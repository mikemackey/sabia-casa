// app-api.jsx — [integration] connects the designed flows to the real backend.
// Endpoints + field names per the Worker API contract (see README).
// This file is the only place that knows about the network.

const PAGE_T0 = Date.now(); // minimum-time-on-page token, captured at load

// Display strings (app-data.jsx) → API enum values (worker.js)
const ENGAGEMENT_VALUES = {
  'One-time': 'one-time',
  'Recurring': 'recurring',
  'Free estimate visit': 'estimate',
};
const REFERRAL_VALUES = {
  'Canvassing route': 'canvassing',
  'Referral': 'referral',
  'Saw something': 'saw-something',
  'Other': 'other',
};

async function postForm(endpoint, fields, photoFile) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== null && v !== undefined) fd.append(k, v);
  }
  if (photoFile instanceof File) fd.append('photo', photoFile, photoFile.name);
  fd.append('t0', String(PAGE_T0));
  try {
    const res = await fetch(endpoint, { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'Couldn’t send. Check your connection and try again.' };
    }
    return data;
  } catch {
    return { ok: false, error: 'Couldn’t send. Check your connection and try again.' };
  }
}

// Flow A — visitor message
function submitMessage({ recipientLabel, message, senderName, contact, photo, hp }) {
  return postForm('/api/message', {
    recipient: recipientLabel,
    message,
    sender_name: senderName,
    contact: contact || '',
    property: window.PROPERTY_ID || '', // which house this doorstep serves
    website: hp || '', // honeypot — must stay empty for humans
  }, photo);
}

// Flow B — vendor proposal
function submitProposal(p) {
  return postForm('/api/proposal', {
    vendor_name: p.name,
    company: p.independent ? '' : (p.company || ''),
    contact_phone: p.phone || '',
    contact_email: p.email || '',
    category: p.category,
    description: p.desc,
    engagement_type: ENGAGEMENT_VALUES[p.engagement] || '',
    price_note: p.price || '',
    roc_license: p.showRoc ? (p.roc || '') : '',
    website_url: p.web || '',
    referral_source: p.referral ? (REFERRAL_VALUES[p.referral] || 'other') : '',
    consent: 'yes',
    property: window.PROPERTY_ID || '', // which house this doorstep serves
    website: p.hp || '', // honeypot
  }, p.photo);
}

Object.assign(window, { submitMessage, submitProposal });
