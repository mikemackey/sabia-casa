/* =====================================================================
   Migration 001 — property column + site.waitlist
   Apply ONCE to the already-deployed `sabia` database (portal Query editor).
   Idempotent: safe to run more than once.
   ===================================================================== */

-- property identifier ("{zip}/{slug}") on doorstep submissions
IF COL_LENGTH('doorstep.proposals', 'property') IS NULL
    ALTER TABLE doorstep.proposals ADD property NVARCHAR(120) NULL;
GO
IF COL_LENGTH('doorstep.messages', 'property') IS NULL
    ALTER TABLE doorstep.messages ADD property NVARCHAR(120) NULL;
GO

-- site-level concerns (the root sabia.casa page)
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
