// POST /api/mcp -> Remote MCP server (Streamable HTTP, stateless) exposing
// read-only tools over the SBC Inspections Firestore data.
// Add it to Claude as a custom connector using the URL:
//   https://<your-app>.vercel.app/api/mcp?token=<ACCESS_TOKEN>
import { getDb, readAll, readKey, KEYS, authorized } from "./_lib.mjs";

const SERVER_INFO = { name: "sbc-inspections", version: "1.0.0" };

// Tool definitions. Each list_* returns the matching dataset; search scans all.
const LIST_KEYS = ["projects", "inspections", "contacts", "schedule", "permits", "todos", "permitCards"];

const TOOLS = [
  ...LIST_KEYS.map((k) => ({
    name: `list_${k}`,
    description: `List all ${k} from SBC Inspections. Optional "limit" to cap results.`,
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "Max records to return" } },
    },
  })),
  {
    name: "search",
    description: "Full-text search across projects, inspections, permits, contacts, schedule and todos. Returns matching records grouped by dataset.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Text to search for (case-insensitive)" } },
      required: ["query"],
    },
  },
  {
    name: "get_summary",
    description: "High-level counts of every dataset in SBC Inspections.",
    inputSchema: { type: "object", properties: {} },
  },
];

function textResult(id, obj) {
  return {
    jsonrpc: "2.0",
    id,
    result: { content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] },
  };
}

async function callTool(name, args) {
  const db = getDb();
  args = args || {};
  if (name === "get_summary") {
    const all = await readAll(db);
    return Object.fromEntries(Object.entries(all).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]));
  }
  if (name === "search") {
    const q = String(args.query || "").toLowerCase();
    if (!q) return { error: "query is required" };
    const all = await readAll(db);
    const hits = {};
    for (const [ds, rows] of Object.entries(all)) {
      if (!Array.isArray(rows)) continue;
      const m = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
      if (m.length) hits[ds] = m;
    }
    return { query: args.query, matches: hits };
  }
  if (name.startsWith("list_")) {
    const ds = name.slice(5);
    const fsKey = KEYS[ds];
    if (!fsKey) return { error: `Unknown dataset "${ds}"` };
    let data = await readKey(db, fsKey);
    if (args.limit && Number.isFinite(args.limit)) data = data.slice(0, args.limit);
    return { dataset: ds, count: data.length, data };
  }
  return { error: `Unknown tool "${name}"` };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type, mcp-session-id, mcp-protocol-version");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") {
    // Some clients probe with GET; nothing to stream in stateless mode.
    return res.status(200).json({ server: SERVER_INFO, transport: "streamable-http", note: "POST JSON-RPC to this URL." });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!authorized(req)) {
    return res.status(401).json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32001, message: "Unauthorized. Append ?token=<ACCESS_TOKEN> to the connector URL." },
    });
  }

  const body = req.body;
  const msg = typeof body === "string" ? JSON.parse(body || "{}") : body || {};

  // Notifications (no id) get an empty 202.
  if (msg.id === undefined || msg.id === null) {
    return res.status(202).end();
  }

  try {
    if (msg.method === "initialize") {
      const clientVer = msg.params?.protocolVersion;
      return res.status(200).json({
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          protocolVersion: clientVer || "2025-06-18",
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
        },
      });
    }
    if (msg.method === "ping") {
      return res.status(200).json({ jsonrpc: "2.0", id: msg.id, result: {} });
    }
    if (msg.method === "tools/list") {
      return res.status(200).json({ jsonrpc: "2.0", id: msg.id, result: { tools: TOOLS } });
    }
    if (msg.method === "tools/call") {
      const out = await callTool(msg.params?.name, msg.params?.arguments);
      return res.status(200).json(textResult(msg.id, out));
    }
    return res.status(200).json({
      jsonrpc: "2.0",
      id: msg.id,
      error: { code: -32601, message: `Method not found: ${msg.method}` },
    });
  } catch (e) {
    return res.status(200).json({
      jsonrpc: "2.0",
      id: msg.id,
      error: { code: -32603, message: String(e?.message || e) },
    });
  }
}
