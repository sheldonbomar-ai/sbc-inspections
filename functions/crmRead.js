const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("crypto");

// Read-only door for the tracker's Vercel API (export + Claude connector).
// The database rules now require a signed-in user, so the API can no longer
// read Firestore directly. It calls this function instead and passes along
// the caller's access token. We confirm the token with the Vercel API itself
// (/api/verify), so the token never has to be stored here.
const VERIFY_URL = "https://sbc-inspections.vercel.app/api/verify";
const ALLOWED = new Set(["sYp", "sYi", "sYc", "sYs", "sYpm", "sYtd", "sYcd", "sYpc"]);
const okUntil = new Map(); // sha256(token) -> expiry ms

async function tokenOk(token) {
  if (!token || token.length > 500) return false;
  const h = crypto.createHash("sha256").update(token).digest("hex");
  if ((okUntil.get(h) || 0) > Date.now()) return true;
  const r = await fetch(VERIFY_URL, { headers: { authorization: `Bearer ${token}` } });
  if (r.status !== 200) return false;
  const j = await r.json().catch(() => null);
  if (!j || j.ok !== true) return false;
  okUntil.set(h, Date.now() + 10 * 60 * 1000);
  return true;
}

exports.crmRead = onRequest(
  { region: "us-east1", invoker: "public", maxInstances: 3 },
  async (req, res) => {
    try {
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : "";
      if (!(await tokenOk(token))) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const keys = String(req.query.keys || "").split(",").filter((k) => ALLOWED.has(k));
      if (!keys.length) {
        res.status(400).json({ error: "No valid keys" });
        return;
      }
      const db = admin.firestore();
      const data = {};
      await Promise.all(
        keys.map(async (k) => {
          const snap = await db.doc(`data/${k}`).get();
          const d = snap.data();
          try {
            data[k] = d && d.value ? JSON.parse(d.value) : [];
          } catch {
            data[k] = [];
          }
        })
      );
      res.status(200).json({ data });
    } catch (e) {
      console.error("crmRead error:", e);
      res.status(500).json({ error: "Read failed" });
    }
  }
);
