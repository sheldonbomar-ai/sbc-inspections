const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

// Website lead capture for stacybomarconstruction.com.
// The estimate form POSTs here; each lead is stored as its own doc in the
// `leads` collection (kept out of the data/* project blobs) and emailed to
// the lead inbox. The tracker's Leads tab reads the same collection.

const gmailPassword = defineSecret("GMAIL_APP_PASSWORD");
const LEAD_INBOX = "getaquotesbc@gmail.com";

const clip = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

exports.submitLead = onRequest(
  {
    region: "us-east1",
    cors: [/^https:\/\/(www\.)?stacybomarconstruction\.com$/],
    invoker: "public",
    maxInstances: 3,
    secrets: [gmailPassword],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }
    const b = req.body || {};

    // Honeypot: real people never see this field. Pretend success for bots.
    if (clip(b["bot-field"], 200)) {
      res.status(200).json({ ok: true });
      return;
    }

    const lead = {
      name: clip(b.name, 120),
      phone: clip(b.phone, 40),
      email: clip(b.email, 160),
      address: clip(b.address, 200),
      ptype: clip(b.ptype, 80),
      msg: clip(b.msg, 3000),
      sourcePage: clip(b.source_page, 200),
      submittedAt: clip(b.submitted_at, 40),
      receivedAt: new Date().toISOString(),
      status: "New",
      notes: "",
    };
    if (!lead.name || !lead.phone || !lead.address) {
      res.status(400).json({ ok: false, error: "Name, phone, and job location are required." });
      return;
    }

    // Store first. If this fails the site falls back to its mailto link.
    let ref;
    try {
      ref = await admin.firestore().collection("leads").add(lead);
    } catch (e) {
      console.error("Lead store failed:", e);
      res.status(500).json({ ok: false });
      return;
    }

    // Email is best effort: the lead is already safe in the tracker.
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: "sbcpermitting@gmail.com", pass: gmailPassword.value() },
      });
      const row = (k, v) => (v ? `<tr><td style="padding:4px 12px 4px 0;color:#6B7D92;font-size:12px;vertical-align:top;">${k}</td><td style="padding:4px 0;font-size:14px;">${esc(v)}</td></tr>` : "");
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
      await transporter.sendMail({
        from: '"SBC Website" <sbcpermitting@gmail.com>',
        to: LEAD_INBOX,
        replyTo: validEmail ? lead.email : undefined,
        subject: `New estimate request: ${lead.ptype || "Project"} for ${lead.name}`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:520px;background:#0F1419;border-radius:12px;padding:24px;color:#E8ECF1;">
          <div style="font-size:18px;font-weight:700;color:#3B8BF5;margin-bottom:4px;">Stacy Bomar Construction</div>
          <div style="font-size:10px;font-weight:700;color:#84C778;letter-spacing:2px;margin-bottom:16px;">NEW WEBSITE LEAD</div>
          <table style="border-collapse:collapse;color:#E8ECF1;">
            ${row("Name", lead.name)}${row("Phone", lead.phone)}${row("Email", lead.email)}${row("Location", lead.address)}${row("Job", lead.ptype)}${row("Details", lead.msg)}
          </table>
          <div style="font-size:11px;color:#6B7D92;margin-top:16px;">Saved to the Leads tab in the SBC Tracker.</div>
        </div>`,
      });
    } catch (e) {
      console.error(`Lead ${ref.id} stored but email failed:`, e);
    }

    res.status(200).json({ ok: true });
  }
);
