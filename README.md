# Front Door Page — sabia.casa

The designed frontend wired to an **Azure-native** backend: Azure Static Web Apps
serves the page and hosts the API as managed Azure Functions (v4); **Azure SQL
Database (serverless)** stores submissions; Telegram notifies Mike and Tanya.
Deploys from GitHub via Actions — the same pattern as prior projects. Runs on the
personal-subscription VS Enterprise dev/test credit (PAM-confirmed dev/test use).

```
front-door-page/
├── staticwebapp.config.json     SWA routing, Node 20 API runtime, security headers
├── .github/workflows/           GitHub Actions → Azure SWA deploy
├── frontend/                    DEPLOYED page (built — don't hand-edit)
│   ├── index.html  app.css  app.js  vendor/   (React 18 served locally)
├── frontend-src/                SOURCE (design JSX + integration files + build.sh)
├── api/                         Azure Functions v4 (managed functions)
│   ├── host.json  package.json
│   └── src/
│       ├── functions/           message.js, proposal.js  (HTTP triggers)
│       └── shared/              db.js, validate.js, notify.js, config.js
├── database/
│   ├── schema.sql               Azure SQL (T-SQL) — [doorstep] schema; [inventory] later
│   └── sample-queries.sql       review/export helpers
├── sign/Front_Door_Board.html   the designed door sign — QR → sabia.casa
├── api-test.js                  backend logic tests (mocked DB + fetch) — 22 checks
├── smoke-test.js                frontend flow test (jsdom) — both flows end to end
└── archive/cloudflare/          the original Worker + wrangler.toml (non-Azure fallback)
```

## Why Azure SQL serverless (the database decision)

The near-term roadmap is the Layer 1 house inventory — systems, vendors,
maintenance, work records, warranties, contractors — which is an intensely
*relational* domain (work record → vendor × system; maintenance item → system +
approved contractor; proposals → vendor records). With multi-home / multi-region
explicitly parked, Cosmos's global-distribution advantage doesn't apply, while its
document model would fight a rich relational schema. Azure SQL is the T-SQL-native
fit, the doorstep schema ports almost verbatim, and **native JSON columns** (the
`extra` fields) absorb the semi-structured edges — relational core plus document
flexibility in one store. The `doorstep.proposals` row is the seed of the future
`inventory.vendors` table; see the forward notes in `database/schema.sql`.

**Config:** General Purpose, **serverless**, min 0.5 vCore, auto-pause ON (1 h).
The pool (`api/src/shared/db.js`) uses `min: 0` connections so the DB can pause
when idle and stop drawing credit; the only cost is a ~2–4 s resume on the first
hit after a pause, which on this page only ever lands on a form submit (invisible).

## ⚠️ Before deploying: the fact sheet is SAMPLE data

`frontend-src/app-data.jsx` ships the design's **sample** house facts (3,180 sq ft,
2016, pool, 2 AC units…). **Replace every value with real data, then rebuild** —
vendors quote against whatever is published. Also rewrite the greeting in your own
voice (`GREETINGS`, tone selected in `app-main.prod.jsx`). Privacy rules are already
encoded (recipients = household + adults only; babysitting excluded; nothing
security-relevant in the facts) — keep them that way.

## Deploy (~45 minutes)

**Prereqs:** the personal Azure subscription (VS Enterprise credit), GitHub repo,
Azure CLI (`az`), Telegram. All resources go in one resource group, e.g. `sabia-rg`.

**1 · Telegram bot (5 min)**
1. **@BotFather** → `/newbot` → copy the token.
2. New group "Front Door", add the bot + Tanya.
3. Send a message there, open `https://api.telegram.org/bot<TOKEN>/getUpdates`,
   copy the group `chat.id` (negative number).

**2 · Azure SQL (serverless)**
```bash
az group create -n sabia-rg -l westus3

az sql server create -n sabia-sql -g sabia-rg -l westus3 \
  --admin-user sabiaadmin --admin-password '<STRONG_PASSWORD>'

# Serverless GP, auto-pause after 60 min idle
az sql db create -g sabia-rg -s sabia-sql -n sabia \
  --edition GeneralPurpose --compute-model Serverless \
  --family Gen5 --capacity 1 --auto-pause-delay 60 \
  --backup-storage-redundancy Local

# Allow Azure services (SWA functions) to reach the server
az sql server firewall-rule create -g sabia-rg -s sabia-sql \
  -n AllowAzure --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0

# Create the schema (add your client IP as a temp firewall rule first, or use the portal Query editor)
sqlcmd -S sabia-sql.database.windows.net -d sabia -U sabiaadmin -P '<STRONG_PASSWORD>' -i database/schema.sql
```

**3 · Static Web App** — easiest via the portal so it wires up GitHub for you:
Azure portal → Create **Static Web App** → resource group `sabia-rg`, plan
**Standard** (SLA + room to grow; trivially within credit) → **Deployment: GitHub**,
pick this repo/branch → Build details: **app location** `frontend`, **api location**
`api`, **output location** blank. Azure commits the Actions workflow and does the
first deploy. (CLI alternative: `az staticwebapp create … --login-with-github`.)

**4 · App Settings** (the functions read these as env vars):
Portal → your Static Web App → **Environment variables** (or `az staticwebapp
appsettings set`):
```
SQL_CONNECTION_STRING = Server=tcp:sabia-sql.database.windows.net,1433;Database=sabia;User ID=sabiaadmin;Password=<…>;Encrypt=true;
TELEGRAM_BOT_TOKEN    = <from BotFather>
TELEGRAM_CHAT_ID      = <group chat id>
IP_SALT               = <any random string>
HA_WEBHOOK_URL        = <optional — Home Assistant webhook>
```
> Prefer a Managed Identity + `Authentication=Active Directory Managed Identity`
> in the connection string over a SQL password once you're past first light.

**5 · Custom domain — sabia.casa**
Portal → Static Web App → **Custom domains** → add `sabia.casa`, create the CNAME/
TXT it asks for at your registrar. Free managed cert. The QR encodes
`https://sabia.casa`, so the domain must resolve before the sign goes up.

**6 · The sign** — open `sign/Front_Door_Board.html`, confirm the QR renders,
print at 100% on letter, laminate/UV stock, mount by the doorbell.
**Scan the printed sign from 3 ft in sunlight before mounting.**

**7 · End-to-end** — push to `main` (Actions deploys), scan → send a test message
and proposal → both land in Telegram within seconds. Verify storage with
`database/sample-queries.sql` (portal Query editor).

## Local development

```bash
npm install -g @azure/static-web-apps-cli azure-functions-core-tools@4
cd api && npm install && cd ..
# point the functions at a dev DB via api/local.settings.json (gitignored), then:
swa start frontend --api-location api
```
`swa start` serves the static app and the functions together at `localhost:4280`
with the same `/api/*` routing as production.

## Tests

```bash
node api-test.js     # backend logic: bot signals, coercion, IP hash, ref, Telegram (mocked)
node smoke-test.js   # frontend: walks both flows in jsdom against the API contract
```

## What changed from the Cloudflare build

Frontend is **identical** — the design integration is fully preserved; only the
backend moved. The Worker became two Azure Functions sharing `db/validate/notify/
config` modules (structured so inventory CRUD endpoints drop in later as more
functions). D1/SQLite → Azure SQL (`database/schema.sql`). `wrangler.toml` →
`staticwebapp.config.json` + the Actions workflow. The Cloudflare version is kept
under `archive/cloudflare/` as a non-Azure fallback.

## API contract (unchanged)

`POST /api/message` — `recipient` (household/Mike/Tanya), `message` (≤500),
`sender_name` (≤80), `contact?`, `photo?` (image ≤5 MB), `t0`, honeypot `website`
(empty). → `{ok:true}`

`POST /api/proposal` — `vendor_name`, `category` (taxonomy), `description` (10–600),
`engagement_type` (`one-time|recurring|estimate`), `consent=yes`, one of
`contact_phone`/`contact_email`; optional `company`, `price_note`, `roc_license`,
`website_url`, `referral_source`, `photo`; plus `t0` + honeypot. → `{ok:true,
ref:"QC-0042"}` (ref = SQL row id). Anti-abuse on both: honeypot, ≥3 s on page,
5/IP/hour. Submissions persist in SQL even if Telegram is down.

## Next: the inventory layer (not built)

Add an `[inventory]` schema (`schema.sql` sketches the first tables and FKs) and
inventory CRUD as new functions under `api/src/functions/`, reusing the shared
modules. The doorstep tables are the foundation; everything else relates back.
