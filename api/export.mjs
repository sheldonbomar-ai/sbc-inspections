// GET /api/export  -> dumps all SBC Inspections data as JSON.
// Optional: /api/export?key=projects to return just one dataset.
import { getDb, readAll, readKey, KEYS, authorized } from "./_lib.mjs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (!authorized(req)) {
    return res.status(401).json({ error: "Unauthorized. Provide ?token=... or Authorization: Bearer <token>." });
  }

  try {
    const db = getDb();
    const one = req.query?.key;
    if (one) {
      const fsKey = KEYS[one];
      if (!fsKey) {
        return res.status(400).json({ error: `Unknown key "${one}". Valid keys: ${Object.keys(KEYS).join(", ")}` });
      }
      const data = await readKey(db, fsKey);
      return res.status(200).json({ key: one, count: data.length, data });
    }
    const all = await readAll(db);
    const counts = Object.fromEntries(Object.entries(all).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]));
    return res.status(200).json({ counts, data: all });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
