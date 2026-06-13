// shared/config.js — allowlists + tunables. Keep CATEGORIES / RECIPIENTS in
// sync with the frontend HOUSE config (frontend-src/app-data.jsx).

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

const LIMITS = {
  MIN_TIME_ON_PAGE_MS: 3000,        // matches the client-side check in app-flow-*.jsx
  MAX_TOKEN_AGE_MS: 24 * 3600e3,
  RATE_LIMIT_PER_HOUR: 5,           // per IP, both flows combined
  MAX_PHOTO_BYTES: 5 * 1024 * 1024,
};

module.exports = { RECIPIENTS, CATEGORIES, ENGAGEMENTS, REFERRALS, LIMITS };
