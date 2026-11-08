# Module coverage against the 61-module ERP checklist

This document checks Vidyalaya against a typical full-suite school ERP module list: 22 core, 17 standard, 10 premium and 12 ultimate modules. Each row names the screen where the feature lives.

Status:
- **Built:** it was already in the product before 18 October 2026.
- **Added:** it was built on 18 October 2026.
- **Extended:** part of it existed, and the missing part was added.

Every row marked Added or Extended is covered by `tests/api/gap-features.ts` (216 checks) and the unit tests.

**Summary:**
- **All 61 items** are now covered.
- **31** were already built.
- **26** were added.
- **4** were extended.

## Core modules (22)

| Module | Status | Where |
|---|---|---|
| Multiple dashboards | Built | Dashboard, per role: owner, principal, teacher, accountant, front office, parent, student |
| News management | Built + Added | Noticeboard (built); **News & Blog** with review and a public news page (added) |
| Timetable | Built | Timetable, with clash detection |
| Student admission | Built | Admissions: enquiry CRM, online form, applications pipeline |
| Messaging system | Built | Messages (in-app chat) |
| Student attendance | Built | Attendance: daily, card scan, registers, absence alerts |
| Courses and batches | Built | Classes & Subjects: classes, sections, subjects, teacher allocation |
| Human resources | Built | Employees, Staff Attendance, Leave, Payroll |
| Finance | Built | Fees, Accounts, Payroll |
| Examination | Built | Exams & Results, Class Tests, Question Papers |
| User management | Built | Staff and student logins, Roles & Permissions |
| Report center | Built + Extended | Reports, plus the **Report builder** (added) |
| Employee / teacher login | Built | Role-based staff logins |
| Students / parents login | Built | Family portal with child switcher |
| Student information | Built | Student profile (360° view) |
| Custom student remarks | **Extended** | **Report-card remarks** with a school remark bank, printed on the report card; general remarks per student |
| Certificate generator | Built | Certificates, with QR verification |
| ID card generator | Built | Certificates & ID cards |
| SMS integration | Built | SMS, WhatsApp & Email (MSG91, Twilio, DLT templates) |
| School / events calendar | Built | Calendar & Events |
| Advance fees | **Added** | Fees: overpayment kept as advance and used automatically; on/off switch |
| Gradebook | **Added** | Exams → **Gradebook**: weighted results across exams, with grade and rank |

## Standard modules (17)

| Module | Status | Where |
|---|---|---|
| Hostel / dormitory | Built | Hostel: rooms, beds, allocation, fee on invoice |
| Instant fees | **Added** | Fees → Invoices → **Instant invoice**: one-off charges for students, a class or a section |
| Library | Built + Extended | Library, plus **book import** |
| Data management | **Extended** | **Data export**: the owner downloads every record as Excel; imports with row-by-row checking |
| Email integration | **Added** | SMTP set-up with a test email; **Email** channel for bulk messages and reminders |
| Transportation | Built | Transport and live GPS tracking |
| Custom import | **Extended** | Student import (built); **staff, books, fee dues and past receipts** (added) |
| Blog | **Added** | News & Blog |
| Poll | **Added** | **Polls & Forms** |
| Custom report | **Added** | Reports → **Report builder**: choose the source, columns and filters; save and share |
| Theme | Built | School Settings → branding palette, logo, dark mode |
| Placement | **Added** | **Placements**: drives, eligibility, applications, selection alerts |
| Gallery | **Added** | **Gallery**: albums, bulk photo upload, staff-only albums |
| Task | **Added** | **Tasks**: multiple assignees, progress roll-up, comments |
| Inventory | Built | Assets & Inventory; Store & POS |
| Discussion | **Added** | **Discussions**: audience-limited forums with moderation |
| Discipline | **Added** | **Discipline**: incident register with parent sharing |

## Premium modules (10)

| Module | Status | Where |
|---|---|---|
| Data export | **Added** | Owner-only full Excel export; CSV export on every list |
| Tally integration | Built | Accounts → Tally XML (ledgers and vouchers) |
| Payment gateway integration | Built | Razorpay: UPI, cards, net banking, webhooks |
| Student assignment management | Built | Homework with online submissions |
| Fees import | **Added** | Fees → Invoices → **Import**: opening dues and past receipts |
| Google SSO | **Added** | Sign in with Google Workspace, limited to the school's domain |
| Form builder | **Added** | Polls & Forms: 7 question types, anonymous option, export |
| Reminder | **Added** | **Reminders**: scheduled or repeating, by app, phone, SMS or email |
| App frame | **Added** | **Apps**: the school's other web tools inside the app, per role |
| Enquiry & registration | Built | Admissions CRM and public application form |

## Ultimate modules (12)

| Module | Status | Where |
|---|---|---|
| Alumni | **Added** | **Alumni**: directory, import of former students, public self-registration |
| Audit | Built | Audit Log |
| Azure integration | **Added** | Sign in with Microsoft 365 / Azure AD (Entra ID) |
| Doc manager | **Added** | **Document Manager**: folders, sharing by role, versions, renewal alerts |
| Automatic timetable generator | Built | Timetable → Auto-generate |
| Paybooks integration | **Added** | Payroll → **Paybooks**: employee master and monthly attendance with loss-of-pay days (file import) |
| Gate management | **Added** | **Gate & Visitors**: visitor register and passes, student gate passes with parent alerts |
| Google Docs | **Extended** | Study material shows Google Docs, Sheets, Slides, Forms, Drive and YouTube previews in the app |
| Online examination | **Added** | **Online Exams**: timed, shuffled, auto-marked, teacher marks written answers, results review |
| QuickBooks integration | **Added** | Accounts → **QuickBooks**: journal CSV for QuickBooks Online and IIF for QuickBooks Desktop |
| Google Meet integration | Built | Live Classes: Google Meet, Zoom, Teams, Jitsi |
| BigBlueButton integration | **Added** | Live Classes on the school's own BigBlueButton server, with personal signed links |

## What is configurable

Each school controls the new features without code changes:
- **Modules:** every new module can be switched off per school in Roles & Permissions, and rights can be set per role.
- **Plans:** Starter, Growth and Enterprise include different modules (see `prisma/upgrade-plans.ts`).
- **School Settings:**

| Settings tab | What can be changed |
|---|---|
| Fees & payments | Accept advance fees |
| SMS, WhatsApp & Email | SMTP server and sender |
| Integrations & data | Google / Microsoft sign-in and allowed domains; Apps; BigBlueButton; public news page; alumni self-registration; data export |
| Rules | Remark bank; discipline categories; gate-pass alerts to parents |

## Honest limits

- **Google/Microsoft sign-in and BigBlueButton** use the operator's OAuth apps and the school's own BBB server. They were verified with unit tests and configuration checks, not against the live services. Add the keys from `.env.example`.
- **Paybooks and QuickBooks** are file exports in their import formats, not live API connections. Paybooks' API needs a partner agreement.
- **Reminders** go out on time when a scheduler calls `/api/public/cron` every minute with `CRON_SECRET`. Without one, due reminders go out when anyone next uses the app.
- **Data export** covers up to 100,000 rows per table and excludes uploaded files. Larger schools need a database dump.
- **Placements** are aimed at senior classes. Most K-12 schools will switch this module off.
