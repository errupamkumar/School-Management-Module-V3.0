# Google Search campaign — setup guide

For: whoever sets up Google Ads, Analytics and Search Console for **https://school-management-module-v3-0.vercel.app**.

The website code is ready for search and ads: canonical URLs, `robots.txt`, `sitemap.xml`, share cards, structured data, Search Console verification, GA4 + Google Ads tags behind a consent banner, a lead conversion, and campaign attribution on every sign-up request. What remains is configuration in Vercel and Google's tools, in this order.

## 0. Blockers — fix before spending

| # | Check | Why | How |
|---|---|---|---|
| 1 | **The live site reaches its database** | On 8 Nov 2026 the deployment could not reach MySQL: sign-up requests fail and nobody can sign in. Every paid click would be wasted. | Use a hosted MySQL 8 (ideally in Mumbai, e.g. AWS RDS / Aiven / DigitalOcean `blr1`), set `DATABASE_URL` in **Vercel → Settings → Environment Variables**, then run `npx prisma db push` once against it. Check: `/pricing` shows ₹ prices, not "Plans for every size of school". |
| 2 | Production secrets | Sign-in and encryption need them. | In Vercel set `NEXTAUTH_SECRET`, `NEXTAUTH_URL=https://school-management-module-v3-0.vercel.app`, `DATA_ENCRYPTION_KEY`. Leave `NEXT_PUBLIC_DEMO_MODE` unset. |
| 3 | Operator account | Someone must read the leads. | `OPERATOR_PASSWORD='…' npm run platform:operator -- ops "Your Name"` with the production `DATABASE_URL`, then create plans under **Platform → Plans**. |
| 4 | "Data hosted in India" | The site says it; Vercel runs functions in the USA by default. | Either set the function region to Mumbai (`bom1`, Vercel → Settings → Functions) **and** host the database in India, or remove the claim from `src/website`. |
| 5 | Legal pages | Google requires a privacy policy where personal data is collected. | `/privacy` and `/terms` are live — have them reviewed (text in `src/website/content/legal.ts`). |
| 6 | No sample content | Fictional testimonials or customer numbers break Google's misrepresentation policy. | Keep `NEXT_PUBLIC_SHOW_SAMPLE_CONTENT` unset. Add real testimonials to `placeholder.ts` only with the school's consent. |

## 1. Tracking (GA4 + Google Ads)

1. **Google Analytics** → Admin → Create property → Web stream for the site URL. Copy the **Measurement ID** (`G-…`).
2. **Google Ads** → Goals → Conversions → **New conversion action** → Website → *Set up manually*:
   - Category **Submit lead form**, name **Website lead**, value *don't use a value* (or a fixed estimate), count **One**, click-through window 30–90 days.
   - Choose **Use Google tag** → *Install the tag yourself* and copy the **Ads ID** (`AW-…`) and the **conversion label** (the part after the `/` in `send_to`).
3. In **Vercel → Environment Variables** (Production) add:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-…` |
   | `NEXT_PUBLIC_GOOGLE_ADS_ID` | `AW-…` |
   | `NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL` | the conversion label |

4. **Redeploy** (these values are built into the page). Open the site: a cookie banner appears; after **Accept**, Google Tag Assistant should show both tags.
5. Link GA4 and Google Ads (GA4 Admin → Product links → Google Ads). Keep the Ads **Website lead** action as the primary conversion; if you also import GA4's `generate_lead`, mark it *secondary* to avoid double counting.

What the site sends:

| Event | When |
|---|---|
| Google Ads `conversion` → `AW-…/label` | a sign-up request is saved (not on errors) |
| GA4 `generate_lead` (`lead_type`: trial / demo) | same moment |
| GA4 `cta_click`, `login_click`, `contact_click` | clicks on sign-up buttons, Log in, phone and email links |
| GA4 `lead_submit_failed` | the form could not be saved (the visitor is offered email / call instead) |

Tags load only on the website and the sign-in / sign-up pages — never inside the school app — and use Consent Mode v2 (denied until the visitor accepts; Google models the rest).

## 2. Search Console and Bing

1. [Search Console](https://search.google.com/search-console) → Add property → **URL prefix** → the site URL → method **HTML tag**. Copy only the `content="…"` value into `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` in Vercel, redeploy, then click **Verify**.
2. Sitemaps → submit `sitemap.xml` (30 public pages). Use **URL inspection → Request indexing** for `/`, `/features` and the six keyword pages below.
3. Bing Webmaster Tools → import from Search Console, or use `NEXT_PUBLIC_BING_SITE_VERIFICATION` the same way.
4. When you move to a custom domain, set `NEXT_PUBLIC_SITE_URL` to it, redeploy, and add the new property.

## 3. Campaign structure

Campaign: **Search**, goal **Leads**, networks: Search only (untick Display), location **India** (or your target states), languages English + Hindi.
Bidding: start with **Maximise clicks** and a max CPC cap; switch to **Maximise conversions** after ~20–30 recorded leads.

One ad group per intent, each landing on the page that answers it (better Quality Score than sending everything to the home page):

| Ad group | Keywords (phrase / exact) | Final URL |
|---|---|---|
| School ERP (generic) | "school management software", "school erp software", "school erp portal", [school management system] | `/` |
| Fee management | "school fee management system", "school fee software", "online school fee payment" | `/features/fees` |
| Attendance | "student attendance software", "school attendance app", "attendance sms to parents" | `/features/attendance` |
| Admissions | "school admission software", "admission enquiry management" | `/features/admissions` |
| Exams & report cards | "report card software for schools", "school exam management software", "best school erp for cbse schools" | `/features/exams` |
| Parent app | "school app for parents", "school parent communication app" | `/features/parent-app` |
| Transport | "school bus tracking app", "school bus gps tracking" | `/features/transport` |

**Tracking template** (account level, keeps auto-tagging on):

```
{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}&utm_term={keyword}
```

The site stores these values with each sign-up request, so **Platform → Website leads → Source** shows e.g. *Google Ads · 1234567 · "school fee management system" → /features/fees*.

**Negative keywords:** free download, crack, github, source code, open source, php, project, college project, project report, pdf, tutorial, course, jobs, salary, login, student login.

## 4. Ad assets (lengths checked)

**Headlines (≤ 30)**

| | Headline | Chars |
|---|---|---|
| 1 | School Management Software | 26 |
| 2 | Smart School ERP Software | 25 |
| 3 | All-in-One School Management | 28 |
| 4 | Student, Fee & Exam Portal | 26 |
| 5 | Live Demo — Try It Free | 23 |
| 6 | Fees by UPI, Instant Receipts | 29 |
| 7 | Attendance with SMS Alerts | 26 |
| 8 | Parent App in 12 Languages | 26 |
| 9 | For CBSE, ICSE & State Boards | 29 |
| 10 | Report Cards in One Click | 25 |
| 11 | Live School Bus GPS Tracking | 28 |
| 12 | 51 Modules, One Login | 21 |
| 13 | Book a Free Live Demo | 21 |
| 14 | Admissions to Alumni | 20 |
| 15 | School ERP for Indian Schools | 29 |

Pin headline 1 or 15 to position 1 in the generic ad group; in feature ad groups put the matching headline (6, 7, 10, 11, 8) first.

**Descriptions (≤ 90)**

| | Description | Chars |
|---|---|---|
| 1 | Admissions, attendance, fees, exams and report cards in one secure cloud dashboard. | 83 |
| 2 | Parents pay fees by UPI, track the school bus and see homework in 12 Indian languages. | 86 |
| 3 | Built for CBSE, ICSE and State Board schools, with role-based access and an audit log. | 86 |
| 4 | Start a free trial or book a live demo. We set up your school and import your data. | 83 |

> From the original draft: *"Cloud-based school management built for schools and colleges. Fast, secure, and easy to use."* is **92 characters** (Google rejects it) and Vidyalaya is built for K-12 schools, not colleges — use description 3 instead. *"Cloud School Management v3.0"* is fine technically, but a version number does not help a principal; headline 15 works better. Description 4 promises set-up and data import — only use it if your team provides that.

**Sitelinks (≤ 25):** Fee Management → `/features/fees` · Student Attendance → `/features/attendance` · Parent & Student App → `/features/parent-app` · Plans & Pricing → `/pricing` · Book a Live Demo → `/get-started?interest=demo` · All 24 Features → `/features`

**Callouts (≤ 25):** 12 Indian Languages · UPI Fee Payments · Parent & Student App · CBSE, ICSE & State Boards · Role-Based Access · Live Bus GPS Tracking

**Structured snippet — Types:** Admissions, Attendance, Fees, Exams, Timetable, Transport, Hostel, Payroll

**Call asset:** (+91) 98748 30490 — schedule it for office hours.

## 5. Launch checklist

- [ ] `/pricing` shows live ₹ prices (database connected)
- [ ] A test sign-up on the live site appears in **Platform → Website leads** with its Source
- [ ] Cookie banner appears; after Accept, Tag Assistant shows GA4 and Ads; the Ads conversion shows *Recording conversions* after a test lead
- [ ] Search Console verified and sitemap submitted
- [ ] Sharing the URL on WhatsApp/LinkedIn shows the Vidyalaya card (check with the [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/))
- [ ] Privacy Policy and Terms reviewed
- [ ] "Data hosted in India" made true or removed
- [ ] Ad groups, negatives, assets and a daily budget set; campaign scheduled

## 6. Free promotion (outside the code)

- **Directories:** Product Hunt, AlternativeTo, SaaSHub, Capterra/GetApp India — use the 1200×630 card at `/opengraph-image` as the listing image and link to feature pages.
- **LinkedIn outreach** to principals and directors: share a feature page link (e.g. `/features/fees`); each has its own share card. For a feature sheet, the screenshots and module list in `docs/Vidyalaya-User-Guide.pdf` and `docs/Vidyalaya-Module-Coverage.pdf` can be reused.
- **Dev.to / Medium:** a build story (Next.js 16, Prisma, multi-tenant RBAC, Vercel) linking to the website earns backlinks.
- Every shared link inherits the attribution: add `?utm_source=linkedin&utm_medium=social&utm_campaign=outreach` to see those leads separately.
