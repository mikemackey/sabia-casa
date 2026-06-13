// shared/notify.js — Telegram notification (+ optional Home Assistant webhook).
// Never throws: the submission is already persisted in SQL, so a Telegram or HA
// outage must not surface as an error to the visitor. Returns photo file_id when
// a photo was sent (so the caller can store it).

const { esc } = require("./validate");

async function notifyTelegram(text, photo) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return null;
  const api = (m) => `https://api.telegram.org/bot${token}/${m}`;
  try {
    if (photo) {
      const fd = new FormData();
      fd.append("chat_id", chat);
      fd.append("caption", text.slice(0, 1024));
      fd.append("parse_mode", "HTML");
      fd.append("photo", photo, photo.name || "photo.jpg");
      const r = await fetch(api("sendPhoto"), { method: "POST", body: fd });
      const data = await r.json();
      if (data.ok) {
        const sizes = data.result.photo || [];
        return sizes.length ? sizes[sizes.length - 1].file_id : null;
      }
      // photo failed → fall back to text so the notification still lands
      await sendText(api, chat, text);
      return null;
    }
    await sendText(api, chat, text);
  } catch {
    /* swallow — data is safe in SQL */
  }
  return null;
}

async function sendText(api, chat, text) {
  await fetch(api("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML" }),
  });
}

async function postHomeAssistant(payload) {
  const url = process.env.HA_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    /* optional integration — ignore failures */
  }
}

module.exports = { notifyTelegram, postHomeAssistant, esc };
