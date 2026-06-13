-- Front Door Page — D1 schema
-- Field names intentionally match the Smart House OS Layer 1 vendor/contractor schema
-- so rows can be imported into the inventory database with no remapping.

CREATE TABLE IF NOT EXISTS proposals (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ref             TEXT,                          -- public reference, e.g. QC-0142
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  vendor_name     TEXT NOT NULL,
  company         TEXT,                          -- NULL/empty = independent
  category        TEXT NOT NULL,                 -- Layer 1 home-systems taxonomy
  description     TEXT NOT NULL,
  engagement_type TEXT NOT NULL,                 -- one-time | recurring | estimate
  price_note      TEXT,
  roc_license     TEXT,                          -- AZ ROC license #
  website         TEXT,
  referral_source TEXT,                          -- canvassing | referral | saw-something | other
  contact_phone   TEXT,
  contact_email   TEXT,
  photo_file_id   TEXT,                          -- Telegram file_id (v1 photo store)
  ip_hash         TEXT,
  user_agent      TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  recipient     TEXT NOT NULL,                   -- "The household" or adult first name
  message       TEXT NOT NULL,
  sender_name   TEXT NOT NULL,
  contact       TEXT,                            -- optional phone/email for replies
  photo_file_id TEXT,
  ip_hash       TEXT,
  user_agent    TEXT
);

CREATE INDEX IF NOT EXISTS idx_proposals_created ON proposals (created_at);
CREATE INDEX IF NOT EXISTS idx_proposals_ip      ON proposals (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_created  ON messages (created_at);
CREATE INDEX IF NOT EXISTS idx_messages_ip       ON messages (ip_hash, created_at);
