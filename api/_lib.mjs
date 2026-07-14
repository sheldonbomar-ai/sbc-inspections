// Shared helpers for the SBC Inspections read API (export + MCP).
// Reads Firestore exactly like the React app does: each key lives at
// data/<key> as a document whose `value` field is a JSON string.
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDFnNEBCo-B1k0RiB4Dg0Y1Ei_ZMiXb6-Q",
  authDomain: "stacy-bomar-tracker.firebaseapp.com",
  projectId: "stacy-bomar-tracker",
  storageBucket: "stacy-bomar-tracker.firebasestorage.app",
  messagingSenderId: "937797571947",
  appId: "1:937797571947:web:db3cc79651e62bbb46282e",
};

export function getDb() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getFirestore(app);
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
  const snap = await getDoc(doc(db, "data", key));
  const d = snap.data();
  if (!d || !d.value) return [];
  try {
    return JSON.parse(d.value);
  } catch {
    return [];
  }
}

export async function readAll(db) {
  const out = {};
  await Promise.all(
    Object.entries(KEYS).map(async ([name, key]) => {
      out[name] = await readKey(db, key);
    })
  );
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
