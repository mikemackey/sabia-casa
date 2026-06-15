// smoke-test.js — render the built app in jsdom, walk both flows against a
// mocked backend, and assert the payloads match the Worker API contract.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const read = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');

const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="root"></div></body></html>`, {
  runScripts: 'outside-only',
  url: 'https://sabia.casa/ds/85142/22752-s-226-th-pl',
  pretendToBeVisual: true,
});
const { window } = dom;

// --- mock fetch: capture FormData, answer like the Worker ---
const calls = [];
window.fetch = (url, opts) => {
  const fields = {};
  for (const [k, v] of opts.body.entries()) fields[k] = v;
  calls.push({ url, fields });
  const body = url.includes('proposal') ? { ok: true, ref: 'QC-0042' } : { ok: true };
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
};

window.eval(read('frontend/vendor/react.production.min.js'));
window.eval(read('frontend/vendor/react-dom.production.min.js'));
window.eval(read('frontend/app.js'));

const $ = (sel) => window.document.querySelector(sel);
const $$ = (sel) => [...window.document.querySelectorAll(sel)];
const byText = (sel, txt) => $$(sel).find((el) => el.textContent.includes(txt));
const click = (el) => el.dispatchEvent(new window.Event('click', { bubbles: true }));
const setVal = (el, v) => {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement : window.HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
};
const tick = () => new Promise((r) => setTimeout(r, 30));
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1); } console.log('ok —', msg); };

(async () => {
  await tick();
  assert(byText('.ttl', 'Leave a message'), 'landing renders with both actions');
  assert(byText('div', 'The Mackey House'), 'house identity renders');

  // ---------- Flow A ----------
  click(byText('button', 'Leave a message'));
  await tick();
  assert(byText('h1', 'Drop us a note'), 'message flow opens');
  setVal($('#m-msg'), 'Your gate was open, closed it for you.');
  setVal($('#m-name'), 'Smoke Tester');
  // min-time check: app was just mounted; backdate it is impossible from here,
  // so wait past the 3s gate.
  await new Promise((r) => setTimeout(r, 3100));
  click(byText('button', 'Send message'));
  await tick(); await tick();
  assert(byText('h1', 'Delivered.'), 'message confirmation renders');
  const m = calls.find((c) => c.url === '/api/message');
  assert(m, 'message POSTed to /api/message');
  assert(m.fields.recipient === 'The household', 'recipient label sent');
  assert(m.fields.sender_name === 'Smoke Tester', 'sender_name sent');
  assert(m.fields.property === '85142/22752-s-226-th-pl', 'property id sent on message');
  assert(m.fields.website === '', 'honeypot empty');
  assert(Number(m.fields.t0) > 0, 't0 token sent');

  // ---------- Flow B ----------
  click(byText('button', 'Back to the front door'));
  await tick();
  click(byText('button', 'Make an offer'));
  await tick();
  assert(byText('h1', 'Who you are'), 'offer step 1 renders');
  setVal($('#o-name'), 'Vendor Vic');
  setVal($('#o-phone'), '480-555-0142');
  click(byText('button', 'Continue'));
  await tick();
  assert(byText('h1', 'What you’re offering'), 'offer step 2 renders');
  const sel = $('#o-cat');
  Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, 'HVAC');
  sel.dispatchEvent(new window.Event('change', { bubbles: true }));
  setVal($('#o-desc'), 'Two-system tune-up before summer, includes coil cleaning.');
  click(byText('button.fd-pill', 'Recurring'));
  await tick(); // flush state before Continue reads it
  click(byText('button', 'Continue'));
  await tick();
  assert(byText('h1', 'Details that help'), 'offer step 3 renders');
  // open optional details and confirm ROC field appears for HVAC
  click(byText('button', 'Add supporting details'));
  await tick();
  assert(byText('label', 'AZ ROC license'), 'ROC field shown for contracting trade');
  setVal($('#o-roc'), 'ROC 123456');
  click(byText('span', 'I understand this household stores my submission').closest('label'));
  await tick();
  click(byText('button', 'Submit offer'));
  await tick(); await tick();
  assert(byText('h1', 'Offer received'), 'offer confirmation renders');
  assert(byText('strong', 'QC-0042'), 'server-issued reference displayed');
  const p = calls.find((c) => c.url === '/api/proposal');
  assert(p, 'proposal POSTed to /api/proposal');
  assert(p.fields.vendor_name === 'Vendor Vic', 'vendor_name sent');
  assert(p.fields.category === 'HVAC', 'category sent');
  assert(p.fields.property === '85142/22752-s-226-th-pl', 'property id sent on proposal');
  assert(p.fields.engagement_type === 'recurring', 'engagement display mapped to API value');
  assert(p.fields.roc_license === 'ROC 123456', 'roc_license sent');
  assert(p.fields.consent === 'yes', 'consent sent');
  assert(p.fields.website === '', 'honeypot empty');

  console.log('\nAll smoke tests passed.');

  // ---------- Unknown address → NotConfigured (property routing) ----------
  const dom2 = new JSDOM(`<!DOCTYPE html><html><body><div id="root"></div></body></html>`, {
    runScripts: 'outside-only',
    url: 'https://sabia.casa/ds/99999/not-a-real-house',
    pretendToBeVisual: true,
  });
  const w2 = dom2.window;
  w2.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
  w2.eval(read('frontend/vendor/react.production.min.js'));
  w2.eval(read('frontend/vendor/react-dom.production.min.js'));
  w2.eval(read('frontend/app.js'));
  await new Promise((r) => setTimeout(r, 30));
  const body2 = w2.document.body.textContent;
  assert(/isn.t set up yet/.test(body2), 'unknown address shows NotConfigured notice');
  assert(!/Leave a message/.test(body2), 'unknown address does NOT render the doorstep');

  console.log('All property-routing checks passed.');
})().catch((e) => { console.error('FAIL (exception):', e); process.exit(1); });
