// functions/proposal.js — Flow B (vendor proposal). Azure Functions v4 model.
const { app } = require("@azure/functions");
const { CATEGORIES, ENGAGEMENTS, REFERRALS, LIMITS } = require("../shared/config");
const { str, getPhoto, checkBotSignals, hashIp, clientIp, esc } = require("../shared/validate");
const { countRecentByIp, insertProposal, finalizeProposal } = require("../shared/db");
const { notifyTelegram, postHomeAssistant } = require("../shared/notify");

const json = (status, obj) => ({
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  jsonBody: obj,
});

app.http("proposal", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "proposal",
  handler: async (request, context) => {
    let form;
    try {
      form = await request.formData();
    } catch {
      return json(400, { ok: false, error: "Invalid form data" });
    }

    const bot = checkBotSignals(form);
    if (bot.dropSilently) return json(200, { ok: true, ref: "QC-0000" });
    if (bot.reject) return json(400, { ok: false, error: bot.reject });

    const f = {
      vendor_name: str(form, "vendor_name", 80),
      company: str(form, "company", 120),
      category: str(form, "category", 60),
      description: str(form, "description", 600),
      engagement_type: str(form, "engagement_type", 20),
      price_note: str(form, "price_note", 120),
      roc_license: str(form, "roc_license", 20),
      website: str(form, "website_url", 200),
      referral_source: str(form, "referral_source", 20),
      contact_phone: str(form, "contact_phone", 40),
      contact_email: str(form, "contact_email", 120),
    };

    if (!f.vendor_name) return json(400, { ok: false, error: "Add your name." });
    if (!CATEGORIES.includes(f.category)) return json(400, { ok: false, error: "Pick a category." });
    if (!f.description || f.description.length < 10) return json(400, { ok: false, error: "Describe the offer in a sentence or two." });
    if (!ENGAGEMENTS.includes(f.engagement_type)) return json(400, { ok: false, error: "Pick one-time, recurring, or estimate visit." });
    if (!f.contact_phone && !f.contact_email) return json(400, { ok: false, error: "Leave a phone or an email so we can reach you." });
    if (!REFERRALS.includes(f.referral_source)) return json(400, { ok: false, error: "Invalid referral value." });
    if (form.get("consent") !== "yes") return json(400, { ok: false, error: "The consent checkbox is required." });
    if (f.roc_license && !/^[A-Za-z0-9 .-]{2,20}$/.test(f.roc_license))
      return json(400, { ok: false, error: "That ROC license number doesn't look right." });

    const photo = getPhoto(form);
    if (photo === false) return json(400, { ok: false, error: "Photo must be an image under 5 MB." });

    const ipHash = await hashIp(clientIp(request), process.env.IP_SALT);
    try {
      if ((await countRecentByIp(ipHash)) >= LIMITS.RATE_LIMIT_PER_HOUR) {
        return json(429, { ok: false, error: "This door has heard a lot from you in the last hour. Try again later." });
      }

      const id = await insertProposal({
        ...f, ip_hash: ipHash, user_agent: (request.headers.get("user-agent") || "").slice(0, 250),
      });
      const ref = "QC-" + String(id).padStart(4, "0");

      const tgText =
        `📋 <b>New proposal ${ref}</b> — ${esc(f.category)}\n` +
        `From: <b>${esc(f.vendor_name)}</b>${f.company ? ` — ${esc(f.company)}` : " (independent)"}\n` +
        `Type: ${esc(f.engagement_type)}${f.price_note ? ` · ~${esc(f.price_note)}` : ""}` +
        `${f.roc_license ? `\nROC: ${esc(f.roc_license)}` : ""}` +
        `${f.website ? `\nWeb: ${esc(f.website)}` : ""}\n` +
        `Contact: ${esc([f.contact_phone, f.contact_email].filter(Boolean).join(" · "))}` +
        `${f.referral_source ? `\nFound us via: ${esc(f.referral_source)}` : ""}\n\n${esc(f.description)}`;
      const photoFileId = await notifyTelegram(tgText, photo);

      await finalizeProposal(id, ref, photoFileId);

      postHomeAssistant({ type: "proposal", ref, vendor_name: f.vendor_name, company: f.company, category: f.category, engagement_type: f.engagement_type });
      return json(200, { ok: true, ref });
    } catch (err) {
      context.error("proposal handler failed:", err);
      return json(500, { ok: false, error: "Something went wrong on our side. Please try again." });
    }
  },
});
