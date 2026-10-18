/**
 * Module catalog and default permission matrix.
 *
 * This file is the single source of truth for "what features exist" and "who
 * gets them by default". It is imported by both the server (enforcement) and
 * the client (navigation), so it must stay free of server-only imports.
 *
 * A school can (a) switch whole modules off, and (b) override any role's
 * view/create/edit/delete rights per module. SUPER_ADMIN is never restricted
 * so an owner can always recover from a bad configuration.
 */

export const ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'TEACHER',
  'ACCOUNTANT',
  'RECEPTIONIST',
  'LIBRARIAN',
  'TRANSPORT_MANAGER',
  'STORE_MANAGER',
  'STAFF',
  'PARENT',
  'STUDENT',
] as const;

export type SchoolRole = (typeof ROLES)[number];
export type AppRole = SchoolRole | 'PLATFORM_ADMIN';

export const ROLE_LABELS: Record<AppRole, string> = {
  PLATFORM_ADMIN: 'Platform Admin',
  SUPER_ADMIN: 'Owner / Director',
  ADMIN: 'Principal / Admin',
  TEACHER: 'Teacher',
  ACCOUNTANT: 'Accountant',
  RECEPTIONIST: 'Front Office',
  LIBRARIAN: 'Librarian',
  TRANSPORT_MANAGER: 'Transport Manager',
  STORE_MANAGER: 'Store Manager',
  STAFF: 'Other Staff',
  PARENT: 'Parent',
  STUDENT: 'Student',
};

/** Roles that belong to employees (get an Employee record and staff features). */
export const STAFF_ROLES: SchoolRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'TEACHER',
  'ACCOUNTANT',
  'RECEPTIONIST',
  'LIBRARIAN',
  'TRANSPORT_MANAGER',
  'STORE_MANAGER',
  'STAFF',
];

export const ACTIONS = ['view', 'create', 'edit', 'delete'] as const;
export type Action = (typeof ACTIONS)[number];

export interface Perm {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export type ModuleGroup =
  | 'Overview'
  | 'Front Office'
  | 'Academics'
  | 'Examinations'
  | 'Finance'
  | 'People'
  | 'Communication'
  | 'Operations'
  | 'Student Life'
  | 'Administration';

export interface ModuleDef {
  key: string;
  label: string;
  labelHi: string;
  group: ModuleGroup;
  description: string;
  /** Core modules cannot be switched off (the product does not work without them). */
  core?: boolean;
  /** Default rights as a compact string per role: V=view C=create E=edit D=delete. */
  defaults: Partial<Record<SchoolRole, string>>;
}

const ALL_STAFF_VIEW: Partial<Record<SchoolRole, string>> = {
  ADMIN: 'V',
  TEACHER: 'V',
  ACCOUNTANT: 'V',
  RECEPTIONIST: 'V',
  LIBRARIAN: 'V',
  TRANSPORT_MANAGER: 'V',
  STORE_MANAGER: 'V',
  STAFF: 'V',
};

export const MODULES = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    labelHi: 'डैशबोर्ड',
    group: 'Overview',
    description: 'Role-specific home screen with KPIs and shortcuts.',
    core: true,
    defaults: { ...ALL_STAFF_VIEW, PARENT: 'V', STUDENT: 'V' },
  },
  {
    key: 'admissions',
    label: 'Admissions & Enquiries',
    labelHi: 'प्रवेश एवं पूछताछ',
    group: 'Front Office',
    description: 'Enquiry CRM, applications pipeline, online admission form.',
    defaults: { ADMIN: 'VCED', RECEPTIONIST: 'VCE' },
  },
  {
    key: 'students',
    label: 'Students',
    labelHi: 'छात्र',
    group: 'People',
    description: 'Student records, profile 360, promotion, transfer, logins.',
    core: true,
    defaults: { ADMIN: 'VCED', TEACHER: 'V', ACCOUNTANT: 'V', RECEPTIONIST: 'VCE', LIBRARIAN: 'V', TRANSPORT_MANAGER: 'V' },
  },
  {
    key: 'guardians',
    label: 'Parents & Families',
    labelHi: 'अभिभावक एवं परिवार',
    group: 'People',
    description: 'Guardian records, family (sibling) grouping, parent logins.',
    defaults: { ADMIN: 'VCED', TEACHER: 'V', ACCOUNTANT: 'V', RECEPTIONIST: 'VCE' },
  },
  {
    key: 'employees',
    label: 'Employees',
    labelHi: 'कर्मचारी',
    group: 'People',
    description: 'Staff directory, job letters, staff logins and roles.',
    core: true,
    defaults: { ADMIN: 'VCED', ACCOUNTANT: 'V' },
  },
  {
    key: 'academics',
    label: 'Classes & Subjects',
    labelHi: 'कक्षाएं एवं विषय',
    group: 'Academics',
    description: 'Academic years, classes, sections, subjects, chapters, teacher allocation.',
    core: true,
    defaults: { ...ALL_STAFF_VIEW, ADMIN: 'VCED' },
  },
  {
    key: 'attendance',
    label: 'Student Attendance',
    labelHi: 'छात्र उपस्थिति',
    group: 'Academics',
    description: 'Daily attendance by class, card scan, reports, absentee alerts.',
    defaults: { ADMIN: 'VCED', TEACHER: 'VCE', RECEPTIONIST: 'V', PARENT: 'V', STUDENT: 'V' },
  },
  {
    key: 'staff_attendance',
    label: 'Staff Attendance',
    labelHi: 'कर्मचारी उपस्थिति',
    group: 'People',
    description: 'Employee attendance with in/out time and monthly reports.',
    defaults: { ADMIN: 'VCED', TEACHER: 'V', ACCOUNTANT: 'V', RECEPTIONIST: 'V', LIBRARIAN: 'V', TRANSPORT_MANAGER: 'V', STORE_MANAGER: 'V', STAFF: 'V' },
  },
  {
    key: 'leave',
    label: 'Leave Management',
    labelHi: 'अवकाश प्रबंधन',
    group: 'People',
    description: 'Leave applications by staff and parents with approval workflow.',
    defaults: { ADMIN: 'VCED', TEACHER: 'VCE', ACCOUNTANT: 'VC', RECEPTIONIST: 'VC', LIBRARIAN: 'VC', TRANSPORT_MANAGER: 'VC', STORE_MANAGER: 'VC', STAFF: 'VC', PARENT: 'VC' },
  },
  {
    key: 'timetable',
    label: 'Timetable',
    labelHi: 'समय सारणी',
    group: 'Academics',
    description: 'Periods, rooms, class timetables with teacher clash detection.',
    defaults: { ADMIN: 'VCED', TEACHER: 'V', RECEPTIONIST: 'V', PARENT: 'V', STUDENT: 'V' },
  },
  {
    key: 'homework',
    label: 'Homework',
    labelHi: 'गृहकार्य',
    group: 'Academics',
    description: 'Daily homework with attachments and online submissions.',
    defaults: { ADMIN: 'VCED', TEACHER: 'VCED', PARENT: 'V', STUDENT: 'VC' },
  },
  {
    key: 'lms',
    label: 'Study Material',
    labelHi: 'अध्ययन सामग्री',
    group: 'Academics',
    description: 'Notes, videos and links organised by class and subject.',
    defaults: { ADMIN: 'VCED', TEACHER: 'VCED', PARENT: 'V', STUDENT: 'V' },
  },
  {
    key: 'live_classes',
    label: 'Live Classes',
    labelHi: 'लाइव कक्षाएं',
    group: 'Academics',
    description: 'Schedule Google Meet / Zoom / Jitsi classes for classes or staff.',
    defaults: { ADMIN: 'VCED', TEACHER: 'VCED', PARENT: 'V', STUDENT: 'V' },
  },
  {
    key: 'exams',
    label: 'Exams & Report Cards',
    labelHi: 'परीक्षा एवं रिपोर्ट कार्ड',
    group: 'Examinations',
    description: 'Exam setup, date sheet, marks entry, grading, result cards.',
    defaults: { ADMIN: 'VCED', TEACHER: 'VE', PARENT: 'V', STUDENT: 'V' },
  },
  {
    key: 'class_tests',
    label: 'Class Tests',
    labelHi: 'कक्षा परीक्षण',
    group: 'Examinations',
    description: 'Quick tests with marks and performance tracking.',
    defaults: { ADMIN: 'VCED', TEACHER: 'VCED', PARENT: 'V', STUDENT: 'V' },
  },
  {
    key: 'question_bank',
    label: 'Question Papers',
    labelHi: 'प्रश्न पत्र',
    group: 'Examinations',
    description: 'Chapter-wise question bank and printable question paper builder.',
    defaults: { ADMIN: 'VCED', TEACHER: 'VCED' },
  },
  {
    key: 'behaviour',
    label: 'Behaviour & Skills',
    labelHi: 'व्यवहार एवं कौशल',
    group: 'Examinations',
    description: 'Co-scholastic ratings and teacher observations.',
    defaults: { ADMIN: 'VCED', TEACHER: 'VCE', PARENT: 'V', STUDENT: 'V' },
  },
  {
    key: 'fees',
    label: 'Fees',
    labelHi: 'शुल्क',
    group: 'Finance',
    description: 'Fee heads, structures, invoices, collection, receipts, defaulters, online payment.',
    defaults: { ADMIN: 'VCED', ACCOUNTANT: 'VCED', RECEPTIONIST: 'VC', PARENT: 'V', STUDENT: 'V' },
  },
  {
    key: 'accounts',
    label: 'Accounts',
    labelHi: 'लेखा',
    group: 'Finance',
    description: 'Chart of accounts, income, expenses and account statement.',
    defaults: { ADMIN: 'VCED', ACCOUNTANT: 'VCED' },
  },
  {
    key: 'payroll',
    label: 'Payroll',
    labelHi: 'वेतन',
    group: 'Finance',
    description: 'Monthly salary payment, salary slips and salary sheet.',
    defaults: { ADMIN: 'VCED', ACCOUNTANT: 'VCED', TEACHER: 'V', RECEPTIONIST: 'V', LIBRARIAN: 'V', TRANSPORT_MANAGER: 'V', STORE_MANAGER: 'V', STAFF: 'V' },
  },
  {
    key: 'notices',
    label: 'Noticeboard',
    labelHi: 'सूचना पट्ट',
    group: 'Communication',
    description: 'Targeted notices for roles and classes.',
    defaults: { ...ALL_STAFF_VIEW, ADMIN: 'VCED', TEACHER: 'VC', PARENT: 'V', STUDENT: 'V' },
  },
  {
    key: 'messaging',
    label: 'Messages',
    labelHi: 'संदेश',
    group: 'Communication',
    description: 'In-app chat between staff, parents and students.',
    defaults: { ADMIN: 'VC', TEACHER: 'VC', ACCOUNTANT: 'VC', RECEPTIONIST: 'VC', LIBRARIAN: 'VC', TRANSPORT_MANAGER: 'VC', STORE_MANAGER: 'VC', STAFF: 'VC', PARENT: 'VC', STUDENT: 'VC' },
  },
  {
    key: 'sms',
    label: 'SMS, WhatsApp & Email',
    labelHi: 'एसएमएस, व्हाट्सएप एवं ईमेल',
    group: 'Communication',
    description: 'Bulk SMS / WhatsApp / email with DLT templates and delivery log.',
    defaults: { ADMIN: 'VCED', RECEPTIONIST: 'VC', ACCOUNTANT: 'VC' },
  },
  {
    key: 'events',
    label: 'Calendar & Events',
    labelHi: 'कैलेंडर एवं कार्यक्रम',
    group: 'Communication',
    description: 'Holidays, events and PTM calendar.',
    defaults: { ...ALL_STAFF_VIEW, ADMIN: 'VCED', PARENT: 'V', STUDENT: 'V' },
  },
  {
    key: 'meetings',
    label: 'Parent Meetings',
    labelHi: 'अभिभावक बैठक',
    group: 'Communication',
    description: 'Parent–teacher and principal 1:1 meeting booking.',
    defaults: { ADMIN: 'VCED', TEACHER: 'VCE', PARENT: 'VC' },
  },
  {
    key: 'transport',
    label: 'Transport',
    labelHi: 'परिवहन',
    group: 'Operations',
    description: 'Vehicles with compliance expiry tracking, routes, stops, student allocation.',
    defaults: { ADMIN: 'VCED', TRANSPORT_MANAGER: 'VCED', RECEPTIONIST: 'V', PARENT: 'V', STUDENT: 'V' },
  },
  {
    key: 'library',
    label: 'Library',
    labelHi: 'पुस्तकालय',
    group: 'Operations',
    description: 'Book catalogue, issue/return and fines.',
    defaults: { ADMIN: 'VCED', LIBRARIAN: 'VCED', TEACHER: 'V', STUDENT: 'V', PARENT: 'V' },
  },
  {
    key: 'store',
    label: 'Store & POS',
    labelHi: 'स्टोर एवं बिक्री',
    group: 'Operations',
    description: 'Uniform/book store with GST, stock and point-of-sale billing.',
    defaults: { ADMIN: 'VCED', STORE_MANAGER: 'VCED', ACCOUNTANT: 'V' },
  },
  {
    key: 'inventory',
    label: 'Assets & Inventory',
    labelHi: 'संपत्ति एवं इन्वेंटरी',
    group: 'Operations',
    description: 'Furniture, equipment and lab asset register.',
    defaults: { ADMIN: 'VCED', STORE_MANAGER: 'VCED' },
  },
  {
    key: 'hostel',
    label: 'Hostel',
    labelHi: 'छात्रावास',
    group: 'Operations',
    description: 'Hostels, rooms and beds, student allocation and hostel fees.',
    defaults: { ADMIN: 'VCED', ACCOUNTANT: 'V', RECEPTIONIST: 'V', PARENT: 'V', STUDENT: 'V' },
  },
  {
    key: 'certificates',
    label: 'Certificates & ID Cards',
    labelHi: 'प्रमाण पत्र एवं पहचान पत्र',
    group: 'Administration',
    description: 'TC, bonafide, character certificates with QR verification; ID cards; letters.',
    defaults: { ADMIN: 'VCED', RECEPTIONIST: 'VC' },
  },
  {
    key: 'reports',
    label: 'Reports',
    labelHi: 'रिपोर्ट',
    group: 'Administration',
    description: 'Student, parent, attendance and fee reports with export.',
    defaults: { ADMIN: 'V', ACCOUNTANT: 'V' },
  },
  {
    key: 'activities',
    label: 'Clubs & Activities',
    labelHi: 'क्लब एवं गतिविधियाँ',
    group: 'Student Life',
    description: 'Co-curricular clubs, enrolment and achievements.',
    defaults: { ADMIN: 'VCED', TEACHER: 'VCE', PARENT: 'V', STUDENT: 'VC' },
  },
  {
    key: 'study_tools',
    label: 'Study Tools',
    labelHi: 'अध्ययन उपकरण',
    group: 'Student Life',
    description: 'Focus timer, study log and doubt desk.',
    defaults: { ADMIN: 'V', TEACHER: 'VE', PARENT: 'V', STUDENT: 'VC' },
  },
  {
    key: 'ai_assistant',
    label: 'AI Assistant',
    labelHi: 'एआई सहायक',
    group: 'Student Life',
    description: 'Role-aware assistant with daily usage limits.',
    defaults: { ADMIN: 'VC', TEACHER: 'VC', ACCOUNTANT: 'VC', PARENT: 'VC', STUDENT: 'VC' },
  },
  {
    key: 'gate',
    label: 'Gate & Visitors',
    labelHi: 'गेट एवं आगंतुक',
    group: 'Front Office',
    description: 'Visitor register with printable passes, and early-leave gate passes for students.',
    defaults: { ADMIN: 'VCED', RECEPTIONIST: 'VCED', STAFF: 'VCE', TEACHER: 'V' },
  },
  {
    key: 'online_exams',
    label: 'Online Exams',
    labelHi: 'ऑनलाइन परीक्षा',
    group: 'Examinations',
    description: 'Timed online tests from the question bank with auto-marking of objective answers.',
    defaults: { ADMIN: 'VCED', TEACHER: 'VCED', PARENT: 'V', STUDENT: 'VC' },
  },
  {
    key: 'discipline',
    label: 'Discipline',
    labelHi: 'अनुशासन',
    group: 'Student Life',
    description: 'Incident register with severity, action taken and parent notification.',
    defaults: { ADMIN: 'VCED', TEACHER: 'VCE', PARENT: 'V', STUDENT: 'V' },
  },
  {
    key: 'placements',
    label: 'Placements',
    labelHi: 'प्लेसमेंट',
    group: 'Student Life',
    description: 'Company drives, eligibility, student applications and selections.',
    defaults: { ADMIN: 'VCED', TEACHER: 'V', PARENT: 'V', STUDENT: 'VC' },
  },
  {
    key: 'polls',
    label: 'Polls & Forms',
    labelHi: 'मतदान एवं फ़ॉर्म',
    group: 'Communication',
    description: 'Polls, surveys and custom forms with targeted audiences and live results.',
    defaults: { ...ALL_STAFF_VIEW, ADMIN: 'VCED', TEACHER: 'VCE', PARENT: 'V', STUDENT: 'V' },
  },
  {
    key: 'discussion',
    label: 'Discussions',
    labelHi: 'चर्चा मंच',
    group: 'Communication',
    description: 'Moderated discussion forums for staff, classes and parents.',
    defaults: { ADMIN: 'VCED', TEACHER: 'VCE', ACCOUNTANT: 'VC', RECEPTIONIST: 'VC', LIBRARIAN: 'VC', TRANSPORT_MANAGER: 'VC', STORE_MANAGER: 'VC', STAFF: 'VC', PARENT: 'VC', STUDENT: 'VC' },
  },
  {
    key: 'gallery',
    label: 'Gallery',
    labelHi: 'गैलरी',
    group: 'Communication',
    description: 'Photo albums of school events shared with families.',
    defaults: { ...ALL_STAFF_VIEW, ADMIN: 'VCED', TEACHER: 'VC', PARENT: 'V', STUDENT: 'V' },
  },
  {
    key: 'blog',
    label: 'News & Blog',
    labelHi: 'समाचार एवं ब्लॉग',
    group: 'Communication',
    description: 'School news and blog posts with review before publishing and an optional public news page.',
    defaults: { ...ALL_STAFF_VIEW, ADMIN: 'VCED', TEACHER: 'VC', PARENT: 'V', STUDENT: 'VC' },
  },
  {
    key: 'reminders',
    label: 'Reminders',
    labelHi: 'अनुस्मारक',
    group: 'Communication',
    description: 'Scheduled and repeating reminders by app, phone, SMS or email.',
    // create = personal reminders; edit = remind other people (roles, classes)
    defaults: { ADMIN: 'VCED', TEACHER: 'VC', ACCOUNTANT: 'VC', RECEPTIONIST: 'VC', LIBRARIAN: 'VC', TRANSPORT_MANAGER: 'VC', STORE_MANAGER: 'VC', STAFF: 'VC' },
  },
  {
    key: 'alumni',
    label: 'Alumni',
    labelHi: 'पूर्व छात्र',
    group: 'People',
    description: 'Alumni directory, self-registration, careers and mentors.',
    defaults: { ADMIN: 'VCED', RECEPTIONIST: 'V' },
  },
  {
    key: 'tasks',
    label: 'Tasks',
    labelHi: 'कार्य',
    group: 'Administration',
    description: 'Assign work to staff with due dates, priorities, progress and comments.',
    // create = assign tasks; edit/delete = manage anyone's tasks
    defaults: { ADMIN: 'VCED', TEACHER: 'VC', ACCOUNTANT: 'VC', RECEPTIONIST: 'VC', LIBRARIAN: 'VC', TRANSPORT_MANAGER: 'VC', STORE_MANAGER: 'VC', STAFF: 'V' },
  },
  {
    key: 'documents',
    label: 'Document Manager',
    labelHi: 'दस्तावेज़ प्रबंधक',
    group: 'Administration',
    description: 'Policies, circulars and licences in folders, with role-based access and expiry alerts.',
    defaults: { ...ALL_STAFF_VIEW, ADMIN: 'VCED', PARENT: 'V', STUDENT: 'V' },
  },
  {
    key: 'apps',
    label: 'Apps',
    labelHi: 'ऐप्स',
    group: 'Overview',
    description: 'Other web tools the school uses, opened inside the app for chosen roles.',
    defaults: { ...ALL_STAFF_VIEW, PARENT: 'V', STUDENT: 'V' },
  },
  {
    key: 'settings',
    label: 'School Settings',
    labelHi: 'विद्यालय सेटिंग्स',
    group: 'Administration',
    description: 'Profile, branding, grading, rules, numbering, gateways, campuses.',
    core: true,
    // create/delete apply to campuses
    defaults: { ADMIN: 'VCED' },
  },
  {
    key: 'access_control',
    label: 'Roles & Permissions',
    labelHi: 'भूमिकाएं एवं अनुमतियाँ',
    group: 'Administration',
    description: 'Enable/disable modules and set per-role permissions.',
    core: true,
    defaults: { ADMIN: 'VE' },
  },
  {
    key: 'audit_logs',
    label: 'Audit Log',
    labelHi: 'ऑडिट लॉग',
    group: 'Administration',
    description: 'Who changed what and when (DPDP accountability).',
    core: true,
    defaults: { ADMIN: 'V' },
  },
] as const satisfies readonly ModuleDef[];

export type ModuleKey = (typeof MODULES)[number]['key'];

export const MODULE_KEYS = MODULES.map((m) => m.key) as ModuleKey[];
export const MODULE_MAP = Object.fromEntries(MODULES.map((m) => [m.key, m])) as Record<ModuleKey, ModuleDef>;

export function isModuleKey(value: string): value is ModuleKey {
  return value in MODULE_MAP;
}

export function parsePermString(spec: string | undefined): Perm {
  const s = spec ?? '';
  return { view: s.includes('V'), create: s.includes('C'), edit: s.includes('E'), delete: s.includes('D') };
}

export const FULL_PERM: Perm = { view: true, create: true, edit: true, delete: true };
export const NO_PERM: Perm = { view: false, create: false, edit: false, delete: false };

export function defaultPerm(module: ModuleKey, role: SchoolRole): Perm {
  if (role === 'SUPER_ADMIN') return FULL_PERM;
  return parsePermString(MODULE_MAP[module].defaults[role as keyof ModuleDef['defaults']]);
}

/** Roles whose data is scoped to one family; their API scoping assumes the default rights. */
export const FAMILY_ROLES: SchoolRole[] = ['PARENT', 'STUDENT'];

/**
 * The most a school may grant `role` on `module` in Roles & Permissions.
 * Family roles can be narrowed but never widened (staff-only endpoints do not
 * scope rows to a family), and only admins may manage permissions.
 */
export function grantCeiling(module: ModuleKey, role: SchoolRole): Perm {
  if (FAMILY_ROLES.includes(role)) return defaultPerm(module, role);
  if (module === 'access_control') return role === 'ADMIN' || role === 'SUPER_ADMIN' ? FULL_PERM : NO_PERM;
  return FULL_PERM;
}

/** Effective permission map sent to the client and checked on the server. */
export type PermissionMap = Partial<Record<ModuleKey, Perm>>;

export function hasPerm(perms: PermissionMap, module: ModuleKey, action: Action = 'view'): boolean {
  return Boolean(perms[module]?.[action]);
}
