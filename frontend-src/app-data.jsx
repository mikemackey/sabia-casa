// app-data.jsx — content + schema, now PROPERTY-KEYED.
//
// The doorstep is served at /ds/{zip}/{slug}. This file reads that path, selects
// the matching property from PROPERTIES, and exposes its content as the globals
// the rest of the app already consumes (HOUSE, FACTS, NEEDS, RECIPIENTS, GREETING).
// Address normalization/encoding is intentionally NOT implemented yet — we look up
// the raw "{zip}/{slug}" key and register one property. Mike's rules formalize this
// later; nothing here pre-empts them.
//
// Field names mirror the (future) Layer 1 inventory schema. FACTS values are SAMPLE.

// ---- SITE-GLOBAL config (shared by every property) ----------------------
const GREETINGS = {
  warm: "Hi — welcome to our doorstep. If we didn’t answer, we’re around but occupied. Leave a note and we’ll get back to you. Here with an offer for the house? Even better — tell us about it below. We read everything.",
  brief: "Welcome. No one came to the door? Leave us a note. Got an offer for the house? Send it below — every one gets read.",
  playful: "You found the front door of a house that actually listens. Knock didn’t land? Drop a note. Selling something good? We’re all ears — the house keeps the receipts.",
};

const CATEGORIES = [
  'Landscaping & Irrigation', 'Pest Control', 'HVAC', 'Plumbing', 'Electrical',
  'Solar & Energy', 'Roofing', 'Cleaning (windows / house / exterior)',
  'Pool & Spa', 'Security & Smart Home', 'Internet / Telecom',
  'Auto (detailing, etc.)', 'Family services (tutoring, babysitting, coaching)',
  'Other',
];
const ROC_TRADES = new Set([
  'Landscaping & Irrigation', 'HVAC', 'Plumbing', 'Electrical',
  'Solar & Energy', 'Roofing', 'Pool & Spa',
]);
const ENGAGEMENTS = ['One-time', 'Recurring', 'Free estimate visit'];
const REFERRALS = ['Canvassing route', 'Referral', 'Saw something', 'Other'];

// ---- PROPERTY REGISTRY (keyed by "{zip}/{slug}") ------------------------
// Add a property by adding an entry. Today: one house.
const PROPERTIES = {
  '85142/22752-s-226-th-pl': {
    greetingTone: 'warm',          // which GREETINGS variant this property uses
    house: {
      name: 'The Mackey House',
      place: 'Queen Creek, AZ',
      monogram: 'M',
      signature: 'This home logs and reviews every offer it receives.',
    },
    // Flow A recipients — household + ADULT first names only. Never list children.
    recipients: [
      { id: 'household', label: 'The household', sub: 'Goes to the whole family' },
      { id: 'mike', label: 'Mike', sub: 'Head of household' },
      { id: 'tanya', label: 'Tanya', sub: 'Head of household' },
    ],
    // Fact sheet — public-record-equivalent or quote-enabling ONLY; nothing
    // security-relevant. SAMPLE values — replace with real ones before sharing.
    facts: [
      { field: 'year_built',    label: 'Year built',     value: '2016' },
      { field: 'sqft',          label: 'Square footage', value: '3,180 sq ft' },
      { field: 'stories',       label: 'Stories',        value: '2' },
      { field: 'bed_bath',      label: 'Bed / bath',     value: '4 bd · 3 ba' },
      { field: 'garage_spaces', label: 'Garage',         value: '3-car' },
      { field: 'lot_size',      label: 'Lot / backyard', value: '0.28 acre · ~2,400 sq ft yard' },
      { field: 'pool_spa',      label: 'Pool / spa',     value: 'Pool, no spa' },
      { field: 'ac_units',      label: 'AC units',       value: '2 split systems (~5 & 3 ton)' },
      { field: 'water_heater',  label: 'Water heater',   value: '1 tank, 50 gal' },
      { field: 'roof_type',     label: 'Roof',           value: 'Concrete tile' },
      { field: 'irrigation',    label: 'Irrigation',     value: 'Drip + sprinkler' },
      { field: 'solar',         label: 'Solar',          value: 'No' },
    ],
    // Standing, non-urgent interests. Privacy-curated: house-and-yard only,
    // nothing that reveals household composition or absence patterns. No names.
    needs: [
      { label: 'Landscape maintenance', note: 'Open to better value than our current service' },
      { label: 'Irrigation repairs & improvements', note: 'Drip zones, a few dead heads' },
      { label: 'Garage organization', note: 'Storage build-out, overhead racks' },
      { label: 'Car detailing', note: 'Recurring, in-driveway preferred' },
      { label: 'Youth running coach', note: 'Distance / form coaching' },
    ],
  },
};

// ---- Path → property resolution -----------------------------------------
// "/ds/85142/22752-s-226-th-pl" → { id, zip, slug }.  null if not a /ds/ path.
function parsePropertyPath(pathname) {
  const m = (pathname || '').match(/^\/ds\/([^/]+)\/([^/]+)\/?$/i);
  if (!m) return null;
  const zip = decodeURIComponent(m[1]).toLowerCase();
  const slug = decodeURIComponent(m[2]).toLowerCase();
  return { id: `${zip}/${slug}`, zip, slug };
}

// Resolve the active property at load time and publish the globals the app uses.
const ACTIVE_PATH = parsePropertyPath(window.location.pathname);
const ACTIVE = ACTIVE_PATH ? PROPERTIES[ACTIVE_PATH.id] || null : null;

const HOUSE = ACTIVE ? ACTIVE.house : null;
const FACTS = ACTIVE ? ACTIVE.facts : [];
const NEEDS = ACTIVE ? ACTIVE.needs : [];
const RECIPIENTS = ACTIVE ? ACTIVE.recipients : [];
const GREETING = ACTIVE ? (GREETINGS[ACTIVE.greetingTone] || GREETINGS.warm) : '';

Object.assign(window, {
  PROPERTIES, parsePropertyPath,
  PROPERTY: ACTIVE,                                   // null = unknown address
  PROPERTY_ID: ACTIVE_PATH ? ACTIVE_PATH.id : '',     // stored on submissions
  HOUSE, GREETING, GREETINGS, RECIPIENTS, FACTS, NEEDS,
  CATEGORIES, ROC_TRADES, ENGAGEMENTS, REFERRALS,
});
