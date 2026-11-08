/**
 * Fills the DEMO school so every dashboard KPI has data on the day it runs, and
 * adds sample tenant schools so the platform console has a business to show.
 *
 * Unlike the other demo tools this writes to DATABASE_URL directly, with the
 * same services the seed uses, because it back-dates attendance and ledger
 * entries (the API only allows "now"). Every step checks what already exists,
 * so it is safe to re-run; run it again on a later day to refresh the "today"
 * cards (attendance, collections, birthdays). The live site's day is the UTC
 * day (it starts at 05:30 IST), so run the daily refresh after 05:30 IST.
 *
 *   npx tsx docs/tools/demo-kpi.ts                   DEMO top-up + sample schools
 *   npx tsx docs/tools/demo-kpi.ts --no-samples      DEMO top-up only
 *   npx tsx docs/tools/demo-kpi.ts --remove-samples  delete the sample schools again
 *
 * Point it at another database with DATABASE_URL (PowerShell: $env:DATABASE_URL = "...").
 */
import type { AttendanceStatus, PaymentMode } from '@prisma/client';
import { prisma, tenantDb, formatNumber, nextSequence, type TenantDb } from '../../src/server/db';
import { readSettings, type SchoolSettings } from '../../src/server/settings';
import { admitStudent } from '../../src/server/services/people';
import { generateInvoices, collectPayment, academicYearFor } from '../../src/server/services/fees';
import { fromPaise, toPaise } from '../../src/server/services/money';
import { postLedger } from '../../src/server/services/ledger';

const DAY = 86_400_000;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const iso = (d: Date) => d.toISOString().slice(0, 10);

// The dashboard's "today" is the server's local date: IST here, UTC on Vercel.
// Mark both when they differ so the cards are filled wherever the app runs.
const NOW = new Date();
const TODAY = utc(NOW.getFullYear(), NOW.getMonth() + 1, NOW.getDate());
const UTC_TODAY = utc(NOW.getUTCFullYear(), NOW.getUTCMonth() + 1, NOW.getUTCDate());
const TODAYS = [...new Set([TODAY.getTime(), UTC_TODAY.getTime()])].map((t) => new Date(t));
const EARLIEST_TODAY = new Date(Math.min(...TODAYS.map((d) => d.getTime())));
const Y = TODAY.getUTCFullYear();
const M = TODAY.getUTCMonth() + 1;
const monthStart = (offset: number) => utc(Y, M + offset, 1);
const PERIOD = `${Y}-${String(M).padStart(2, '0')}`;

// Deterministic per day, so a re-run on the same day makes the same choices.
let seed = Number(iso(TODAY).replace(/-/g, ''));
function rand(): number {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const chance = (p: number) => rand() < p;
const phone = () => `${pick(['6', '7', '8', '9'])}${String(int(100000000, 999999999))}`;
const log = (msg: string) => console.log(`  ${msg}`);

const BOY = ['Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Reyansh', 'Ishaan', 'Rohan', 'Ayaan', 'Dhruv', 'Aryan', 'Pranav', 'Dev'];
const GIRL = ['Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Myra', 'Kiara', 'Anika', 'Navya', 'Riya', 'Kavya', 'Tanvi', 'Meera'];
const SURNAME = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Mishra', 'Pandey', 'Yadav', 'Jha', 'Sinha', 'Prasad', 'Tiwari'];
const FATHER = ['Rajesh', 'Suresh', 'Manoj', 'Sanjay', 'Anil', 'Vinod', 'Rakesh', 'Deepak', 'Amit', 'Ravi'];
const MOTHER = ['Sunita', 'Anita', 'Kavita', 'Rekha', 'Neha', 'Priya', 'Seema', 'Pooja', 'Ritu', 'Nidhi'];
const MODES: PaymentMode[] = ['CASH', 'UPI', 'UPI', 'UPI', 'BANK_TRANSFER', 'CARD'];

// ---------------------------------------------------------------------------
// DEMO school
// ---------------------------------------------------------------------------

async function topUpDemo() {
  const school = await prisma.school.findUnique({ where: { code: 'DEMO' } });
  if (!school) throw new Error('School DEMO not found. Run "npx tsx prisma/seed.ts" first.');
  const schoolId = school.id;
  const db = tenantDb(schoolId);
  const settings = readSettings(school.settings);
  const user = (username: string) => db.user.findFirstOrThrow({ where: { username } });
  const [admin, accountant, teacher] = await Promise.all([user('admin'), user('accountant'), user('teacher')]);
  console.log(`DEMO: ${school.name} (today ${TODAYS.map(iso).join(' / ')})`);

  // Admissions first so the new students also get today's attendance.
  await newAdmissions(db, schoolId, settings);
  await attendance(db, schoolId, admin.id);
  await collectionsToday(db, schoolId, settings, accountant);
  await accounts(db, schoolId, settings, admin.id, accountant.id);
  await birthdays(db);
  await classroom(db, schoolId, teacher);
  await pipeline(db, schoolId, settings, teacher);
}

/** "New this month" on the students card: admit a few through the real admission service. */
async function newAdmissions(db: TenantDb, schoolId: string, settings: SchoolSettings) {
  const want = 6;
  const have = await db.student.count({ where: { status: 'ACTIVE', admissionDate: { gte: monthStart(0) } } });
  if (have >= want) return log(`new admissions this month: ${have} already`);
  const campus = await db.campus.findFirstOrThrow({ where: { isMain: true } });
  // Usual entry points: Nursery, Class 1, 6, 9 and 11.
  const sections = await db.section.findMany({ where: { class: { numericOrder: { in: [1, 4, 9, 12, 14] } } }, include: { class: true }, orderBy: { class: { numericOrder: 'asc' } } });
  const ids: string[] = [];
  for (let i = have; i < want; i++) {
    const sec = sections[i % sections.length];
    const female = chance(0.5);
    const surname = pick(SURNAME);
    const father = `${pick(FATHER)} ${surname}`;
    const fatherPhone = phone();
    const r = await admitStudent(db, schoolId, settings, {
      student: {
        campusId: campus.id,
        classId: sec.classId,
        sectionId: sec.id,
        firstName: female ? pick(GIRL) : pick(BOY),
        lastName: surname,
        gender: female ? 'FEMALE' : 'MALE',
        dob: iso(utc(Y - (sec.class.numericOrder + 2), int(1, 12), int(1, 28))),
        admissionDate: iso(utc(Y, M, int(1, Math.max(1, TODAY.getUTCDate())))),
        address: `${int(1, 200)}, Kankarbagh, Patna`,
        city: 'Patna',
        state: 'Bihar',
        pincode: '800020',
      } as never,
      guardian: { fatherName: father, fatherPhone, motherName: `${pick(MOTHER)} ${surname}`, motherPhone: phone(), primaryPhone: fatherPhone, address: `${int(1, 200)}, Kankarbagh, Patna` } as never,
      createLogins: false,
    });
    ids.push(r.studentId);
  }
  const inv = await generateInvoices(db, schoolId, settings, 4, { period: PERIOD, studentIds: ids });
  log(`new admissions this month: +${ids.length} students, ${inv.created} invoice(s)`);
}

const studentStatus = (): AttendanceStatus => {
  const r = rand();
  return r < 0.89 ? 'PRESENT' : r < 0.94 ? 'ABSENT' : r < 0.98 ? 'LATE' : 'LEAVE';
};

/** Working days since the last marked day, plus today (even on a Sunday or holiday). */
async function attendance(db: TenantDb, schoolId: string, markedById: string) {
  const last = await db.studentAttendance.findFirst({ orderBy: { date: 'desc' }, select: { date: true } });
  const days: Date[] = [];
  if (last) for (let d = addDays(last.date, 1); d < EARLIEST_TODAY; d = addDays(d, 1)) if (d.getUTCDay() !== 0) days.push(d);
  days.push(...TODAYS);
  const [students, staff] = await Promise.all([
    db.student.findMany({ where: { status: 'ACTIVE' }, select: { id: true, sectionId: true } }),
    db.employee.findMany({ where: { status: 'ACTIVE' }, select: { id: true } }),
  ]);
  let marks = 0;
  for (const date of days) {
    const r = await db.studentAttendance.createMany({
      skipDuplicates: true,
      data: students.map((s) => ({ schoolId, studentId: s.id, sectionId: s.sectionId, date, status: studentStatus(), markedById })),
    });
    await db.employeeAttendance.createMany({
      skipDuplicates: true,
      data: staff.map((e) => {
        const r2 = rand();
        const status: AttendanceStatus = r2 < 0.93 ? 'PRESENT' : r2 < 0.97 ? 'LATE' : 'LEAVE';
        return {
          schoolId,
          employeeId: e.id,
          date,
          status,
          inTime: status === 'PRESENT' ? `07:${String(int(10, 29)).padStart(2, '0')}` : status === 'LATE' ? `08:${String(int(0, 25)).padStart(2, '0')}` : null,
          outTime: status === 'LEAVE' ? null : `14:${String(int(30, 59)).padStart(2, '0')}`,
          markedById,
        };
      }),
    });
    marks += r.count;
  }
  log(`attendance: ${days.map(iso).join(', ')} (${marks} student marks added)`);
}

/** "Collected today": settle a few of this month's open invoices through the fee service. */
async function collectionsToday(db: TenantDb, schoolId: string, settings: SchoolSettings, collector: { id: string; name: string }) {
  const want = 8;
  // Receipts are stamped "now", which is in the current UTC day: the day the dashboard on Vercel calls today.
  const have = await db.feePayment.count({ where: { status: 'SUCCESS', paidAt: { gte: UTC_TODAY } } });
  if (have >= want) return log(`collections today: ${have} receipts already`);
  const open = await db.feeInvoice.findMany({ where: { period: PERIOD, status: { in: ['UNPAID', 'PARTIAL'] } }, orderBy: { dueDate: 'asc' }, take: want - have, select: { id: true, studentId: true, total: true, paidAmount: true } });
  let sum = 0;
  for (const inv of open) {
    const amount = toPaise(inv.total) - toPaise(inv.paidAmount);
    if (amount <= 0) continue;
    const mode = pick(MODES);
    await collectPayment(db, schoolId, settings, {
      studentIds: [inv.studentId],
      invoiceIds: [inv.id],
      amount,
      mode,
      paidAt: new Date(),
      referenceNo: mode === 'UPI' || mode === 'BANK_TRANSFER' ? `UTR${int(100000000, 999999999)}` : null,
      collectedBy: collector,
    });
    sum += amount;
  }
  log(`collections today: +${open.length} receipts, Rs ${(sum / 100).toLocaleString('en-IN')}`);
}

const EXPENSES = ['Electricity', 'Building Maintenance', 'Stationery', 'Diesel & Vehicle Upkeep', 'Internet & Telephone', 'Events & Functions'];
const OTHER_INCOME: Array<[name: string, min: number, max: number, everyMonth: boolean]> = [
  ['Hall Rent', 6000, 15000, true],
  ['Scrap Sale', 1500, 6000, false],
];

/** Income vs expense chart: monthly expenses and other income for the last six months, and salaries paid so far. */
async function accounts(db: TenantDb, schoolId: string, settings: SchoolSettings, adminId: string, accountantId: string) {
  const heads = await db.accountHead.findMany();
  const headId = (name: string, type: 'INCOME' | 'EXPENSE') => heads.find((h) => h.name === name && h.type === type)?.id;
  let entries = 0;
  for (let i = 5; i >= 0; i--) {
    const from = monthStart(-i);
    const to = monthStart(-i + 1);
    const lastDay = i === 0 ? TODAY.getUTCDate() : new Date(to.getTime() - DAY).getUTCDate();
    if (lastDay < 3) continue;
    const label = MONTHS[from.getUTCMonth()];
    const inMonth = async (id: string) => (await db.ledgerEntry.count({ where: { headId: id, date: { gte: from, lt: to } } })) > 0;
    const day = () => utc(from.getUTCFullYear(), from.getUTCMonth() + 1, int(3, Math.min(25, lastDay)));
    for (const name of EXPENSES) {
      const id = headId(name, 'EXPENSE');
      if (!id || (await inMonth(id))) continue;
      await db.ledgerEntry.create({
        data: { schoolId, headId: id, type: 'EXPENSE', amount: fromPaise(int(4000, 45000) * 100), date: day(), description: `${name} — ${label}`, mode: pick(['BANK_TRANSFER', 'CASH', 'UPI'] as const), party: pick(['SBPDCL', 'Sharma Traders', 'Airtel Business', 'Indian Oil', 'Local Vendor']), createdById: accountantId },
      });
      entries++;
    }
    for (const [name, min, max, everyMonth] of OTHER_INCOME) {
      const id = headId(name, 'INCOME');
      if (!id || (!everyMonth && i % 2 === 1) || (await inMonth(id))) continue;
      await db.ledgerEntry.create({
        data: { schoolId, headId: id, type: 'INCOME', amount: fromPaise(int(min, max) * 100), date: day(), description: `${name} — ${label}`, mode: pick(['BANK_TRANSFER', 'UPI', 'CASH'] as const), party: name === 'Hall Rent' ? pick(['Patna Wedding Planners', 'Bihar Coaching Centre', 'Rotary Club Patna']) : 'Kabadi Traders', createdById: accountantId },
      });
      entries++;
    }
  }

  // Salaries for every month whose pay day (the 1st of the next month) has passed.
  const ayStart = Number(academicYearFor(TODAY).slice(0, 4));
  const employees = await db.employee.findMany({ where: { status: 'ACTIVE' } });
  let slips = 0;
  for (let k = 0; k < 12; k++) {
    const first = utc(ayStart, 4 + k, 1);
    const paidAt = utc(first.getUTCFullYear(), first.getUTCMonth() + 2, 1);
    if (paidAt > TODAY) break;
    const month = `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, '0')}`;
    const paid = new Set((await db.salaryPayment.findMany({ where: { month }, select: { employeeId: true } })).map((s) => s.employeeId));
    for (const e of employees) {
      if (paid.has(e.id)) continue;
      const net = Math.round((Number(e.basicSalary) + Number(e.allowances) - Number(e.deductions)) * 100);
      const name = `${e.firstName} ${e.lastName ?? ''}`.trim();
      await db.$transaction(async (tx) => {
        const n = await nextSequence(tx, schoolId, 'salary');
        const slip = await tx.salaryPayment.create({
          data: { schoolId, slipNo: formatNumber(settings.numbering.salarySlipPrefix, n, 5), employeeId: e.id, month, basic: e.basicSalary, allowances: e.allowances, deductions: e.deductions, net: fromPaise(net), mode: 'BANK_TRANSFER', paidAt, paidById: adminId },
        });
        await postLedger(tx, schoolId, { kind: 'SALARY', amount: net, date: paidAt, description: `Salary ${month} — ${name}`, mode: 'BANK_TRANSFER', referenceNo: slip.slipNo, party: name, sourceId: slip.id, createdById: adminId });
      });
      slips++;
    }
  }
  // The seed staffs DEMO like a 500-pupil school but bills 200, so expenses outrun fees. Top each
  // month up with term instalments of development charges to a modest surplus.
  let devHead = (await db.accountHead.findFirst({ where: { name: 'Development & Annual Charges', type: 'INCOME' } }))?.id;
  devHead ??= (await db.accountHead.create({ data: { schoolId, name: 'Development & Annual Charges', type: 'INCOME' } })).id;
  let topUps = 0;
  for (let i = 5; i >= 0; i--) {
    const from = monthStart(-i);
    const to = monthStart(-i + 1);
    if (await db.ledgerEntry.count({ where: { headId: devHead, date: { gte: from, lt: to } } })) continue;
    const sums = await db.ledgerEntry.groupBy({ by: ['type'], where: { date: { gte: from, lt: to } }, _sum: { amount: true } });
    const sum = (t: string) => Number(sums.find((s) => s.type === t)?._sum.amount ?? 0);
    const gap = Math.round((sum('EXPENSE') * 1.12 - sum('INCOME')) / 1000) * 1000;
    if (gap <= 0) continue;
    const lastDay = i === 0 ? TODAY.getUTCDate() : new Date(to.getTime() - DAY).getUTCDate();
    await db.ledgerEntry.create({
      data: { schoolId, headId: devHead, type: 'INCOME', amount: fromPaise(gap * 100), date: utc(from.getUTCFullYear(), from.getUTCMonth() + 1, Math.min(lastDay, int(1, 10))), description: `Development & annual charges — ${MONTHS[from.getUTCMonth()]}`, mode: 'BANK_TRANSFER', party: 'Parents (term instalment)', createdById: accountantId },
    });
    topUps++;
  }
  log(`accounts: +${entries} ledger entries, +${slips} salary slips, +${topUps} development-charge instalments`);
}

/** "Birthdays today": move a couple of birthdays to today if nobody has one. */
async function birthdays(db: TenantDb) {
  const isToday = (d: Date | null) => !!d && d.getUTCMonth() === TODAY.getUTCMonth() && d.getUTCDate() === TODAY.getUTCDate();
  const toToday = (d: Date) => utc(d.getUTCFullYear(), M, TODAY.getUTCDate());
  const students = await db.student.findMany({ where: { status: 'ACTIVE', dob: { not: null } }, select: { id: true, dob: true } });
  const staff = await db.employee.findMany({ where: { status: 'ACTIVE', dob: { not: null } }, select: { id: true, dob: true } });
  let moved = 0;
  if (students.filter((s) => isToday(s.dob)).length < 2) {
    for (const s of [pick(students), pick(students)]) {
      await db.student.update({ where: { id: s.id }, data: { dob: toToday(s.dob!) } });
      moved++;
    }
  }
  if (!staff.some((e) => isToday(e.dob)) && staff.length) {
    const e = pick(staff);
    await db.employee.update({ where: { id: e.id }, data: { dob: toToday(e.dob!) } });
    moved++;
  }
  log(`birthdays today: ${moved ? `${moved} moved to today` : 'already present'}`);
}

/** Family dashboard: homework due this week in every section, and upcoming live classes. */
async function classroom(db: TenantDb, schoolId: string, teacher: { id: string; name: string }) {
  const classes = await db.class.findMany({ where: { isActive: true }, include: { sections: true, subjects: true } });
  const titles = ['Chapter exercise', 'Worksheet practice', 'Read and summarise', 'Solve textbook questions', 'Revision notes'];
  let homework = 0;
  for (const c of classes) {
    if (!c.subjects.length) continue;
    for (const s of c.sections) {
      if (await db.homework.count({ where: { sectionId: s.id, dueOn: { gte: TODAY } } })) continue;
      await db.homework.create({
        data: { schoolId, classId: c.id, sectionId: s.id, subjectId: pick(c.subjects).subjectId, title: pick(titles), description: `Complete questions ${int(1, 5)} to ${int(8, 15)} from the current chapter in your notebook.`, assignedOn: TODAY, dueOn: addDays(TODAY, int(2, 6)), createdById: teacher.id, createdByName: teacher.name },
      });
      homework++;
    }
  }

  let live = 0;
  if ((await db.liveClass.count({ where: { startsAt: { gte: NOW } } })) < 4) {
    const sec = await db.section.findFirstOrThrow({ where: { class: { numericOrder: 13 } } });
    // Times are IST: 10:30 = 05:00 UTC, 16:00 = 10:30 UTC.
    const at = (days: number, hUtc: number, mUtc: number) => new Date(Date.UTC(Y, M - 1, TODAY.getUTCDate() + days, hUtc, mUtc));
    const rows = [
      { title: 'Revision — Light: Reflection and Refraction', platform: 'GOOGLE_MEET', meetingUrl: 'https://meet.google.com/rev-lght-ref', audience: 'SECTION', classId: sec.classId, sectionId: sec.id, startsAt: at(1, 10, 30), durationMins: 45 },
      { title: 'Career guidance webinar for Classes 9–12', platform: 'ZOOM', meetingUrl: 'https://zoom.us/j/9876543210', audience: 'ALL_STUDENTS', startsAt: at(2, 5, 0), durationMins: 60 },
      { title: 'Doubt clearing — Trigonometry', platform: 'GOOGLE_MEET', meetingUrl: 'https://meet.google.com/dbt-trig-ntr', audience: 'SECTION', classId: sec.classId, sectionId: sec.id, startsAt: at(4, 10, 30), durationMins: 45 },
      { title: 'Staff briefing: Term 2 assessments', platform: 'JITSI', meetingUrl: 'https://meet.jit.si/vidyalaya-term2-briefing', audience: 'ALL_STAFF', startsAt: at(5, 9, 0), durationMins: 30 },
    ];
    for (const r of rows) await db.liveClass.create({ data: { schoolId, ...r, hostId: teacher.id, hostName: teacher.name } });
    live = rows.length;
  }
  log(`classroom: +${homework} homework, +${live} live classes`);
}

/** Pending counters: fresh admission enquiries and leave requests. */
async function pipeline(db: TenantDb, schoolId: string, settings: SchoolSettings, teacher: { id: string }) {
  const ay = academicYearFor(TODAY);
  const recent = await db.admissionApplication.count({ where: { stage: 'ENQUIRY', createdAt: { gte: addDays(TODAY, -7) } } });
  const classes = await db.class.findMany({ where: { isActive: true }, select: { id: true } });
  let enquiries = 0;
  for (let i = recent; i < 4; i++) {
    const n = await db.$transaction((tx) => nextSequence(tx, schoolId, 'application'));
    const female = chance(0.5);
    await db.admissionApplication.create({
      data: {
        schoolId,
        applicationNo: formatNumber(settings.numbering.applicationPrefix, n, 5),
        stage: 'ENQUIRY',
        source: pick(['ONLINE', 'ONLINE', 'CAMPAIGN', 'PHONE', 'WALK_IN']),
        classId: pick(classes).id,
        academicYear: ay,
        studentName: `${female ? pick(GIRL) : pick(BOY)} ${pick(SURNAME)}`,
        gender: female ? 'FEMALE' : 'MALE',
        guardianName: `${pick(FATHER)} ${pick(SURNAME)}`,
        guardianPhone: phone(),
        notes: pick(['Asked about transport and fee structure.', 'Wants a campus visit this week.', 'Enquired about the science stream.', 'Sibling already studies here.']),
        followUpAt: addDays(TODAY, int(1, 4)),
        consentGiven: true,
        createdAt: new Date(NOW.getTime() - int(1, 72) * 3600_000),
      },
    });
    enquiries++;
  }

  let leaves = 0;
  if ((await db.leaveRequest.count({ where: { status: 'PENDING' } })) < 4) {
    const colleague = await db.employee.findFirst({ where: { status: 'ACTIVE', isTeaching: true, userId: { not: null }, NOT: { userId: teacher.id } } });
    if (colleague?.userId) {
      await db.leaveRequest.create({ data: { schoolId, applicantId: colleague.userId, employeeId: colleague.id, leaveType: 'CASUAL', fromDate: addDays(TODAY, 3), toDate: addDays(TODAY, 4), reason: 'Attending a family wedding.' } });
      leaves++;
    }
    const child = await db.student.findFirst({ where: { status: 'ACTIVE', guardian: { userId: { not: null } }, class: { numericOrder: { lte: 8 } } }, include: { guardian: true } });
    if (child?.guardian?.userId) {
      await db.leaveRequest.create({ data: { schoolId, applicantId: child.guardian.userId, studentId: child.id, leaveType: 'SICK', fromDate: addDays(TODAY, 1), toDate: addDays(TODAY, 1), reason: 'Dental appointment in the morning.' } });
      leaves++;
    }
  }
  log(`pipeline: +${enquiries} enquiries, +${leaves} leave requests`);
}

// ---------------------------------------------------------------------------
// Sample schools for the platform console
// ---------------------------------------------------------------------------

type Sample = { code: string; name: string; city: string; state: string; plan: string; status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED'; joinedDaysAgo: number; trialDaysLeft?: number; students: number };
const SAMPLES: Sample[] = [
  { code: 'SVSG', name: 'Sunrise Valley School', city: 'Gaya', state: 'Bihar', plan: 'GROWTH', status: 'ACTIVE', joinedDaysAgo: 160, students: 420 },
  { code: 'GDAM', name: 'Gyandeep Academy', city: 'Muzaffarpur', state: 'Bihar', plan: 'STARTER', status: 'ACTIVE', joinedDaysAgo: 128, students: 180 },
  { code: 'LISR', name: 'Lotus International School', city: 'Ranchi', state: 'Jharkhand', plan: 'ENTERPRISE', status: 'ACTIVE', joinedDaysAgo: 96, students: 640 },
  { code: 'GVPS', name: 'Ganga View Public School', city: 'Bhagalpur', state: 'Bihar', plan: 'GROWTH', status: 'ACTIVE', joinedDaysAgo: 64, students: 350 },
  { code: 'LSKP', name: 'Little Scholars Kindergarten', city: 'Patna', state: 'Bihar', plan: 'STARTER', status: 'ACTIVE', joinedDaysAgo: 33, students: 95 },
  { code: 'NJVD', name: 'Navjyoti Vidyalaya', city: 'Darbhanga', state: 'Bihar', plan: 'STARTER', status: 'SUSPENDED', joinedDaysAgo: 140, students: 120 },
  { code: 'GMSD', name: 'Green Meadows School', city: 'Dhanbad', state: 'Jharkhand', plan: 'GROWTH', status: 'TRIAL', joinedDaysAgo: 7, trialDaysLeft: 3, students: 260 },
  { code: 'BFPS', name: 'Bright Future Public School', city: 'Varanasi', state: 'Uttar Pradesh', plan: 'GROWTH', status: 'TRIAL', joinedDaysAgo: 5, trialDaysLeft: 6, students: 210 },
  { code: 'RCSS', name: 'Riverside Convent School', city: 'Siliguri', state: 'West Bengal', plan: 'STARTER', status: 'TRIAL', joinedDaysAgo: 2, trialDaysLeft: 12, students: 140 },
];

async function addSamples() {
  console.log('Platform: sample schools');
  const plans = await prisma.subscriptionPlan.findMany({ select: { id: true, code: true } });
  for (const s of SAMPLES) {
    if (await prisma.school.findUnique({ where: { code: s.code } })) {
      log(`${s.code} ${s.name}: exists`);
      continue;
    }
    const createdAt = addDays(NOW, -s.joinedDaysAgo);
    const school = await prisma.school.create({
      data: { code: s.code, name: s.name, shortName: s.code, city: s.city, state: s.state, board: 'CBSE', status: s.status, planId: plans.find((p) => p.code === s.plan)?.id, trialEndsAt: s.trialDaysLeft ? addDays(NOW, s.trialDaysLeft) : null, createdAt },
    });
    const schoolId = school.id;
    const db = tenantDb(schoolId);
    const campus = await db.campus.create({ data: { schoolId, name: 'Main Campus', code: 'MAIN', isMain: true, city: s.city } });
    const cls = await db.class.create({ data: { schoolId, campusId: campus.id, name: 'All classes', numericOrder: 1 } });
    const sec = await db.section.create({ data: { schoolId, classId: cls.id, name: 'A', capacity: 2000 } });
    await db.student.createMany({
      data: Array.from({ length: s.students }, (_, i) => {
        const female = chance(0.48);
        return { schoolId, campusId: campus.id, classId: cls.id, sectionId: sec.id, admissionNo: `S${String(i + 1).padStart(4, '0')}`, firstName: female ? pick(GIRL) : pick(BOY), lastName: pick(SURNAME), gender: female ? 'FEMALE' : 'MALE', admissionDate: createdAt } as const;
      }),
    });
    log(`${s.code} ${s.name}: ${s.status}, ${s.plan}, ${s.students} students`);
  }
}

/** Deletes the sample schools. A school with any user (every real signup has an owner) is never touched. */
async function removeSamples() {
  console.log('Platform: removing sample schools');
  for (const s of SAMPLES) {
    const school = await prisma.school.findUnique({ where: { code: s.code } });
    if (!school) continue;
    if (await prisma.user.count({ where: { schoolId: school.id } })) {
      log(`${s.code}: has user accounts, so it is not a sample school; left alone`);
      continue;
    }
    const where = { schoolId: school.id };
    await prisma.student.deleteMany({ where });
    await prisma.section.deleteMany({ where });
    await prisma.class.deleteMany({ where });
    await prisma.campus.deleteMany({ where });
    await prisma.school.delete({ where: { id: school.id } });
    log(`${s.code} ${s.name}: removed`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const t0 = Date.now();
  if (args.includes('--remove-samples')) {
    await removeSamples();
  } else {
    await topUpDemo();
    if (!args.includes('--no-samples')) await addSamples();
  }
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
