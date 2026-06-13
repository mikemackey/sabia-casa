// shared/db.js — Azure SQL access via a lazily-initialised mssql pool.
//
// SERVERLESS AUTO-PAUSE NOTE: the pool is configured with min:0 and a short
// idle timeout so connections drain when traffic stops, letting the serverless
// database AUTO-PAUSE (and stop drawing the VS credit). An always-open pool
// would keep the DB awake 24/7 — the exact "leaving connections open prevents
// auto-pause" trap. The cost is a ~2–4s resume on the first request after a
// pause; on this page that only ever lands on a form submit, so it's invisible.

const sql = require("mssql");

let poolPromise = null;

function getConfig() {
  // Preferred: full connection string in SQL_CONNECTION_STRING (App Setting).
  // mssql parses the standard ADO.NET / ODBC-style string.
  const conn = process.env.SQL_CONNECTION_STRING;
  const base = {
    pool: { min: 0, max: 4, idleTimeoutMillis: 30000 },
    options: { encrypt: true, trustServerCertificate: false },
    // First request after auto-pause must outlast the resume.
    connectionTimeout: 30000,
    requestTimeout: 30000,
  };
  if (conn) return { ...base, connectionString: conn };

  // Fallback: discrete settings.
  return {
    ...base,
    server: process.env.SQL_SERVER,        // e.g. sabia-sql.database.windows.net
    database: process.env.SQL_DATABASE || "sabia",
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
  };
}

async function getPool() {
  if (!poolPromise) {
    const cfg = getConfig();
    const pool = cfg.connectionString
      ? new sql.ConnectionPool(cfg.connectionString)
      : new sql.ConnectionPool(cfg);
    // Reset on hard failure so the next invocation can retry instead of
    // reusing a poisoned promise.
    pool.on("error", () => { poolPromise = null; });
    poolPromise = pool.connect().catch((err) => { poolPromise = null; throw err; });
  }
  return poolPromise;
}

// Count this IP's submissions across both tables in the last hour (rate limit).
async function countRecentByIp(ipHash) {
  const pool = await getPool();
  const r = await pool.request()
    .input("ip", sql.Char(32), ipHash)
    .query(`
      SELECT
        (SELECT COUNT(*) FROM doorstep.proposals
           WHERE ip_hash = @ip AND created_at > DATEADD(hour, -1, SYSUTCDATETIME())) +
        (SELECT COUNT(*) FROM doorstep.messages
           WHERE ip_hash = @ip AND created_at > DATEADD(hour, -1, SYSUTCDATETIME())) AS n;`);
  return r.recordset[0].n;
}

async function insertMessage(m) {
  const pool = await getPool();
  await pool.request()
    .input("recipient", sql.NVarChar(40), m.recipient)
    .input("message", sql.NVarChar(sql.MAX), m.message)
    .input("sender_name", sql.NVarChar(80), m.sender_name)
    .input("contact", sql.NVarChar(120), m.contact || null)
    .input("photo_file_id", sql.NVarChar(200), m.photo_file_id || null)
    .input("ip_hash", sql.Char(32), m.ip_hash)
    .input("user_agent", sql.NVarChar(250), m.user_agent || null)
    .query(`INSERT INTO doorstep.messages
      (recipient, message, sender_name, contact, photo_file_id, ip_hash, user_agent)
      VALUES (@recipient, @message, @sender_name, @contact, @photo_file_id, @ip_hash, @user_agent);`);
}

// Inserts a proposal and returns its new id (used to build the QC-#### ref).
async function insertProposal(p) {
  const pool = await getPool();
  const r = await pool.request()
    .input("vendor_name", sql.NVarChar(80), p.vendor_name)
    .input("company", sql.NVarChar(120), p.company || null)
    .input("category", sql.NVarChar(60), p.category)
    .input("description", sql.NVarChar(sql.MAX), p.description)
    .input("engagement_type", sql.NVarChar(20), p.engagement_type)
    .input("price_note", sql.NVarChar(120), p.price_note || null)
    .input("roc_license", sql.NVarChar(20), p.roc_license || null)
    .input("website", sql.NVarChar(200), p.website || null)
    .input("referral_source", sql.NVarChar(20), p.referral_source || null)
    .input("contact_phone", sql.NVarChar(40), p.contact_phone || null)
    .input("contact_email", sql.NVarChar(120), p.contact_email || null)
    .input("ip_hash", sql.Char(32), p.ip_hash)
    .input("user_agent", sql.NVarChar(250), p.user_agent || null)
    .query(`INSERT INTO doorstep.proposals
      (vendor_name, company, category, description, engagement_type, price_note,
       roc_license, website, referral_source, contact_phone, contact_email,
       ip_hash, user_agent)
      OUTPUT INSERTED.id
      VALUES (@vendor_name, @company, @category, @description, @engagement_type,
       @price_note, @roc_license, @website, @referral_source, @contact_phone,
       @contact_email, @ip_hash, @user_agent);`);
  return r.recordset[0].id;
}

// Attach the public ref + photo file_id once known (after insert / Telegram send).
async function finalizeProposal(id, ref, photoFileId) {
  const pool = await getPool();
  await pool.request()
    .input("id", sql.Int, id)
    .input("ref", sql.NVarChar(20), ref)
    .input("photo_file_id", sql.NVarChar(200), photoFileId || null)
    .query(`UPDATE doorstep.proposals SET ref = @ref, photo_file_id = @photo_file_id WHERE id = @id;`);
}

module.exports = { getPool, countRecentByIp, insertMessage, insertProposal, finalizeProposal };
