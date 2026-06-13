// app-data.jsx — content + schema for the Mackey House doorstep page.
// Field names mirror the (future) Layer 1 inventory schema so this block can be
// generated from the single source of truth later. Values are SAMPLE values.

const HOUSE = {
  name: 'The Mackey House',
  place: 'Queen Creek, AZ',
  monogram: 'M',
  signature: 'This home logs and reviews every offer it receives.',
};

// Greeting tone variants (Mike personalizes the real copy during build).
const GREETINGS = {
  warm: "Hi — welcome to our doorstep. If we didn’t answer, we’re around but occupied. Leave a note and we’ll get back to you. Here with an offer for the house? Even better — tell us about it below. We read everything.",
  brief: "Welcome. No one came to the door? Leave us a note. Got an offer for the house? Send it below — every one gets read.",
  playful: "You found the front door of a house that actually listens. Knock didn’t land? Drop a note. Selling something good? We’re all ears — the house keeps the receipts.",
};

// Flow A recipients — household + ADULT first names only. Never list children.
const RECIPIENTS = [
  { id: 'household', label: 'The household', sub: 'Goes to the whole family' },
  { id: 'mike', label: 'Mike', sub: 'Head of household' },
  { id: 'tanya', label: 'Tanya', sub: 'Head of household' },
];

// House Fact Sheet — published Layer 1 subset. Public-record-equivalent or
// directly quote-enabling ONLY. Nothing security-relevant.
const FACTS = [
  { field: 'year_built',   label: 'Year built',        value: '2016' },
  { field: 'sqft',         label: 'Square footage',    value: '3,180 sq ft' },
  { field: 'stories',      label: 'Stories',           value: '2' },
  { field: 'bed_bath',     label: 'Bed / bath',        value: '4 bd · 3 ba' },
  { field: 'garage_spaces',label: 'Garage',            value: '3-car' },
  { field: 'lot_size',     label: 'Lot / backyard',    value: '0.28 acre · ~2,400 sq ft yard' },
  { field: 'pool_spa',     label: 'Pool / spa',        value: 'Pool, no spa' },
  { field: 'ac_units',     label: 'AC units',          value: '2 split systems (~5 & 3 ton)' },
  { field: 'water_heater', label: 'Water heater',      value: '1 tank, 50 gal' },
  { field: 'roof_type',    label: 'Roof',              value: 'Concrete tile' },
  { field: 'irrigation',   label: 'Irrigation',        value: 'Drip + sprinkler' },
  { field: 'solar',        label: 'Solar',             value: 'No' },
];

// What this house is looking for — standing, non-urgent interests.
// Curated for privacy: house-and-yard services only; nothing that reveals
// household composition or absence patterns. No names.
const NEEDS = [
  { label: 'Landscape maintenance', note: 'Open to better value than our current service' },
  { label: 'Irrigation repairs & improvements', note: 'Drip zones, a few dead heads' },
  { label: 'Garage organization', note: 'Storage build-out, overhead racks' },
  { label: 'Car detailing', note: 'Recurring, in-driveway preferred' },
  { label: 'Youth running coach', note: 'Distance / form coaching' },
];

// Flow B category taxonomy — mirrors the Layer 1 home-systems schema.
const CATEGORIES = [
  'Landscaping & Irrigation',
  'Pest Control',
  'HVAC',
  'Plumbing',
  'Electrical',
  'Solar & Energy',
  'Roofing',
  'Cleaning (windows / house / exterior)',
  'Pool & Spa',
  'Security & Smart Home',
  'Internet / Telecom',
  'Auto (detailing, etc.)',
  'Family services (tutoring, babysitting, coaching)',
  'Other',
];

// Categories that are AZ contracting trades → reveal the ROC license # field.
const ROC_TRADES = new Set([
  'Landscaping & Irrigation', 'HVAC', 'Plumbing', 'Electrical',
  'Solar & Energy', 'Roofing', 'Pool & Spa',
]);

const ENGAGEMENTS = ['One-time', 'Recurring', 'Free estimate visit'];

const REFERRALS = ['Canvassing route', 'Referral', 'Saw something', 'Other'];

Object.assign(window, {
  HOUSE, GREETINGS, RECIPIENTS, FACTS, NEEDS, CATEGORIES, ROC_TRADES, ENGAGEMENTS, REFERRALS,
});
