/* =====================================================================
   sabia — house-system database (Azure SQL Database, General Purpose serverless)

   This is the FOUNDATION of the Smart House OS Layer 1 inventory, not just
   the doorstep page's storage. The doorstep tables live in the [doorstep]
   schema; the inventory tables (systems, vendors, appliances, maintenance,
   work records, warranties) will land in an [inventory] schema later and
   relate back to these.

   Field names in [doorstep].[proposals] deliberately match the planned
   Layer 1 vendor/contractor schema, so a proposal promotes into an
   inventory.vendors row with no remapping. See the FORWARD NOTES at the end.

   Run once against a fresh database:
     sqlcmd -S <server>.database.windows.net -d sabia -G -i schema.sql
   (-G = Microsoft Entra auth; use -U/-P for SQL auth.)
   ===================================================================== */

IF SCHEMA_ID('doorstep') IS NULL EXEC('CREATE SCHEMA doorstep');
GO

/* ---------- Vendor proposals (Flow B) -------------------------------- */
IF OBJECT_ID('doorstep.proposals', 'U') IS NULL
CREATE TABLE doorstep.proposals (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    ref             NVARCHAR(20)    NULL,                       -- public reference, e.g. QC-0142
    created_at      DATETIME2(0)    NOT NULL DEFAULT SYSUTCDATETIME(),
    vendor_name     NVARCHAR(80)    NOT NULL,
    company         NVARCHAR(120)   NULL,                       -- NULL = independent
    category        NVARCHAR(60)    NOT NULL,                   -- Layer 1 home-systems taxonomy
    description     NVARCHAR(MAX)   NOT NULL,
    engagement_type NVARCHAR(20)    NOT NULL,                   -- one-time | recurring | estimate
    price_note      NVARCHAR(120)   NULL,
    roc_license     NVARCHAR(20)    NULL,                       -- AZ ROC license #
    website         NVARCHAR(200)   NULL,
    referral_source NVARCHAR(20)    NULL,                       -- canvassing | referral | saw-something | other
    contact_phone   NVARCHAR(40)    NULL,
    contact_email   NVARCHAR(120)   NULL,
    photo_file_id   NVARCHAR(200)   NULL,                       -- Telegram file_id (v1 photo store)
    property        NVARCHAR(120)   NULL,                       -- "{zip}/{slug}" the doorstep served
    extra           NVARCHAR(MAX)   NULL,                       -- reserved: JSON for semi-structured fields
    ip_hash         CHAR(32)        NULL,
    user_agent      NVARCHAR(250)   NULL
);
GO

/* ---------- Visitor messages (Flow A) -------------------------------- */
IF OBJECT_ID('doorstep.messages', 'U') IS NULL
CREATE TABLE doorstep.messages (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    created_at    DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME(),
    recipient     NVARCHAR(40)  NOT NULL,                       -- "The household" or an adult first name
    message       NVARCHAR(MAX) NOT NULL,
    sender_name   NVARCHAR(80)  NOT NULL,
    contact       NVARCHAR(120) NULL,                           -- optional phone/email for replies
    photo_file_id NVARCHAR(200) NULL,
    property      NVARCHAR(120) NULL,                           -- "{zip}/{slug}" the doorstep served
    ip_hash       CHAR(32)      NULL,
    user_agent    NVARCHAR(250) NULL
);
GO

/* ---------- Indexes (rate-limit lookups + chronological review) ------ */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_proposals_created')
    CREATE INDEX ix_proposals_created ON doorstep.proposals (created_at DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_proposals_ip')
    CREATE INDEX ix_proposals_ip ON doorstep.proposals (ip_hash, created_at);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_messages_created')
    CREATE INDEX ix_messages_created ON doorstep.messages (created_at DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_messages_ip')
    CREATE INDEX ix_messages_ip ON doorstep.messages (ip_hash, created_at);
GO

/* ---------- Site-level: waitlist (root sabia.casa "notify me") -------- */
IF SCHEMA_ID('site') IS NULL EXEC('CREATE SCHEMA site');
GO

IF OBJECT_ID('site.waitlist', 'U') IS NULL
CREATE TABLE site.waitlist (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    created_at  DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME(),
    email       NVARCHAR(254) NOT NULL UNIQUE,
    ip_hash     CHAR(32)      NULL,
    user_agent  NVARCHAR(250) NULL
);
GO

/* =====================================================================
   FORWARD NOTES — the inventory layer (build next, NOT now)

   When the inventory work starts, add an [inventory] schema. Sketch of the
   first relationships so today's field naming stays aligned:

     inventory.systems        (electrical, plumbing, hvac, solar, irrigation…)
     inventory.appliances     (specs + consumables; extra = JSON for varied metadata)
     inventory.vendors        (identity, licensing/ROC, ratings) ← promoted from
                               doorstep.proposals; add proposals.vendor_id FK then
     inventory.maintenance    (schedule/frequency) → FK to systems + vendors
     inventory.work_records   (vendor × system, dates, labor-warranty) → FKs

   The [extra] NVARCHAR(MAX) columns hold JSON for the genuinely
   variable-shape data, so the relational core stays clean while still
   absorbing irregular fields — the hybrid that made SQL the right pick
   over a document store for a single rich home.
   ===================================================================== */
