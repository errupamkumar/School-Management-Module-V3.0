/**
 * Demo seed: one platform admin and two schools.
 *
 *   DEMO  Vidyalaya Public School (Patna) — full data set, every module
 *   GVS   Green Valley School (Ranchi)    — small, Starter plan; proves tenant isolation
 *
 * All demo logins use SEED_PASSWORD (default Demo@12345). Refuses to run in
 * production unless SEED_ALLOW_DEMO=1.
 */
import { Prisma, type Gender, type PaymentMode } from '@prisma/client';
import { prisma, tenantDb, formatNumber, nextSequence } from '../src/server/db';
import { hashPassword } from '../src/server/crypto';
import { readSettings } from '../src/server/settings';
import { admitStudent, hireEmployee, createLogin } from '../src/server/services/people';
import { generateInvoices, collectPayment, academicYearFor } from '../src/server/services/fees';
import { fromPaise } from '../src/server/services/money';
import { DEFAULT_GRADES } from '../src/server/services/exams';
import { DEFAULT_CERTIFICATE_TEMPLATES, DEFAULT_RULES } from '../src/server/defaults';
import { MODULE_KEYS } from '../src/lib/modules';

if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_DEMO !== '1') {
  console.error('Refusing to seed demo data in production. Set SEED_ALLOW_DEMO=1 to override.');
  process.exit(1);
}

const PASSWORD = process.env.SEED_PASSWORD || 'Demo@12345';

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------
let seed = 20261017;
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

const BOY = ['Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Reyansh', 'Sai', 'Krishna', 'Ishaan', 'Kabir', 'Rohan', 'Ayaan', 'Shaurya', 'Atharv', 'Dhruv', 'Harsh', 'Aryan', 'Yash', 'Rudra', 'Pranav', 'Ansh', 'Om', 'Lakshya', 'Dev', 'Kunal', 'Nikhil'];
const GIRL = ['Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Ira', 'Myra', 'Kiara', 'Pari', 'Anika', 'Navya', 'Riya', 'Sneha', 'Prisha', 'Avni', 'Kavya', 'Tanvi', 'Ishita', 'Meera', 'Nisha', 'Pooja', 'Shreya', 'Khushi', 'Aditi', 'Muskan', 'Sakshi'];
const SURNAME = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Mishra', 'Pandey', 'Yadav', 'Jha', 'Sinha', 'Prasad', 'Tiwari', 'Srivastava', 'Chaudhary', 'Rai', 'Thakur', 'Pathak', 'Dubey', 'Ojha', 'Ranjan'];
const MALE_ADULT = ['Rajesh', 'Suresh', 'Manoj', 'Sanjay', 'Anil', 'Vinod', 'Ashok', 'Rakesh', 'Deepak', 'Amit', 'Pankaj', 'Ravi', 'Santosh', 'Mukesh', 'Alok'];
const FEMALE_ADULT = ['Sunita', 'Anita', 'Kavita', 'Rekha', 'Neha', 'Priya', 'Seema', 'Pooja', 'Archana', 'Ritu', 'Shalini', 'Madhu', 'Renu', 'Kiran', 'Nidhi'];
const OCCUPATION = ['Business', 'Government Service', 'Private Job', 'Farmer', 'Doctor', 'Teacher', 'Engineer', 'Shopkeeper', 'Advocate', 'Bank Employee'];
const LOCALITY = ['Boring Road', 'Kankarbagh', 'Rajendra Nagar', 'Patliputra Colony', 'Bailey Road', 'Ashok Rajpath', 'Danapur', 'Anisabad', 'Gardanibagh', 'Phulwari Sharif'];

function phone(): string {
  return `${pick(['6', '7', '8', '9'])}${String(int(100000000, 999999999))}`;
}
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function utcDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

const TODAY = (() => {
  const n = new Date();
  return utcDate(n.getFullYear(), n.getMonth() + 1, n.getDate());
})();

// ---------------------------------------------------------------------------
// Platform
// ---------------------------------------------------------------------------
async function seedPlatform(hash: string) {
  const starterModules = ['dashboard', 'students', 'employees', 'academics', 'settings', 'access_control', 'audit_logs', 'attendance', 'staff_attendance', 'fees', 'notices', 'homework', 'timetable', 'exams', 'events', 'leave', 'guardians', 'certificates', 'reports', 'messaging', 'gate', 'discipline', 'polls', 'gallery', 'tasks', 'documents', 'reminders', 'apps'];
  const growthModules = [...starterModules, 'admissions', 'accounts', 'payroll', 'class_tests', 'lms', 'live_classes', 'transport', 'library', 'sms', 'meetings', 'behaviour', 'hostel', 'online_exams', 'discussion', 'blog', 'alumni', 'placements'];

  const plans = [
    { code: 'STARTER', name: 'Starter', description: 'Core administration for small schools.', priceMonthly: 999, pricePerStudent: 0, maxStudents: 300, maxCampuses: 1, modules: starterModules, sortOrder: 1 },
    { code: 'GROWTH', name: 'Growth', description: 'Finance, transport, library and communication.', priceMonthly: 2499, pricePerStudent: 0, maxStudents: 1200, maxCampuses: 2, modules: growthModules, sortOrder: 2 },
    { code: 'ENTERPRISE', name: 'Enterprise', description: 'Every module, multi-campus, AI assistant.', priceMonthly: 0, pricePerStudent: 25, maxStudents: null, maxCampuses: null, modules: MODULE_KEYS, sortOrder: 3 },
  ];
  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      update: { ...p, priceMonthly: new Prisma.Decimal(p.priceMonthly), pricePerStudent: new Prisma.Decimal(p.pricePerStudent) },
      create: { ...p, priceMonthly: new Prisma.Decimal(p.priceMonthly), pricePerStudent: new Prisma.Decimal(p.pricePerStudent) },
    });
  }

  const existing = await prisma.user.findFirst({ where: { schoolId: null, username: 'platform' } });
  if (!existing) {
    await prisma.user.create({
      data: { username: 'platform', email: 'platform@vidyalaya.app', name: 'Platform Operator', role: 'PLATFORM_ADMIN', passwordHash: hash, mustChangePassword: false },
    });
  }
}

// ---------------------------------------------------------------------------
// School
// ---------------------------------------------------------------------------
interface SchoolSpec {
  code: string;
  name: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  plan: string;
  classes: Array<{ name: string; order: number; sections: string[]; fee: number }>;
  studentsPerSection: [number, number];
  teachers: number;
  full: boolean;
}

const CLASS_SUBJECTS: Record<string, string[]> = {
  pre: ['ENG', 'HIN', 'MAT', 'EVS', 'ART'],
  primary: ['ENG', 'HIN', 'MAT', 'EVS', 'CS', 'GK'],
  middle: ['ENG', 'HIN', 'MAT', 'SCI', 'SST', 'SAN', 'CS'],
  secondary: ['ENG', 'HIN', 'MAT', 'SCI', 'SST', 'CS'],
  senior: ['ENG', 'PHY', 'CHE', 'MAT', 'BIO', 'PE'],
};
function levelOf(order: number) {
  if (order <= 3) return 'pre';
  if (order <= 8) return 'primary';
  if (order <= 11) return 'middle';
  if (order <= 13) return 'secondary';
  return 'senior';
}

const SUBJECTS = [
  ['ENG', 'English'], ['HIN', 'Hindi'], ['MAT', 'Mathematics'], ['SCI', 'Science'], ['SST', 'Social Science'], ['SAN', 'Sanskrit'],
  ['CS', 'Computer Science'], ['EVS', 'Environmental Studies'], ['GK', 'General Knowledge'], ['ART', 'Art & Craft'],
  ['PHY', 'Physics'], ['CHE', 'Chemistry'], ['BIO', 'Biology'], ['PE', 'Physical Education'],
] as const;

async function seedSchool(spec: SchoolSpec, hash: string) {
  const plan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { code: spec.plan } });
  const school = await prisma.school.create({
    data: {
      code: spec.code,
      name: spec.name,
      shortName: spec.code,
      tagline: 'Nurturing minds, building futures',
      email: `office@${spec.code.toLowerCase()}.edu.in`,
      phone: '0612-2234567',
      website: `https://${spec.code.toLowerCase()}.edu.in`,
      address: `${pick(LOCALITY)}, ${spec.city}`,
      city: spec.city,
      district: spec.district,
      state: spec.state,
      pincode: spec.pincode,
      board: 'CBSE',
      affiliationNo: String(int(330000, 339999)),
      udiseCode: `10${int(100000000, 999999999)}`,
      establishedYear: 1998,
      status: 'ACTIVE',
      planId: plan.id,
      settings: {
        fees: { onlinePaymentEnabled: spec.full },
        bankAccounts: [{ bankName: 'State Bank of India', branch: `${spec.city} Main Branch`, accountName: spec.name, accountNo: `3${int(1000000000, 9999999999)}`, ifsc: 'SBIN0000152', upiId: `${spec.code.toLowerCase()}fees@sbi`, instructions: 'Mention admission number in remarks.' }],
        rules: DEFAULT_RULES,
      },
    },
  });
  const schoolId = school.id;
  const db = tenantDb(schoolId);
  const settings = readSettings(school.settings);

  const campus = await db.campus.create({ data: { schoolId, name: 'Main Campus', code: 'MAIN', isMain: true, city: spec.city, address: school.address } });
  const ay = academicYearFor(TODAY);
  const ayStart = Number(ay.slice(0, 4));
  await db.academicYear.create({ data: { schoolId, name: ay, startDate: utcDate(ayStart, 4, 1), endDate: utcDate(ayStart + 1, 3, 31), isCurrent: true } });
  await db.academicYear.create({ data: { schoolId, name: `${ayStart - 1}-${String(ayStart % 100).padStart(2, '0')}`, startDate: utcDate(ayStart - 1, 4, 1), endDate: utcDate(ayStart, 3, 31), isCurrent: false } });

  // Owner login (not an employee record)
  await createLogin(db, schoolId, { username: 'owner', name: 'Dr. Anand Swaroop Pathak', role: 'SUPER_ADMIN', email: `owner@${spec.code.toLowerCase()}.edu.in`, passwordHash: hash, mustChange: false, campusId: campus.id });

  // Subjects
  const subjectIds: Record<string, string> = {};
  for (const [code, name] of SUBJECTS) {
    const s = await db.subject.create({ data: { schoolId, code, name, type: ['PHY', 'CHE', 'BIO', 'CS'].includes(code) ? 'BOTH' : 'THEORY' } });
    subjectIds[code] = s.id;
  }

  // Grade scale
  await db.gradeScale.createMany({ data: DEFAULT_GRADES.map((g) => ({ schoolId, grade: g.grade, minPercent: g.minPercent, maxPercent: g.maxPercent, gradePoint: g.gradePoint, remark: g.remark, isPass: g.isPass })) });

  // Employees
  const hire = async (first: string, last: string, gender: Gender, designation: string, role: Parameters<typeof hireEmployee>[3]['loginRole'], username: string | null, basic: number, teaching = false, dept = 'Academics') => {
    const r = await hireEmployee(db, schoolId, settings, {
      employee: {
        campusId: campus.id,
        firstName: first,
        lastName: last,
        gender,
        designation,
        department: dept,
        isTeaching: teaching,
        phone: phone(),
        email: `${first.toLowerCase()}.${last.toLowerCase()}@${spec.code.toLowerCase()}.edu.in`,
        joiningDate: iso(utcDate(int(2012, 2024), int(1, 12), int(1, 28))),
        qualification: teaching ? pick(['M.Sc., B.Ed.', 'M.A., B.Ed.', 'B.Sc., B.Ed.', 'M.Com., B.Ed.', 'B.A., B.Ed.']) : pick(['B.Com.', 'Graduate', 'Intermediate']),
        experienceYears: int(2, 18),
        panNo: `${['A', 'B', 'C', 'D'][int(0, 3)]}${'BCDEFGHJK'[int(0, 8)]}${'PQRST'[int(0, 4)]}P${last[0]}${int(1000, 9999)}${'ABCDEFGHJK'[int(0, 9)]}`,
        bankName: pick(['State Bank of India', 'Punjab National Bank', 'HDFC Bank', 'Bank of Baroda']),
        bankAccount: String(int(10000000000, 99999999999)),
        ifsc: pick(['SBIN0000152', 'PUNB0123400', 'HDFC0001234', 'BARB0PATNAX']),
        basicSalary: basic,
        allowances: Math.round(basic * 0.2),
        deductions: Math.round(basic * 0.12),
      },
      loginRole: role,
      username,
      passwordHash: hash,
      mustChange: false,
    });
    return r.employeeId;
  };

  const principalId = await hire('Meenakshi', 'Sinha', 'FEMALE', 'Principal', 'ADMIN', 'admin', 75000, false, 'Administration');
  const teacherIds: string[] = [];
  for (let i = 0; i < spec.teachers; i++) {
    const female = chance(0.6);
    teacherIds.push(await hire(female ? pick(FEMALE_ADULT) : pick(MALE_ADULT), pick(SURNAME), female ? 'FEMALE' : 'MALE', i < 3 ? 'PGT' : i < 8 ? 'TGT' : 'PRT', 'TEACHER', i === 0 ? 'teacher' : null, i < 3 ? 52000 : i < 8 ? 42000 : 32000, true));
  }
  let accountantId: string | null = null;
  if (spec.full) {
    accountantId = await hire('Ramesh', 'Gupta', 'MALE', 'Accountant', 'ACCOUNTANT', 'accountant', 38000, false, 'Finance');
    await hire('Kiran', 'Kumari', 'FEMALE', 'Receptionist', 'RECEPTIONIST', 'reception', 22000, false, 'Front Office');
    await hire('Alok', 'Ranjan', 'MALE', 'Librarian', 'LIBRARIAN', 'librarian', 28000, false, 'Library');
    await hire('Mohan', 'Yadav', 'MALE', 'Transport In-charge', 'TRANSPORT_MANAGER', 'transport', 26000, false, 'Transport');
    await hire('Sushila', 'Devi', 'FEMALE', 'Store Keeper', 'STORE_MANAGER', 'store', 21000, false, 'Store');
    await hire('Ramu', 'Paswan', 'MALE', 'Peon', null, null, 14000, false, 'Support');
    await hire('Bhola', 'Ram', 'MALE', 'Driver', null, null, 18000, false, 'Transport');
  }

  // Classes, sections, subjects, teachers
  const sections: Array<{ id: string; classId: string; className: string; order: number; name: string }> = [];
  let t = 0;
  for (const c of spec.classes) {
    const cls = await db.class.create({ data: { schoolId, campusId: campus.id, name: c.name, numericOrder: c.order, monthlyFee: fromPaise(c.fee * 100) } });
    const level = levelOf(c.order);
    for (const code of CLASS_SUBJECTS[level]) {
      await db.classSubject.create({ data: { schoolId, classId: cls.id, subjectId: subjectIds[code], fullMarks: 100, passMarks: 33 } });
    }
    for (const sName of c.sections) {
      const sec = await db.section.create({
        data: { schoolId, classId: cls.id, name: sName, capacity: 40, room: `R-${c.order}${sName}`, classTeacherId: teacherIds[t++ % teacherIds.length] },
      });
      sections.push({ id: sec.id, classId: cls.id, className: c.name, order: c.order, name: sName });
      for (const [i, code] of CLASS_SUBJECTS[level].entries()) {
        await db.teacherAssignment.create({ data: { schoolId, sectionId: sec.id, subjectId: subjectIds[code], employeeId: teacherIds[(t + i) % teacherIds.length] } });
      }
    }
  }

  // Fee heads & structure
  const heads: Record<string, string> = {};
  for (const [i, [name, kind]] of ([['Tuition Fee', 'RECURRING'], ['Admission Fee', 'ONE_TIME'], ['Annual Charges', 'RECURRING'], ['Exam Fee', 'RECURRING'], ['Computer Fee', 'RECURRING'], ['Smart Class Fee', 'RECURRING']] as const).entries()) {
    heads[name] = (await db.feeHead.create({ data: { schoolId, name, kind, sortOrder: i } })).id;
  }
  for (const c of spec.classes) {
    const cls = await db.class.findFirstOrThrow({ where: { name: c.name } });
    const base = { schoolId, academicYear: ay, classId: cls.id };
    await db.feeStructure.create({ data: { ...base, feeHeadId: heads['Tuition Fee'], amount: fromPaise(c.fee * 100), frequency: 'MONTHLY', dueDay: 10, lateFeeType: 'FIXED', lateFeeAmount: fromPaise(5000) } });
    await db.feeStructure.create({ data: { ...base, feeHeadId: heads['Admission Fee'], amount: fromPaise(5000 * 100), frequency: 'ONE_TIME', dueDay: 10 } });
    await db.feeStructure.create({ data: { ...base, feeHeadId: heads['Annual Charges'], amount: fromPaise((3000 + c.order * 150) * 100), frequency: 'YEARLY', dueDay: 15 } });
    await db.feeStructure.create({ data: { ...base, feeHeadId: heads['Exam Fee'], amount: fromPaise(600 * 100), frequency: 'HALF_YEARLY', months: [9, 2], dueDay: 10 } });
    if (c.order >= 6) await db.feeStructure.create({ data: { ...base, feeHeadId: heads['Computer Fee'], amount: fromPaise(300 * 100), frequency: 'MONTHLY', dueDay: 10 } });
    if (spec.full) await db.feeStructure.create({ data: { ...base, feeHeadId: heads['Smart Class Fee'], amount: fromPaise(1200 * 100), frequency: 'QUARTERLY', dueDay: 10 } });
  }

  // Transport (before students so invoices include transport)
  const stopIds: string[] = [];
  if (spec.full) {
    const routes = [
      { name: 'Route 1 — Boring Road', vehicle: 'BR01PA4521', stops: ['Boring Road Chauraha', 'Patliputra Colony', 'Rajapur Pul', 'SK Puri'] },
      { name: 'Route 2 — Kankarbagh', vehicle: 'BR01PB7710', stops: ['Kankarbagh Tempo Stand', 'Rajendra Nagar Terminal', 'Malahi Pakri', 'Bypass Chowk'] },
      { name: 'Route 3 — Danapur', vehicle: 'BR01PC3302', stops: ['Danapur Cantt', 'Saguna More', 'RPS More', 'Bailey Road'] },
    ];
    for (const [ri, r] of routes.entries()) {
      const v = await db.vehicle.create({
        data: {
          schoolId,
          registrationNo: r.vehicle,
          model: pick(['Tata Starbus 40', 'Ashok Leyland Lynx 32', 'Eicher Skyline 40']),
          capacity: 40,
          driverName: `${pick(MALE_ADULT)} ${pick(SURNAME)}`,
          driverPhone: phone(),
          driverLicenseNo: `BR01${int(2010, 2020)}${int(1000000, 9999999)}`,
          attendantName: `${pick(FEMALE_ADULT)} Devi`,
          attendantPhone: phone(),
          insuranceExpiry: addDays(TODAY, ri === 0 ? 18 : 200),
          fitnessExpiry: addDays(TODAY, ri === 1 ? -5 : 300),
          pucExpiry: addDays(TODAY, 90),
          permitExpiry: addDays(TODAY, 400),
        },
      });
      const route = await db.transportRoute.create({ data: { schoolId, name: r.name, vehicleId: v.id } });
      for (const [si, s] of r.stops.entries()) {
        const stop = await db.routeStop.create({ data: { schoolId, routeId: route.id, name: s, sortOrder: si + 1, pickupTime: `07:${String(5 + si * 8).padStart(2, '0')}`, dropTime: `14:${String(10 + si * 8).padStart(2, '0')}`, monthlyFee: fromPaise((900 + si * 150) * 100) } });
        stopIds.push(stop.id);
      }
    }
  }

  // Students — some families have 2 children (siblings share the guardian phone).
  const families: Array<{ phone: string; surname: string; father: string; mother: string }> = [];
  const studentIds: string[] = [];
  let demoParentPhone: string | null = null;
  let demoStudentId: string | null = null;
  for (const sec of sections) {
    const count = int(spec.studentsPerSection[0], spec.studentsPerSection[1]);
    for (let k = 0; k < count; k++) {
      const female = chance(0.48);
      const sibling = families.length > 4 && chance(0.15) ? pick(families) : null;
      const fam = sibling ?? { phone: phone(), surname: pick(SURNAME), father: pick(MALE_ADULT), mother: pick(FEMALE_ADULT) };
      if (!sibling) families.push(fam);
      const age = sec.order + 2; // Nursery(1) ≈ 3 years
      const admissionYear = TODAY.getUTCFullYear() - int(0, Math.min(6, Math.max(0, age - 3)));
      const admissionDate = admissionYear === TODAY.getUTCFullYear() ? utcDate(ayStart, 4, int(1, 20)) : utcDate(admissionYear, 4, int(1, 20));
      const r = await admitStudent(db, schoolId, settings, {
        student: {
          campusId: campus.id,
          classId: sec.classId,
          sectionId: sec.id,
          firstName: female ? pick(GIRL) : pick(BOY),
          lastName: fam.surname,
          gender: female ? 'FEMALE' : 'MALE',
          dob: iso(utcDate(TODAY.getUTCFullYear() - age, int(1, 12), int(1, 28))),
          admissionDate: iso(admissionDate),
          rollNo: String(k + 1),
          bloodGroup: pick(['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-']),
          religion: pick(['Hindu', 'Hindu', 'Hindu', 'Muslim', 'Sikh', 'Christian']),
          category: pick(['GENERAL', 'OBC', 'OBC', 'SC', 'ST', 'EWS']),
          motherTongue: pick(['Hindi', 'Hindi', 'Maithili', 'Bhojpuri', 'Magahi']),
          apaarConsent: pick(['PENDING', 'GRANTED', 'GRANTED', 'DECLINED'] as const),
          address: `${int(1, 200)}, ${pick(LOCALITY)}, ${spec.city}`,
          city: spec.city,
          state: spec.state,
          pincode: spec.pincode,
          isRte: chance(0.04),
          feeDiscountPercent: sibling ? 10 : 0,
        },
        guardian: {
          fatherName: `${fam.father} ${fam.surname}`,
          fatherPhone: fam.phone,
          fatherOccupation: pick(OCCUPATION),
          motherName: `${fam.mother} ${fam.surname}`,
          motherPhone: phone(),
          motherOccupation: pick(['Homemaker', 'Teacher', 'Private Job', 'Business']),
          primaryPhone: fam.phone,
          address: `${int(1, 200)}, ${pick(LOCALITY)}, ${spec.city}`,
          annualIncome: int(3, 25) * 100000,
        },
        passwordHash: hash,
        mustChange: false,
      });
      studentIds.push(r.studentId);
      // Keep the latest sibling family so the demo parent's children span different classes.
      if (sibling && spec.full) demoParentPhone = fam.phone;
      if (!demoStudentId && sec.order === 13) demoStudentId = r.studentId;
    }
  }

  // RTE students: full concession on tuition
  const rte = await db.student.findMany({ where: { isRte: true }, select: { id: true } });
  for (const s of rte) await db.feeConcession.create({ data: { schoolId, studentId: s.id, feeHeadId: heads['Tuition Fee'], kind: 'PERCENT', value: 100, reason: 'RTE' } });

  // Friendly demo usernames
  if (demoParentPhone) {
    const g = await db.guardian.findFirstOrThrow({ where: { primaryPhone: demoParentPhone } });
    if (g.userId) await db.user.update({ where: { id: g.userId }, data: { username: 'parent' } });
  }
  if (demoStudentId) {
    const s = await db.student.findUniqueOrThrow({ where: { id: demoStudentId } });
    if (s.userId) await db.user.update({ where: { id: s.userId }, data: { username: 'student' } });
  }

  // Transport allocation (~35% of students from Class 1 up)
  if (stopIds.length) {
    const eligible = await db.student.findMany({ where: { class: { numericOrder: { gte: 4 } } }, select: { id: true } });
    for (const s of eligible) {
      if (!chance(0.35)) continue;
      const stop = await db.routeStop.findUniqueOrThrow({ where: { id: pick(stopIds) } });
      await db.studentTransport.create({ data: { schoolId, studentId: s.id, routeId: stop.routeId, stopId: stop.id, tripType: pick(['BOTH', 'BOTH', 'PICKUP']) } });
    }
  }

  // Invoices from April to the current month, then payments.
  const periods: string[] = [];
  for (let m = 4; ; m++) {
    const y = ayStart + (m > 12 ? 1 : 0);
    const mm = ((m - 1) % 12) + 1;
    const d = utcDate(y, mm, 1);
    if (d > TODAY) break;
    periods.push(`${y}-${String(mm).padStart(2, '0')}`);
  }
  for (const period of periods) await generateInvoices(db, schoolId, settings, 4, { period });

  const collector = await db.user.findFirstOrThrow({ where: { username: spec.full ? 'accountant' : 'admin' } });
  const modes: PaymentMode[] = ['CASH', 'CASH', 'UPI', 'UPI', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD'];
  const allInvoices = await db.feeInvoice.findMany({ orderBy: { period: 'asc' }, select: { id: true, studentId: true, period: true, total: true, dueDate: true } });
  const defaulters = new Set(studentIds.filter(() => chance(0.12)));
  for (const inv of allInvoices) {
    const isCurrent = inv.period === periods[periods.length - 1];
    if (Number(inv.total) <= 0) continue;
    if (defaulters.has(inv.studentId) && inv.period >= periods[Math.max(0, periods.length - 3)]) continue;
    if (isCurrent && chance(0.55)) continue;
    const partial = chance(0.06);
    const amount = Math.round(Number(inv.total) * 100 * (partial ? 0.5 : 1));
    const paidAt = addDays(inv.dueDate, int(-8, 6));
    await collectPayment(db, schoolId, settings, {
      studentIds: [inv.studentId],
      invoiceIds: [inv.id],
      amount,
      mode: pick(modes),
      paidAt: paidAt > TODAY ? TODAY : paidAt,
      referenceNo: chance(0.5) ? `UTR${int(100000000, 999999999)}` : null,
      collectedBy: { id: collector.id, name: collector.name },
    });
  }

  // Attendance: last 30 working days
  const allStudents = await db.student.findMany({ select: { id: true, sectionId: true } });
  const staff = await db.employee.findMany({ select: { id: true } });
  const markerId = (await db.user.findFirstOrThrow({ where: { username: 'admin' } })).id;
  let day = TODAY;
  let marked = 0;
  while (marked < 30) {
    day = addDays(day, -1);
    if (day.getUTCDay() === 0) continue;
    marked++;
    const rows = allStudents.map((s) => {
      const r = rand();
      return { schoolId, studentId: s.id, sectionId: s.sectionId, date: day, status: (r < 0.88 ? 'PRESENT' : r < 0.94 ? 'ABSENT' : r < 0.98 ? 'LATE' : 'LEAVE') as never, markedById: markerId };
    });
    await db.studentAttendance.createMany({ data: rows });
    await db.employeeAttendance.createMany({
      data: staff.map((e) => {
        const r = rand();
        return { schoolId, employeeId: e.id, date: day, status: (r < 0.93 ? 'PRESENT' : r < 0.97 ? 'LATE' : 'LEAVE') as never, inTime: r < 0.93 ? `07:${String(int(10, 29)).padStart(2, '0')}` : r < 0.97 ? `08:${String(int(0, 25)).padStart(2, '0')}` : null, outTime: r < 0.97 ? `14:${String(int(30, 59)).padStart(2, '0')}` : null, markedById: markerId };
      }),
    });
  }

  // Exams with marks
  const examDefs = [
    { name: 'Periodic Test 1', term: 'TERM_1', start: utcDate(ayStart, 7, 14), end: utcDate(ayStart, 7, 22), published: true, max: 40, pass: 13 },
    { name: 'Half Yearly Examination', term: 'TERM_1', start: utcDate(ayStart, 9, 22), end: utcDate(ayStart, 10, 3), published: true, max: 80, pass: 27 },
    { name: 'Periodic Test 2', term: 'TERM_2', start: utcDate(ayStart, 12, 8), end: utcDate(ayStart, 12, 16), published: false, max: 40, pass: 13 },
  ];
  const classes = await db.class.findMany({ include: { subjects: true } });
  for (const ed of examDefs) {
    const exam = await db.exam.create({ data: { schoolId, name: ed.name, academicYear: ay, term: ed.term, startDate: ed.start, endDate: ed.end, isPublished: ed.published } });
    for (const cls of classes) {
      for (const [i, cs] of cls.subjects.entries()) {
        await db.examSchedule.create({ data: { schoolId, examId: exam.id, classId: cls.id, subjectId: cs.subjectId, date: addDays(ed.start, i), startTime: '09:00', endTime: ed.max > 40 ? '12:00' : '10:30', maxMarks: ed.max, passMarks: ed.pass } });
      }
      if (ed.end > TODAY) continue;
      const pupils = await db.student.findMany({ where: { classId: cls.id }, select: { id: true } });
      const marks: Prisma.ExamMarkCreateManyInput[] = [];
      for (const p of pupils) {
        const ability = 0.45 + rand() * 0.5;
        for (const cs of cls.subjects) {
          const absent = chance(0.015);
          const val = Math.min(ed.max, Math.max(0, Math.round((ability + (rand() - 0.5) * 0.25) * ed.max)));
          marks.push({ schoolId, examId: exam.id, studentId: p.id, classId: cls.id, subjectId: cs.subjectId, marksObtained: absent ? null : val, isAbsent: absent });
        }
      }
      if (marks.length) await db.examMark.createMany({ data: marks });
    }
  }

  // Timetable
  const periodsDef = [
    ['Period 1', '07:50', '08:30', false], ['Period 2', '08:30', '09:10', false], ['Period 3', '09:10', '09:50', false], ['Short Break', '09:50', '10:05', true],
    ['Period 4', '10:05', '10:45', false], ['Period 5', '10:45', '11:25', false], ['Lunch', '11:25', '11:55', true], ['Period 6', '11:55', '12:35', false], ['Period 7', '12:35', '13:15', false],
  ] as const;
  const periodIds: string[] = [];
  for (const [i, [name, start, end, isBreak]] of periodsDef.entries()) {
    const p = await db.period.create({ data: { schoolId, name, startTime: start, endTime: end, sortOrder: i, isBreak } });
    if (!isBreak) periodIds.push(p.id);
  }
  const assignments = await db.teacherAssignment.findMany();
  const busy = new Set<string>();
  for (const sec of sections) {
    const own = assignments.filter((a) => a.sectionId === sec.id);
    if (!own.length) continue;
    for (let dow = 1; dow <= 6; dow++) {
      for (const [pi, periodId] of periodIds.entries()) {
        for (let attempt = 0; attempt < own.length; attempt++) {
          const a = own[(dow + pi + attempt) % own.length];
          const key = `${a.employeeId}:${dow}:${periodId}`;
          if (busy.has(key)) continue;
          busy.add(key);
          await db.timetableEntry.create({ data: { schoolId, sectionId: sec.id, day: dow, periodId, subjectId: a.subjectId, employeeId: a.employeeId } });
          break;
        }
      }
    }
  }

  // Notices, events, homework
  const adminUser = await db.user.findFirstOrThrow({ where: { username: 'admin' } });
  const notices = [
    { title: 'Half Yearly results published', body: 'Results of the Half Yearly Examination are now available on the parent and student portal. Parent–teacher meeting will be held on Saturday.', category: 'EXAM', isPinned: true },
    { title: 'Diwali & Chhath vacation', body: `School will remain closed for Diwali and Chhath Puja. Classes resume after the break. Holiday homework is available under Homework.`, category: 'HOLIDAY', isPinned: false },
    { title: 'October fee due date', body: 'Fees for October are due by the 10th. A late fee of ₹50 applies after the due date. Pay online from the parent portal or at the accounts counter.', category: 'FEE', isPinned: false },
    { title: 'Annual Sports Meet registrations open', body: 'Students of Classes 3–12 may register for track and field events with their house masters by the end of this month.', category: 'EVENT', isPinned: false },
    { title: 'Staff meeting on Monday', body: 'All teaching staff to assemble in the conference hall at 2:30 PM to discuss Term 2 planning.', category: 'GENERAL', isPinned: false, roles: ['TEACHER', 'ADMIN'] },
  ];
  for (const [i, n] of notices.entries()) {
    await db.notice.create({ data: { schoolId, title: n.title, body: n.body, category: n.category, isPinned: n.isPinned, audience: { roles: (n as { roles?: string[] }).roles ?? [], classIds: [] }, publishAt: addDays(TODAY, -i * 3), createdById: adminUser.id, createdByName: adminUser.name } });
  }
  const events = [
    { title: 'Diwali', kind: 'HOLIDAY', start: utcDate(ayStart, 11, 8), end: utcDate(ayStart, 11, 9) },
    { title: 'Chhath Puja', kind: 'HOLIDAY', start: utcDate(ayStart, 11, 13), end: utcDate(ayStart, 11, 15) },
    { title: 'Parent–Teacher Meeting', kind: 'PTM', start: addDays(TODAY, 7), end: null },
    { title: 'Annual Sports Meet', kind: 'EVENT', start: addDays(TODAY, 30), end: addDays(TODAY, 31) },
    { title: 'Children’s Day Celebration', kind: 'EVENT', start: utcDate(ayStart, 11, 14), end: null },
    { title: 'Republic Day', kind: 'HOLIDAY', start: utcDate(ayStart + 1, 1, 26), end: null },
  ];
  for (const e of events) await db.event.create({ data: { schoolId, title: e.title, kind: e.kind, startDate: e.start, endDate: e.end, createdById: adminUser.id } });

  const teacherUser = await db.user.findFirstOrThrow({ where: { username: 'teacher' } });
  for (const sec of sections.slice(-8)) {
    const subj = assignments.find((a) => a.sectionId === sec.id);
    if (!subj) continue;
    for (let d = 0; d < 3; d++) {
      await db.homework.create({
        data: { schoolId, classId: sec.classId, sectionId: sec.id, subjectId: subj.subjectId, title: pick(['Chapter exercise', 'Worksheet practice', 'Read and summarise', 'Solve textbook questions']), description: `Complete questions ${int(1, 5)} to ${int(8, 15)} from the current chapter in your notebook.`, assignedOn: addDays(TODAY, -d), dueOn: addDays(TODAY, 2 - d), createdById: teacherUser.id, createdByName: teacherUser.name },
      });
    }
  }

  if (spec.full) await seedOperations(schoolId, ay, ayStart, heads, subjectIds, accountantId);

  // Starter-plan school switches a module off explicitly to show customisation.
  if (!spec.full) await db.schoolModule.create({ data: { schoolId, module: 'certificates', enabled: false } });

  return { schoolId, students: studentIds.length };
}

async function seedOperations(schoolId: string, ay: string, ayStart: number, heads: Record<string, string>, subjectIds: Record<string, string>, accountantId: string | null) {
  const db = tenantDb(schoolId);
  const settings = readSettings((await prisma.school.findUniqueOrThrow({ where: { id: schoolId } })).settings);
  const admin = await db.user.findFirstOrThrow({ where: { username: 'admin' } });

  // Accounts: heads and monthly expenses
  const expenseHeads = ['Electricity', 'Building Maintenance', 'Stationery', 'Diesel & Vehicle Upkeep', 'Internet & Telephone', 'Events & Functions'];
  const incomeHeads = ['Donations', 'Hall Rent', 'Scrap Sale'];
  const headIds: Record<string, string> = {};
  for (const name of expenseHeads) headIds[name] = (await db.accountHead.create({ data: { schoolId, name, type: 'EXPENSE' } })).id;
  for (const name of incomeHeads) headIds[name] = (await db.accountHead.create({ data: { schoolId, name, type: 'INCOME' } })).id;
  for (let m = 4; m <= 9; m++) {
    for (const name of expenseHeads) {
      await db.ledgerEntry.create({ data: { schoolId, headId: headIds[name], type: 'EXPENSE', amount: fromPaise(int(4000, 45000) * 100), date: utcDate(ayStart, m, int(3, 25)), description: `${name} — ${['April', 'May', 'June', 'July', 'August', 'September'][m - 4]}`, mode: pick(['BANK_TRANSFER', 'CASH', 'UPI'] as const), party: pick(['SBPDCL', 'Sharma Traders', 'Airtel Business', 'Indian Oil', 'Local Vendor']), createdById: accountantId ?? admin.id } });
    }
  }
  await db.ledgerEntry.create({ data: { schoolId, headId: headIds['Donations'], type: 'INCOME', amount: fromPaise(51000 * 100), date: utcDate(ayStart, 8, 15), description: 'Alumni association donation for library', mode: 'BANK_TRANSFER', party: 'Alumni Association' } });

  // Salaries April–September
  const employees = await db.employee.findMany();
  for (let m = 4; m <= 9; m++) {
    const month = `${ayStart}-${String(m).padStart(2, '0')}`;
    for (const e of employees) {
      const net = Number(e.basicSalary) + Number(e.allowances) - Number(e.deductions);
      await db.$transaction(async (tx) => {
        const n = await nextSequence(tx, schoolId, 'salary');
        const slip = await tx.salaryPayment.create({ data: { schoolId, slipNo: formatNumber(settings.numbering.salarySlipPrefix, n, 5), employeeId: e.id, month, basic: e.basicSalary, allowances: e.allowances, deductions: e.deductions, net: fromPaise(Math.round(net * 100)), mode: 'BANK_TRANSFER', paidAt: utcDate(ayStart, m + 1 > 12 ? 1 : m + 1, 1), paidById: admin.id } });
        const head = await tx.accountHead.upsert({ where: { schoolId_name_type: { schoolId, name: 'Salaries', type: 'EXPENSE' } }, update: {}, create: { schoolId, name: 'Salaries', type: 'EXPENSE', isSystem: true } });
        await tx.ledgerEntry.create({ data: { schoolId, headId: head.id, type: 'EXPENSE', amount: slip.net, date: slip.paidAt, description: `Salary ${month} — ${e.firstName} ${e.lastName ?? ''}`.trim(), mode: 'BANK_TRANSFER', party: `${e.firstName} ${e.lastName ?? ''}`.trim(), source: 'SALARY', sourceId: slip.id } });
      });
    }
  }

  // Library
  const books = [
    ['NCERT Mathematics Class 10', 'NCERT', 'Textbook'], ['NCERT Science Class 10', 'NCERT', 'Textbook'], ['Wings of Fire', 'A. P. J. Abdul Kalam', 'Biography'], ['Godan', 'Munshi Premchand', 'Hindi Literature'],
    ['The Discovery of India', 'Jawaharlal Nehru', 'History'], ['Malgudi Days', 'R. K. Narayan', 'Fiction'], ['Panchatantra Stories', 'Vishnu Sharma', 'Children'], ['Concepts of Physics Vol 1', 'H. C. Verma', 'Reference'],
    ['Objective General Knowledge', 'Lucent', 'Reference'], ['Ignited Minds', 'A. P. J. Abdul Kalam', 'Non-fiction'], ['Rashmirathi', 'Ramdhari Singh Dinkar', 'Hindi Literature'], ['The Story of My Experiments with Truth', 'M. K. Gandhi', 'Biography'],
  ];
  const bookIds: string[] = [];
  for (const [title, author, category] of books) {
    const copies = int(2, 8);
    bookIds.push((await db.book.create({ data: { schoolId, title, author, category, isbn: `978${int(1000000000, 9999999999)}`, publisher: author === 'NCERT' ? 'NCERT' : pick(['Rupa', 'Penguin', 'Rajkamal', 'Bharati Bhawan']), rackNo: `R${int(1, 6)}-S${int(1, 4)}`, copies, available: copies } })).id);
  }
  const students = await db.student.findMany({ take: 15, orderBy: { admissionNo: 'desc' } });
  const librarian = await db.user.findFirstOrThrow({ where: { username: 'librarian' } });
  for (const [i, s] of students.slice(0, 8).entries()) {
    const bookId = bookIds[i % bookIds.length];
    const issued = addDays(TODAY, -int(3, 25));
    await db.bookIssue.create({ data: { schoolId, bookId, borrowerType: 'STUDENT', borrowerId: s.id, borrowerName: `${s.firstName} ${s.lastName ?? ''}`.trim(), issuedOn: issued, dueOn: addDays(issued, 14), issuedById: librarian.id } });
    await db.book.update({ where: { id: bookId }, data: { available: { decrement: 1 } } });
  }

  // Store
  const cats: Record<string, string> = {};
  for (const name of ['Uniform', 'Books', 'Stationery']) cats[name] = (await db.productCategory.create({ data: { schoolId, name } })).id;
  const products = [
    ['Uniform', 'Summer Shirt (Size 28-34)', 'UNI-SHIRT', 450, 5, 120], ['Uniform', 'Trousers / Skirt', 'UNI-TROUSER', 550, 5, 90], ['Uniform', 'School Tie', 'UNI-TIE', 120, 5, 200], ['Uniform', 'House T-shirt', 'UNI-HOUSE', 380, 5, 4],
    ['Books', 'Class 10 Book Set', 'BK-SET-10', 3200, 0, 25], ['Books', 'Class 5 Book Set', 'BK-SET-05', 2100, 0, 30], ['Stationery', 'Notebook (200 pages)', 'ST-NB200', 60, 12, 600], ['Stationery', 'Geometry Box', 'ST-GEOM', 180, 18, 75],
  ] as const;
  const productIds: string[] = [];
  for (const [cat, name, sku, price, gst, stock] of products) {
    productIds.push((await db.product.create({ data: { schoolId, categoryId: cats[cat], name, sku, price: fromPaise(price * 100), gstPercent: gst, stock, reorderAt: 10 } })).id);
  }

  // Assets
  const assets = [
    ['Student Desk & Bench', 'Furniture', 420, 3200, 'Classrooms'], ['Smart Board (75")', 'Electronics', 18, 85000, 'Classrooms'], ['Desktop Computer', 'Electronics', 40, 32000, 'Computer Lab'],
    ['Microscope', 'Lab Equipment', 25, 6500, 'Biology Lab'], ['Cricket Kit', 'Sports', 6, 7500, 'Sports Room'], ['Water Purifier (RO)', 'Electrical', 8, 18000, 'Corridors'], ['CCTV Camera', 'Electronics', 36, 3500, 'Campus'],
  ] as const;
  for (const [name, category, quantity, cost, location] of assets) {
    await db.asset.create({ data: { schoolId, name, category, quantity, unitCost: fromPaise(cost * 100), location, condition: pick(['GOOD', 'GOOD', 'FAIR'] as const), purchasedOn: utcDate(int(2019, 2025), int(1, 12), int(1, 28)), supplier: pick(['Godrej Interio', 'HP India', 'Kent RO', 'SG Sports']) } });
  }

  // Certificate templates
  for (const [name, kind, recipientType, body] of DEFAULT_CERTIFICATE_TEMPLATES) await db.certificateTemplate.create({ data: { schoolId, name, kind, recipientType, body } });

  // Message templates (DLT)
  await db.messageTemplate.createMany({
    data: [
      { schoolId, name: 'Absent alert', channel: 'SMS', body: 'Dear Parent, your ward {#var#} was absent today ({#var#}). - {#var#}', dltTemplateId: '1207161234567890123' },
      { schoolId, name: 'Fee reminder', channel: 'SMS', body: 'Dear Parent, fee of Rs {#var#} for {#var#} is due. Kindly pay by {#var#}. - {#var#}', dltTemplateId: '1207161234567890456' },
      { schoolId, name: 'Fee reminder', channel: 'WHATSAPP', body: 'Dear Parent, a fee of ₹{{1}} is pending for {{2}}. Pay online: {{3}}', dltTemplateId: null },
    ],
  });

  // Admissions pipeline
  const firstClass = await db.class.findFirstOrThrow({ where: { numericOrder: 1 } });
  const stages = ['ENQUIRY', 'ENQUIRY', 'ENQUIRY', 'APPLIED', 'APPLIED', 'DOCS_VERIFIED', 'TEST_SCHEDULED', 'SEAT_OFFERED', 'REJECTED', 'WITHDRAWN'] as const;
  for (const [i, stage] of stages.entries()) {
    const n = await db.$transaction((tx) => nextSequence(tx, schoolId, 'application'));
    const female = chance(0.5);
    await db.admissionApplication.create({
      data: {
        schoolId,
        applicationNo: formatNumber(settings.numbering.applicationPrefix, n, 5),
        stage,
        source: pick(['WALK_IN', 'ONLINE', 'PHONE', 'REFERRAL']),
        classId: (i % 3 === 0 ? firstClass : await db.class.findFirstOrThrow({ where: { numericOrder: int(2, 10) } })).id,
        academicYear: ay,
        studentName: `${female ? pick(GIRL) : pick(BOY)} ${pick(SURNAME)}`,
        gender: female ? 'FEMALE' : 'MALE',
        guardianName: `${pick(MALE_ADULT)} ${pick(SURNAME)}`,
        guardianPhone: phone(),
        notes: stage === 'ENQUIRY' ? 'Asked about transport and fee structure.' : null,
        followUpAt: stage === 'ENQUIRY' ? addDays(TODAY, int(1, 5)) : null,
        consentGiven: true,
        createdAt: addDays(TODAY, -int(1, 40)),
      },
    });
  }

  // Activities
  const actDefs = [['Robotics Club', 'STEM'], ['Debate Society', 'CLUB'], ['Cricket Academy', 'SPORTS'], ['Classical Music', 'ARTS'], ['Eco Warriors', 'COMMUNITY']] as const;
  const seniors = await db.student.findMany({ where: { class: { numericOrder: { gte: 9 } } }, select: { id: true } });
  for (const [name, category] of actDefs) {
    const a = await db.activity.create({ data: { schoolId, name, category, description: `${name} meets weekly after school.`, schedule: pick(['Mon & Thu, 2:30–3:30 PM', 'Wednesday, 2:30–4:00 PM', 'Saturday, 9:00–11:00 AM']), capacity: 30 } });
    for (const s of seniors.filter(() => chance(0.12))) await db.activityMember.create({ data: { schoolId, activityId: a.id, studentId: s.id } });
  }

  // Behaviour ratings for one senior section
  const teacher = await db.user.findFirstOrThrow({ where: { username: 'teacher' } });
  for (const s of seniors.slice(0, 20)) {
    for (const trait of settings.behaviourTraits) {
      await db.behaviourRating.create({ data: { schoolId, studentId: s.id, term: 'TERM_1', category: 'BEHAVIOUR', trait, rating: int(3, 5), ratedById: teacher.id } });
    }
  }

  // Question bank
  const cls10 = await db.class.findFirst({ where: { numericOrder: 13 } });
  if (cls10) {
    const qs = [
      ['MCQ', 'The value of sin 30° is:', ['1/2', '√3/2', '1', '0'], '1/2', 1],
      ['SHORT', 'Find the HCF of 96 and 404 using prime factorisation.', null, '4', 2],
      ['LONG', 'Prove that √5 is irrational.', null, 'Proof by contradiction.', 5],
      ['MCQ', 'The distance of the point (3, 4) from the origin is:', ['5', '7', '25', '1'], '5', 1],
      ['SHORT', 'Write the quadratic formula and use it to solve x² − 5x + 6 = 0.', null, 'x = 2, 3', 3],
    ] as const;
    for (const [type, text, options, answer, marks] of qs) {
      await db.question.create({ data: { schoolId, classId: cls10.id, subjectId: subjectIds['MAT'], type, text, options: options ? [...options] : undefined, answer, marks, difficulty: marks > 2 ? 'HARD' : 'MEDIUM', createdById: teacher.id } });
    }
  }

  // Live classes
  const sec = await db.section.findFirstOrThrow({ where: { class: { numericOrder: 13 } }, include: { class: true } });
  await db.liveClass.create({ data: { schoolId, title: 'Doubt clearing — Quadratic Equations', platform: 'GOOGLE_MEET', meetingUrl: 'https://meet.google.com/abc-defg-hij', audience: 'SECTION', classId: sec.classId, sectionId: sec.id, startsAt: new Date(Date.now() + 26 * 3600_000), durationMins: 45, hostId: teacher.id, hostName: teacher.name } });
  await db.liveClass.create({ data: { schoolId, title: 'Staff training: Using the gradebook', platform: 'JITSI', meetingUrl: 'https://meet.jit.si/vidyalaya-staff-training', audience: 'ALL_STAFF', startsAt: new Date(Date.now() + 50 * 3600_000), durationMins: 60, hostId: admin.id, hostName: admin.name } });

  // Leave requests
  const parentUser = await db.user.findFirst({ where: { username: 'parent' }, include: { guardian: { include: { students: true } } } });
  if (parentUser?.guardian?.students[0]) {
    await db.leaveRequest.create({ data: { schoolId, applicantId: parentUser.id, studentId: parentUser.guardian.students[0].id, leaveType: 'SICK', fromDate: addDays(TODAY, 1), toDate: addDays(TODAY, 2), reason: 'Viral fever; doctor advised rest for two days.' } });
  }
  const teacherEmp = await db.employee.findFirstOrThrow({ where: { userId: teacher.id } });
  await db.leaveRequest.create({ data: { schoolId, applicantId: teacher.id, employeeId: teacherEmp.id, leaveType: 'CASUAL', fromDate: addDays(TODAY, 5), toDate: addDays(TODAY, 5), reason: 'Family function.' } });

  // A conversation between the demo parent and teacher
  if (parentUser) {
    const [a, b] = [parentUser.id, teacher.id].sort();
    const conv = await db.conversation.create({ data: { schoolId, userAId: a, userBId: b } });
    await db.chatMessage.createMany({
      data: [
        { schoolId, conversationId: conv.id, senderId: parentUser.id, body: 'Good morning ma’am, how is my child doing in Mathematics this term?', createdAt: addDays(new Date(), -2) },
        { schoolId, conversationId: conv.id, senderId: teacher.id, body: 'Good morning! Steady progress. Please ensure the daily worksheet is completed — that will help a lot before Periodic Test 2.', createdAt: addDays(new Date(), -2) },
      ],
    });
    await db.meeting.create({ data: { schoolId, requestedById: parentUser.id, requestedByName: parentUser.name, withUserId: teacher.id, withUserName: teacher.name, studentId: parentUser.guardian?.students[0]?.id, topic: 'Academic progress review', agenda: 'Discuss Half Yearly results and study plan.', mode: 'IN_PERSON', scheduledAt: new Date(Date.now() + 3 * 86_400_000), status: 'REQUESTED' } });
  }

  // Store sale
  const storeUser = await db.user.findFirstOrThrow({ where: { username: 'store' } });
  await db.$transaction(async (tx) => {
    const n = await nextSequence(tx, schoolId, 'order');
    const product = await tx.product.findUniqueOrThrow({ where: { id: productIds[0] } });
    const qty = 2;
    const sub = Number(product.price) * qty;
    const tax = Math.round(sub * Number(product.gstPercent)) / 100;
    await tx.storeOrder.create({
      data: {
        schoolId,
        orderNo: formatNumber(settings.numbering.orderPrefix, n, 5),
        customerName: 'Walk-in parent',
        subtotal: sub,
        tax,
        total: sub + tax,
        mode: 'UPI',
        soldById: storeUser.id,
        items: { create: [{ schoolId, productId: product.id, name: product.name, qty, unitPrice: product.price, gstPercent: product.gstPercent, lineTotal: sub + tax }] },
      },
    });
    await tx.product.update({ where: { id: product.id }, data: { stock: { decrement: qty } } });
  });
  void heads;
}

async function main() {
  const t0 = Date.now();
  const hash = await hashPassword(PASSWORD);
  await seedPlatform(hash);

  for (const code of ['DEMO', 'GVS']) {
    const existing = await prisma.school.findUnique({ where: { code } });
    if (existing) {
      console.log(`School ${code} already exists — skipping. Run "npm run db:reset" for a clean seed.`);
      continue;
    }
    const spec: SchoolSpec =
      code === 'DEMO'
        ? {
            code,
            name: 'Vidyalaya Public School',
            city: 'Patna',
            district: 'Patna',
            state: 'Bihar',
            pincode: '800001',
            plan: 'ENTERPRISE',
            classes: [
              { name: 'Nursery', order: 1, sections: ['A'], fee: 1500 },
              { name: 'LKG', order: 2, sections: ['A'], fee: 1600 },
              { name: 'UKG', order: 3, sections: ['A'], fee: 1700 },
              ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ name: String(n), order: n + 3, sections: n <= 10 ? ['A', 'B'] : ['A'], fee: 1800 + n * 150 })),
              { name: '11', order: 14, sections: ['A'], fee: 3600 },
              { name: '12', order: 15, sections: ['A'], fee: 3800 },
            ],
            studentsPerSection: [6, 9],
            teachers: 14,
            full: true,
          }
        : {
            code,
            name: 'Green Valley School',
            city: 'Ranchi',
            district: 'Ranchi',
            state: 'Jharkhand',
            pincode: '834001',
            plan: 'STARTER',
            classes: [
              { name: '1', order: 4, sections: ['A'], fee: 1200 },
              { name: '2', order: 5, sections: ['A'], fee: 1250 },
              { name: '3', order: 6, sections: ['A'], fee: 1300 },
            ],
            studentsPerSection: [4, 5],
            teachers: 3,
            full: false,
          };
    const r = await seedSchool(spec, hash);
    console.log(`Seeded ${code}: ${r.students} students`);
  }

  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s. Demo password for every account: ${PASSWORD}`);
  console.log('  Platform:  (no school code)  platform');
  console.log('  School DEMO: owner, admin, teacher, accountant, reception, librarian, transport, store, parent, student');
  console.log('  School GVS:  owner, admin, teacher');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
