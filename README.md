<div align="center">

# 🏫 Vidyalaya ERP

### Multi-school SaaS for Indian K-12 schools — admissions to alumni, in one secure place

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Motion](https://img.shields.io/badge/Motion-14-FFF312?style=flat-square)](https://motion.dev/)
[![Powered by SRM ECO TECH](https://img.shields.io/badge/Powered_by-SRM_ECO_TECH-00A86B?style=flat-square)](https://test.srmecotech.com/)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/v3/website-home-dark.png" />
  <img src="docs/screenshots/v3/website-home.png" width="92%" alt="Vidyalaya website landing page" />
</picture>

<sub>The public website at <code>/</code>. It follows your GitHub theme here, and has its own light/dark toggle in the app.</sub>

</div>

Vidyalaya ERP runs any number of schools from one deployment. Each school gets its own branding, settings, feature switches and role permissions, while the platform operator onboards schools, sells plans and manages subscriptions. A public website showcases every feature and turns visitors into sign-up requests. Built for CBSE, ICSE and State Board schools: CBSE grading, RTE quota, UDISE+/PEN/APAAR fields, UPI fee payments, DLT-compliant SMS, and 12 Indian languages.

> The requirements analysis and build status are in [docs/REQUIREMENTS_ANALYSIS.md](docs/REQUIREMENTS_ANALYSIS.md); module-by-module coverage is in [docs/MODULE_COVERAGE.md](docs/MODULE_COVERAGE.md).

## Contents

[What's new](#whats-new) · [How it fits together](#how-it-fits-together) · [Highlights](#highlights) · [Modules](#modules) · [Plans](#plans) · **Step-by-step guides:** [1 Run locally](#guide-1--run-it-locally) · [2 Tour the website](#guide-2--tour-the-website) · [3 Set up a school](#guide-3--set-up-a-school) · [4 Run the platform](#guide-4--run-the-platform) · [5 Customise the website](#guide-5--customise-the-website) · [Roles](#roles--permissions) · [Security](#security--privacy) · [Demo accounts](#demo-accounts) · [Testing](#testing) · [Deployment](#deployment) · [Project layout](#project-layout) · [Contact](#contact)

## What's new

| | |
|---|---|
| **Public website** | Landing page, a feature carousel, 24 standalone feature pages with real screens, live pricing and FAQ — built with [Motion](https://motion.dev/) animations. Signed-in users opening `/` still go straight to their dashboard. |
| **Sign in and sign up** | `/login` and `/get-started` are single focused cards in the website's style. The sign-in content and behaviour are unchanged. |
| **Light and dark mode** | A toggle on the website, sign-in and sign-up pages. It shares the app's per-device theme setting. |
| **Website leads** | "Start free trial / Book a demo" requests are validated, de-duplicated, spam-filtered and listed in a new **Website leads** tab of the platform console, with status and notes. |
| **Live pricing** | Prices, limits and the module-by-plan comparison are read from the same plans the operator edits. |
| **Powered by SRM ECO TECH** | Shown on the website footer and the sign-in / sign-up pages, with the company's contact details. |

<table>
<tr>
<td width="50%"><img src="docs/screenshots/v3/login.png" alt="Sign-in page, light" /></td>
<td width="50%"><img src="docs/screenshots/v3/login-dark.png" alt="Sign-in page, dark" /></td>
</tr>
<tr>
<td align="center"><em>Sign in — light</em></td>
<td align="center"><em>Sign in — dark</em></td>
</tr>
</table>

## How it fits together

```mermaid
flowchart LR
  subgraph WEB["Public website"]
    H["/ Landing page"] --> F["/features · 24 feature pages"]
    H --> PR["/pricing · live plans"]
    H --> SU["/get-started · sign up"]
    H --> LI["/login · sign in"]
  end
  SU -- "WebsiteLead" --> OP["Platform console · Website leads"]
  OP -- "Onboard school" --> SC[("School tenant")]
  LI --> APP["School app · role dashboards"]
  APP --> API["API routes · auth · RBAC · tenant scope · audit"]
  API --> DB[("MySQL · Prisma")]
  PR -. "reads plans" .-> DB
  API --> EXT["Razorpay · MSG91 / Twilio · SMTP · Google / Microsoft SSO · Traccar GPS"]
```

From first visit to a school that runs on Vidyalaya:

```mermaid
sequenceDiagram
  actor V as School visitor
  participant W as Website
  participant P as Platform operator
  participant A as Vidyalaya app
  actor F as Staff and families
  V->>W: Explore features and pricing
  V->>W: Start free trial / Book a demo
  W->>P: Request appears in "Website leads"
  P->>P: Call, demo, update status and notes
  P->>A: Onboard school (code, plan, owner login)
  V->>A: Owner signs in at /login
  V->>A: Import students, set fees, add staff
  A->>F: Logins for teachers, parents and students
  F->>A: Attendance, homework, UPI fees, results
```

## Highlights

- **Every feature can be switched off, every role tuned.** Owners and principals turn modules on or off for the whole school and set view / add / edit / delete per role. Parent and student access can be narrowed but never widened.
- **True multi-tenancy.** Every query is scoped to the school by a Prisma extension; teachers see only their sections, parents only their own children.
- **Platform console.** Onboard a school in under a minute with campus, session, grade scale, fee heads, certificate templates and an owner login ready. Plans bundle modules with student and campus limits. Trials lapse to **read-only** (never locked out of their data).
- **Fees that reconcile.** Monthly/quarterly structures, concessions, RTE, transport, late fees, family-wise collection, cancellations with reversal, gap-free receipts, Razorpay UPI/card payments settling to the school's own account.
- **QR-verifiable certificates.** TC, bonafide, character, merit and experience certificates from editable templates, each with a serial number and a public verification page.
- **Live transport.** Every bus on one map; parents see distance and arrival time to their own stop; drivers run trips from a phone or GPS device.
- **AI assistant** that knows the user's role and relevant school data, with a per-user daily allowance.
- **12 Indian languages and an installable app** for Android, iPhone and desktop, with phone alerts.

<table>
<tr>
<td width="50%"><img src="docs/screenshots/v3/website-orbit.png" alt="Every role connected" /></td>
<td width="50%"><img src="docs/screenshots/v3/website-insights.png" alt="Charts on the website" /></td>
</tr>
<tr>
<td align="center"><em>All 11 school roles share the same live data</em></td>
<td align="center"><em>The website's animated charts (illustrative demo-school figures)</em></td>
</tr>
<tr>
<td><img src="docs/screenshots/v2/access-control.png" alt="Roles and permissions" /></td>
<td><img src="docs/screenshots/v2/certificate.png" alt="Certificate with QR verification" /></td>
</tr>
<tr>
<td align="center"><em>Module switches and per-role rights</em></td>
<td align="center"><em>Certificates with QR verification</em></td>
</tr>
</table>

## Modules

51 modules in 10 areas. The catalogue and default rights live in [`src/lib/modules.ts`](src/lib/modules.ts).

```mermaid
pie showData title Modules by area
  "Communication" : 10
  "Administration" : 7
  "People" : 6
  "Academics" : 6
  "Examinations" : 5
  "Operations" : 5
  "Student Life" : 5
  "Finance" : 3
  "Front Office" : 2
  "Overview" : 2
```

| Area | Modules |
|---|---|
| Overview | Dashboard, Apps |
| Front Office | Admissions & Enquiries, Gate & Visitors |
| People | Students, Parents & Families, Employees, Staff Attendance, Leave Management, Alumni |
| Academics | Classes & Subjects, Student Attendance, Timetable, Homework, Study Material, Live Classes |
| Examinations | Exams & Report Cards, Class Tests, Question Papers, Behaviour & Skills, Online Exams |
| Finance | Fees, Accounts, Payroll |
| Communication | Noticeboard, Messages, SMS, WhatsApp & Email, Calendar & Events, Parent Meetings, Polls & Forms, Discussions, Gallery, News & Blog, Reminders |
| Operations | Transport, Library, Store & POS, Assets & Inventory, Hostel |
| Administration | Certificates & ID Cards, Reports, Tasks, Document Manager, School Settings, Roles & Permissions, Audit Log |
| Student Life | Clubs & Activities, Study Tools, AI Assistant, Discipline, Placements |

On the website these are presented as 24 solutions, each with its own page at `/features/<slug>`:

```mermaid
mindmap
  root((Vidyalaya))
    Administration
      Admissions CRM
      Student information
      Staff, HR and tasks
      Certificates and ID cards
      Gate, visitors and discipline
    Academics
      Classes and timetable
      Attendance
      Homework, LMS and live classes
      Exams and report cards
      Online exams
    Finance
      Fees and online payments
      Accounts, payroll and Tally
    Communication
      SMS, WhatsApp, email and notices
      Parent and student app
      Polls, gallery, blog and events
    Operations
      Transport and live GPS
      Hostel
      Library, store and assets
    Platform
      Dashboards and report builder
      AI assistant and student life
      Alumni and placements
      Roles, permissions and security
      12 languages and dark mode
      Integrations
```

## Plans

The seed creates three plans. The operator can change them under **Platform → Plans**, and the website's pricing page shows whatever is saved there.

| Plan | Price (seed default) | Students | Campuses | Modules |
|---|---|---|---|---|
| Starter | ₹999 / month | up to 300 | 1 | 28 of 51 |
| Growth | ₹2,499 / month | up to 1,200 | 2 | 45 of 51 |
| Enterprise | ₹25 / student / month | unlimited | unlimited | 51 of 51 |

<img src="docs/screenshots/v3/website-pricing.png" alt="Pricing section with live plans" />

---

## Guide 1 — Run it locally

**Requirements:** Node.js 20.9 or later (22 recommended) and a running MySQL 8 server.

1. **Install dependencies.** This also generates the Prisma client.

   ```bash
   npm install
   ```

2. **Configure the environment.** Copy the example and set at least `DATABASE_URL`, `NEXTAUTH_SECRET` and `NEXTAUTH_URL=http://localhost:3000`. Set `NEXT_PUBLIC_DEMO_MODE=1` to show one-click demo accounts on the sign-in page.

   ```bash
   cp .env.example .env
   ```

3. **Create the tables and load the demo schools.** ⚠️ This wipes the database named in `DATABASE_URL`.

   ```bash
   npm run db:reset
   ```

4. **Start the app** and open http://localhost:3000. You land on the website.

   ```bash
   npm run dev
   ```

5. **Sign in.** Click **Log in**, then use school code `DEMO`, username `owner` and password `Demo@12345` (or a demo-account button). You arrive on the owner dashboard.

<details>
<summary><b>Troubleshooting</b></summary>

| Symptom | Fix |
|---|---|
| "Invalid school code, username or password" for correct details | The database is not reachable — start MySQL and check `DATABASE_URL`. |
| "Too many login attempts" while testing | `npx tsx tests/reset-rate-limits.ts` |
| A new table "does not exist" right after a schema change | Run `npx prisma db push`, then restart `npm run dev` so it loads the new Prisma client. |
| `prisma generate` fails with `EPERM` on Windows | A running dev server locks the engine file; stop it, generate, start again. |

</details>

## Guide 2 — Tour the website

| Step | What you do | Screen |
|---|---|---|
| **1. Landing page** | Open `/`. Use the sun/moon button to switch between light and dark. | <img src="docs/screenshots/v3/website-home.png" width="420" alt="Landing page" /> |
| **2. Browse features** | Pick a category tab or swipe the carousel; it autoplays and pauses on hover. | <img src="docs/screenshots/v3/website-features.png" width="420" alt="Feature carousel" /> |
| **3. Open a feature page** | Each of the 24 features has a page with highlights, capabilities, steps, roles and the plans that include it. | <img src="docs/screenshots/v3/website-feature-page.png" width="420" alt="Feature page" /> |
| **4. See real screens** | The gallery shows every screen of that feature, with numbered notes. | <img src="docs/screenshots/v3/website-feature-gallery.png" width="420" alt="Screen gallery" /> |
| **5. Compare roles** | "A tailored experience for every role" shows what each person sees. | <img src="docs/screenshots/v3/website-roles.png" width="420" alt="Role showcase" /> |
| **6. Sign up** | **Start free trial** or **Book a demo** opens `/get-started`. The request goes to the platform operator. | <img src="docs/screenshots/v3/signup.png" width="420" alt="Sign-up page" /> |
| **7. On a phone** | The whole website works at phone width, in both themes. | <img src="docs/screenshots/v3/website-mobile-dark.png" width="200" alt="Website on a phone, dark mode" /> |

## Guide 3 — Set up a school

Signed in as the school owner (`DEMO` / `owner`):

| Step | What you do | Screen |
|---|---|---|
| **1. Start on the dashboard** | Today's numbers and the things that need action. | <img src="docs/demo/shots/03-dashboard-admin.png" width="420" alt="Owner dashboard" /> |
| **2. School settings** | **Settings**: profile, branding, languages, fees, SMS / WhatsApp / email, payment gateway. | <img src="docs/demo/shots/57-settings.png" width="420" alt="School settings" /> |
| **3. Modules and rights** | **Roles & permissions**: switch off what you don't use and tune each role. | <img src="docs/demo/shots/58-access-control.png" width="420" alt="Roles and permissions" /> |
| **4. Add students** | **Students**: import from CSV, or **Admit** one; the parent's mobile links siblings. | <img src="docs/demo/shots/08-students.png" width="420" alt="Students" /> |
| **5. Fee structure** | **Fees → Structure**: fee heads per class; roll over next year with a % increase. | <img src="docs/demo/shots/38-fee-structure.png" width="420" alt="Fee structure" /> |
| **6. Collect fees** | **Fees → Collect**: all siblings at once, any payment mode, printed receipt. | <img src="docs/demo/shots/35-fees-collect.png" width="420" alt="Fee counter" /> |
| **7. Daily attendance** | Teachers mark the section present in one tap; parents of absentees get an SMS and app alert. | <img src="docs/demo/shots/18-attendance-mark.png" width="420" alt="Mark attendance" /> |
| **8. Exams and report cards** | Enter marks, publish results, print report cards. | <img src="docs/demo/shots/31-results.png" width="420" alt="Results" /> |
| **9. Families on the app** | Parents see attendance, homework, results and fees, pay by UPI and track the bus. | <img src="docs/demo/shots/05-dashboard-parent-mobile.png" width="150" alt="Parent app" /> <img src="docs/demo/shots/69-parent-live-mobile.png" width="150" alt="Live bus" /> |

The complete illustrated walkthrough of every screen is in [docs/USER_GUIDE.md](docs/USER_GUIDE.md) and [docs/demo/index.html](docs/demo/index.html).

## Guide 4 — Run the platform

1. **Sign in as the operator.** With the demo data, leave the school code empty and use `platform` / `Demo@12345`. In production create the account first:

   ```bash
   OPERATOR_PASSWORD='…' npm run platform:operator -- ops "Your Name"
   ```

2. **Work through website leads.** Open **Website leads**. Each request shows the school, contact, what they want and where they came from. Click a row to call, email, change the status (New → Contacted → Demo done → Converted / Closed) and keep notes. Every change is audited.

   <img src="docs/screenshots/v3/platform-leads.png" width="88%" alt="Website leads in the platform console (sample data)" />

3. **Set up plans.** Under **Plans**, choose the modules, price and limits for each plan. The website's pricing page updates within five minutes.

4. **Onboard the school.** Under **Schools → Onboard school**, enter the school code, plan, trial length and owner login. Share the school code and the one-time owner password; the owner must change it at first sign-in.

```mermaid
stateDiagram-v2
  [*] --> NEW: Form submitted on /get-started
  NEW --> CONTACTED: Operator calls
  CONTACTED --> DEMO_DONE: Live demo given
  DEMO_DONE --> CONVERTED: School onboarded
  NEW --> CLOSED
  CONTACTED --> CLOSED
  DEMO_DONE --> CLOSED
  CONVERTED --> [*]
  CLOSED --> [*]
```

## Guide 5 — Customise the website

Everything the website shows lives in one module, `src/website/`.

| To change | Edit |
|---|---|
| Customer counts, school names, testimonials, offer lines | `src/website/content/placeholder.ts` — **dummy values: replace before launch** |
| Company name, logo, address, phones, email ("Powered by") | `src/website/content/company.ts` |
| Feature pages (text, screens, steps, roles) | `src/website/content/features.ts` |
| Navigation, footer links, categories, FAQ, colours | `src/website/content/site.ts` |
| Product screenshots used on the website | Re-shoot with `node docs/tools/shoot.cjs`, then `npm run website:screens` |
| The README screenshots in `docs/screenshots/v3` | `node docs/tools/shoot-website.cjs` (set `TEST_BASE_URL` for another server) |

Product facts on the website — 51 modules, 11 roles, 12 languages, and plan prices — are read from the code and the database, so they never drift from the app.

---

## Roles & permissions

Owner/Director, Principal/Admin, Teacher, Accountant, Front Office, Librarian, Transport Manager, Store Manager, Other Staff, Parent, Student, plus the Platform Operator. Defaults are in [`src/lib/modules.ts`](src/lib/modules.ts); each school overrides them under **Roles & permissions**. The owner is never restricted, and only the owner can change the Principal/Admin role.

## Security & privacy

```mermaid
flowchart LR
  B["Browser or installed app"] --> PX["proxy.ts · page gate"]
  PX --> R["API route wrapper"]
  R --> AU{"Signed in and session valid?"}
  AU -- no --> E1["401"]
  AU -- yes --> PM{"Module on and role allowed?"}
  PM -- no --> E2["403"]
  PM -- yes --> T["Tenant-scoped Prisma · school and row scope"]
  T --> DB[("MySQL")]
  R --> AL["Audit log"]
```

- No built-in or shared accounts; `NEXTAUTH_SECRET` and `DATA_ENCRYPTION_KEY` are required in production.
- Sign-in by school code + username/email/mobile; lockout and per-IP/per-account rate limits; temporary passwords must be changed; sign out everywhere.
- Server-side permission and row-scope checks on every API route; same-origin checks on mutations; CSP, HSTS and frame protection.
- Aadhaar and gateway credentials encrypted with AES-256-GCM, with only the last 4 Aadhaar digits ever shown; secrets never returned by any API.
- Uploaded files kept outside the web root, type-checked and served after access checks; admin-authored HTML sanitised and every substituted value escaped.
- The public sign-up form is rate-limited, validated on the server, de-duplicated and protected by a honeypot; only the platform operator can read the requests.
- DPDP consent records; a read-only audit log of every change, sign-in and support action.

## Demo accounts

Password for every account: `Demo@12345` (override with `SEED_PASSWORD`).

| School code | Usernames |
|---|---|
| `DEMO` (Enterprise plan, ~200 students) | `owner`, `admin`, `teacher`, `accountant`, `reception`, `librarian`, `transport`, `store`, `parent`, `student` |
| `GVS` (Starter plan, certificates switched off) | `owner`, `admin`, `teacher` |
| *(leave empty)* | `platform` — the SaaS operator console |

## Testing

```bash
npm run typecheck             # TypeScript
npm run lint                  # ESLint (Next.js rules)
npm test                      # unit tests (vitest)
npm run test:api              # API integration suite — needs a freshly seeded DB and a running server
npx playwright test           # browser smoke test of every menu page per role (uses installed Chrome)
```

`TEST_BASE_URL` points the API and browser suites at another server. Both suites clear login rate-limit counters in the test database first, so never run them against production.

## Deployment

1. Provision MySQL 8 and set every variable from `.env.example`. Generate `NEXTAUTH_SECRET` and `DATA_ENCRYPTION_KEY`, and back up the encryption key securely. Leave `NEXT_PUBLIC_DEMO_MODE` unset.
2. `npm ci && npx prisma db push && npm run build && npm start` behind HTTPS.
3. Create the operator account (see [Guide 4](#guide-4--run-the-platform)), create plans, then onboard schools.
4. Each school adds its own Razorpay, SMS (DLT) and WhatsApp credentials under **Settings**. Point the Razorpay webhook at the URL shown there.
5. Persist `STORAGE_DIR` (uploaded documents) and include it and the database in backups.
6. Replace the placeholder content in `src/website/content/placeholder.ts` before the website goes public.
7. **Store apps (optional):** the Capacitor shell in [`mobile/`](mobile/README.md) loads `https://<your-domain>/dashboard`, so the app opens on sign-in or the dashboard, never the marketing site.

## Project layout

```
prisma/schema.prisma        multi-tenant data model (incl. WebsiteLead)   prisma/seed.ts   demo schools
src/proxy.ts                auth routing (Next.js 16)                      next.config.js   security headers / CSP
src/server/api.ts           route wrapper: auth, RBAC, tenant scope, read-only mode, errors
src/server/db.ts            tenant-scoped Prisma client, gap-free sequences
src/server/services/        fees, people, exams, messaging, razorpay, ai, provisioning …
src/lib/modules.ts          module catalogue and default role permissions
src/website/                public website module: content/, components/, server/plans.ts, tailwind-plugin.js
src/app/(website)/          website pages: /, /features, /features/[slug], /pricing
src/app/(auth)/             /login and /get-started (sign in, sign up)
src/app/(app)/              school app pages          src/app/platform/   operator console (incl. Website leads)
src/app/api/                REST endpoints            src/app/print/      printable documents
scripts/website-screens.mjs product screenshots → website (WebP)
docs/tools/                 screenshot tools: shoot.cjs (product), shoot-website.cjs (README)
mobile/                     Capacitor shell for Play Store / App Store
tests/unit  tests/api  tests/e2e
legacy/                     previous single-school version, kept for reference only
```

## Contact

**SRM ECO TECH PVT. LTD.** — [test.srmecotech.com](https://test.srmecotech.com/)
A-21, Ground Floor, Pandav Nagar, Delhi – 110092
Phone: (+91) 98748 30490 · (+91) 95819 83786 · Email: [info@srmecotech.com](mailto:info@srmecotech.com)

---

<div align="center">

Built for Indian schools · Powered by <a href="https://test.srmecotech.com/"><img src="public/srm-eco-tech.png" height="22" alt="SRM ECO TECH" align="center" /></a>

</div>
