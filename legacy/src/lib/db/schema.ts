/**
 * Canonical SQLite DDL for the Vidyalaya School Management System.
 *
 * Why this exists alongside prisma/schema.prisma
 * ----------------------------------------------
 * prisma/schema.prisma remains the reference model for the Postgres
 * production deployment. This file is the executable schema for the
 * zero-dependency SQLite runtime used in development and demos, driven by
 * Node's built-in `node:sqlite`. Keeping the DDL as a TypeScript string (not
 * a .sql asset) guarantees it survives Next.js bundling, which does not copy
 * arbitrary non-imported files into the server build.
 *
 * Conventions
 * -----------
 *  - Table names are lowercase plural.
 *  - Column names are camelCase and match the Prisma field names exactly, so
 *    rows deserialize directly into the TypeScript domain types with no
 *    field-mapping layer in between.
 *  - SQLite has no BOOLEAN: booleans are INTEGER 0/1.
 *  - SQLite has no DATETIME: timestamps are ISO-8601 TEXT, which sorts
 *    lexicographically in the same order as chronologically.
 *  - SQLite has no array type: Prisma's String[]/Role[] columns are stored as
 *    JSON TEXT and parsed in the repository layer.
 */

export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

-- ============================ CAMPUS ============================
CREATE TABLE IF NOT EXISTS campuses (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  code            TEXT NOT NULL UNIQUE,
  address         TEXT NOT NULL DEFAULT '',
  city            TEXT NOT NULL DEFAULT '',
  district        TEXT NOT NULL DEFAULT '',
  state           TEXT NOT NULL DEFAULT 'Uttar Pradesh',
  pincode         TEXT NOT NULL DEFAULT '',
  phone           TEXT NOT NULL DEFAULT '',
  email           TEXT NOT NULL DEFAULT '',
  website         TEXT,
  logoUrl         TEXT,
  principalName   TEXT,
  affiliationNo   TEXT,
  boardType       TEXT,
  establishedYear INTEGER,
  isActive        INTEGER NOT NULL DEFAULT 1,
  createdAt       TEXT NOT NULL,
  updatedAt       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_campuses_code ON campuses(code);

-- ============================ USERS =============================
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  phone      TEXT UNIQUE,
  password   TEXT NOT NULL,
  role       TEXT NOT NULL,
  isActive   INTEGER NOT NULL DEFAULT 1,
  language   TEXT NOT NULL DEFAULT 'en',
  avatar     TEXT,
  campusId   TEXT REFERENCES campuses(id) ON DELETE SET NULL,
  createdAt  TEXT NOT NULL,
  updatedAt  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_campus ON users(campusId);

-- ======================= ACADEMIC SESSION =======================
CREATE TABLE IF NOT EXISTS academic_sessions (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  startDate TEXT NOT NULL,
  endDate   TEXT NOT NULL,
  isCurrent INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
);

-- ======================= CLASSES & SECTIONS =====================
CREATE TABLE IF NOT EXISTS classes (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  numericOrder INTEGER NOT NULL DEFAULT 0,
  campusId     TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  isActive     INTEGER NOT NULL DEFAULT 1,
  createdAt    TEXT NOT NULL,
  updatedAt    TEXT NOT NULL,
  UNIQUE(name, campusId)
);
CREATE INDEX IF NOT EXISTS idx_classes_campus ON classes(campusId);

CREATE TABLE IF NOT EXISTS sections (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  classId        TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  campusId       TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  capacity       INTEGER NOT NULL DEFAULT 40,
  classTeacherId TEXT,
  createdAt      TEXT NOT NULL,
  UNIQUE(name, classId)
);
CREATE INDEX IF NOT EXISTS idx_sections_class ON sections(classId);

-- ============================ SUBJECTS ==========================
CREATE TABLE IF NOT EXISTS subjects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  subjectType TEXT NOT NULL DEFAULT 'THEORY',
  isOptional  INTEGER NOT NULL DEFAULT 0,
  createdAt   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS class_subjects (
  id        TEXT PRIMARY KEY,
  classId   TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subjectId TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE(classId, subjectId)
);

-- ============================ PARENTS ===========================
CREATE TABLE IF NOT EXISTS parents (
  id               TEXT PRIMARY KEY,
  fatherName       TEXT NOT NULL,
  fatherPhone      TEXT,
  fatherEmail      TEXT,
  fatherIdCard     TEXT,
  fatherOccupation TEXT,
  motherName       TEXT,
  motherPhone      TEXT,
  motherOccupation TEXT,
  guardianName     TEXT,
  guardianPhone    TEXT,
  guardianRelation TEXT,
  religion         TEXT,
  annualIncome     REAL,
  userId           TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  createdAt        TEXT NOT NULL,
  updatedAt        TEXT NOT NULL
);

-- ============================ TEACHERS ==========================
CREATE TABLE IF NOT EXISTS teachers (
  id             TEXT PRIMARY KEY,
  employeeId     TEXT NOT NULL UNIQUE,
  firstName      TEXT NOT NULL,
  lastName       TEXT NOT NULL DEFAULT '',
  gender         TEXT NOT NULL,
  dob            TEXT,
  qualification  TEXT,
  specialization TEXT,
  experience     INTEGER,
  joiningDate    TEXT NOT NULL,
  salary         REAL,
  aadhaarNo      TEXT,
  panNo          TEXT,
  bankAccount    TEXT,
  bankName       TEXT,
  ifscCode       TEXT,
  photo          TEXT,
  phone          TEXT,
  address        TEXT,
  isActive       INTEGER NOT NULL DEFAULT 1,
  userId         TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  campusId       TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  createdAt      TEXT NOT NULL,
  updatedAt      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_teachers_campus ON teachers(campusId);

CREATE TABLE IF NOT EXISTS teacher_subjects (
  id        TEXT PRIMARY KEY,
  teacherId TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subjectId TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  classId   TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  sectionId TEXT REFERENCES sections(id) ON DELETE SET NULL,
  UNIQUE(teacherId, subjectId, classId, sectionId)
);

-- ============================= STAFF ============================
CREATE TABLE IF NOT EXISTS staff (
  id          TEXT PRIMARY KEY,
  employeeId  TEXT NOT NULL UNIQUE,
  firstName   TEXT NOT NULL,
  lastName    TEXT NOT NULL DEFAULT '',
  designation TEXT NOT NULL,
  department  TEXT,
  gender      TEXT NOT NULL,
  dob         TEXT,
  joiningDate TEXT NOT NULL,
  salary      REAL,
  phone       TEXT,
  address     TEXT,
  aadhaarNo   TEXT,
  panNo       TEXT,
  bankAccount TEXT,
  bankName    TEXT,
  ifscCode    TEXT,
  isActive    INTEGER NOT NULL DEFAULT 1,
  userId      TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  campusId    TEXT REFERENCES campuses(id) ON DELETE SET NULL,
  createdAt   TEXT NOT NULL,
  updatedAt   TEXT NOT NULL
);

-- ============================ STUDENTS ==========================
CREATE TABLE IF NOT EXISTS students (
  id               TEXT PRIMARY KEY,
  admissionNo      TEXT NOT NULL UNIQUE,
  rollNo           TEXT,
  firstName        TEXT NOT NULL,
  lastName         TEXT NOT NULL DEFAULT '',
  gender           TEXT NOT NULL,
  dob              TEXT NOT NULL,
  bloodGroup       TEXT,
  religion         TEXT,
  caste            TEXT,
  category         TEXT,
  nationality      TEXT NOT NULL DEFAULT 'Indian',
  aadhaarNo        TEXT,
  photo            TEXT,
  signatureHindi   TEXT,
  signatureEnglish TEXT,
  streetAddress    TEXT,
  village          TEXT,
  post             TEXT,
  policeStation    TEXT,
  city             TEXT,
  district         TEXT,
  state            TEXT DEFAULT 'Uttar Pradesh',
  pincode          TEXT,
  previousSchool   TEXT,
  tcNumber         TEXT,
  admissionDate    TEXT NOT NULL,
  isActive         INTEGER NOT NULL DEFAULT 1,
  userId           TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  campusId         TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  classId          TEXT NOT NULL REFERENCES classes(id),
  sectionId        TEXT NOT NULL REFERENCES sections(id),
  parentId         TEXT REFERENCES parents(id) ON DELETE SET NULL,
  createdAt        TEXT NOT NULL,
  updatedAt        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_students_class_section ON students(classId, sectionId);
CREATE INDEX IF NOT EXISTS idx_students_campus ON students(campusId);
CREATE INDEX IF NOT EXISTS idx_students_admissionno ON students(admissionNo);
CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parentId);

CREATE TABLE IF NOT EXISTS student_documents (
  id        TEXT PRIMARY KEY,
  studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  fileUrl   TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_promotions (
  id           TEXT PRIMARY KEY,
  studentId    TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fromClassId  TEXT NOT NULL REFERENCES classes(id),
  toClassId    TEXT NOT NULL REFERENCES classes(id),
  academicYear TEXT NOT NULL,
  promotedAt   TEXT NOT NULL,
  remarks      TEXT
);

-- =========================== ATTENDANCE =========================
CREATE TABLE IF NOT EXISTS attendances (
  id         TEXT PRIMARY KEY,
  date       TEXT NOT NULL,
  status     TEXT NOT NULL,
  remarks    TEXT,
  studentId  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  sectionId  TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  markedById TEXT,
  createdAt  TEXT NOT NULL,
  UNIQUE(studentId, date)
);
CREATE INDEX IF NOT EXISTS idx_attendances_date_section ON attendances(date, sectionId);

CREATE TABLE IF NOT EXISTS teacher_attendances (
  id        TEXT PRIMARY KEY,
  date      TEXT NOT NULL,
  status    TEXT NOT NULL,
  remarks   TEXT,
  teacherId TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  createdAt TEXT NOT NULL,
  UNIQUE(teacherId, date)
);
CREATE INDEX IF NOT EXISTS idx_teacher_attendances_date ON teacher_attendances(date);

-- =========================== TIMETABLE ==========================
CREATE TABLE IF NOT EXISTS timetable_slots (
  id        TEXT PRIMARY KEY,
  day       TEXT NOT NULL,
  startTime TEXT NOT NULL,
  endTime   TEXT NOT NULL,
  period    INTEGER NOT NULL,
  classId   TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  sectionId TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  subjectId TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacherId TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  UNIQUE(day, period, classId, sectionId)
);
CREATE INDEX IF NOT EXISTS idx_timetable_teacher_day ON timetable_slots(teacherId, day);

-- ============================== FEES ============================
CREATE TABLE IF NOT EXISTS fee_structures (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  feeType      TEXT NOT NULL,
  amount       REAL NOT NULL,
  dueDate      TEXT,
  academicYear TEXT NOT NULL,
  frequency    TEXT NOT NULL DEFAULT 'MONTHLY',
  lateFine     REAL NOT NULL DEFAULT 0,
  lateFineType TEXT NOT NULL DEFAULT 'FIXED',
  classId      TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  campusId     TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  createdAt    TEXT NOT NULL,
  updatedAt    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fee_structures_class_year ON fee_structures(classId, academicYear);

CREATE TABLE IF NOT EXISTS fee_payments (
  id             TEXT PRIMARY KEY,
  receiptNo      TEXT NOT NULL UNIQUE,
  amount         REAL NOT NULL,
  discount       REAL NOT NULL DEFAULT 0,
  lateFine       REAL NOT NULL DEFAULT 0,
  totalAmount    REAL NOT NULL,
  paidAmount     REAL NOT NULL,
  balanceAmount  REAL NOT NULL DEFAULT 0,
  paymentMode    TEXT NOT NULL,
  paymentStatus  TEXT NOT NULL,
  paymentDate    TEXT NOT NULL,
  transactionId  TEXT,
  chequeNo       TEXT,
  bankName       TEXT,
  remarks        TEXT,
  month          TEXT,
  academicYear   TEXT NOT NULL,
  studentId      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  feeStructureId TEXT NOT NULL REFERENCES fee_structures(id),
  collectedById  TEXT,
  createdAt      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_year ON fee_payments(studentId, academicYear);
CREATE INDEX IF NOT EXISTS idx_fee_payments_date ON fee_payments(paymentDate);

-- =========================== ACCOUNTING =========================
CREATE TABLE IF NOT EXISTS incomes (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,
  amount      REAL NOT NULL,
  date        TEXT NOT NULL,
  description TEXT,
  receiptNo   TEXT,
  paymentMode TEXT,
  campusId    TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  createdAt   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_incomes_campus_date ON incomes(campusId, date);

CREATE TABLE IF NOT EXISTS expenses (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,
  amount      REAL NOT NULL,
  date        TEXT NOT NULL,
  description TEXT,
  voucherNo   TEXT,
  paidTo      TEXT,
  paymentMode TEXT,
  campusId    TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  approvedBy  TEXT,
  createdAt   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_expenses_campus_date ON expenses(campusId, date);

-- ============================ SALARY ============================
CREATE TABLE IF NOT EXISTS salary_payments (
  id            TEXT PRIMARY KEY,
  month         TEXT NOT NULL,
  basicSalary   REAL NOT NULL,
  allowances    REAL NOT NULL DEFAULT 0,
  deductions    REAL NOT NULL DEFAULT 0,
  netSalary     REAL NOT NULL,
  paymentMode   TEXT NOT NULL,
  paymentDate   TEXT NOT NULL,
  transactionId TEXT,
  status        TEXT NOT NULL DEFAULT 'PAID',
  remarks       TEXT,
  teacherId     TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  createdAt     TEXT NOT NULL,
  UNIQUE(teacherId, month)
);

CREATE TABLE IF NOT EXISTS staff_salary_payments (
  id          TEXT PRIMARY KEY,
  month       TEXT NOT NULL,
  basicSalary REAL NOT NULL,
  allowances  REAL NOT NULL DEFAULT 0,
  deductions  REAL NOT NULL DEFAULT 0,
  netSalary   REAL NOT NULL,
  paymentMode TEXT NOT NULL,
  paymentDate TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'PAID',
  staffId     TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  createdAt   TEXT NOT NULL,
  UNIQUE(staffId, month)
);

-- ============================= EXAMS ============================
CREATE TABLE IF NOT EXISTS exams (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  examType     TEXT NOT NULL,
  academicYear TEXT NOT NULL,
  startDate    TEXT NOT NULL,
  endDate      TEXT NOT NULL,
  classId      TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  description  TEXT,
  isPublished  INTEGER NOT NULL DEFAULT 0,
  createdAt    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_exams_class_year ON exams(classId, academicYear);

CREATE TABLE IF NOT EXISTS exam_subjects (
  id           TEXT PRIMARY KEY,
  examId       TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subjectId    TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  examDate     TEXT NOT NULL,
  startTime    TEXT,
  endTime      TEXT,
  maxMarks     REAL NOT NULL,
  passingMarks REAL NOT NULL,
  room         TEXT,
  UNIQUE(examId, subjectId)
);

CREATE TABLE IF NOT EXISTS exam_results (
  id             TEXT PRIMARY KEY,
  marksObtained  REAL NOT NULL,
  grade          TEXT,
  remarks        TEXT,
  isAbsent       INTEGER NOT NULL DEFAULT 0,
  practicalMarks REAL,
  theoryMarks    REAL,
  examId         TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  studentId      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subjectId      TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  createdAt      TEXT NOT NULL,
  UNIQUE(examId, studentId, subjectId)
);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(studentId);

-- =========================== HOMEWORK ===========================
CREATE TABLE IF NOT EXISTS homeworks (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  attachmentUrl TEXT,
  dueDate       TEXT NOT NULL,
  classId       TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subjectId     TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacherId     TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  createdAt     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS homework_submissions (
  id            TEXT PRIMARY KEY,
  homeworkId    TEXT NOT NULL REFERENCES homeworks(id) ON DELETE CASCADE,
  studentId     TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  submittedAt   TEXT NOT NULL,
  attachmentUrl TEXT,
  marks         REAL,
  remarks       TEXT,
  status        TEXT NOT NULL DEFAULT 'SUBMITTED',
  UNIQUE(homeworkId, studentId)
);

-- ========================= ONLINE CLASSES =======================
CREATE TABLE IF NOT EXISTS online_classes (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  meetingLink  TEXT NOT NULL,
  platform     TEXT NOT NULL DEFAULT 'ZOOM',
  startTime    TEXT NOT NULL,
  endTime      TEXT NOT NULL,
  teacherId    TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  classIds     TEXT NOT NULL DEFAULT '[]',
  status       TEXT NOT NULL DEFAULT 'SCHEDULED',
  recordingUrl TEXT,
  createdAt    TEXT NOT NULL
);

-- =========================== TRANSPORT ==========================
CREATE TABLE IF NOT EXISTS transport_routes (
  id             TEXT PRIMARY KEY,
  routeName      TEXT NOT NULL,
  routeNo        TEXT NOT NULL,
  vehicleNo      TEXT NOT NULL,
  driverName     TEXT NOT NULL,
  driverPhone    TEXT NOT NULL DEFAULT '',
  driverLicense  TEXT,
  conductorName  TEXT,
  conductorPhone TEXT,
  capacity       INTEGER NOT NULL DEFAULT 40,
  campusId       TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  isActive       INTEGER NOT NULL DEFAULT 1,
  createdAt      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transport_stops (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  pickupTime TEXT NOT NULL DEFAULT '',
  dropTime   TEXT NOT NULL DEFAULT '',
  fare       REAL NOT NULL DEFAULT 0,
  routeId    TEXT NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
  stopOrder  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_transport_stops_route ON transport_stops(routeId);

CREATE TABLE IF NOT EXISTS transport_assignments (
  id         TEXT PRIMARY KEY,
  studentId  TEXT NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  routeId    TEXT NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
  stopName   TEXT NOT NULL DEFAULT '',
  pickupDrop TEXT NOT NULL DEFAULT 'BOTH',
  createdAt  TEXT NOT NULL
);

-- ====================== NOTICE & MESSAGING ======================
CREATE TABLE IF NOT EXISTS notices (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL DEFAULT 'GENERAL',
  targetRoles   TEXT NOT NULL DEFAULT '[]',
  targetClasses TEXT NOT NULL DEFAULT '[]',
  attachmentUrl TEXT,
  isPublished   INTEGER NOT NULL DEFAULT 1,
  publishDate   TEXT NOT NULL,
  expiryDate    TEXT,
  campusId      TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  createdById   TEXT NOT NULL DEFAULT '',
  createdAt     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notices_campus_date ON notices(campusId, publishDate);

CREATE TABLE IF NOT EXISTS notifications (
  id        TEXT PRIMARY KEY,
  title     TEXT NOT NULL,
  message   TEXT NOT NULL DEFAULT '',
  type      TEXT NOT NULL DEFAULT 'INFO',
  isRead    INTEGER NOT NULL DEFAULT 0,
  userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  link      TEXT,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(userId, isRead);

CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  content    TEXT NOT NULL,
  senderId   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiverId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  isRead     INTEGER NOT NULL DEFAULT 0,
  createdAt  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(senderId);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiverId);

-- ============================= EVENTS ===========================
CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  startDate   TEXT NOT NULL,
  endDate     TEXT,
  location    TEXT,
  type        TEXT NOT NULL DEFAULT 'EVENT',
  campusId    TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  createdAt   TEXT NOT NULL
);

-- ============================= LEAVE ============================
CREATE TABLE IF NOT EXISTS leave_requests (
  id         TEXT PRIMARY KEY,
  startDate  TEXT NOT NULL,
  endDate    TEXT NOT NULL,
  reason     TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'PENDING',
  leaveType  TEXT NOT NULL DEFAULT 'OTHER',
  approvedBy TEXT,
  remarks    TEXT,
  studentId  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  createdAt  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teacher_leave_requests (
  id         TEXT PRIMARY KEY,
  startDate  TEXT NOT NULL,
  endDate    TEXT NOT NULL,
  reason     TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'PENDING',
  leaveType  TEXT NOT NULL DEFAULT 'OTHER',
  approvedBy TEXT,
  remarks    TEXT,
  teacherId  TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  createdAt  TEXT NOT NULL
);

-- =========================== INVENTORY ==========================
CREATE TABLE IF NOT EXISTS inventory_items (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 0,
  unitPrice    REAL NOT NULL DEFAULT 0,
  supplier     TEXT,
  purchaseDate TEXT,
  location     TEXT,
  condition    TEXT NOT NULL DEFAULT 'GOOD',
  campusId     TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  createdAt    TEXT NOT NULL,
  updatedAt    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_inventory_campus_category ON inventory_items(campusId, category);

-- ======================== ID CARD / LMS =========================
CREATE TABLE IF NOT EXISTS id_card_templates (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL,
  templateData TEXT NOT NULL DEFAULT '{}',
  isDefault    INTEGER NOT NULL DEFAULT 0,
  createdAt    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_materials (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  fileUrl     TEXT NOT NULL DEFAULT '',
  fileType    TEXT NOT NULL DEFAULT 'PDF',
  subjectId   TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  classIds    TEXT NOT NULL DEFAULT '[]',
  uploadedBy  TEXT NOT NULL DEFAULT '',
  downloads   INTEGER NOT NULL DEFAULT 0,
  createdAt   TEXT NOT NULL
);

-- =========================== BIOMETRIC ==========================
CREATE TABLE IF NOT EXISTS biometric_devices (
  id         TEXT PRIMARY KEY,
  deviceName TEXT NOT NULL,
  deviceId   TEXT NOT NULL UNIQUE,
  location   TEXT NOT NULL DEFAULT '',
  type       TEXT NOT NULL DEFAULT 'FINGERPRINT',
  isActive   INTEGER NOT NULL DEFAULT 1,
  lastSync   TEXT,
  createdAt  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS biometric_logs (
  id        TEXT PRIMARY KEY,
  deviceId  TEXT NOT NULL,
  userId    TEXT NOT NULL,
  punchTime TEXT NOT NULL,
  punchType TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_biometric_logs_user ON biometric_logs(userId, punchTime);

-- ==================== ADMISSION PIPELINE (new) ==================
-- Backs /admission/inquiries and /admission/requests, which the original
-- navigation advertised but had no model or page for.
CREATE TABLE IF NOT EXISTS admission_inquiries (
  id             TEXT PRIMARY KEY,
  studentName    TEXT NOT NULL,
  parentName     TEXT NOT NULL DEFAULT '',
  phone          TEXT NOT NULL DEFAULT '',
  email          TEXT,
  classAppliedId TEXT REFERENCES classes(id) ON DELETE SET NULL,
  source         TEXT NOT NULL DEFAULT 'WALK_IN',
  status         TEXT NOT NULL DEFAULT 'NEW',
  followUpDate   TEXT,
  notes          TEXT,
  campusId       TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  createdAt      TEXT NOT NULL,
  updatedAt      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admission_inquiries_status ON admission_inquiries(status);

-- ====================== CERTIFICATES (new) ======================
-- Backs /certification (TC, bonafide, character certificates).
CREATE TABLE IF NOT EXISTS certificates (
  id          TEXT PRIMARY KEY,
  certNo      TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL,
  studentId   TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  issueDate   TEXT NOT NULL,
  issuedBy    TEXT,
  purpose     TEXT,
  remarks     TEXT,
  createdAt   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(studentId);

-- ======================== SETTINGS (new) ========================
-- Simple key/value store backing /settings.
CREATE TABLE IF NOT EXISTS settings (
  key       TEXT PRIMARY KEY,
  value     TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- ===================== INTERNAL BOOKKEEPING =====================
CREATE TABLE IF NOT EXISTS _meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
