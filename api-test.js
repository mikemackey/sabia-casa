// api-test.js — unit-tests the backend's pure logic without standing up the
// Functions host or a real database. Mocks fetch (Telegram) and the mssql pool.
// Run: node api-test.js   (from repo root, after `npm install` in api/)
const path = require("path");
const api = (p) => path.join(__dirname, "api", "node_modules", p);
const shared = (m) => require(path.join(__dirname, "api", "src", "shared", m));

let pass = 0;
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } pass++; console.log("ok —", m); };

// Minimal FormData-like shim mirroring what request.formData() returns.
class FD {
  constructor(o = {}) { this.m = new Map(Object.entries(o)); }
  get(k) { return this.m.has(k) ? this.m.get(k) : null; }
  set(k, v) { this.m.set(k, v); }
}

(async () => {
  const { str, getPhoto, checkBotSignals, hashIp, clientIp, esc } = shared("validate");
  const { RECIPIENTS, CATEGORIES, ENGAGEMENTS, LIMITS } = shared("config");

  // ---- field coercion ----
  const fd = new FD({ vendor_name: "  Vic  ", description: "x".repeat(700) });
  ok(str(fd, "vendor_name", 80) === "Vic", "str trims whitespace");
  ok(str(fd, "description", 600).length === 600, "str enforces max length");
  ok(str(fd, "missing", 10) === "", "str returns '' for missing field");

  // ---- honeypot + time token ----
  ok(checkBotSignals(new FD({ website: "spam" })).dropSilently, "honeypot trips → dropSilently");
  ok(checkBotSignals(new FD({ t0: String(Date.now()) })).reject, "too-fast submit rejected");
  ok(checkBotSignals(new FD({ t0: String(Date.now() - 5000) })).ok, "submit after 3s passes");
  ok(checkBotSignals(new FD({ t0: "not-a-number" })).reject, "missing/NaN t0 rejected");

  // ---- IP hashing ----
  const h1 = await hashIp("203.0.113.7", "salt");
  const h2 = await hashIp("203.0.113.7", "salt");
  const h3 = await hashIp("203.0.113.8", "salt");
  ok(h1.length === 32 && h1 === h2, "hashIp is deterministic, 32 chars");
  ok(h1 !== h3, "hashIp differs per IP");
  ok(clientIp({ headers: { get: () => "203.0.113.7, 10.0.0.1" } }) === "203.0.113.7", "clientIp takes first XFF hop");

  // ---- photo guard ----
  ok(getPhoto(new FD({})) === null, "no photo → null");
  ok(getPhoto(new FD({ photo: { size: 10, type: "text/plain" } })) === false, "non-image → false");
  ok(getPhoto(new FD({ photo: { size: 9e6, type: "image/jpeg" } })) === false, "oversized image → false");
  ok(getPhoto(new FD({ photo: { size: 1000, type: "image/png", name: "a.png" } })) !== null, "valid image kept");

  // ---- escaping ----
  ok(esc('<b>&"') === "&lt;b&gt;&amp;\"", "esc encodes <, >, &");

  // ---- taxonomy invariants shared with the frontend ----
  ok(CATEGORIES.includes("HVAC") && CATEGORIES.length === 14, "category taxonomy intact (14)");
  ok(ENGAGEMENTS.join() === "one-time,recurring,estimate", "engagement enum matches API values");
  ok(RECIPIENTS.length === 3 && !RECIPIENTS.join().toLowerCase().includes("vera"), "recipients are adults only");

  // ---- QC ref formatting (mirrors proposal.js) ----
  const ref = (id) => "QC-" + String(id).padStart(4, "0");
  ok(ref(42) === "QC-0042" && ref(12345) === "QC-12345", "QC ref zero-pads to 4");

  // ---- Telegram notify with mocked fetch (no network) ----
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push({ url, opts });
    return { json: async () => ({ ok: true, result: { photo: [{ file_id: "small" }, { file_id: "big" }] } }) };
  };
  process.env.TELEGRAM_BOT_TOKEN = "T"; process.env.TELEGRAM_CHAT_ID = "C";
  delete require.cache[require.resolve(path.join(__dirname, "api", "src", "shared", "notify.js"))];
  const { notifyTelegram } = shared("notify");
  const realPhoto = new File(["binary"], "p.jpg", { type: "image/jpeg" }); // Node 20 global
  const fileId = await notifyTelegram("hello", realPhoto);
  ok(calls[0].url.includes("/sendPhoto") && fileId === "big", "photo path → sendPhoto, returns largest file_id");
  const textId = await notifyTelegram("just text", null);
  ok(calls[1].url.includes("/sendMessage") && textId === null, "text path → sendMessage, no file_id");

  // notify must not throw even if fetch explodes (data already safe in SQL)
  global.fetch = async () => { throw new Error("telegram down"); };
  delete require.cache[require.resolve(path.join(__dirname, "api", "src", "shared", "notify.js"))];
  const { notifyTelegram: notify2 } = shared("notify");
  let threw = false;
  try { await notify2("x", null); } catch { threw = true; }
  ok(!threw, "notify swallows Telegram failure (submission stays safe)");

  console.log(`\nAll ${pass} backend logic checks passed.`);
})().catch((e) => { console.error("FAIL (exception):", e); process.exit(1); });
