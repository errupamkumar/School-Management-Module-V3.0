import type { Prisma } from '@prisma/client';
import { badRequest, forbidden, type Ctx } from '../api';
import { classLabel, displayName } from '../common';
import { studentWhere } from '../scope';
import type { ModuleKey } from '@/lib/modules';

/**
 * Report builder: users pick a data source, columns and filters. Each source
 * declares an allow-list of columns and the module needed to use it, so a
 * custom report can never show more than the user could already see.
 */
export interface Filters {
  classId?: string;
  sectionId?: string;
  status?: string;
  gender?: string;
  from?: string;
  to?: string;
  search?: string;
}

interface Column {
  key: string;
  label: string;
  /** Extra right needed for sensitive columns (e.g. salary). */
  needs?: [ModuleKey, 'view' | 'edit'];
}

interface Source {
  label: string;
  module: ModuleKey;
  columns: Column[];
  filters: Array<keyof Filters>;
  statuses?: string[];
  load(ctx: Ctx, f: Filters): Promise<Array<Record<string, unknown>>>;
}

const LIMIT = 5000;
const d = (v: string) => new Date(`${v}T00:00:00.000Z`);
const iso = (v: Date | null | undefined) => (v ? v.toISOString().slice(0, 10) : '');

export const SOURCES: Record<string, Source> = {
  students: {
    label: 'Students',
    module: 'students',
    filters: ['classId', 'sectionId', 'status', 'gender', 'search'],
    statuses: ['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'PASSED_OUT', 'DROPPED'],
    columns: [
      { key: 'admissionNo', label: 'Admission no.' },
      { key: 'name', label: 'Name' },
      { key: 'class', label: 'Class' },
      { key: 'rollNo', label: 'Roll no.' },
      { key: 'gender', label: 'Gender' },
      { key: 'dob', label: 'Date of birth' },
      { key: 'admissionDate', label: 'Admission date' },
      { key: 'status', label: 'Status' },
      { key: 'category', label: 'Category' },
      { key: 'religion', label: 'Religion' },
      { key: 'bloodGroup', label: 'Blood group' },
      { key: 'fatherName', label: "Father's name" },
      { key: 'motherName', label: "Mother's name" },
      { key: 'phone', label: 'Parent mobile' },
      { key: 'city', label: 'City' },
      { key: 'transportStop', label: 'Bus stop' },
      { key: 'hostel', label: 'Hostel room' },
      { key: 'feeDiscount', label: 'Fee discount %', needs: ['fees', 'view'] },
    ],
    async load(ctx, f) {
      const where: Prisma.StudentWhereInput = { AND: [await studentWhere(ctx)] };
      const and = where.AND as Prisma.StudentWhereInput[];
      if (f.classId) and.push({ classId: f.classId });
      if (f.sectionId) and.push({ sectionId: f.sectionId });
      if (f.status) and.push({ status: f.status as never });
      if (f.gender) and.push({ gender: f.gender as never });
      if (f.search) and.push({ OR: [{ firstName: { contains: f.search } }, { lastName: { contains: f.search } }, { admissionNo: { contains: f.search } }] });
      const rows = await ctx.db.student.findMany({
        where,
        take: LIMIT,
        orderBy: [{ class: { numericOrder: 'asc' } }, { firstName: 'asc' }],
        include: { class: { select: { name: true } }, section: { select: { name: true } }, guardian: { select: { fatherName: true, motherName: true, primaryPhone: true } }, transport: { select: { stop: { select: { name: true } } } }, hostel: { where: { status: 'ACTIVE' }, take: 1, select: { room: { select: { roomNo: true, hostel: { select: { name: true } } } } } } },
      });
      return rows.map((s) => ({
        admissionNo: s.admissionNo,
        name: displayName(s),
        class: classLabel(s.class, s.section),
        rollNo: s.rollNo,
        gender: s.gender,
        dob: iso(s.dob),
        admissionDate: iso(s.admissionDate),
        status: s.status,
        category: s.category,
        religion: s.religion,
        bloodGroup: s.bloodGroup,
        fatherName: s.guardian?.fatherName,
        motherName: s.guardian?.motherName,
        phone: s.guardian?.primaryPhone,
        city: s.city,
        transportStop: s.transport?.stop?.name ?? '',
        hostel: s.hostel[0] ? `${s.hostel[0].room.hostel.name} ${s.hostel[0].room.roomNo}` : '',
        feeDiscount: Number(s.feeDiscountPercent),
      }));
    },
  },
  employees: {
    label: 'Staff',
    module: 'employees',
    filters: ['status', 'gender', 'search'],
    statuses: ['ACTIVE', 'INACTIVE'],
    columns: [
      { key: 'employeeCode', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'designation', label: 'Designation' },
      { key: 'department', label: 'Department' },
      { key: 'gender', label: 'Gender' },
      { key: 'phone', label: 'Mobile' },
      { key: 'email', label: 'Email' },
      { key: 'joiningDate', label: 'Joined' },
      { key: 'qualification', label: 'Qualification' },
      { key: 'isTeaching', label: 'Teaching' },
      { key: 'status', label: 'Status' },
      { key: 'basicSalary', label: 'Basic salary', needs: ['payroll', 'edit'] },
      { key: 'netSalary', label: 'Net salary', needs: ['payroll', 'edit'] },
    ],
    async load(ctx, f) {
      const rows = await ctx.db.employee.findMany({
        where: { ...(f.status ? { status: f.status as never } : {}), ...(f.gender ? { gender: f.gender as never } : {}), ...(f.search ? { OR: [{ firstName: { contains: f.search } }, { lastName: { contains: f.search } }, { employeeCode: { contains: f.search } }] } : {}) },
        take: LIMIT,
        orderBy: { employeeCode: 'asc' },
      });
      return rows.map((e) => ({ employeeCode: e.employeeCode, name: displayName(e), designation: e.designation, department: e.department, gender: e.gender, phone: e.phone, email: e.email, joiningDate: iso(e.joiningDate), qualification: e.qualification, isTeaching: e.isTeaching ? 'Yes' : 'No', status: e.status, basicSalary: Number(e.basicSalary), netSalary: Number(e.basicSalary) + Number(e.allowances) - Number(e.deductions) }));
    },
  },
  invoices: {
    label: 'Fee invoices',
    module: 'fees',
    filters: ['classId', 'sectionId', 'status', 'from', 'to', 'search'],
    statuses: ['UNPAID', 'PARTIAL', 'PAID', 'CANCELLED'],
    columns: [
      { key: 'invoiceNo', label: 'Invoice' },
      { key: 'for', label: 'For' },
      { key: 'student', label: 'Student' },
      { key: 'admissionNo', label: 'Admission no.' },
      { key: 'class', label: 'Class' },
      { key: 'issueDate', label: 'Issued' },
      { key: 'dueDate', label: 'Due' },
      { key: 'total', label: 'Amount' },
      { key: 'paid', label: 'Paid' },
      { key: 'balance', label: 'Balance' },
      { key: 'status', label: 'Status' },
    ],
    async load(ctx, f) {
      const rows = await ctx.db.feeInvoice.findMany({
        where: {
          student: { AND: [await studentWhere(ctx), ...(f.classId ? [{ classId: f.classId }] : []), ...(f.sectionId ? [{ sectionId: f.sectionId }] : []), ...(f.search ? [{ OR: [{ firstName: { contains: f.search } }, { admissionNo: { contains: f.search } }] }] : [])] },
          ...(f.status ? { status: f.status as never } : {}),
          ...(f.from || f.to ? { dueDate: { ...(f.from ? { gte: d(f.from) } : {}), ...(f.to ? { lte: d(f.to) } : {}) } } : {}),
        },
        take: LIMIT,
        orderBy: [{ dueDate: 'desc' }],
        include: { student: { select: { firstName: true, lastName: true, admissionNo: true, class: { select: { name: true } }, section: { select: { name: true } } } } },
      });
      const label = (p: string, t: string | null) => t || p;
      return rows.map((i) => ({ invoiceNo: i.invoiceNo, for: label(i.period, i.title), student: displayName(i.student), admissionNo: i.student.admissionNo, class: classLabel(i.student.class, i.student.section), issueDate: iso(i.issueDate), dueDate: iso(i.dueDate), total: Number(i.total), paid: Number(i.paidAmount), balance: Number(i.total) - Number(i.paidAmount), status: i.status }));
    },
  },
  payments: {
    label: 'Fee receipts',
    module: 'fees',
    filters: ['classId', 'status', 'from', 'to', 'search'],
    statuses: ['SUCCESS', 'PENDING', 'FAILED', 'CANCELLED'],
    columns: [
      { key: 'receiptNo', label: 'Receipt' },
      { key: 'paidAt', label: 'Date' },
      { key: 'student', label: 'Student' },
      { key: 'admissionNo', label: 'Admission no.' },
      { key: 'class', label: 'Class' },
      { key: 'amount', label: 'Amount' },
      { key: 'mode', label: 'Mode' },
      { key: 'reference', label: 'Reference' },
      { key: 'collectedBy', label: 'Collected by' },
      { key: 'status', label: 'Status' },
    ],
    async load(ctx, f) {
      const rows = await ctx.db.feePayment.findMany({
        where: {
          student: { AND: [await studentWhere(ctx), ...(f.classId ? [{ classId: f.classId }] : []), ...(f.search ? [{ OR: [{ firstName: { contains: f.search } }, { admissionNo: { contains: f.search } }] }] : [])] },
          ...(f.status ? { status: f.status as never } : {}),
          ...(f.from || f.to ? { paidAt: { ...(f.from ? { gte: d(f.from) } : {}), ...(f.to ? { lt: new Date(d(f.to).getTime() + 86_400_000) } : {}) } } : {}),
        },
        take: LIMIT,
        orderBy: { paidAt: 'desc' },
        include: { student: { select: { firstName: true, lastName: true, admissionNo: true, class: { select: { name: true } }, section: { select: { name: true } } } } },
      });
      return rows.map((p) => ({ receiptNo: p.receiptNo, paidAt: iso(p.paidAt), student: displayName(p.student), admissionNo: p.student.admissionNo, class: classLabel(p.student.class, p.student.section), amount: Number(p.amount), mode: p.mode, reference: p.referenceNo ?? p.chequeNo ?? '', collectedBy: p.collectedByName ?? (p.gateway ? 'Online' : ''), status: p.status }));
    },
  },
  attendance: {
    label: 'Attendance summary',
    module: 'attendance',
    filters: ['classId', 'sectionId', 'from', 'to'],
    columns: [
      { key: 'admissionNo', label: 'Admission no.' },
      { key: 'name', label: 'Name' },
      { key: 'class', label: 'Class' },
      { key: 'days', label: 'Days marked' },
      { key: 'present', label: 'Present' },
      { key: 'absent', label: 'Absent' },
      { key: 'leave', label: 'Leave' },
      { key: 'late', label: 'Late' },
      { key: 'percent', label: 'Attendance %' },
    ],
    async load(ctx, f) {
      if (!f.from || !f.to) throw badRequest('Choose a date range for attendance.');
      const students = await ctx.db.student.findMany({
        where: { AND: [await studentWhere(ctx), { status: 'ACTIVE' }, ...(f.classId ? [{ classId: f.classId }] : []), ...(f.sectionId ? [{ sectionId: f.sectionId }] : [])] },
        take: LIMIT,
        orderBy: [{ class: { numericOrder: 'asc' } }, { rollNo: 'asc' }],
        select: { id: true, firstName: true, lastName: true, admissionNo: true, class: { select: { name: true } }, section: { select: { name: true } } },
      });
      const att = await ctx.db.studentAttendance.groupBy({ by: ['studentId', 'status'], where: { studentId: { in: students.map((s) => s.id) }, date: { gte: d(f.from), lte: d(f.to) } }, _count: true });
      return students.map((s) => {
        const c = (st: string) => att.find((a) => a.studentId === s.id && a.status === st)?._count ?? 0;
        const days = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE'].reduce((a, st) => a + c(st), 0);
        const present = c('PRESENT') + c('LATE') + c('HALF_DAY');
        return { admissionNo: s.admissionNo, name: displayName(s), class: classLabel(s.class, s.section), days, present, absent: c('ABSENT'), leave: c('LEAVE'), late: c('LATE'), percent: days ? Math.round((present / days) * 1000) / 10 : '' };
      });
    },
  },
  library: {
    label: 'Library issues',
    module: 'library',
    filters: ['status', 'from', 'to'],
    statuses: ['ISSUED', 'RETURNED'],
    columns: [
      { key: 'book', label: 'Book' },
      { key: 'borrower', label: 'Borrower' },
      { key: 'issuedOn', label: 'Issued' },
      { key: 'dueOn', label: 'Due' },
      { key: 'returnedOn', label: 'Returned' },
      { key: 'fine', label: 'Fine' },
    ],
    async load(ctx, f) {
      const rows = await ctx.db.bookIssue.findMany({
        where: { ...(f.status === 'ISSUED' ? { returnedOn: null } : f.status === 'RETURNED' ? { returnedOn: { not: null } } : {}), ...(f.from || f.to ? { issuedOn: { ...(f.from ? { gte: d(f.from) } : {}), ...(f.to ? { lte: d(f.to) } : {}) } } : {}) },
        take: LIMIT,
        orderBy: { issuedOn: 'desc' },
        include: { book: { select: { title: true } } },
      });
      return rows.map((r) => ({ book: r.book.title, borrower: `${r.borrowerName} (${r.borrowerType === 'STUDENT' ? 'student' : 'staff'})`, issuedOn: iso(r.issuedOn), dueOn: iso(r.dueOn), returnedOn: iso(r.returnedOn), fine: Number(r.fine) }));
    },
  },
};

export function catalog(ctx: Ctx) {
  return Object.entries(SOURCES)
    .filter(([, s]) => ctx.can(s.module))
    .map(([key, s]) => ({ key, label: s.label, filters: s.filters, statuses: s.statuses ?? [], columns: s.columns.filter((c) => !c.needs || ctx.can(c.needs[0], c.needs[1])).map(({ key: k, label }) => ({ key: k, label })) }));
}

export async function runReport(ctx: Ctx, entity: string, columns: string[], filters: Filters) {
  const src = SOURCES[entity];
  if (!src) throw badRequest('Unknown data source.');
  if (!ctx.can(src.module)) throw forbidden();
  const allowed = src.columns.filter((c) => !c.needs || ctx.can(c.needs[0], c.needs[1]));
  const cols = columns.length ? allowed.filter((c) => columns.includes(c.key)) : allowed;
  if (!cols.length) throw badRequest('Choose at least one column.');
  const rows = await src.load(ctx, filters);
  return { columns: cols.map(({ key, label }) => ({ key, label })), rows: rows.map((r) => Object.fromEntries(cols.map((c) => [c.key, r[c.key] ?? '']))), truncated: rows.length >= LIMIT };
}
