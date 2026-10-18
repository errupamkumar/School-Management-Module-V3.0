# Vidyalaya ERP — Requirements Analysis & Build Status

**Audience:** product owner, engineering and sales. **Status date:** 17 October 2026. **Branch:** `feature/saas-platform` (uncommitted).

This document records what the product must do to compete as a multi-school SaaS in the Indian K-12 market, how the rebuilt codebase meets it, and what is still open.

---

## 1. Inputs

| Source | What it gave us |
|---|---|
| Existing codebase (now under `legacy/`) | Feature intent, data shapes, BRDs in `docs/`. Audited for security and multi-tenancy (§5). |
| eSkooly walkthrough (all roles, demo account supplied by the owner; nothing was created there) | Baseline feature set and UX of a widely used Indian school ERP. Parity in §3. |
| Indian market & regulation | CBSE/ICSE/State board grading, RTE 25% quota, UDISE+/PEN/APAAR identifiers, DLT-registered SMS, UPI payments, DPDP Act 2023, UIDAI Aadhaar handling. |

## 2. Product requirements

**Business:** sell one product to many schools of different sizes; onboard a school in minutes; charge per plan (flat or per student); let each school tailor the product without code changes.

**Functional:** full school operations — admissions to alumni — for nine staff roles plus parents and students, with an owner-level switch for every feature and per-role view/add/edit/delete rights.

**Non-functional:** strict tenant isolation; row-level data scope (a teacher sees their sections, a parent their children); no shared or hard-coded credentials; encrypted sensitive identifiers; full audit trail; works on low-end Android phones over 4G; English and Hindi.

## 3. eSkooly parity matrix

✅ built and tested · ➕ goes beyond eSkooly

| Area | eSkooly capability | Vidyalaya ERP | |
|---|---|---|---|
| Settings | Institute profile, logo, rules, bank accounts, fee/marks settings | Profile, logo, brand colour, numbering prefixes, working days, result criteria, traits, rules, bank accounts, campuses | ✅ ➕ |
| Classes & subjects | Classes, sections, subjects, chapters | Plus class-subject marks config, teacher allocation, academic years | ✅ |
| Students | Admission, admission letter, ID cards, basic list, logins, promote | Plus sibling (family) detection, bulk CSV import, status lifecycle (TC/passed out), documents, 360° profile, Aadhaar (encrypted) + APAAR consent | ✅ ➕ |
| Employees | Add, job letter, logins | Plus payroll profile, class-teacher/subject allocation | ✅ |
| Accounts | Chart of accounts, income, expense, statement | Ledger auto-posted from fees, store and salary; manual entries; statement | ✅ |
| Fees | Invoices, collect, receipts, defaulters, reports | Monthly/quarterly structures, concessions, RTE/discounts, transport fees, late fees, family-wise collection, cancellation with reversal, online UPI/card via Razorpay, gap-free receipt numbers | ✅ ➕ |
| Salary | Pay salary, salary sheet | Payslips with attendance, amount in words | ✅ |
| Attendance | Students, employees, reports | Plus QR ID-card scan, absence SMS, session-to-date 75% eligibility report | ✅ ➕ |
| Timetable | Periods, rooms, timetable | Plus clash detection and auto-generation | ✅ ➕ |
| Homework | Assign | Plus attachments and online submission | ✅ |
| Behaviour & skills | Ratings | Plus observations; feeds the report card | ✅ |
| Exams | Exams, marks, result card, award list | CBSE grade scale (editable), ranks, pass rules, publish to parents | ✅ |
| Class tests | Tests and marks | ✅ | ✅ |
| Question papers | Chapters, question bank, paper builder | Plus auto-generate by blueprint and answer key | ✅ ➕ |
| Messaging / SMS / WhatsApp | Internal messages, SMS, WhatsApp | Policy-checked messaging (parents can't reach other parents), DLT templates, outbox with MSG91/Twilio/WhatsApp Cloud | ✅ |
| Live classes | Links | Meet/Zoom/Jitsi scheduling by class or staff | ✅ |
| Online store / POS | Products, sale | Stock, orders, cancellation restores stock, ledger posting | ✅ |
| Certificates | Leave, character, custom | Template designer with placeholders, sequential serials, **QR public verification**, revocation | ✅ ➕ |
| Reports | Student info, parent info, attendance, fee collection | Plus UDISE+-style class strength by gender/category/RTE, birthdays, CSV export everywhere | ✅ ➕ |
| — | — | Admissions CRM with public online application form, transport, library, assets, events calendar, leave workflow, PTM meetings, clubs & activities with waitlists, study tools, doubt desk, AI assistant, notifications, audit log | ➕ |

## 4. What wins in the Indian market

Competitors (eSkooly, Fedena, Entab CampusCare, MyClassboard, Teachmint, NextGen) mostly compete on breadth. Differentiators built in:

1. **Owner-controlled feature switches and per-role rights** — any module on/off, any role's view/add/edit/delete, with safe ceilings (parents/students can be restricted, never widened).
2. **Real multi-school SaaS** — platform console to onboard a school in under a minute (campus, session, grade scale, fee heads, certificate templates, owner login), plans with module bundles and student/campus limits, trial → paid → read-only lifecycle.
3. **Compliance by design** — DPDP consent records, Aadhaar stored encrypted (only last 4 digits shown), APAAR consent with an explicit "decline", full audit log the school can see (including support actions by the platform).
4. **Parent experience** — one login per family covering all siblings, online fee payment by UPI, Hindi UI, absence alerts, results and homework.
5. **Verifiable documents** — QR-verified certificates cut fake TCs, a real pain for admissions.
6. **AI assistant** with per-user daily caps — a study tutor for students (with child-safety rules and the Tele-MANAS helpline), drafting help for staff — so AI costs stay predictable per school.

## 5. Legacy audit findings (all addressed in the rebuild)

| Finding | Risk | Resolution |
|---|---|---|
| Single-tenant data model | Could not host more than one school | Every tenant row carries `schoolId`; a Prisma extension injects it into every query; cross-tenant writes throw |
| Demo accounts and a default session secret in code | Account takeover in production | Removed; `NEXTAUTH_SECRET` and `DATA_ENCRYPTION_KEY` are mandatory in production |
| **Gemini API key hard-coded (base64) in `legacy/src/app/api/ai-assistant/route.ts`** | Key is in git history and must be considered leaked | New code reads keys only from the environment. **Action: revoke/rotate that key in Google AI Studio**, then delete `legacy/` |
| Uploads stored under `public/` | Anyone with the URL could download student documents | Files stored outside the web root, type-sniffed by magic bytes, served only after access checks |
| Permission checks only in the UI | API callable directly | Every API route enforces module + action + row scope on the server |

## 6. Security & privacy controls

- **Authentication:** school code + username/email/mobile; bcrypt; lockout after 5 failures; per-IP and per-account rate limits (DB-backed, so they hold across instances); forced password change for issued credentials; "sign out everywhere"; sessions revoked on password change, deactivation or role change.
- **Authorisation:** 37 modules × 11 roles; owner unrestricted; admins cannot change their own role's rights; row scope for teachers/parents/students.
- **Web:** same-origin check on every mutation, CSP, HSTS, frame-deny, no secrets in any API response (serializer strips them), HTML sanitiser for admin-authored templates and escaping of every substituted value.
- **Data:** money in integer paise; gap-free receipt/certificate numbers inside transactions; encrypted Aadhaar and gateway credentials (AES-256-GCM).
- **Accountability:** audit log for every change, sign-in and support action, read-only by design.

## 7. Architecture

Next.js 16 (App Router, `proxy.ts`), React 19, Tailwind with per-school brand palettes, Radix UI, TanStack Query/Table, Prisma 5 on MySQL 8, NextAuth credentials sessions, zod validation at every API boundary. Integrations: Razorpay (orders, signature verification, webhooks), MSG91/Twilio/WhatsApp Cloud, Claude or Gemini for the assistant. See `README.md` for the layout.

## 8. Verification status

| Check | Result |
|---|---|
| TypeScript (`npm run typecheck`) | clean |
| Production build (`npm run build`) | passes |
| Lint (`npm run lint`) | 0 errors; warnings are React-Compiler advisories |
| Unit tests (`npm test`) | 276 passing — sanitiser XSS payloads, money, Indian number words, permission ceilings, read-only rules, Aadhaar/PAN/IFSC/mobile, CBSE grades, Next.js export rules for every route/page |
| API integration (`npm run test:api`) | 113 passing — sign-in, RBAC, family scope, tenant isolation, notifications, roles & permissions, settings, certificates, activities, reports, AI guards, platform lifecycle |
| Browser smoke (`npx playwright test`) | Every menu page for admin, teacher, accountant, parent and student renders with no page errors or failed API calls |

## 9. Known limitations and next steps

1. **Gateways need the school's own accounts:** SMS (DLT-registered sender and templates), WhatsApp Cloud, Razorpay live keys. Until then messages are logged as "skipped" and online payment stays off.
2. **AI assistant needs a provider key** (`ANTHROPIC_API_KEY` preferred). During testing Gemini returned "high demand" errors; the app now falls back across models and fails gracefully.
3. **SaaS billing is manual:** plans, limits and paid-until dates are managed in the platform console; there is no automated subscription invoicing/GST yet.
4. **Student cap is soft:** checked before each admission, not under a lock, so simultaneous admissions could exceed it slightly.
5. **Scaling:** permission cache is per instance (30 s TTL) — changes are instant on one server and within 30 s across several.
6. **Not built:** native mobile apps (the web app is mobile-responsive), biometric device integration, email delivery, alumni module.
7. **Housekeeping:** rotate the leaked Gemini key; delete `legacy/` after sign-off; commit the branch; set up CI to run typecheck, lint, unit and API tests against a seeded database.
