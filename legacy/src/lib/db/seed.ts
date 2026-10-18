/**
 * Demo seed data.
 *
 * Runs automatically the first time the database is opened (see ./index.ts),
 * so there is no separate `db:seed` step to forget. Everything is inserted
 * inside a single transaction: SQLite fsyncs per statement otherwise, which
 * would turn ~8,000 inserts into a multi-minute first boot.
 *
 * Passwords are hashed once per distinct password rather than once per user —
 * bcrypt at cost 10 takes roughly 100ms, so hashing 150 student accounts
 * individually would add ~15 seconds to startup for no benefit.
 */

import type { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import { SCHEMA_SQL } from './schema';

/* ------------------------------------------------------------------ */
/* Deterministic pseudo-randomness                                     */
/* ------------------------------------------------------------------ */

/**
 * Mulberry32. A fixed seed means every developer and every CI run gets the
 * same demo data, which makes screenshots and bug reports comparable.
 */
function makeRng(seed: number) {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(20260916);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function intBetween(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function chance(probability: number): boolean {
  return rng() < probability;
}

/* ------------------------------------------------------------------ */
/* Insert helper                                                       */
/* ------------------------------------------------------------------ */

/** node:sqlite only binds null, number, bigint, string and Uint8Array. */
function coerce(value: unknown): any {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function makeInserter(database: DatabaseSync) {
  const cache = new Map<string, any>();

  return function insert(table: string, data: Record<string, unknown>): void {
    const columns = Object.keys(data);
    const key = `${table}:${columns.join(',')}`;

    let statement = cache.get(key);
    if (!statement) {
      const placeholders = columns.map(() => '?').join(', ');
      statement = database.prepare(
        `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
      );
      cache.set(key, statement);
    }

    statement.run(...columns.map((column) => coerce(data[column])));
  };
}

/* ------------------------------------------------------------------ */
/* Id + date utilities (local copies to avoid a circular import)       */
/* ------------------------------------------------------------------ */

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter.toString(36).padStart(5, '0')}${Math.floor(rng() * 1e6).toString(36)}`;
}

const NOW = new Date('2026-09-16T09:00:00.000Z');
const iso = (date: Date) => date.toISOString();
const NOW_ISO = iso(NOW);

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function dayKey(date: Date): string {
  return `${date.toISOString().slice(0, 10)}T00:00:00.000Z`;
}

/** Indian academic year runs April to March. */
const ACADEMIC_YEAR = '2026-27';

/* ------------------------------------------------------------------ */
/* Reference data                                                      */
/* ------------------------------------------------------------------ */

const FIRST_NAMES_M = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Reyansh', 'Krishna', 'Ishaan',
  'Shaurya', 'Atharv', 'Rudra', 'Kabir', 'Ayaan', 'Dhruv', 'Aryan', 'Rohan',
  'Kartik', 'Nikhil', 'Siddharth', 'Harsh', 'Manish', 'Pranav', 'Sarthak', 'Yash',
];
const FIRST_NAMES_F = [
  'Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Pari', 'Anika', 'Navya', 'Myra',
  'Aarohi', 'Ishita', 'Riya', 'Kavya', 'Shreya', 'Priya', 'Neha', 'Pooja',
  'Sneha', 'Meera', 'Nandini', 'Tanvi', 'Aditi', 'Sanjana', 'Ritika', 'Payal',
];
const SURNAMES = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Yadav', 'Mishra', 'Tiwari', 'Pandey',
  'Kumar', 'Patel', 'Joshi', 'Chauhan', 'Rathore', 'Saxena', 'Agarwal', 'Dubey',
  'Srivastava', 'Tripathi', 'Shukla', 'Bhardwaj',
];
const OCCUPATIONS = [
  'Farmer', 'Shopkeeper', 'Government Service', 'Private Service', 'Teacher',
  'Driver', 'Businessman', 'Labourer', 'Engineer', 'Doctor',
];
const VILLAGES = [
  'Rampur', 'Sultanpur', 'Bhagwanpur', 'Naurangabad', 'Kishanpur', 'Devipur',
  'Mohanlalganj', 'Chinhat', 'Gosainganj', 'Itaunja',
];
const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS'];
const BLOOD_GROUPS = [
  'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
  'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE',
];
const RELIGIONS = ['HINDU', 'MUSLIM', 'CHRISTIAN', 'SIKH', 'BUDDHIST', 'JAIN'];

const CLASS_DEFS = [
  { name: 'Nursery', order: 1 }, { name: 'LKG', order: 2 }, { name: 'UKG', order: 3 },
  { name: '1', order: 4 }, { name: '2', order: 5 }, { name: '3', order: 6 },
  { name: '4', order: 7 }, { name: '5', order: 8 }, { name: '6', order: 9 },
  { name: '7', order: 10 }, { name: '8', order: 11 }, { name: '9', order: 12 },
  { name: '10', order: 13 }, { name: '11', order: 14 }, { name: '12', order: 15 },
];

const SUBJECT_DEFS = [
  { name: 'Hindi', code: 'HIN', type: 'THEORY' },
  { name: 'English', code: 'ENG', type: 'THEORY' },
  { name: 'Mathematics', code: 'MAT', type: 'THEORY' },
  { name: 'Science', code: 'SCI', type: 'BOTH' },
  { name: 'Social Science', code: 'SST', type: 'THEORY' },
  { name: 'Sanskrit', code: 'SAN', type: 'THEORY' },
  { name: 'Computer Science', code: 'CSC', type: 'BOTH' },
  { name: 'Physical Education', code: 'PED', type: 'PRACTICAL' },
  { name: 'Drawing', code: 'DRW', type: 'PRACTICAL' },
  { name: 'General Knowledge', code: 'GNK', type: 'THEORY' },
  { name: 'Physics', code: 'PHY', type: 'BOTH' },
  { name: 'Chemistry', code: 'CHE', type: 'BOTH' },
  { name: 'Biology', code: 'BIO', type: 'BOTH' },
  { name: 'Accountancy', code: 'ACC', type: 'THEORY' },
];

const EXPENSE_CATEGORIES = [
  'Salary', 'Maintenance', 'Utilities', 'Stationery', 'Transport Fuel',
  'Library Books', 'Lab Equipment', 'Sports Equipment', 'Events', 'Miscellaneous',
];

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const PERIOD_TIMES = [
  ['08:00', '08:45'], ['08:45', '09:30'], ['09:30', '10:15'],
  ['10:35', '11:20'], ['11:20', '12:05'], ['12:05', '12:50'], ['12:50', '13:35'],
];

function gradeFor(percentage: number): string {
  if (percentage >= 91) return 'A1';
  if (percentage >= 81) return 'A2';
  if (percentage >= 71) return 'B1';
  if (percentage >= 61) return 'B2';
  if (percentage >= 51) return 'C1';
  if (percentage >= 41) return 'C2';
  if (percentage >= 33) return 'D';
  return 'E';
}

/* ------------------------------------------------------------------ */
/* Seeder                                                              */
/* ------------------------------------------------------------------ */

export function seedDatabase(database: DatabaseSync): void {
  // Defensive: if this is ever invoked against a fresh handle, make sure the
  // tables exist before writing to them.
  database.exec(SCHEMA_SQL);

  const insert = makeInserter(database);

  database.exec('BEGIN');
  try {
    /* ---------------- passwords (hashed once each) ---------------- */
    const pw = {
      admin: bcrypt.hashSync('admin123', 10),
      teacher: bcrypt.hashSync('teacher123', 10),
      parent: bcrypt.hashSync('parent123', 10),
      student: bcrypt.hashSync('student123', 10),
      accountant: bcrypt.hashSync('account123', 10),
    };

    /* ------------------------- campus ----------------------------- */
    const campusId = id('cmp');
    insert('campuses', {
      id: campusId,
      name: 'Vidyalaya Public School',
      code: 'VPS-LKO-01',
      address: 'Sitapur Road, Near Engineering College Crossing',
      city: 'Lucknow',
      district: 'Lucknow',
      state: 'Uttar Pradesh',
      pincode: '226021',
      phone: '+91 522 4001234',
      email: 'office@vidyalaya.edu.in',
      website: 'https://vidyalaya.edu.in',
      principalName: 'Dr. Suresh Chandra Mishra',
      affiliationNo: 'CBSE/2109876',
      boardType: 'CBSE',
      establishedYear: 1998,
      isActive: true,
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    });

    /* --------------------- academic sessions ---------------------- */
    insert('academic_sessions', {
      id: id('ses'),
      name: ACADEMIC_YEAR,
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: '2027-03-31T00:00:00.000Z',
      isCurrent: true,
      createdAt: NOW_ISO,
    });
    insert('academic_sessions', {
      id: id('ses'),
      name: '2025-26',
      startDate: '2025-04-01T00:00:00.000Z',
      endDate: '2026-03-31T00:00:00.000Z',
      isCurrent: false,
      createdAt: NOW_ISO,
    });

    /* ------------------------- subjects --------------------------- */
    const subjects = SUBJECT_DEFS.map((def) => {
      const subjectId = id('sub');
      insert('subjects', {
        id: subjectId,
        name: def.name,
        code: def.code,
        subjectType: def.type,
        isOptional: false,
        createdAt: NOW_ISO,
      });
      return { id: subjectId, ...def };
    });

    const subjectByCode = new Map(subjects.map((s) => [s.code, s]));

    /** Subjects taught per class band. */
    function subjectsForClass(order: number) {
      if (order <= 3) {
        return ['HIN', 'ENG', 'MAT', 'GNK', 'DRW'].map((c) => subjectByCode.get(c)!);
      }
      if (order <= 8) {
        return ['HIN', 'ENG', 'MAT', 'SCI', 'SST', 'SAN', 'CSC', 'PED'].map(
          (c) => subjectByCode.get(c)!
        );
      }
      if (order <= 10) {
        return ['HIN', 'ENG', 'MAT', 'SCI', 'SST', 'CSC', 'PED'].map(
          (c) => subjectByCode.get(c)!
        );
      }
      return ['ENG', 'PHY', 'CHE', 'MAT', 'BIO', 'CSC'].map((c) => subjectByCode.get(c)!);
    }

    /* ------------------- classes and sections --------------------- */
    const classes: Array<{
      id: string;
      name: string;
      order: number;
      sections: Array<{ id: string; name: string }>;
    }> = [];

    for (const def of CLASS_DEFS) {
      const classId = id('cls');
      insert('classes', {
        id: classId,
        name: def.name,
        numericOrder: def.order,
        campusId,
        isActive: true,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      });

      // Junior classes run two sections, seniors just one.
      const sectionNames = def.order <= 11 ? ['A', 'B'] : ['A'];
      const sections = sectionNames.map((sectionName) => {
        const sectionId = id('sec');
        insert('sections', {
          id: sectionId,
          name: sectionName,
          classId,
          campusId,
          capacity: 40,
          classTeacherId: null,
          createdAt: NOW_ISO,
        });
        return { id: sectionId, name: sectionName };
      });

      for (const subject of subjectsForClass(def.order)) {
        insert('class_subjects', { id: id('csb'), classId, subjectId: subject.id });
      }

      classes.push({ id: classId, name: def.name, order: def.order, sections });
    }

    const allSections = classes.flatMap((c) =>
      c.sections.map((s) => ({ ...s, classId: c.id, className: c.name, order: c.order }))
    );

    /* -------------------------- admins ---------------------------- */
    const superAdminUserId = id('usr');
    insert('users', {
      id: superAdminUserId,
      email: 'admin@vidyalaya.com',
      phone: '+919000000001',
      password: pw.admin,
      role: 'SUPER_ADMIN',
      isActive: true,
      language: 'en',
      campusId,
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    });

    const accountantUserId = id('usr');
    insert('users', {
      id: accountantUserId,
      email: 'accountant@vidyalaya.com',
      phone: '+919000000002',
      password: pw.accountant,
      role: 'ACCOUNTANT',
      isActive: true,
      language: 'en',
      campusId,
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    });
    insert('staff', {
      id: id('stf'),
      employeeId: 'EMP1001',
      firstName: 'Ramesh',
      lastName: 'Agarwal',
      designation: 'Accountant',
      department: 'Accounts',
      gender: 'MALE',
      dob: '1985-06-12T00:00:00.000Z',
      joiningDate: '2015-07-01T00:00:00.000Z',
      salary: 38000,
      phone: '+919000000002',
      address: 'Aliganj, Lucknow',
      isActive: true,
      userId: accountantUserId,
      campusId,
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    });

    /* -------------------------- teachers -------------------------- */
    const TEACHER_DEFS = [
      { first: 'Anjali', last: 'Sharma', gender: 'FEMALE', qual: 'M.Sc, B.Ed', spec: 'Mathematics', code: 'MAT' },
      { first: 'Rakesh', last: 'Verma', gender: 'MALE', qual: 'M.A, B.Ed', spec: 'Hindi', code: 'HIN' },
      { first: 'Priyanka', last: 'Singh', gender: 'FEMALE', qual: 'M.A English, B.Ed', spec: 'English', code: 'ENG' },
      { first: 'Sunil', last: 'Yadav', gender: 'MALE', qual: 'M.Sc Physics, B.Ed', spec: 'Physics', code: 'PHY' },
      { first: 'Kavita', last: 'Mishra', gender: 'FEMALE', qual: 'M.Sc Chemistry', spec: 'Chemistry', code: 'CHE' },
      { first: 'Deepak', last: 'Tiwari', gender: 'MALE', qual: 'M.Sc Biology, B.Ed', spec: 'Biology', code: 'BIO' },
      { first: 'Neelam', last: 'Pandey', gender: 'FEMALE', qual: 'M.A History, B.Ed', spec: 'Social Science', code: 'SST' },
      { first: 'Manoj', last: 'Kumar', gender: 'MALE', qual: 'MCA', spec: 'Computer Science', code: 'CSC' },
      { first: 'Shalini', last: 'Gupta', gender: 'FEMALE', qual: 'M.Sc, B.Ed', spec: 'Science', code: 'SCI' },
      { first: 'Arun', last: 'Joshi', gender: 'MALE', qual: 'M.A Sanskrit', spec: 'Sanskrit', code: 'SAN' },
      { first: 'Pooja', last: 'Chauhan', gender: 'FEMALE', qual: 'B.P.Ed', spec: 'Physical Education', code: 'PED' },
      { first: 'Vikas', last: 'Saxena', gender: 'MALE', qual: 'B.F.A', spec: 'Drawing', code: 'DRW' },
      { first: 'Rekha', last: 'Dubey', gender: 'FEMALE', qual: 'M.A, B.Ed', spec: 'General Knowledge', code: 'GNK' },
      { first: 'Amit', last: 'Srivastava', gender: 'MALE', qual: 'M.Com, B.Ed', spec: 'Accountancy', code: 'ACC' },
      { first: 'Meena', last: 'Tripathi', gender: 'FEMALE', qual: 'M.Sc Maths, B.Ed', spec: 'Mathematics', code: 'MAT' },
      { first: 'Sanjay', last: 'Shukla', gender: 'MALE', qual: 'M.A English', spec: 'English', code: 'ENG' },
      { first: 'Geeta', last: 'Bhardwaj', gender: 'FEMALE', qual: 'M.Sc, B.Ed', spec: 'Science', code: 'SCI' },
      { first: 'Rajeev', last: 'Rathore', gender: 'MALE', qual: 'M.A Hindi, B.Ed', spec: 'Hindi', code: 'HIN' },
    ];

    const teachers = TEACHER_DEFS.map((def, index) => {
      const userId = id('usr');
      const teacherId = id('tch');
      // The first teacher owns the advertised demo login.
      const email =
        index === 0
          ? 'teacher@vidyalaya.com'
          : `${def.first.toLowerCase()}.${def.last.toLowerCase()}@vidyalaya.com`;

      insert('users', {
        id: userId,
        email,
        phone: `+9198${(10000000 + index * 137).toString().slice(0, 8)}`,
        password: pw.teacher,
        role: 'TEACHER',
        isActive: true,
        language: 'en',
        campusId,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      });

      const salary = intBetween(28, 62) * 1000;
      insert('teachers', {
        id: teacherId,
        employeeId: `TCH${(2001 + index).toString()}`,
        firstName: def.first,
        lastName: def.last,
        gender: def.gender,
        dob: iso(new Date(Date.UTC(1980 + (index % 12), index % 12, 1 + (index % 27)))),
        qualification: def.qual,
        specialization: def.spec,
        experience: intBetween(2, 22),
        joiningDate: iso(new Date(Date.UTC(2010 + (index % 14), (index * 3) % 12, 1))),
        salary,
        aadhaarNo: `${intBetween(2000, 9999)} ${intBetween(1000, 9999)} ${intBetween(1000, 9999)}`,
        panNo: `ABCDE${intBetween(1000, 9999)}F`,
        bankAccount: `${intBetween(10000000, 99999999)}${intBetween(100, 999)}`,
        bankName: pick(['State Bank of India', 'Punjab National Bank', 'Bank of Baroda', 'HDFC Bank']),
        ifscCode: `SBIN000${intBetween(1000, 9999)}`,
        phone: `+9198${(10000000 + index * 137).toString().slice(0, 8)}`,
        address: `${pick(VILLAGES)}, Lucknow, Uttar Pradesh`,
        isActive: true,
        userId,
        campusId,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      });

      return { id: teacherId, userId, salary, ...def };
    });

    /* ---------------- class teachers + subject map ---------------- */
    const updateClassTeacher = database.prepare(
      'UPDATE sections SET classTeacherId = ? WHERE id = ?'
    );
    allSections.forEach((section, index) => {
      const teacher = teachers[index % teachers.length];
      updateClassTeacher.run(teacher.id, section.id);
    });

    for (const section of allSections) {
      for (const subject of subjectsForClass(section.order)) {
        const candidates = teachers.filter((t) => t.code === subject.code);
        const teacher = candidates.length ? pick(candidates) : pick(teachers);
        insert('teacher_subjects', {
          id: id('tsb'),
          teacherId: teacher.id,
          subjectId: subject.id,
          classId: section.classId,
          sectionId: section.id,
        });
      }
    }

    /* ------------------------ other staff ------------------------- */
    const STAFF_DEFS = [
      { first: 'Shyam', last: 'Lal', designation: 'Head Clerk', dept: 'Administration', gender: 'MALE', salary: 26000 },
      { first: 'Kamla', last: 'Devi', designation: 'Librarian', dept: 'Library', gender: 'FEMALE', salary: 24000 },
      { first: 'Ravi', last: 'Prasad', designation: 'Lab Assistant', dept: 'Science Lab', gender: 'MALE', salary: 19000 },
      { first: 'Munni', last: 'Bai', designation: 'Attendant', dept: 'Housekeeping', gender: 'FEMALE', salary: 12000 },
      { first: 'Jagdish', last: 'Singh', designation: 'Security Guard', dept: 'Security', gender: 'MALE', salary: 15000 },
      { first: 'Anil', last: 'Kumar', designation: 'Transport Incharge', dept: 'Transport', gender: 'MALE', salary: 22000 },
    ];

    const staffList = STAFF_DEFS.map((def, index) => {
      const userId = id('usr');
      const staffId = id('stf');
      insert('users', {
        id: userId,
        email: `${def.first.toLowerCase()}.${def.last.toLowerCase()}@vidyalaya.com`,
        phone: `+9197${(20000000 + index * 211).toString().slice(0, 8)}`,
        password: pw.accountant,
        role: def.designation === 'Librarian' ? 'LIBRARIAN' : def.designation === 'Transport Incharge' ? 'TRANSPORT_MANAGER' : 'ADMIN',
        isActive: true,
        language: 'en',
        campusId,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      });
      insert('staff', {
        id: staffId,
        employeeId: `EMP${(1010 + index).toString()}`,
        firstName: def.first,
        lastName: def.last,
        designation: def.designation,
        department: def.dept,
        gender: def.gender,
        dob: iso(new Date(Date.UTC(1978 + index, index % 12, 10))),
        joiningDate: iso(new Date(Date.UTC(2012 + index, 3, 1))),
        salary: def.salary,
        phone: `+9197${(20000000 + index * 211).toString().slice(0, 8)}`,
        address: `${pick(VILLAGES)}, Lucknow`,
        isActive: true,
        userId,
        campusId,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      });
      return { id: staffId, salary: def.salary };
    });

    /* ----------------------- fee structures ----------------------- */
    const feeStructures: Array<{ id: string; classId: string; amount: number; feeType: string }> = [];

    for (const klass of classes) {
      // Tuition scales with class level.
      const tuition = 900 + klass.order * 120;
      const rows = [
        { name: 'Tuition Fee', feeType: 'TUITION', amount: tuition, frequency: 'MONTHLY' },
        { name: 'Admission Fee', feeType: 'ADMISSION', amount: 2500, frequency: 'ONE_TIME' },
        { name: 'Examination Fee', feeType: 'EXAM', amount: 600, frequency: 'HALF_YEARLY' },
        { name: 'Computer Lab Fee', feeType: 'COMPUTER', amount: 400, frequency: 'QUARTERLY' },
        { name: 'Annual Development Charge', feeType: 'DEVELOPMENT', amount: 3000, frequency: 'YEARLY' },
      ];

      for (const row of rows) {
        const feeId = id('fee');
        insert('fee_structures', {
          id: feeId,
          name: row.name,
          feeType: row.feeType,
          amount: row.amount,
          dueDate: '2026-10-10T00:00:00.000Z',
          academicYear: ACADEMIC_YEAR,
          frequency: row.frequency,
          lateFine: row.feeType === 'TUITION' ? 20 : 0,
          lateFineType: row.feeType === 'TUITION' ? 'PER_DAY' : 'FIXED',
          classId: klass.id,
          campusId,
          createdAt: NOW_ISO,
          updatedAt: NOW_ISO,
        });
        feeStructures.push({ id: feeId, classId: klass.id, amount: row.amount, feeType: row.feeType });
      }
    }

    /* ------------------- students, parents, users ------------------ */
    type Student = {
      id: string;
      userId: string;
      classId: string;
      sectionId: string;
      order: number;
      name: string;
      gender: string;
    };
    const students: Student[] = [];

    let admissionCounter = 0;
    let receiptCounter = 0;

    for (const section of allSections) {
      // Senior sections are smaller, junior sections fuller.
      const size = section.order <= 8 ? intBetween(6, 9) : intBetween(4, 7);

      for (let seat = 1; seat <= size; seat += 1) {
        admissionCounter += 1;

        const gender = chance(0.52) ? 'MALE' : 'FEMALE';
        const firstName = gender === 'MALE' ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
        const surname = pick(SURNAMES);
        const isFirstStudent = admissionCounter === 1;

        /* -------- parent -------- */
        const parentUserId = id('usr');
        const parentId = id('par');
        const fatherName = `${pick(FIRST_NAMES_M)} ${surname}`;
        const motherName = `${pick(FIRST_NAMES_F)} ${surname}`;

        insert('users', {
          id: parentUserId,
          email: isFirstStudent
            ? 'parent@vidyalaya.com'
            : `parent${admissionCounter}@vidyalaya.com`,
          phone: `+9196${(30000000 + admissionCounter * 71).toString().slice(0, 8)}`,
          password: pw.parent,
          role: 'PARENT',
          isActive: true,
          language: chance(0.3) ? 'hi' : 'en',
          campusId,
          createdAt: NOW_ISO,
          updatedAt: NOW_ISO,
        });

        insert('parents', {
          id: parentId,
          fatherName,
          fatherPhone: `+9196${(30000000 + admissionCounter * 71).toString().slice(0, 8)}`,
          fatherEmail: isFirstStudent ? 'parent@vidyalaya.com' : `parent${admissionCounter}@vidyalaya.com`,
          fatherIdCard: `${intBetween(2000, 9999)} ${intBetween(1000, 9999)} ${intBetween(1000, 9999)}`,
          fatherOccupation: pick(OCCUPATIONS),
          motherName,
          motherPhone: `+9195${(40000000 + admissionCounter * 53).toString().slice(0, 8)}`,
          motherOccupation: chance(0.4) ? pick(OCCUPATIONS) : 'Homemaker',
          guardianName: chance(0.1) ? `${pick(FIRST_NAMES_M)} ${surname}` : null,
          guardianPhone: null,
          guardianRelation: chance(0.1) ? 'Uncle' : null,
          religion: pick(RELIGIONS),
          annualIncome: intBetween(90, 900) * 1000,
          userId: parentUserId,
          createdAt: NOW_ISO,
          updatedAt: NOW_ISO,
        });

        /* -------- student -------- */
        const studentUserId = id('usr');
        const studentId = id('stu');
        const admissionNo = `ADM26${(1000 + admissionCounter).toString()}`;
        // Approximate age from class level.
        const birthYear = 2026 - (3 + section.order);

        insert('users', {
          id: studentUserId,
          email: isFirstStudent
            ? 'student@vidyalaya.com'
            : `${admissionNo.toLowerCase()}@vidyalaya.com`,
          phone: null,
          password: pw.student,
          role: 'STUDENT',
          isActive: true,
          language: 'en',
          campusId,
          createdAt: NOW_ISO,
          updatedAt: NOW_ISO,
        });

        insert('students', {
          id: studentId,
          admissionNo,
          rollNo: String(seat),
          firstName,
          lastName: surname,
          gender,
          dob: iso(new Date(Date.UTC(birthYear, intBetween(0, 11), intBetween(1, 28)))),
          bloodGroup: pick(BLOOD_GROUPS),
          religion: pick(RELIGIONS),
          caste: null,
          category: pick(CATEGORIES),
          nationality: 'Indian',
          aadhaarNo: `${intBetween(2000, 9999)} ${intBetween(1000, 9999)} ${intBetween(1000, 9999)}`,
          streetAddress: `House No. ${intBetween(1, 250)}`,
          village: pick(VILLAGES),
          post: pick(VILLAGES),
          policeStation: pick(['Gudamba', 'Aliganj', 'Mahanagar', 'Chinhat']),
          city: 'Lucknow',
          district: 'Lucknow',
          state: 'Uttar Pradesh',
          pincode: `2260${intBetween(10, 99)}`,
          previousSchool: chance(0.35) ? `${pick(['Saraswati', 'Gyan Bharti', 'Little Angels'])} School` : null,
          tcNumber: null,
          admissionDate: iso(new Date(Date.UTC(2026, 3, intBetween(1, 28)))),
          isActive: true,
          userId: studentUserId,
          campusId,
          classId: section.classId,
          sectionId: section.id,
          parentId,
          createdAt: NOW_ISO,
          updatedAt: NOW_ISO,
        });

        students.push({
          id: studentId,
          userId: studentUserId,
          classId: section.classId,
          sectionId: section.id,
          order: section.order,
          name: `${firstName} ${surname}`,
          gender,
        });
      }
    }

    /* -------------------------- attendance ------------------------ */
    // Last 24 weekdays of attendance, which is enough to make the
    // dashboard percentages and monthly reports meaningful.
    const attendanceDays: Date[] = [];
    let cursor = new Date(NOW);
    while (attendanceDays.length < 24) {
      const weekday = cursor.getUTCDay();
      if (weekday !== 0) attendanceDays.push(new Date(cursor));
      cursor = addDays(cursor, -1);
    }

    for (const student of students) {
      for (const day of attendanceDays) {
        const roll = rng();
        let status = 'PRESENT';
        if (roll > 0.94) status = 'ABSENT';
        else if (roll > 0.915) status = 'LATE';
        else if (roll > 0.905) status = 'LEAVE';

        insert('attendances', {
          id: id('att'),
          date: dayKey(day),
          status,
          remarks: status === 'LEAVE' ? 'Approved leave' : null,
          studentId: student.id,
          sectionId: student.sectionId,
          markedById: superAdminUserId,
          createdAt: iso(day),
        });
      }
    }

    for (const teacher of teachers) {
      for (const day of attendanceDays.slice(0, 12)) {
        insert('teacher_attendances', {
          id: id('tat'),
          date: dayKey(day),
          status: rng() > 0.96 ? 'ABSENT' : 'PRESENT',
          remarks: null,
          teacherId: teacher.id,
          createdAt: iso(day),
        });
      }
    }

    /* ------------------------ fee payments ------------------------ */
    const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September'];

    for (const student of students) {
      const tuition = feeStructures.find(
        (f) => f.classId === student.classId && f.feeType === 'TUITION'
      );
      if (!tuition) continue;

      // Most families are current; some are one or two months behind.
      const monthsPaid = chance(0.72) ? MONTHS.length : intBetween(2, MONTHS.length - 1);

      for (let monthIndex = 0; monthIndex < monthsPaid; monthIndex += 1) {
        receiptCounter += 1;
        const discount = chance(0.12) ? 200 : 0;
        const lateFine = chance(0.15) ? intBetween(1, 8) * 20 : 0;
        const total = tuition.amount - discount + lateFine;
        const partial = chance(0.07);
        const paid = partial ? Math.round(total * 0.5) : total;

        insert('fee_payments', {
          id: id('fpy'),
          receiptNo: `REC2609${(10000 + receiptCounter).toString()}`,
          amount: tuition.amount,
          discount,
          lateFine,
          totalAmount: total,
          paidAmount: paid,
          balanceAmount: total - paid,
          paymentMode: pick(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE']),
          paymentStatus: partial ? 'PARTIAL' : 'PAID',
          paymentDate: iso(new Date(Date.UTC(2026, 3 + monthIndex, intBetween(2, 27)))),
          transactionId: chance(0.5) ? `TXN${intBetween(100000, 999999)}` : null,
          remarks: null,
          month: MONTHS[monthIndex],
          academicYear: ACADEMIC_YEAR,
          studentId: student.id,
          feeStructureId: tuition.id,
          collectedById: accountantUserId,
          createdAt: NOW_ISO,
        });
      }
    }

    /* --------------------------- exams ---------------------------- */
    for (const klass of classes) {
      const classSubjects = subjectsForClass(klass.order);

      const examDefs = [
        {
          name: `Unit Test 1 (${ACADEMIC_YEAR})`,
          examType: 'UNIT_TEST',
          start: new Date(Date.UTC(2026, 6, 13)),
          end: new Date(Date.UTC(2026, 6, 18)),
          max: 25,
          published: true,
        },
        {
          name: `Half Yearly Examination (${ACADEMIC_YEAR})`,
          examType: 'HALF_YEARLY',
          start: new Date(Date.UTC(2026, 8, 21)),
          end: new Date(Date.UTC(2026, 8, 30)),
          max: 80,
          published: false,
        },
      ];

      for (const examDef of examDefs) {
        const examId = id('exm');
        insert('exams', {
          id: examId,
          name: examDef.name,
          examType: examDef.examType,
          academicYear: ACADEMIC_YEAR,
          startDate: iso(examDef.start),
          endDate: iso(examDef.end),
          classId: klass.id,
          description: `${examDef.examType.replace('_', ' ')} for Class ${klass.name}`,
          isPublished: examDef.published,
          createdAt: NOW_ISO,
        });

        classSubjects.forEach((subject, subjectIndex) => {
          insert('exam_subjects', {
            id: id('exs'),
            examId,
            subjectId: subject.id,
            examDate: iso(addDays(examDef.start, subjectIndex)),
            startTime: '09:00',
            endTime: examDef.max > 50 ? '12:00' : '10:30',
            maxMarks: examDef.max,
            passingMarks: Math.round(examDef.max * 0.33),
            room: `Room ${100 + subjectIndex}`,
            createdAt: NOW_ISO,
          });
        });

        // Only the published exam carries results, so the Results page has
        // data while the upcoming exam correctly shows none.
        if (!examDef.published) continue;

        const classStudents = students.filter((s) => s.classId === klass.id);
        for (const student of classStudents) {
          // Give each student a consistent ability so results look plausible.
          const ability = 0.45 + rng() * 0.5;

          for (const subject of classSubjects) {
            const absent = chance(0.02);
            const raw = absent
              ? 0
              : Math.min(
                  examDef.max,
                  Math.max(6, Math.round(examDef.max * ability + (rng() - 0.5) * examDef.max * 0.18))
                );
            const percentage = (raw / examDef.max) * 100;

            insert('exam_results', {
              id: id('exr'),
              marksObtained: raw,
              grade: absent ? 'AB' : gradeFor(percentage),
              remarks: null,
              isAbsent: absent,
              practicalMarks: subject.type !== 'THEORY' ? Math.round(raw * 0.3) : null,
              theoryMarks: subject.type !== 'THEORY' ? Math.round(raw * 0.7) : raw,
              examId,
              studentId: student.id,
              subjectId: subject.id,
              createdAt: NOW_ISO,
            });
          }
        }
      }
    }

    /* ------------------------- timetable -------------------------- */
    for (const section of allSections) {
      const classSubjects = subjectsForClass(section.order);
      let rotation = 0;

      for (const day of DAYS) {
        const periodCount = day === 'SATURDAY' ? 4 : PERIOD_TIMES.length;

        for (let period = 1; period <= periodCount; period += 1) {
          const subject = classSubjects[rotation % classSubjects.length];
          rotation += 1;

          const candidates = teachers.filter((t) => t.code === subject.code);
          const teacher = candidates.length ? candidates[period % candidates.length] : teachers[period % teachers.length];

          insert('timetable_slots', {
            id: id('tts'),
            day,
            startTime: PERIOD_TIMES[period - 1][0],
            endTime: PERIOD_TIMES[period - 1][1],
            period,
            classId: section.classId,
            sectionId: section.id,
            subjectId: subject.id,
            teacherId: teacher.id,
          });
        }
      }
    }

    /* -------------------------- homework -------------------------- */
    for (const klass of classes.slice(3)) {
      const classSubjects = subjectsForClass(klass.order);
      for (let index = 0; index < 3; index += 1) {
        const subject = pick(classSubjects);
        const candidates = teachers.filter((t) => t.code === subject.code);
        const teacher = candidates.length ? pick(candidates) : pick(teachers);
        const homeworkId = id('hwk');

        insert('homeworks', {
          id: homeworkId,
          title: `${subject.name}: Exercise ${intBetween(2, 14)}`,
          description: `Complete the exercise questions and submit in your notebook. Revise the chapter before attempting.`,
          dueDate: iso(addDays(NOW, intBetween(1, 9))),
          classId: klass.id,
          subjectId: subject.id,
          teacherId: teacher.id,
          createdAt: iso(addDays(NOW, -intBetween(1, 5))),
        });

        const classStudents = students.filter((s) => s.classId === klass.id);
        for (const student of classStudents) {
          if (!chance(0.6)) continue;
          insert('homework_submissions', {
            id: id('hws'),
            homeworkId,
            studentId: student.id,
            submittedAt: iso(addDays(NOW, -intBetween(0, 2))),
            marks: chance(0.6) ? intBetween(5, 10) : null,
            remarks: null,
            status: chance(0.5) ? 'CHECKED' : 'SUBMITTED',
          });
        }
      }
    }

    /* ----------------------- online classes ----------------------- */
    for (let index = 0; index < 6; index += 1) {
      const klass = pick(classes.slice(8));
      const subject = pick(subjectsForClass(klass.order));
      const candidates = teachers.filter((t) => t.code === subject.code);
      const teacher = candidates.length ? pick(candidates) : pick(teachers);
      const start = addDays(NOW, index - 2);

      insert('online_classes', {
        id: id('onl'),
        title: `${subject.name} Doubt Session — Class ${klass.name}`,
        description: 'Bring your questions from the last two chapters.',
        meetingLink: `https://meet.google.com/vps-${intBetween(100, 999)}-${intBetween(100, 999)}`,
        platform: pick(['GOOGLE_MEET', 'ZOOM', 'TEAMS']),
        startTime: iso(start),
        endTime: iso(new Date(start.getTime() + 60 * 60 * 1000)),
        teacherId: teacher.id,
        classIds: [klass.id],
        status: index < 2 ? 'COMPLETED' : 'SCHEDULED',
        createdAt: NOW_ISO,
      });
    }

    /* ------------------------- transport -------------------------- */
    const ROUTE_DEFS = [
      { name: 'Aliganj – Sitapur Road', no: 'R-01', vehicle: 'UP32 AB 4521', driver: 'Ram Prakash' },
      { name: 'Chinhat – Kamta', no: 'R-02', vehicle: 'UP32 CD 7789', driver: 'Mohan Lal' },
      { name: 'Gomti Nagar – Vikas Nagar', no: 'R-03', vehicle: 'UP32 EF 1122', driver: 'Suresh Yadav' },
      { name: 'Jankipuram – Faizabad Road', no: 'R-04', vehicle: 'UP32 GH 9080', driver: 'Dinesh Kumar' },
    ];

    const routes = ROUTE_DEFS.map((def, index) => {
      const routeId = id('rte');
      insert('transport_routes', {
        id: routeId,
        routeName: def.name,
        routeNo: def.no,
        vehicleNo: def.vehicle,
        driverName: def.driver,
        driverPhone: `+9194${(50000000 + index * 313).toString().slice(0, 8)}`,
        driverLicense: `UP32${intBetween(100000, 999999)}`,
        conductorName: pick(FIRST_NAMES_M) + ' ' + pick(SURNAMES),
        conductorPhone: `+9193${(60000000 + index * 179).toString().slice(0, 8)}`,
        capacity: intBetween(28, 45),
        campusId,
        isActive: true,
        createdAt: NOW_ISO,
      });

      const stopNames = [pick(VILLAGES), pick(VILLAGES), pick(VILLAGES), pick(VILLAGES)];
      const stops = stopNames.map((stopName, stopIndex) => {
        insert('transport_stops', {
          id: id('stp'),
          name: `${stopName} Crossing`,
          pickupTime: `0${6 + Math.floor(stopIndex / 2)}:${stopIndex % 2 === 0 ? '15' : '45'}`,
          dropTime: `1${4 + Math.floor(stopIndex / 2)}:${stopIndex % 2 === 0 ? '30' : '55'}`,
          fare: 600 + stopIndex * 150,
          routeId,
          stopOrder: stopIndex + 1,
        });
        return `${stopName} Crossing`;
      });

      return { id: routeId, stops };
    });

    for (const student of students) {
      if (!chance(0.32)) continue;
      const route = pick(routes);
      insert('transport_assignments', {
        id: id('tas'),
        studentId: student.id,
        routeId: route.id,
        stopName: pick(route.stops),
        pickupDrop: chance(0.85) ? 'BOTH' : pick(['PICKUP', 'DROP']),
        createdAt: NOW_ISO,
      });
    }

    /* -------------------- notices and events ---------------------- */
    const NOTICE_DEFS = [
      { title: 'Half Yearly Examination Schedule Released', type: 'EXAM', content: 'The Half Yearly Examination will commence from 21 September 2026. The detailed datesheet is available with class teachers and on the exam noticeboard. Students must carry their admit cards.' },
      { title: 'Fee Submission Reminder — September', type: 'FEE', content: 'Parents are requested to clear the September tuition fee by 10 October 2026. A late fine of Rs 20 per day applies thereafter. Payments can be made by cash, UPI or bank transfer at the accounts counter.' },
      { title: 'Gandhi Jayanti — School Closed', type: 'HOLIDAY', content: 'The school will remain closed on 2 October 2026 on account of Gandhi Jayanti. A special assembly will be held on 1 October.' },
      { title: 'Parent Teacher Meeting', type: 'EVENT', content: 'A Parent Teacher Meeting for classes 6 to 12 is scheduled for Saturday, 26 September 2026 from 09:00 to 13:00. Parents are requested to collect the progress report from the respective class teacher.' },
      { title: 'Annual Sports Day Trials', type: 'GENERAL', content: 'Trials for the Annual Sports Day will be conducted during the games period this week. Interested students should register with the Physical Education department.' },
      { title: 'Winter Uniform From 1 November', type: 'GENERAL', content: 'All students must switch to the prescribed winter uniform from 1 November 2026. The school blazer is compulsory during the morning assembly.' },
    ];

    NOTICE_DEFS.forEach((def, index) => {
      insert('notices', {
        id: id('not'),
        title: def.title,
        content: def.content,
        type: def.type,
        targetRoles: ['ADMIN', 'TEACHER', 'PARENT', 'STUDENT'],
        targetClasses: [],
        isPublished: true,
        publishDate: iso(addDays(NOW, -index * 3)),
        expiryDate: iso(addDays(NOW, 30 - index)),
        campusId,
        createdById: superAdminUserId,
        createdAt: iso(addDays(NOW, -index * 3)),
      });
    });

    const EVENT_DEFS = [
      { title: 'Parent Teacher Meeting', type: 'PTM', start: addDays(NOW, 10), location: 'School Auditorium' },
      { title: 'Gandhi Jayanti', type: 'HOLIDAY', start: new Date(Date.UTC(2026, 9, 2)), location: null },
      { title: 'Annual Sports Day', type: 'EVENT', start: new Date(Date.UTC(2026, 10, 14)), location: 'School Ground' },
      { title: 'Diwali Break', type: 'HOLIDAY', start: new Date(Date.UTC(2026, 10, 7)), location: null },
      { title: 'Staff Review Meeting', type: 'MEETING', start: addDays(NOW, 4), location: 'Conference Room' },
      { title: 'Science Exhibition', type: 'EVENT', start: new Date(Date.UTC(2026, 11, 5)), location: 'Science Block' },
    ];

    for (const def of EVENT_DEFS) {
      insert('events', {
        id: id('evt'),
        title: def.title,
        description: null,
        startDate: iso(def.start),
        endDate: iso(def.start),
        location: def.location,
        type: def.type,
        campusId,
        createdAt: NOW_ISO,
      });
    }

    /* ----------------------- leave requests ----------------------- */
    for (let index = 0; index < 14; index += 1) {
      const student = pick(students);
      const start = addDays(NOW, intBetween(-10, 6));
      insert('leave_requests', {
        id: id('lvr'),
        startDate: iso(start),
        endDate: iso(addDays(start, intBetween(0, 3))),
        reason: pick(['Fever and cold', 'Family function', 'Medical check-up', 'Out of station', 'Sister\'s marriage']),
        status: pick(['PENDING', 'APPROVED', 'APPROVED', 'REJECTED']),
        leaveType: pick(['SICK', 'CASUAL', 'FAMILY', 'OTHER']),
        approvedBy: null,
        remarks: null,
        studentId: student.id,
        createdAt: iso(addDays(start, -1)),
      });
    }

    for (let index = 0; index < 6; index += 1) {
      const teacher = pick(teachers);
      const start = addDays(NOW, intBetween(-8, 8));
      insert('teacher_leave_requests', {
        id: id('tlv'),
        startDate: iso(start),
        endDate: iso(addDays(start, intBetween(0, 2))),
        reason: pick(['Medical leave', 'Personal work', 'Family emergency', 'Training programme']),
        status: pick(['PENDING', 'APPROVED', 'APPROVED']),
        leaveType: pick(['SICK', 'CASUAL', 'OTHER']),
        approvedBy: null,
        remarks: null,
        teacherId: teacher.id,
        createdAt: iso(addDays(start, -2)),
      });
    }

    /* ------------------------- accounting ------------------------- */
    // Income rows mirror fee collection plus a few non-fee sources.
    for (let monthIndex = 0; monthIndex < 6; monthIndex += 1) {
      insert('incomes', {
        id: id('inc'),
        title: `Fee Collection — ${MONTHS[monthIndex]} 2026`,
        category: 'Fee Collection',
        amount: intBetween(280, 460) * 1000,
        date: iso(new Date(Date.UTC(2026, 3 + monthIndex, 28))),
        description: 'Monthly consolidated tuition and misc fee collection',
        receiptNo: `INC${2600 + monthIndex}`,
        paymentMode: 'CASH',
        campusId,
        createdAt: NOW_ISO,
      });
    }

    const EXTRA_INCOME = [
      { title: 'Government Grant (Mid-day Meal)', category: 'Grant', amount: 180000 },
      { title: 'Alumni Donation', category: 'Donation', amount: 75000 },
      { title: 'Transport Fee Collection', category: 'Transport', amount: 240000 },
      { title: 'Sale of Uniform & Books', category: 'Other', amount: 132000 },
    ];
    EXTRA_INCOME.forEach((def, index) => {
      insert('incomes', {
        id: id('inc'),
        title: def.title,
        category: def.category,
        amount: def.amount,
        date: iso(addDays(NOW, -intBetween(5, 90))),
        description: null,
        receiptNo: `INC${2700 + index}`,
        paymentMode: pick(['BANK_TRANSFER', 'CHEQUE', 'ONLINE']),
        campusId,
        createdAt: NOW_ISO,
      });
    });

    for (let index = 0; index < 42; index += 1) {
      const category = pick(EXPENSE_CATEGORIES);
      insert('expenses', {
        id: id('exp'),
        title: `${category} — ${pick(['September', 'August', 'July'])} 2026`,
        category,
        amount:
          category === 'Salary'
            ? intBetween(380, 520) * 1000
            : intBetween(3, 85) * 1000,
        date: iso(addDays(NOW, -intBetween(1, 120))),
        description: null,
        voucherNo: `VCH${3000 + index}`,
        paidTo: pick(['Sharma Traders', 'UP Power Corporation', 'Jal Nigam', 'Staff Payroll', 'Bharat Petroleum', 'Local Vendor']),
        paymentMode: pick(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI']),
        campusId,
        approvedBy: superAdminUserId,
        createdAt: NOW_ISO,
      });
    }

    /* --------------------------- salary --------------------------- */
    const SALARY_MONTHS = ['June 2026', 'July 2026', 'August 2026'];
    for (const teacher of teachers) {
      for (const month of SALARY_MONTHS) {
        const basic = teacher.salary ?? 30000;
        const allowances = Math.round(basic * 0.12);
        const deductions = Math.round(basic * 0.08);
        insert('salary_payments', {
          id: id('sal'),
          month,
          basicSalary: basic,
          allowances,
          deductions,
          netSalary: basic + allowances - deductions,
          paymentMode: 'BANK_TRANSFER',
          paymentDate: iso(new Date(Date.UTC(2026, 5 + SALARY_MONTHS.indexOf(month), 28))),
          transactionId: `SALTXN${intBetween(100000, 999999)}`,
          status: 'PAID',
          remarks: null,
          teacherId: teacher.id,
          createdAt: NOW_ISO,
        });
      }
    }

    for (const member of staffList) {
      for (const month of SALARY_MONTHS) {
        const basic = member.salary;
        const allowances = Math.round(basic * 0.1);
        const deductions = Math.round(basic * 0.06);
        insert('staff_salary_payments', {
          id: id('ssl'),
          month,
          basicSalary: basic,
          allowances,
          deductions,
          netSalary: basic + allowances - deductions,
          paymentMode: 'BANK_TRANSFER',
          paymentDate: iso(new Date(Date.UTC(2026, 5 + SALARY_MONTHS.indexOf(month), 28))),
          status: 'PAID',
          staffId: member.id,
          createdAt: NOW_ISO,
        });
      }
    }

    /* -------------------------- inventory ------------------------- */
    const INVENTORY_DEFS = [
      { name: 'Student Desk (Dual)', category: 'Furniture', qty: 420, price: 3200 },
      { name: 'Teacher Chair', category: 'Furniture', qty: 48, price: 2400 },
      { name: 'Whiteboard 6x4', category: 'Furniture', qty: 34, price: 4500 },
      { name: 'Desktop Computer', category: 'Electronics', qty: 42, price: 32000 },
      { name: 'Projector', category: 'Electronics', qty: 8, price: 28000 },
      { name: 'Ceiling Fan', category: 'Electronics', qty: 96, price: 1800 },
      { name: 'A4 Paper Ream', category: 'Stationery', qty: 180, price: 280 },
      { name: 'Chalk Box', category: 'Stationery', qty: 260, price: 45 },
      { name: 'Register (200 pages)', category: 'Stationery', qty: 140, price: 120 },
      { name: 'Microscope', category: 'Lab Equipment', qty: 16, price: 8500 },
      { name: 'Chemistry Glassware Set', category: 'Lab Equipment', qty: 24, price: 3400 },
      { name: 'Cricket Kit', category: 'Sports', qty: 6, price: 6500 },
      { name: 'Football', category: 'Sports', qty: 18, price: 900 },
      { name: 'Volleyball Net', category: 'Sports', qty: 4, price: 1600 },
      { name: 'Library Almirah', category: 'Furniture', qty: 12, price: 7800 },
      { name: 'First Aid Kit', category: 'Miscellaneous', qty: 10, price: 1200 },
    ];

    for (const def of INVENTORY_DEFS) {
      insert('inventory_items', {
        id: id('inv'),
        name: def.name,
        category: def.category,
        quantity: def.qty,
        unitPrice: def.price,
        supplier: pick(['Sharma Traders', 'Lucknow Furniture House', 'Tech Solutions', 'Modern Stationers']),
        purchaseDate: iso(addDays(NOW, -intBetween(30, 900))),
        location: pick(['Store Room', 'Science Lab', 'Computer Lab', 'Library', 'Classrooms']),
        condition: pick(['GOOD', 'GOOD', 'GOOD', 'FAIR', 'POOR']),
        campusId,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      });
    }

    /* --------------------- admission inquiries -------------------- */
    for (let index = 0; index < 18; index += 1) {
      const gender = chance(0.5) ? 'MALE' : 'FEMALE';
      const firstName = gender === 'MALE' ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
      const surname = pick(SURNAMES);
      const klass = pick(classes);

      insert('admission_inquiries', {
        id: id('inq'),
        studentName: `${firstName} ${surname}`,
        parentName: `${pick(FIRST_NAMES_M)} ${surname}`,
        phone: `+9192${(70000000 + index * 421).toString().slice(0, 8)}`,
        email: chance(0.5) ? `${firstName.toLowerCase()}.${surname.toLowerCase()}@gmail.com` : null,
        classAppliedId: klass.id,
        source: pick(['WALK_IN', 'PHONE', 'WEBSITE', 'REFERRAL']),
        status: pick(['NEW', 'NEW', 'FOLLOW_UP', 'CONVERTED', 'CLOSED']),
        followUpDate: iso(addDays(NOW, intBetween(1, 14))),
        notes: pick([
          'Asked about transport availability on Sitapur Road.',
          'Wants fee structure details for the full year.',
          'Transferring from another CBSE school mid-session.',
          'Requested a campus visit this weekend.',
          null,
        ]) as any,
        campusId,
        createdAt: iso(addDays(NOW, -intBetween(1, 40))),
        updatedAt: NOW_ISO,
      });
    }

    /* ------------------------ certificates ------------------------ */
    for (let index = 0; index < 12; index += 1) {
      const student = pick(students);
      const type = pick(['TRANSFER', 'BONAFIDE', 'CHARACTER', 'FEE_RECEIPT']);
      insert('certificates', {
        id: id('crt'),
        certNo: `CERT/26/${(500 + index).toString()}`,
        type,
        studentId: student.id,
        issueDate: iso(addDays(NOW, -intBetween(1, 60))),
        issuedBy: 'Dr. Suresh Chandra Mishra',
        purpose: pick(['Scholarship application', 'Passport application', 'School transfer', 'Bank account opening']),
        remarks: null,
        createdAt: NOW_ISO,
      });
    }

    /* ---------------------- study materials ----------------------- */
    for (let index = 0; index < 14; index += 1) {
      const klass = pick(classes.slice(5));
      const subject = pick(subjectsForClass(klass.order));
      insert('study_materials', {
        id: id('mat'),
        title: `${subject.name} — Chapter ${intBetween(1, 12)} Notes`,
        description: 'Revision notes with solved examples.',
        fileUrl: `/uploads/materials/${subject.code.toLowerCase()}-ch${intBetween(1, 12)}.pdf`,
        fileType: pick(['PDF', 'PDF', 'VIDEO', 'DOC']),
        subjectId: subject.id,
        classIds: [klass.id],
        uploadedBy: superAdminUserId,
        downloads: intBetween(0, 180),
        createdAt: iso(addDays(NOW, -intBetween(1, 60))),
      });
    }

    /* ---------------------- biometric devices --------------------- */
    const DEVICE_DEFS = [
      { name: 'Main Gate Reader', deviceId: 'BIO-GATE-01', location: 'Main Gate', type: 'FINGERPRINT' },
      { name: 'Staff Room Reader', deviceId: 'BIO-STAFF-01', location: 'Staff Room', type: 'FACE' },
      { name: 'Admin Block RFID', deviceId: 'BIO-ADMIN-01', location: 'Admin Block', type: 'RFID' },
    ];
    for (const def of DEVICE_DEFS) {
      insert('biometric_devices', {
        id: id('dev'),
        deviceName: def.name,
        deviceId: def.deviceId,
        location: def.location,
        type: def.type,
        isActive: true,
        lastSync: iso(addDays(NOW, 0)),
        createdAt: NOW_ISO,
      });
    }

    for (const teacher of teachers.slice(0, 12)) {
      for (const day of attendanceDays.slice(0, 5)) {
        const inTime = new Date(day);
        inTime.setUTCHours(7, intBetween(35, 59), 0, 0);
        insert('biometric_logs', {
          id: id('blg'),
          deviceId: 'BIO-GATE-01',
          userId: teacher.userId,
          punchTime: iso(inTime),
          punchType: 'IN',
          createdAt: NOW_ISO,
        });
        const outTime = new Date(day);
        outTime.setUTCHours(14, intBetween(0, 40), 0, 0);
        insert('biometric_logs', {
          id: id('blg'),
          deviceId: 'BIO-GATE-01',
          userId: teacher.userId,
          punchTime: iso(outTime),
          punchType: 'OUT',
          createdAt: NOW_ISO,
        });
      }
    }

    /* ------------------------ id templates ------------------------ */
    insert('id_card_templates', {
      id: id('idt'),
      name: 'Standard Student Card (Portrait)',
      type: 'STUDENT',
      templateData: { orientation: 'portrait', accent: '#2563eb', showBlood: true, showAddress: false },
      isDefault: true,
      createdAt: NOW_ISO,
    });
    insert('id_card_templates', {
      id: id('idt'),
      name: 'Standard Staff Card (Portrait)',
      type: 'TEACHER',
      templateData: { orientation: 'portrait', accent: '#1d4ed8', showBlood: true, showAddress: true },
      isDefault: true,
      createdAt: NOW_ISO,
    });

    /* ------------------------- notifications ---------------------- */
    const NOTIF_DEFS = [
      { title: 'Half Yearly datesheet published', message: 'The datesheet for the Half Yearly Examination is now available.', type: 'INFO' },
      { title: '12 fee defaulters this month', message: 'September tuition remains unpaid for 12 students. Review the Due List.', type: 'WARNING' },
      { title: 'Attendance below 75% for 4 students', message: 'Four students have dropped below the 75% attendance threshold.', type: 'ALERT' },
      { title: 'August salary disbursed', message: 'Salary for August 2026 has been disbursed to all staff.', type: 'SUCCESS' },
    ];
    NOTIF_DEFS.forEach((def, index) => {
      insert('notifications', {
        id: id('nfy'),
        title: def.title,
        message: def.message,
        type: def.type,
        isRead: index > 2,
        userId: superAdminUserId,
        link: null,
        createdAt: iso(addDays(NOW, -index)),
      });
    });

    /* --------------------------- settings ------------------------- */
    const SETTINGS: Array<[string, string]> = [
      ['school.name', 'Vidyalaya Public School'],
      ['school.board', 'CBSE'],
      ['school.affiliationNo', 'CBSE/2109876'],
      ['school.principal', 'Dr. Suresh Chandra Mishra'],
      ['school.phone', '+91 522 4001234'],
      ['school.email', 'office@vidyalaya.edu.in'],
      ['academic.currentYear', ACADEMIC_YEAR],
      ['academic.sessionStartMonth', 'April'],
      ['attendance.minimumPercentage', '75'],
      ['fee.lateFinePerDay', '20'],
      ['fee.currency', 'INR'],
      ['locale.default', 'en'],
      ['locale.enabled', 'en,hi'],
      ['grading.scheme', 'CBSE_A1_E'],
      ['exam.passingPercentage', '33'],
    ];
    for (const [key, value] of SETTINGS) {
      insert('settings', { key, value, updatedAt: NOW_ISO });
    }

    database.exec('COMMIT');

    const studentCount = (
      database.prepare('SELECT COUNT(*) AS c FROM students').get() as any
    ).c;
    // eslint-disable-next-line no-console
    console.log(
      `[vidyalaya] database seeded — ${studentCount} students, ${teachers.length} teachers, ${allSections.length} sections`
    );
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
