const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
// Explicit bucket name: this project's default bucket uses the newer
// .firebasestorage.app naming, so admin.storage().bucket() (which defaults
// to <project>.appspot.com) points at a bucket that doesn't exist.
const bucket = admin.storage().bucket("stacy-bomar-tracker.firebasestorage.app");

const ADMIN_EMAILS = ["sheldon@sbc.app", "tim@sbc.app"];
const DATA_KEYS = ["sYp", "sYi", "sYc", "sYs", "sYpm", "sYtd", "sYcd", "sYpc"];

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

// Preview a backup's contents (record counts per key) without restoring
exports.previewBackup = onCall({ region: "us-east1" }, async (request) => {
  if (!request.auth || !ADMIN_EMAILS.includes(request.auth.token.email)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
  const { backupPath } = request.data;
  if (!backupPath) throw new HttpsError("invalid-argument", "backupPath required");
  const [contents] = await bucket.file(backupPath).download();
  const snap = JSON.parse(contents.toString("utf-8"));
  const counts = {};
  for (const key of DATA_KEYS) {
    if (snap.keys && snap.keys[key] !== undefined) {
      try { counts[key] = JSON.parse(snap.keys[key]).length; } catch { counts[key] = null; }
    } else {
      counts[key] = 0;
    }
  }
  return { trigger: snap.trigger, timestamp: snap.timestamp, counts };
});

// Restore from a backup
exports.restoreBackup = onCall({ region: "us-east1" }, async (request) => {
  if (!request.auth || !ADMIN_EMAILS.includes(request.auth.token.email)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
  const { backupPath } = request.data;
  if (!backupPath) throw new HttpsError("invalid-argument", "backupPath required");

  await createBackup("pre-restore");

  const file = bucket.file(backupPath);
  const [contents] = await file.download();
  const snapshot = JSON.parse(contents.toString("utf-8"));

  const batch = db.batch();
  for (const key of DATA_KEYS) {
    if (snapshot.keys && snapshot.keys[key] !== undefined) {
      batch.set(db.collection("data").doc(key), { value: snapshot.keys[key] });
    }
  }
  await batch.commit();

  await db.collection("activityLog").add({
    user: request.auth.token.email,
    action: "restored backup",
    detail: backupPath,
    ts: new Date().toISOString(),
  });

  return { success: true, restoredFrom: backupPath };
});

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
