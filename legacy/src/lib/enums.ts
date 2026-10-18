/**
 * Domain enums.
 *
 * These were previously imported from '@prisma/client', but that package only
 * exposes generated enums after `prisma generate` runs successfully (which
 * requires downloading native engine binaries). When generation has not run,
 * `Role` resolves to `undefined` at runtime and every RBAC check silently
 * fails open/closed in unpredictable ways.
 *
 * Declaring them here makes role checks deterministic and keeps the app
 * buildable with zero network access. The values are kept byte-identical to
 * the enum members in prisma/schema.prisma so the Postgres/Prisma production
 * path stays a drop-in swap.
 */

export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
  ACCOUNTANT: 'ACCOUNTANT',
  LIBRARIAN: 'LIBRARIAN',
  TRANSPORT_MANAGER: 'TRANSPORT_MANAGER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const Religion = {
  HINDU: 'HINDU',
  MUSLIM: 'MUSLIM',
  CHRISTIAN: 'CHRISTIAN',
  SIKH: 'SIKH',
  BUDDHIST: 'BUDDHIST',
  JAIN: 'JAIN',
  OTHER: 'OTHER',
} as const;
export type Religion = (typeof Religion)[keyof typeof Religion];

export const BloodGroup = {
  A_POSITIVE: 'A_POSITIVE',
  A_NEGATIVE: 'A_NEGATIVE',
  B_POSITIVE: 'B_POSITIVE',
  B_NEGATIVE: 'B_NEGATIVE',
  AB_POSITIVE: 'AB_POSITIVE',
  AB_NEGATIVE: 'AB_NEGATIVE',
  O_POSITIVE: 'O_POSITIVE',
  O_NEGATIVE: 'O_NEGATIVE',
} as const;
export type BloodGroup = (typeof BloodGroup)[keyof typeof BloodGroup];

export const FeeType = {
  TUITION: 'TUITION',
  ADMISSION: 'ADMISSION',
  EXAM: 'EXAM',
  TRANSPORT: 'TRANSPORT',
  LIBRARY: 'LIBRARY',
  LABORATORY: 'LABORATORY',
  SPORTS: 'SPORTS',
  COMPUTER: 'COMPUTER',
  UNIFORM: 'UNIFORM',
  BOOKS: 'BOOKS',
  DEVELOPMENT: 'DEVELOPMENT',
  ANNUAL: 'ANNUAL',
  OTHER: 'OTHER',
} as const;
export type FeeType = (typeof FeeType)[keyof typeof FeeType];

export const PaymentMode = {
  CASH: 'CASH',
  UPI: 'UPI',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CHEQUE: 'CHEQUE',
  ONLINE: 'ONLINE',
  DD: 'DD',
} as const;
export type PaymentMode = (typeof PaymentMode)[keyof typeof PaymentMode];

export const PaymentStatus = {
  PAID: 'PAID',
  PARTIAL: 'PARTIAL',
  UNPAID: 'UNPAID',
  OVERDUE: 'OVERDUE',
  WAIVED: 'WAIVED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const ExamType = {
  UNIT_TEST: 'UNIT_TEST',
  HALF_YEARLY: 'HALF_YEARLY',
  ANNUAL: 'ANNUAL',
  PRE_BOARD: 'PRE_BOARD',
  PRACTICE: 'PRACTICE',
  WEEKLY_TEST: 'WEEKLY_TEST',
} as const;
export type ExamType = (typeof ExamType)[keyof typeof ExamType];

export const AttendanceStatus = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  HALF_DAY: 'HALF_DAY',
  LEAVE: 'LEAVE',
} as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const LeaveStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type LeaveStatus = (typeof LeaveStatus)[keyof typeof LeaveStatus];

/* ------------------------------------------------------------------ */
/* Display helpers                                                     */
/* ------------------------------------------------------------------ */

/** Roles that may administer the school. Used by middleware and API guards. */
export const ADMIN_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN];

/** Roles permitted to touch money. */
export const FINANCE_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  PARENT: 'Parent',
  ACCOUNTANT: 'Accountant',
  LIBRARIAN: 'Librarian',
  TRANSPORT_MANAGER: 'Transport Manager',
};

export const BLOOD_GROUP_LABELS: Record<BloodGroup, string> = {
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O-',
};

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  ONLINE: 'Online',
  DD: 'Demand Draft',
};

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  UNIT_TEST: 'Unit Test',
  HALF_YEARLY: 'Half Yearly',
  ANNUAL: 'Annual',
  PRE_BOARD: 'Pre-Board',
  PRACTICE: 'Practice',
  WEEKLY_TEST: 'Weekly Test',
};

/** Turn an enum member such as BANK_TRANSFER into "Bank Transfer". */
export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return '—';
  return value
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}
