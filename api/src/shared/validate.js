// shared/validate.js — request parsing + anti-abuse, framework-agnostic.
// crypto, FormData, and Blob are all globals in the Functions Node 20 runtime.

const { LIMITS } = require("./config");

function str(form, key, max) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// Returns: File (ok) | null (none) | false (present but invalid).
function getPhoto(form) {
  const f = form.get("photo");
  if (!f || typeof f === "string" || !f.size) return null;
  if (!f.type || !f.type.startsWith("image/") || f.size > LIMITS.MAX_PHOTO_BYTES) return false;
  return f;
}

// honeypot ("website" hidden field must be empty) + minimum time-on-page token.
// Returns { dropSilently } | { reject:"msg" } | { ok:true }.
function checkBotSignals(form) {
  if (str(form, "website", 200)) return { dropSilently: true };
  const t0 = Number(form.get("t0"));
  const age = Date.now() - t0;
  if (!Number.isFinite(t0) || age < LIMITS.MIN_TIME_ON_PAGE_MS || age > LIMITS.MAX_TOKEN_AGE_MS) {
    return { reject: "Please take a moment and try again." };
  }
  return { ok: true };
}

async function hashIp(ip, salt) {
  const data = new TextEncoder().encode((salt || "front-door-v1") + "|" + (ip || "0.0.0.0"));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

// Azure SWA forwards the caller IP in x-forwarded-for (client first).
function clientIp(request) {
  const xff = request.headers.get("x-forwarded-for") || "";
  return xff.split(",")[0].trim() || "0.0.0.0";
}

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

module.exports = { str, getPhoto, checkBotSignals, hashIp, clientIp, esc };
