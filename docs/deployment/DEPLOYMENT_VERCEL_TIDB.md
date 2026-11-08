# Vidyalaya ERP — Production Deployment Guide (Vercel + TiDB Cloud)

| | |
|---|---|
| **Live site** | https://school-management-module-v3-0.vercel.app |
| **Hosting** | Vercel project `school-management-module-v3-0`, built from GitHub `errupamkumar/School-Management-Module-V3.0`, branch `main` |
| **Database** | TiDB Cloud Starter (MySQL-compatible), AWS `ap-southeast-1` (Singapore), database `vidyalaya` |
| **Set up on** | 8 November 2026 |
| **Demo sign-in** | School code `DEMO` · username `owner` · password `Demo@12345` (Super Admin) |

This guide records how the live site was connected to a production database, from an empty TiDB account to a working sign-in. Follow it to rebuild the setup from scratch, to move to another database, or to understand why something stopped working. It also covers the demo data that fills the dashboards, and the open items that still need attention.

> **No secrets in this document.** Connection strings, passwords and keys are shown as placeholders. The real values live only in Vercel (as sensitive variables) and in the account owner's password manager.

> This guide replaces the database part of [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md). That older guide describes PostgreSQL on Neon, which does not work with this codebase: the Prisma schema and several raw SQL queries are MySQL-specific.

---

## 1. Architecture at a glance

![Production architecture: users reach the Next.js app on Vercel over HTTPS; the app talks to TiDB Cloud in Singapore over TLS; GitHub pushes trigger builds; the developer laptop manages the schema and Vercel settings](images/01-architecture.svg)

| Part | Service | What it does |
|---|---|---|
| Web app and API | Vercel (serverless functions) | Runs the Next.js 16 app: public website, sign-in, every dashboard and `/api/*` route |
| Database | TiDB Cloud Starter | One MySQL-compatible database for every school; rows are separated by `schoolId` |
| Source code | GitHub, branch `main` | Every push to `main` triggers a new production build on Vercel |
| Settings | Vercel environment variables | The database address and the security keys, injected at build and run time |
| Admin tools | Prisma CLI and Vercel CLI on the developer laptop | Create tables, load demo data, change settings, redeploy |

Why TiDB Cloud: the app needs MySQL, Vercel runs many short-lived serverless functions that each open their own connections, and TiDB Cloud Starter is free to start, handles that connection pattern, and uses a publicly trusted TLS certificate, so no certificate file has to be uploaded to Vercel. Aiven or Railway MySQL would also work; only the SSL part of the connection string changes (see [Troubleshooting](#8-troubleshooting)).

---

## 2. What was broken

Signing in on the live site with the correct demo details always showed **“Invalid school code, username or password.”** The same details worked on the laptop.

![Before the fix the sign-in request reached a Prisma query that failed because DATABASE_URL was missing, and the form showed the generic message. After the fix Prisma reaches TiDB and a session is created.](images/02-root-cause.svg)

The cause was not the credentials. The Vercel project had **no `DATABASE_URL` at all**, so the first database query in the sign-in flow (the rate-limit check) failed, and the sign-in code reports every failure with the same generic message. The laptop worked because its `.env` points at the local MySQL server, which Vercel cannot reach.

How it was found, by calling the live API directly instead of the browser:

```bash
# A data endpoint returned 500 instead of 200
curl -s -o /dev/null -w '%{http_code}\n' https://school-management-module-v3-0.vercel.app/api/public/sso

# A scripted sign-in returned an error URL containing Prisma's own message:
#   "Environment variable not found: DATABASE_URL"
```

---

## 3. Step-by-step setup

![Seven steps: diagnose, create the TiDB cluster, build the connection string, create tables and load data, set Vercel variables, redeploy, verify](images/03-steps.svg)

### Step 1 — Diagnose

Covered in [section 2](#2-what-was-broken). The quick test for any “sign-in fails only in production” report is: does `/api/public/sso` return 200? If not, the database is unreachable or not configured.

### Step 2 — Create the TiDB Cloud cluster (account owner, in the browser)

1. Sign up at **tidbcloud.com**.
2. Create a cluster on the free **Starter** plan. This deployment uses **AWS, Singapore (ap-southeast-1)**. Pick the region closest to your users that the plan offers.
3. Wait until the cluster's status is **Active** on its Overview page.

What was chosen, as shown on the Overview page:

| Setting | Value |
|---|---|
| Plan | Starter (free; set a spending limit in the console if you want a hard cap) |
| Cloud provider and region | AWS · Singapore (ap-southeast-1) |
| Compatibility | MySQL compatible · TiDB v8.5 |
| High availability | Zonal |

### Step 3 — Build the connection string

1. On the cluster's Overview page, click **Connect** (top right).
2. Choose **Connect With: General** (or Prisma) and click **Generate Password**.
3. Copy the details. TiDB shows them as separate fields: `HOST`, `PORT`, `USERNAME`, `PASSWORD`, `DATABASE`, `CA`.

Put them together into one URL:

![The DATABASE_URL split into protocol, username, password, host, port, database, TLS setting and connection pool size](images/04-connection-string.svg)

```text
mysql://USERNAME:PASSWORD@HOST:4000/vidyalaya?sslaccept=strict&connection_limit=5
```

Points that matter:

- **Database name:** use `vidyalaya`, not the `sys` that the Connect dialog shows. `sys` is TiDB's system database. `prisma db push` creates `vidyalaya` on first run.
- **Password symbols:** if the password contains `@ # / : ? &` or spaces, URL-encode it (for example `@` becomes `%40`), or generate a new one.
- **`sslaccept=strict`** turns on TLS and verifies TiDB's certificate. TiDB Cloud requires TLS, and its certificate is publicly trusted, so no `CA` file is needed.
- **`connection_limit=5`** keeps each serverless function's connection pool small.

Keep the full string out of the repository and out of chat messages. In this deployment it was saved to a file in the owner's user folder and read by scripts without ever being printed.

### Step 4 — Create the tables and load the data

Run these from the project folder. The `DATABASE_URL` set here applies only to this terminal session, so the local `.env` and the laptop's MySQL are not touched.

**PowerShell (Windows):**

```powershell
$env:DATABASE_URL = "mysql://USERNAME:PASSWORD@HOST:4000/vidyalaya?sslaccept=strict&connection_limit=5"
npx prisma db push --skip-generate      # creates the database and all 110 tables
npx tsx prisma/seed.ts                  # demo platform admin + schools DEMO and GVS
npx tsx docs/tools/demo-kpi.ts          # extra demo data so every KPI shows numbers
Remove-Item Env:DATABASE_URL
```

**Git Bash / macOS / Linux:**

```bash
export DATABASE_URL='mysql://USERNAME:PASSWORD@HOST:4000/vidyalaya?sslaccept=strict&connection_limit=5'
npx prisma db push --skip-generate
npx tsx prisma/seed.ts
npx tsx docs/tools/demo-kpi.ts
unset DATABASE_URL
```

What happened in this deployment:

```text
Datasource "db": MySQL database "vidyalaya" at "gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000"
MySQL database vidyalaya created at gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000
Your database is now in sync with your Prisma schema. Done in 75.67s
```

Notes:

- `--skip-generate` is only needed while a local `npm run dev` is running: Windows locks Prisma's engine file. The generated client is already up to date from the last install.
- **The seed is slow over the internet.** It writes row by row (admissions, invoices, payments, timetable), and every write is a round trip from India to Singapore. It took **about 89 minutes** (5,356 s) here, compared with about a minute against a local MySQL server. It only has to run once. It refuses to run when `NODE_ENV=production` unless `SEED_ALLOW_DEMO=1` is also set.
- The seed skips a school that already exists, so running it twice does not duplicate data. To start over, drop and recreate the database (`npx prisma db push --force-reset --skip-generate`), which deletes everything in it.

### Step 5 — Set the Vercel environment variables

![What each of the four production variables powers, and what breaks when it is missing](images/05-env-vars.svg)

**From the terminal (what was done here):**

```bash
vercel login                                               # account owner approves in the browser
vercel link --yes --project school-management-module-v3-0  # connects this folder to the project
vercel env ls                                              # see what is already set
```

`vercel link` creates a `.vercel/` folder and adds `.vercel` and `.env*` to `.gitignore`. It may also create a `.env.local` holding a short-lived `VERCEL_OIDC_TOKEN`. That file is not needed by this app and was deleted. Next.js gives `.env.local` priority over `.env`, so check it never ends up overriding your local `DATABASE_URL`.

Generate the two secrets (Node is already installed with the project):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"   # NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # DATA_ENCRYPTION_KEY
```

Add each variable to **Production**. The CLI asks for the value, so it is not saved in your shell history:

```bash
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production          # https://school-management-module-v3-0.vercel.app
vercel env add DATA_ENCRYPTION_KEY production
```

To replace a value, remove it first: `vercel env rm NEXTAUTH_SECRET production --yes`.

**Or in the Vercel dashboard:** open the project → **Settings → Environment Variables** → add each key and value, choose the **Production** environment, mark it **Sensitive**, and save.

Points that matter:

- The project already had `NEXTAUTH_URL` and `NEXTAUTH_SECRET`, stored as sensitive, so their values could not be read back to check them. Nobody had ever signed in to the live site, so both were replaced for Production with known-good values. The Preview and Development copies were left as they were.
- **Sensitive variables cannot be viewed again**, by anyone. Before adding `NEXTAUTH_SECRET` and `DATA_ENCRYPTION_KEY`, keep a copy in a password manager. In this deployment they were also written to `C:\Users\<you>\vidyalaya-prod-secrets-BACKUP.txt`, which should be moved into a password manager and deleted.
- **Never change `DATA_ENCRYPTION_KEY`** once real data exists: anything encrypted with the old key becomes unreadable.

### Step 6 — Redeploy

New environment variables only take effect in a new deployment.

![A push to main builds and deploys automatically; vercel redeploy rebuilds the live commit with the current variables](images/06-deploy-pipeline.svg)

Find the deployment currently serving the domain, then rebuild exactly that one:

```bash
vercel inspect school-management-module-v3-0.vercel.app    # shows its url and id
vercel redeploy https://school-management-module-v3-0-<id>-<team>.vercel.app --target production
```

Result in this deployment:

```text
Redeploying project dpl_DKX3tuXjLbi9UJsnPxoLZCpnY4Jr
▲ Aliased         https://school-management-module-v3-0.vercel.app
✓ Ready in 2m
```

The rebuilt deployment came from commit `4825e89` on `main`, the same commit that was already live, so only the settings changed.

**Do not use `vercel --prod` from the laptop for this.** It uploads the local working folder, including uncommitted changes, instead of the commit on GitHub. In the dashboard the equivalent is **Deployments → ⋯ on the current one → Redeploy**.

From now on, every push to `main` builds and deploys automatically, and the variables stay in place.

### Step 7 — Verify

```bash
B=https://school-management-module-v3-0.vercel.app

# 1. The database answers
curl -s -o /dev/null -w '%{http_code}\n' $B/api/public/sso          # expect 200

# 2. A real sign-in creates a session
cd "$(mktemp -d)"
csrf=$(curl -s -c j $B/api/auth/csrf | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
curl -s -b j -c j -o /dev/null -w '%{http_code}\n' -X POST $B/api/auth/callback/credentials \
  --data-urlencode "csrfToken=$csrf" --data-urlencode schoolCode=DEMO \
  --data-urlencode identifier=owner --data-urlencode 'password=Demo@12345' --data-urlencode json=true
curl -s -b j $B/api/auth/session                                     # expect "role":"SUPER_ADMIN"
```

| Check | Before | After |
|---|---|---|
| `GET /api/public/sso` | 500 `INTERNAL` | **200** |
| Sign-in as `DEMO` / `owner` | error URL with Prisma message | **200, session created** |
| Session role | none | **SUPER_ADMIN** (Dr. Anand Swaroop Pathak) |
| Sign-in in the browser | “Invalid school code…” | **Dashboard opens** |

---

## 4. Demo data and KPIs

The seed builds a realistic school, but some dashboard cards depend on *today* or on months the seed does not cover, so a fresh seed shows empty “today” cards and a gap after September. `docs/tools/demo-kpi.ts` fills those gaps.

![The seed creates the base data once; the demo-kpi top-up adds today's data and later months; together they fill the school, teacher, family and platform dashboards](images/07-demo-data.svg)

```powershell
$env:DATABASE_URL = "mysql://…TiDB connection string…"
npx tsx docs/tools/demo-kpi.ts                    # DEMO top-up + 9 sample schools
npx tsx docs/tools/demo-kpi.ts --no-samples       # DEMO top-up only (the daily refresh)
npx tsx docs/tools/demo-kpi.ts --remove-samples   # delete the sample schools again
Remove-Item Env:DATABASE_URL
```

What fills each card:

| Dashboard card | Comes from | Top-up adds |
|---|---|---|
| Students, staff, class strength | seed | 6 admissions this month, through the real admission service |
| Present today, absent today, staff today | seed covers the last 30 working days, not today | today's marks for every student and employee |
| Collected today, this month, payment modes | seed payments up to today | 8 receipts today, through the real fee service |
| Income vs expense (6 months) | seed: fees, plus expenses and salaries April–September | October onward expenses, rent and scrap income, October salaries, and monthly development-charge income so each month ends in a small surplus |
| Pending: leave, enquiries, books, stock, vehicles | seed | fresh enquiries and leave requests |
| Birthdays today | random dates of birth | moves two students' birthdays to today |
| Family: homework, live classes | seed (a few sections) | homework due this week in every section, 4 upcoming live classes |
| Platform: schools, MRR, trials | DEMO and GVS only | 9 sample schools: 6 active, 3 on trial, 1 suspended |

**Run it every day you demo.** “Today” on the live site is the UTC day, which starts at **05:30 IST**, so run the `--no-samples` refresh after 05:30 IST. It skips anything already present, so running it twice changes nothing. The sample schools have no user accounts, and `--remove-samples` refuses to delete any school that has one.

The live dashboards after the top-up (8 November 2026):

![Owner dashboard with every card filled: 200 students, 92% present today, fee collection trend, income above expense in every month, pending lists, absentees, receipts and birthdays](images/kpi-owner.webp)

![Parent dashboard: attendance this month, fees due, homework due, latest exam result, live class and notices](images/kpi-parent.webp)

![Platform console: 7 paying schools, 3 on trial with 2 ending this week, Rs 28,995 monthly recurring revenue, 2,629 active students](images/kpi-platform.webp)

The timetable cards read “No classes today” in these screenshots because 8 November 2026 is a Sunday. The greeting still says “Dr.” instead of “Anand” until the greeting fix is deployed (QA report, bug 7).

---

## 5. Performance: run the functions next to the database

Right after go-live, the site was correct but slow: `/api/me` took about 3.8 s and the owner dashboard about 12 s, even for a single user. The same build next to its database answers in 26 ms and 124 ms.

![Bar chart, log scale: GET /api/me 3.76 s live vs 26 ms in QA; GET /api/dashboard 12.1 s live vs 124 ms in QA; sign-in 11.1 s live vs 822 ms in QA](../qa/images/perf-live-vs-qa.svg)

The cause is placement, not code. The Vercel project ran its functions in **Washington, D.C. (`iad1`)**, Vercel's default region, while the database is in **Singapore**. Every query crosses the world and back, about a quarter of a second each, and a dashboard makes dozens of them. A query from India takes about 120 ms, and from inside Singapore it takes a few milliseconds.

**Fix (ready, needs one push):** `vercel.json` in the repository pins the functions to Singapore:

```json
{ "$schema": "https://openapi.vercel.sh/vercel.json", "regions": ["sin1"] }
```

It takes effect with the next deployment from `main`. The same setting is in the dashboard under **Project → Settings → Functions → Function Region**. Choose the region of the database: if the database moves to Mumbai, use `bom1`.

The full QA, security and load-test results are in [docs/qa/QA_REPORT.md](../qa/QA_REPORT.md).

---

## 6. Environment variable reference

**Set in Production:**

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | TiDB connection string (step 3) |
| `NEXTAUTH_SECRET` | Yes | Signs session cookies; at least 32 characters |
| `NEXTAUTH_URL` | Yes | `https://school-management-module-v3-0.vercel.app`; change it when a custom domain goes live |
| `DATA_ENCRYPTION_KEY` | Yes | 32 random bytes, base64; encrypts Aadhaar numbers and gateway credentials |

**Not set yet. Each one switches on a feature** (descriptions from `.env.example`):

| Variable(s) | Feature it enables |
|---|---|
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Online fee payments (platform fallback keys; each school can also enter its own) |
| `ANTHROPIC_API_KEY` + `AI_MODEL`, or `GEMINI_API_KEY` | AI assistant |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Phone notifications from the installable app |
| `CRON_SECRET` | Scheduled reminders through `POST /api/public/cron` |
| `GOOGLE_CLIENT_ID`/`SECRET`, `AZURE_AD_CLIENT_ID`/`SECRET`/`TENANT_ID` | Single sign-on with Google or Microsoft |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_BING_SITE_VERIFICATION` | Canonical links and search-console verification |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL` | Analytics and ads conversion tracking (see `docs/marketing/GOOGLE_ADS_SETUP.md`) |
| `STORAGE_DIR`, `MAX_FILE_SIZE` | Where uploads are stored; see the file-upload limitation in [section 9](#9-security-checklist-and-open-items) |

**Keep unset in production:** `NEXT_PUBLIC_DEMO_MODE`, `PAYMENT_SANDBOX`, `NEXT_PUBLIC_SHOW_SAMPLE_CONTENT` (the last one shows fictional testimonials and customer numbers, which breaks Google Ads policy).

Variables whose name starts with `NEXT_PUBLIC_` are built into the pages, so they need a redeploy and must never hold a secret.

---

## 7. Day-to-day operations

| Task | How |
|---|---|
| Ship code | Commit and `git push origin main`. Vercel builds and deploys in about 2 minutes. |
| Change the database schema | Before pushing code that needs the new columns, apply the schema to TiDB: set `DATABASE_URL` as in step 4 and run `npx prisma db push --skip-generate`. `db push` warns before any change that would delete data; read the warning. |
| Change a setting | `vercel env rm NAME production --yes`, then `vercel env add NAME production`, then redeploy (step 6). |
| Rotate the TiDB password | TiDB → Connect → Generate Password → update `DATABASE_URL` in Vercel → redeploy. The old password stops working at once, so do the Vercel update straight away. |
| Refresh the demo KPIs | `npx tsx docs/tools/demo-kpi.ts` with `DATABASE_URL` set (see section 4). |
| Read production logs | `vercel logs school-management-module-v3-0.vercel.app`, or the project's **Logs** tab in Vercel. |
| Watch database usage | TiDB console → cluster → **Monitoring**, and **Capacity used this month** on the Overview page. |
| Backups | TiDB console → **Data → Backup**. Check what the Starter plan keeps, and export before risky changes. |

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| “Invalid school code, username or password” for correct details, and `/api/public/sso` returns 500 | The database is not configured or not reachable | Check `DATABASE_URL` in Vercel, then redeploy. Test the URL from the laptop with `npx prisma db pull --print` (with `DATABASE_URL` set). |
| Same message, but `/api/public/sso` returns 200 | Wrong school code, username or password, or too many attempts | The limit is 30 sign-in attempts per IP per 15 minutes. Wait, or clear it with `npx tsx tests/reset-rate-limits.ts` pointed at the same database. |
| `Environment variable not found: DATABASE_URL` | The variable is missing for Production, or was added without a redeploy | Add it for **Production**, then redeploy. |
| `Unknown database 'vidyalaya'` | The schema was never pushed | Run step 4. |
| `Access denied for user` | Wrong username or password, or the password has unencoded symbols | Generate a new password and URL-encode it. |
| TLS or certificate errors on TiDB | `sslaccept` missing or wrong | Use `?sslaccept=strict`. |
| TLS errors on Aiven or another host with a private certificate authority | The host's certificate is not publicly trusted | Use `sslaccept=accept_invalid_certs` (still encrypted, but the server is not verified), or move to TiDB. |
| Connection timeouts from Vercel only | The database only accepts listed IP addresses | Vercel has no fixed IP: allow all addresses (`0.0.0.0/0`) and rely on TLS and the password. |
| `NEXTAUTH_SECRET must be set to at least 32 random characters in production` | The secret is short or missing | Generate a new one (step 5) and redeploy. Everyone is signed out. |
| `DATA_ENCRYPTION_KEY is required in production` or `must be 32 bytes` | The key is missing or malformed | Restore the original key from the password manager. Only generate a new one if there is no encrypted data yet. |
| Login works on the laptop but not on the live site after a schema change | Code was deployed before the schema was pushed | Run `npx prisma db push --skip-generate` against TiDB. |

---

## 9. Security checklist and open items

**Do now:**

- [ ] Move `NEXTAUTH_SECRET` and `DATA_ENCRYPTION_KEY` from `vidyalaya-prod-secrets-BACKUP.txt` into a password manager, then delete the file.
- [ ] Delete `vidyalaya-db-url.txt` from your user folder once the TiDB password is in the password manager (it contains the password), or rotate the password.
- [ ] Rotate the TiDB password if the connection details were ever shared in a chat or email.
- [ ] Keep `.env*` and `.vercel/` out of git (already in `.gitignore`).

**Open items found during the setup:**

| Item | Why it matters | Suggested fix |
|---|---|---|
| Functions run far from the database | Every query crosses from Washington to Singapore, so pages take 4–12 s (section 5). | **Fixed in code, waiting for deploy:** `vercel.json` pins functions to `sin1`. |
| Known-password demo accounts on the live site | `platform` controls every school and every website lead, and its password is the published demo password. | Change the `platform` password (and the DEMO owner's) before real schools sign up. |
| File uploads do not work on Vercel | Uploads are written to `./storage` next to the app. On Vercel that folder is read-only and only a temporary folder is writable, so uploads fail or are lost. | Move uploads to object storage (for example S3, Cloudflare R2 or Vercel Blob) before real schools upload files. |
| “Data hosted in India” on the website footer | The database is in Singapore. | Recreate the cluster in an India region if TiDB offers one for your plan, or change the footer text. |
| Database errors leak into the sign-in error URL | When the database failed, the raw Prisma message ended up in `/api/auth/error?error=…`, visible to anyone. | **Fixed in code, waiting for deploy:** unexpected errors are logged on the server and reported as `UNAVAILABLE`. |
| The sign-in form reported outages as wrong passwords | It sent this whole investigation in the wrong direction at first. | **Fixed in code, waiting for deploy:** the form now says “Sign-in is temporarily unavailable”. |
| Demo data lives in the production database | Real schools will share the database with the DEMO and GVS schools and the sample schools. | Before launch, remove the sample schools (`--remove-samples`). Decide whether DEMO stays as a public demo school. |
