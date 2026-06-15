// functions/notify.js — root "notify me when testing opens" email capture.
// Azure Functions v4. Honeypot + min-time + email validation; dedupes on email.
const { app } = require("@azure/functions");
const { str, checkBotSignals, hashIp, clientIp, esc } = require("../shared/validate");
const { insertWaitlist } = require("../shared/db");
const { notifyTelegram } = require("../shared/notify");

const json = (status, obj) => ({
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  jsonBody: obj,
});

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

app.http("notify", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "notify",
  handler: async (request, context) => {
    let form;
    try {
      form = await request.formData();
    } catch {
      return json(400, { ok: false, error: "Invalid form data" });
    }

    const bot = checkBotSignals(form);
    if (bot.dropSilently) return json(200, { ok: true });   // honeypot → accept & drop
    if (bot.reject) return json(400, { ok: false, error: bot.reject });

    const email = str(form, "email", 254).toLowerCase();
    if (!EMAIL_RE.test(email)) return json(400, { ok: false, error: "Enter a valid email address." });

    const ipHash = await hashIp(clientIp(request), process.env.IP_SALT);
    try {
      await insertWaitlist({
        email, ip_hash: ipHash,
        user_agent: (request.headers.get("user-agent") || "").slice(0, 250),
      });
      await notifyTelegram(`✉️ <b>New waitlist signup</b>\n${esc(email)}`, null);
      return json(200, { ok: true });
    } catch (err) {
      context.error("notify handler failed:", err);
      return json(500, { ok: false, error: "Something went wrong on our side. Please try again." });
    }
  },
});
