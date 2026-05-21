const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();

const gmailPassword = defineSecret("GMAIL_APP_PASSWORD");
const ADMIN_EMAILS = ["sheldon@sbc.app", "tim@sbc.app"];
const DATA_KEYS = ["sYp", "sYi", "sYc", "sYs", "sYpm", "sYtd", "sYcd"];

// ============================================
// BACKUP SYSTEM
// ============================================

// Daily automatic backup at 2 AM ET
exports.dailyBackup = onSchedule(
  { schedule: "every day 02:00", timeZone: "America/New_York", region: "us-east1" },
  async () => {
    await createBackup("auto");
  }
);

// Manual backup triggered from admin UI
exports.manualBackup = onCall({ region: "us-east1" }, async (request) => {
  if (!request.auth || !ADMIN_EMAILS.includes(request.auth.token.email)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
  const path = await createBackup("manual");
  return { success: true, path };
});

// List available backups
exports.listBackups = onCall({ region: "us-east1" }, async (request) => {
  if (!request.auth || !ADMIN_EMAILS.includes(request.auth.token.email)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
  const [files] = await bucket.getFiles({ prefix: "backups/" });
  const backups = files
    .filter((f) => f.name.endsWith(".json"))
    .map((f) => ({
      path: f.name,
      date: f.metadata.timeCreated,
      size: parseInt(f.metadata.size || "0"),
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  return { backups };
});

// Restore from a backup
exports.restoreBackup = onCall({ region: "us-east1" }, async (request) => {
  if (!request.auth || !ADMIN_EMAILS.includes(request.auth.token.email)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
  const { backupPath } = request.data;
  if (!backupPath) throw new HttpsError("invalid-argument", "backupPath required");

  // Save a pre-restore snapshot first
  await createBackup("pre-restore");

  // Read the backup file
  const file = bucket.file(backupPath);
  const [contents] = await file.download();
  const snapshot = JSON.parse(contents.toString("utf-8"));

  // Write each key back to Firestore
  const batch = db.batch();
  for (const key of DATA_KEYS) {
    if (snapshot.keys && snapshot.keys[key] !== undefined) {
      batch.set(db.collection("data").doc(key), { value: snapshot.keys[key] });
    }
  }
  await batch.commit();

  // Log the restore
  await db.collection("activityLog").add({
    user: request.auth.token.email,
    action: "restored backup",
    detail: backupPath,
    ts: new Date().toISOString(),
  });

  return { success: true, restoredFrom: backupPath };
});

// Shared backup creation logic
async function createBackup(trigger) {
  const snapshot = { trigger, timestamp: new Date().toISOString(), keys: {} };

  for (const key of DATA_KEYS) {
    const doc = await db.collection("data").doc(key).get();
    if (doc.exists) {
      snapshot.keys[key] = doc.data().value;
    }
  }

  const date = new Date().toISOString().split("T")[0];
  const ts = Date.now();
  const path = `backups/${date}/${trigger}-${ts}.json`;
  const file = bucket.file(path);
  await file.save(JSON.stringify(snapshot), { contentType: "application/json" });

  // Cleanup: delete backups older than 30 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const [allFiles] = await bucket.getFiles({ prefix: "backups/" });
  for (const f of allFiles) {
    if (new Date(f.metadata.timeCreated) < cutoff) {
      await f.delete().catch(() => {});
    }
  }

  console.log(`Backup saved: ${path} (${trigger})`);
  return path;
}

// ============================================
// TODO EMAIL NOTIFICATIONS (existing)
// ============================================

exports.onTodoAdded = onDocumentWritten(
  { document: "data/sYtd", secrets: [gmailPassword] },
  async (event) => {
    const beforeData = event.data.before?.data();
    const afterData = event.data.after?.data();

    if (!afterData) return;

    const oldTodos = beforeData ? JSON.parse(beforeData.value || "[]") : [];
    const newTodos = JSON.parse(afterData.value || "[]");

    const oldIds = new Set(oldTodos.map((t) => t.id));
    const added = newTodos.filter((t) => !oldIds.has(t.id));

    if (added.length === 0) return;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "sbcpermitting@gmail.com",
        pass: gmailPassword.value(),
      },
    });

    for (const todo of added) {
      const priorityColor =
        todo.priority === "High" ? "#F87171" : todo.priority === "Low" ? "#6B7D92" : "#3B8BF5";

      await transporter.sendMail({
        from: '"SBC Tracker" <sbcpermitting@gmail.com>',
        to: "sbcpermitting@gmail.com",
        subject: `New To Do: ${todo.text}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;background:#0F1419;border-radius:12px;padding:24px;color:#E8ECF1;">
            <div style="font-size:18px;font-weight:700;color:#3B8BF5;margin-bottom:4px;">Stacy Bomar Construction</div>
            <div style="font-size:10px;font-weight:700;color:#4ADE80;letter-spacing:2px;margin-bottom:20px;">NEW TO DO ITEM</div>
            <div style="background:#1A2332;border-radius:8px;padding:16px;border:1px solid #2D3B4E;">
              <div style="font-size:15px;font-weight:600;margin-bottom:8px;">${todo.text}</div>
              <div style="font-size:12px;color:#A0AEBF;">
                <span style="color:${priorityColor};font-weight:600;">${todo.priority} Priority</span>
                &nbsp;&middot;&nbsp; Added by ${todo.createdBy}
                &nbsp;&middot;&nbsp; ${todo.createdAt}
              </div>
            </div>
          </div>
        `,
      });
    }

    console.log(`Sent ${added.length} todo email(s)`);
  }
);
