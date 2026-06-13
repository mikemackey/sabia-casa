// functions/message.js — Flow A (visitor message). Azure Functions v4 model.
const { app } = require("@azure/functions");
const { RECIPIENTS } = require("../shared/config");
const { str, getPhoto, checkBotSignals, hashIp, clientIp, esc } = require("../shared/validate");
const { countRecentByIp, insertMessage } = require("../shared/db");
const { notifyTelegram, postHomeAssistant } = require("../shared/notify");
const { LIMITS } = require("../shared/config");

const json = (status, obj) => ({
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  jsonBody: obj,
});

app.http("message", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "message",
  handler: async (request, context) => {
    let form;
    try {
      form = await request.formData();
    } catch {
      return json(400, { ok: false, error: "Invalid form data" });
    }

    const bot = checkBotSignals(form);
    if (bot.dropSilently) return json(200, { ok: true }); // honeypot → accept & drop
    if (bot.reject) return json(400, { ok: false, error: bot.reject });

    const recipient = str(form, "recipient", 40);
    const message = str(form, "message", 500);
    const senderName = str(form, "sender_name", 80);
    const contact = str(form, "contact", 120);

    if (!RECIPIENTS.includes(recipient)) return json(400, { ok: false, error: "Pick who the message is for." });
    if (!message) return json(400, { ok: false, error: "The message is empty." });
    if (!senderName) return json(400, { ok: false, error: "Add your name so we know who stopped by." });

    const photo = getPhoto(form);
    if (photo === false) return json(400, { ok: false, error: "Photo must be an image under 5 MB." });

    const ipHash = await hashIp(clientIp(request), process.env.IP_SALT);
    try {
      if ((await countRecentByIp(ipHash)) >= LIMITS.RATE_LIMIT_PER_HOUR) {
        return json(429, { ok: false, error: "This door has heard a lot from you in the last hour. Try again later." });
      }

      const tgText =
        `🏠 <b>Doorstep message</b> — for <b>${esc(recipient)}</b>\n` +
        `From: <b>${esc(senderName)}</b>${contact ? ` (${esc(contact)})` : ""}\n\n${esc(message)}`;
      const photoFileId = await notifyTelegram(tgText, photo);

      await insertMessage({
        recipient, message, sender_name: senderName, contact,
        photo_file_id: photoFileId,
        ip_hash: ipHash, user_agent: (request.headers.get("user-agent") || "").slice(0, 250),
      });

      context.extraOutputs && null; // (no extra outputs; placeholder for future)
      postHomeAssistant({ type: "message", recipient, sender_name: senderName, contact, message });
      return json(200, { ok: true });
    } catch (err) {
      context.error("message handler failed:", err);
      return json(500, { ok: false, error: "Something went wrong on our side. Please try again." });
    }
  },
});
