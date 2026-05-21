const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

admin.initializeApp();

const gmailPassword = defineSecret("GMAIL_APP_PASSWORD");

// Re-export backup functions
const backups = require("./backups");
exports.dailyBackup = backups.dailyBackup;
exports.manualBackup = backups.manualBackup;
exports.listBackups = backups.listBackups;
exports.restoreBackup = backups.restoreBackup;

// Todo email notifications
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
