/* Handy review/export queries for the doorstep tables. */

-- Recent proposals (newest first)
SELECT ref, vendor_name, company, category, engagement_type, created_at
FROM doorstep.proposals ORDER BY id DESC;

-- Recent visitor messages
SELECT recipient, sender_name, contact, created_at
FROM doorstep.messages ORDER BY id DESC;

-- Export proposals as JSON (column names already match the Layer 1 vendor schema)
SELECT * FROM doorstep.proposals FOR JSON PATH;
