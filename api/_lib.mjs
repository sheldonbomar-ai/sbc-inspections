// Shared helpers for the SBC Inspections read API (export + MCP).
// Each key lives at data/<key> as a document whose `value` field is a JSON string.
// The database now requires a signed-in user, so this API reads through the
// crmRead Cloud Function, passing along the caller's access token.
const READ_URL = "https://us-east1-stacy-bomar-tracker.cloudfunctions.net/crmRead";

// Pulls the caller's token off the request. Named getDb for the callers' sake.
export function getDb(req) {
  let qp = "";
  try {
    qp = new URL(req.url, "http://localhost").searchParams.get("token") || "";
  } catch {
    /* ignore */
  }
  const header = req.headers?.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  return { token: bearer || qp };
}

async function fetchKeys(db, keys) {
  const r = await fetch(`${READ_URL}?keys=${keys.join(",")}`, {
    headers: { authorization: `Bearer ${db.token}` },
  });
  if (!r.ok) throw new Error(`Data read failed (${r.status})`);
  return (await r.json()).data || {};
}

// Friendly name -> Firestore key
export const KEYS = {
  projects: "sYp",
  inspections: "sYi",
  contacts: "sYc",
  schedule: "sYs",
  permits: "sYpm",
  todos: "sYtd",
  companyDocs: "sYcd",
  permitCards: "sYpc",
};

export async function readKey(db, key) {
  const data = await fetchKeys(db, [key]);
  return Array.isArray(data[key]) ? data[key] : [];
}

export async function readAll(db) {
  const data = await fetchKeys(db, Object.values(KEYS));
  const out = {};
  for (const [name, key] of Object.entries(KEYS)) out[name] = Array.isArray(data[key]) ? data[key] : [];
  return out;
}

// Token check: accepts ?token=... or "Authorization: Bearer ...".
// If ACCESS_TOKEN env var is unset, the endpoint stays open (fail-open) so it
// still works before the env var is configured — but you should set it.
export function authorized(req) {
  const token = process.env.ACCESS_TOKEN;
  if (!token) return true;
  let qp = "";
  try {
    qp = new URL(req.url, "http://localhost").searchParams.get("token") || "";
  } catch {
    /* ignore */
  }
  const header = req.headers?.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  return qp === token || bearer === token;
}
