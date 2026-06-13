/**
 * Front Door Page — Cloudflare Worker
 *
 * Serves the static frontend (via assets binding) and handles:
 *   POST /api/message   — Flow A: visitor message
 *   POST /api/proposal  — Flow B: vendor proposal
 *
 * Storage:       D1 (binding: DB) — schema in schema.sql
 * Notification:  Telegram bot (secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)
 *                Optional: HA_WEBHOOK_URL — also POSTs JSON to Home Assistant
 * Photos:        forwarded to Telegram (sendPhoto); file_id stored in D1.
 *                No separate object storage needed in v1.
 *
 * Anti-abuse (per brief §4/§5/§10): honeypot field, minimum time-on-page,
 * per-IP hourly rate limit. No CAPTCHA.
 */

// ---- Allowlists (keep in sync with HOUSE config in frontend/index.html) ----

const RECIPIENTS = ["The household", "Mike", "Tanya"]; // adults only — brief §4 privacy rule

const CATEGORIES = [
  "Landscaping & Irrigation", "Pest Control", "HVAC", "Plumbing", "Electrical",
  "Solar & Energy", "Roofing", "Cleaning (windows / house / exterior)",
  "Pool & Spa", "Security & Smart Home", "Internet / Telecom",
  "Auto (detailing, etc.)", "Family services (tutoring, babysitting, coaching)",
  "Other",
];

const ENGAGEMENTS = ["one-time", "recurring", "estimate"];
const REFERRALS = ["canvassing", "referral", "saw-something", "other", ""];

const MIN_TIME_ON_PAGE_MS = 3000;     // matches the designed client-side check
const MAX_TOKEN_AGE_MS = 24 * 3600e3; // and staler than this
const RATE_LIMIT_PER_HOUR = 5;        // per IP, both flows combined
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env, ctx, url).catch((err) => {
        console.error("api error:", err);
        return json({ ok: false, error: "Something went wrong on our side. Please try again." }, 500);
      });
    }
    return env.ASSETS.fetch(request);
  },
};

// --------------------------------------------------------------- API routing

async function handleApi(request, env, ctx, url) {
  if (request.method !== "POST") return json({ ok: false, error: "POST only" }, 405);

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "Invalid form data" }, 400);
  }

  // Honeypot: hidden "website" field must be empty.
  if (str(form, "website", 200)) return json({ ok: true }); // silently accept & drop

  // Minimum time on page.
  const t0 = Number(form.get("t0"));
  const age = Date.now() - t0;
  if (!Number.isFinite(t0) || age < MIN_TIME_ON_PAGE_MS || age > MAX_TOKEN_AGE_MS) {
    return json({ ok: false, error: "Please take a moment and try again." }, 400);
  }

  // Per-IP rate limit.
  const ipHash = await hashIp(request, env);
  if (await overRateLimit(env, ipHash)) {
    return json({ ok: false, error: "This door has heard a lot from you in the last hour. Try again later." }, 429);
  }

  const ua = (request.headers.get("User-Agent") || "").slice(0, 250);

  if (url.pathname === "/api/message") return handleMessage(form, env, ctx, ipHash, ua);
  if (url.pathname === "/api/proposal") return handleProposal(form, env, ctx, ipHash, ua);
  return json({ ok: false, error: "Not found" }, 404);
}

// --------------------------------------------------------------- Flow A

async function handleMessage(form, env, ctx, ipHash, ua) {
  const recipient = str(form, "recipient", 40);
  const message = str(form, "message", 500);
  const senderName = str(form, "sender_name", 80);
  const contact = str(form, "contact", 120);

  if (!RECIPIENTS.includes(recipient)) return bad("Pick who the message is for.");
  if (!message) return bad("The message is empty.");
  if (!senderName) return bad("Add your name so we know who stopped by.");

  const photo = getPhoto(form);
  if (photo === false) return bad("Photo must be an image under 5 MB.");

  const tgText =
    `🏠 <b>Doorstep message</b> — for <b>${esc(recipient)}</b>\n` +
    `From: <b>${esc(senderName)}</b>${contact ? ` (${esc(contact)})` : ""}\n\n` +
    `${esc(message)}`;
  const photoFileId = await notifyTelegram(env, tgText, photo);

  await env.DB.prepare(
    `INSERT INTO messages (recipient, message, sender_name, contact, photo_file_id, ip_hash, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(recipient, message, senderName, contact || null, photoFileId, ipHash, ua).run();

  if (env.HA_WEBHOOK_URL) {
    ctx.waitUntil(postHA(env, { type: "message", recipient, sender_name: senderName, contact, message }));
  }
  return json({ ok: true });
}

// --------------------------------------------------------------- Flow B

async function handleProposal(form, env, ctx, ipHash, ua) {
  const vendorName = str(form, "vendor_name", 80);
  const company = str(form, "company", 120);
  const category = str(form, "category", 40);
  const description = str(form, "description", 600);
  const engagement = str(form, "engagement_type", 20);
  const priceNote = str(form, "price_note", 120);
  const roc = str(form, "roc_license", 20);
  const website = str(form, "website_url", 200);
  const referral = str(form, "referral_source", 20);
  const phone = str(form, "contact_phone", 40);
  const email = str(form, "contact_email", 120);

  if (!vendorName) return bad("Add your name.");
  if (!CATEGORIES.includes(category)) return bad("Pick a category.");
  if (!description || description.length < 10) return bad("Describe the offer in a sentence or two.");
  if (!ENGAGEMENTS.includes(engagement)) return bad("Pick one-time, recurring, or estimate visit.");
  if (!phone && !email) return bad("Leave a phone or an email so we can reach you.");
  if (!REFERRALS.includes(referral)) return bad("Invalid referral value.");
  if (form.get("consent") !== "yes") return bad("The consent checkbox is required.");
  if (roc && !/^[A-Za-z0-9 .-]{2,20}$/.test(roc)) return bad("That ROC license number doesn't look right.");

  const photo = getPhoto(form);
  if (photo === false) return bad("Photo must be an image under 5 MB.");

  const res = await env.DB.prepare(
    `INSERT INTO proposals (vendor_name, company, category, description, engagement_type,
       price_note, roc_license, website, referral_source, contact_phone, contact_email,
       ip_hash, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    vendorName, company || null, category, description, engagement,
    priceNote || null, roc || null, website || null, referral || null,
    phone || null, email || null, ipHash, ua
  ).run();

  const id = res.meta.last_row_id;
  const ref = "QC-" + String(id).padStart(4, "0");

  const tgText =
    `📋 <b>New proposal ${ref}</b> — ${esc(category)}\n` +
    `From: <b>${esc(vendorName)}</b>${company ? ` — ${esc(company)}` : " (independent)"}\n` +
    `Type: ${esc(engagement)}${priceNote ? ` · ~${esc(priceNote)}` : ""}` +
    `${roc ? `\nROC: ${esc(roc)}` : ""}` +
    `${website ? `\nWeb: ${esc(website)}` : ""}\n` +
    `Contact: ${esc([phone, email].filter(Boolean).join(" · "))}` +
    `${referral ? `\nFound us via: ${esc(referral)}` : ""}\n\n` +
    `${esc(description)}`;
  const photoFileId = await notifyTelegram(env, tgText, photo);

  await env.DB.prepare(`UPDATE proposals SET ref = ?, photo_file_id = ? WHERE id = ?`)
    .bind(ref, photoFileId, id).run();

  if (env.HA_WEBHOOK_URL) {
    ctx.waitUntil(postHA(env, { type: "proposal", ref, vendor_name: vendorName, company, category, engagement_type: engagement }));
  }
  return json({ ok: true, ref });
}

// --------------------------------------------------------------- Helpers

function str(form, key, max) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function getPhoto(form) {
  const f = form.get("photo");
  if (!f || typeof f === "string" || f.size === 0) return null;
  if (!f.type.startsWith("image/") || f.size > MAX_PHOTO_BYTES) return false;
  return f;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const bad = (msg) => json({ ok: false, error: msg }, 400);

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function hashIp(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  const salt = env.IP_SALT || "front-door-v1";
  const data = new TextEncoder().encode(salt + "|" + ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function overRateLimit(env, ipHash) {
  const q = (table) =>
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM ${table} WHERE ip_hash = ? AND created_at > datetime('now','-1 hour')`
    ).bind(ipHash).first();
  const [m, p] = await Promise.all([q("messages"), q("proposals")]);
  return (m?.n || 0) + (p?.n || 0) >= RATE_LIMIT_PER_HOUR;
}

/**
 * Sends Telegram notification. Returns photo file_id if a photo was sent.
 * Never throws — a Telegram outage must not lose a submission (it's in D1).
 */
async function notifyTelegram(env, text, photo) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return null;
  const api = (m) => `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${m}`;
  try {
    if (photo) {
      const fd = new FormData();
      fd.append("chat_id", env.TELEGRAM_CHAT_ID);
      fd.append("caption", text.slice(0, 1024));
      fd.append("parse_mode", "HTML");
      fd.append("photo", photo, photo.name || "photo.jpg");
      const r = await fetch(api("sendPhoto"), { method: "POST", body: fd });
      const data = await r.json();
      if (data.ok) {
        const sizes = data.result.photo || [];
        return sizes.length ? sizes[sizes.length - 1].file_id : null;
      }
      // Fall back to text-only if photo upload failed.
      await fetch(api("sendMessage"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: "HTML" }),
      });
      return null;
    }
    await fetch(api("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: "HTML" }),
    });
  } catch (err) {
    console.error("telegram notify failed:", err);
  }
  return null;
}

/** Optional Home Assistant webhook — outbound only, fire-and-forget. */
async function postHA(env, payload) {
  try {
    await fetch(env.HA_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("HA webhook failed:", err);
  }
}
