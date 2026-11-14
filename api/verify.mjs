// GET /api/verify -> 200 {ok:true} only when the caller sent the right access token.
// Used by the crmRead Cloud Function to check a token without storing it.
// Fails closed: if ACCESS_TOKEN is not configured, nobody is verified.
import { authorized } from "./_lib.mjs";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!process.env.ACCESS_TOKEN || !authorized(req)) {
    return res.status(401).json({ ok: false });
  }
  return res.status(200).json({ ok: true });
}
