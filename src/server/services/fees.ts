import crypto from 'node:crypto';
import { Prisma, type PaymentMode, type PaymentStatus } from '@prisma/client';
import { formatNumber, reserveSequence, type TenantDb, type TenantTx } from '../db';
import { badRequest, conflict, notFound } from '../api';
import type { SchoolSettings } from '../settings';
import { fromPaise, percentOf, toPaise, type Paise } from './money';
import { postLedger, removeLedgerForSource } from './ledger';

// ----------------------------------------------------------------------------
// Calendar helpers
// ----------------------------------------------------------------------------

export function parsePeriod(period: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) throw badRequest('Billing period must look like YYYY-MM.');
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) throw badRequest('Billing month must be between 01 and 12.');
  return { year, month };
}

export function academicYearFor(date: Date, startMonth = 4): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const start = m >= startMonth ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export function academicYearForPeriod(period: string, startMonth = 4): string {
  const { year, month } = parsePeriod(period);
  return academicYearFor(new Date(Date.UTC(year, month - 1, 1)), startMonth);
}

/** Calendar months (1-12) a fee head is billed in. */
export function billingMonths(frequency: string, months: unknown, startMonth = 4): number[] {
  if (Array.isArray(months) && months.length) return months.map(Number).filter((n) => n >= 1 && n <= 12);
  const shift = (offsets: number[]) => offsets.map((o) => ((startMonth - 1 + o) % 12) + 1);
  switch (frequency) {
    case 'MONTHLY':
      return shift([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    case 'QUARTERLY':
      return shift([0, 3, 6, 9]);
    case 'HALF_YEARLY':
      return shift([0, 6]);
    case 'YEARLY':
      return shift([0]);
    default:
      return []; // ONE_TIME without explicit months is billed manually
  }
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function periodLabel(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  return m ? `${MONTH_NAMES[Number(m[2]) - 1]} ${m[1]}` : period;
}

// ----------------------------------------------------------------------------
// Invoice generation
// ----------------------------------------------------------------------------

export interface GenerateInvoicesInput {
  period: string; // YYYY-MM
  classIds?: string[];
  studentIds?: string[];
  issueDate?: Date;
  dueDay?: number;
}

interface DraftItem {
  feeHeadId: string | null;
  description: string;
  amount: Paise;
  discount: Paise;
}

export async function generateInvoices(
  db: TenantDb,
  schoolId: string,
  settings: SchoolSettings,
  startMonth: number,
  input: GenerateInvoicesInput
): Promise<{ created: number; skipped: number; empty: number; invoiceIds: string[] }> {
  const { year, month } = parsePeriod(input.period);
  const academicYear = academicYearForPeriod(input.period, startMonth);
  const issueDate = input.issueDate ?? new Date(Date.UTC(year, month - 1, 1));

  const students = await db.student.findMany({
    where: {
      status: 'ACTIVE',
      ...(input.classIds?.length ? { classId: { in: input.classIds } } : {}),
      ...(input.studentIds?.length ? { id: { in: input.studentIds } } : {}),
    },
    select: {
      id: true,
      classId: true,
      admissionDate: true,
      feeDiscountPercent: true,
      transport: { select: { stop: { select: { name: true, monthlyFee: true } } } },
      hostel: { where: { status: 'ACTIVE' }, take: 1, select: { room: { select: { roomNo: true, monthlyFee: true, hostel: { select: { name: true } } } } } },
    },
  });
  if (!students.length) return { created: 0, skipped: 0, empty: 0, invoiceIds: [] };

  const studentIds = students.map((s) => s.id);
  const classIds = [...new Set(students.map((s) => s.classId))];

  const [existing, structures, concessions, outstanding] = await Promise.all([
    db.feeInvoice.findMany({ where: { period: input.period, studentId: { in: studentIds } }, select: { studentId: true } }),
    db.feeStructure.findMany({
      where: { academicYear, classId: { in: classIds }, feeHead: { isActive: true } },
      include: { feeHead: { select: { name: true, kind: true, sortOrder: true } } },
      orderBy: { feeHead: { sortOrder: 'asc' } },
    }),
    db.feeConcession.findMany({ where: { studentId: { in: studentIds } } }),
    db.feeInvoice.findMany({
      where: { studentId: { in: studentIds }, status: { in: ['UNPAID', 'PARTIAL'] }, period: { lt: input.period } },
      select: { studentId: true, total: true, paidAmount: true },
    }),
  ]);

  const already = new Set(existing.map((e) => e.studentId));
  const arrears = new Map<string, Paise>();
  for (const inv of outstanding) arrears.set(inv.studentId, (arrears.get(inv.studentId) ?? 0) + toPaise(inv.total) - toPaise(inv.paidAmount));

  const drafts: Array<{ studentId: string; items: DraftItem[]; dueDay: number }> = [];
  let skipped = 0;
  let empty = 0;

  for (const s of students) {
    if (already.has(s.id)) {
      skipped++;
      continue;
    }
    const isAdmissionMonth =
      s.admissionDate.getUTCFullYear() === year && s.admissionDate.getUTCMonth() + 1 === month;
    const items: DraftItem[] = [];
    let dueDay = input.dueDay ?? 31;

    for (const st of structures.filter((x) => x.classId === s.classId)) {
      const billedNow =
        st.frequency === 'ONE_TIME'
          ? isAdmissionMonth || billingMonths(st.frequency, st.months, startMonth).includes(month)
          : billingMonths(st.frequency, st.months, startMonth).includes(month);
      if (!billedNow) continue;
      // One-time heads (admission fee) are only charged in the admission month.
      if (st.feeHead.kind === 'ONE_TIME' && !isAdmissionMonth && !Array.isArray(st.months)) continue;
      const amount = toPaise(st.amount);
      items.push({ feeHeadId: st.feeHeadId, description: st.feeHead.name, amount, discount: 0 });
      if (!input.dueDay) dueDay = Math.min(dueDay, st.dueDay);
    }

    const stop = s.transport?.stop;
    if (stop && toPaise(stop.monthlyFee) > 0) {
      items.push({ feeHeadId: null, description: `Transport (${stop.name})`, amount: toPaise(stop.monthlyFee), discount: 0 });
    }

    const bed = s.hostel[0]?.room;
    if (bed && toPaise(bed.monthlyFee) > 0) {
      items.push({ feeHeadId: null, description: `Hostel (${bed.hostel.name}, room ${bed.roomNo})`, amount: toPaise(bed.monthlyFee), discount: 0 });
    }

    // Discounts: the student's blanket percentage, then head-specific concessions.
    const blanket = Number(s.feeDiscountPercent);
    const own = concessions.filter((c) => c.studentId === s.id);
    for (const item of items) {
      let discount = blanket > 0 ? percentOf(item.amount, blanket) : 0;
      for (const c of own) {
        if (c.feeHeadId && c.feeHeadId !== item.feeHeadId) continue;
        if (!c.feeHeadId && item.feeHeadId === null) continue; // concessions don't apply to transport or hostel unless targeted
        discount += c.kind === 'PERCENT' ? percentOf(item.amount, Number(c.value)) : toPaise(c.value);
      }
      item.discount = Math.min(discount, item.amount);
    }

    if (!items.length) {
      empty++;
      continue;
    }
    drafts.push({ studentId: s.id, items, dueDay: dueDay === 31 ? 10 : dueDay });
  }

  if (!drafts.length) return { created: 0, skipped, empty, invoiceIds: [] };

  const prefix = settings.numbering.invoicePrefix;
  const invoiceIds: string[] = [];

  await db.$transaction(
    async (tx) => {
      const first = await reserveSequence(tx, schoolId, 'invoice', drafts.length);
      const invoices: Prisma.FeeInvoiceCreateManyInput[] = [];
      const items: Prisma.FeeInvoiceItemCreateManyInput[] = [];
      drafts.forEach((d, i) => {
        const id = crypto.randomUUID();
        invoiceIds.push(id);
        const subtotal = d.items.reduce((a, it) => a + it.amount, 0);
        const discount = d.items.reduce((a, it) => a + it.discount, 0);
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        invoices.push({
          id,
          schoolId,
          invoiceNo: formatNumber(prefix, first + i, 6),
          studentId: d.studentId,
          period: input.period,
          issueDate,
          dueDate: new Date(Date.UTC(year, month - 1, Math.min(d.dueDay, lastDay))),
          subtotal: fromPaise(subtotal),
          discount: fromPaise(discount),
          lateFee: fromPaise(0),
          previousBalance: fromPaise(arrears.get(d.studentId) ?? 0),
          total: fromPaise(subtotal - discount),
          paidAmount: fromPaise(0),
          status: subtotal - discount <= 0 ? 'PAID' : 'UNPAID',
        });
        for (const it of d.items) {
          items.push({ schoolId, invoiceId: id, feeHeadId: it.feeHeadId, description: it.description, amount: fromPaise(it.amount), discount: fromPaise(it.discount) });
        }
      });
      await tx.feeInvoice.createMany({ data: invoices });
      await tx.feeInvoiceItem.createMany({ data: items });
    },
    { timeout: 60_000 }
  );

  return { created: drafts.length, skipped, empty, invoiceIds };
}

// ----------------------------------------------------------------------------
// Late fees
// ----------------------------------------------------------------------------

/** Applies the class's late-fee rule to overdue invoices. Idempotent for FIXED rules. */
export async function applyLateFees(db: TenantDb, asOf: Date): Promise<{ updated: number }> {
  const overdue = await db.feeInvoice.findMany({
    where: { status: { in: ['UNPAID', 'PARTIAL'] }, dueDate: { lt: asOf } },
    include: { student: { select: { classId: true } } },
  });
  if (!overdue.length) return { updated: 0 };

  const rules = await db.feeStructure.findMany({
    where: { lateFeeType: { not: 'NONE' }, classId: { in: [...new Set(overdue.map((o) => o.student.classId))] } },
    select: { classId: true, academicYear: true, lateFeeType: true, lateFeeAmount: true },
  });

  let updated = 0;
  for (const inv of overdue) {
    const rule = rules
      .filter((r) => r.classId === inv.student.classId)
      .sort((a, b) => toPaise(b.lateFeeAmount) - toPaise(a.lateFeeAmount))[0];
    if (!rule) continue;
    const days = Math.floor((asOf.getTime() - inv.dueDate.getTime()) / 86_400_000);
    const fee = rule.lateFeeType === 'PER_DAY' ? toPaise(rule.lateFeeAmount) * Math.min(days, 60) : toPaise(rule.lateFeeAmount);
    if (fee === toPaise(inv.lateFee)) continue;
    const base = toPaise(inv.subtotal) - toPaise(inv.discount);
    await db.feeInvoice.update({ where: { id: inv.id }, data: { lateFee: fromPaise(fee), total: fromPaise(base + fee) } });
    updated++;
  }
  return { updated };
}

// ----------------------------------------------------------------------------
// Collection
// ----------------------------------------------------------------------------

export interface CollectInput {
  studentIds: string[];
  amount: Paise;
  mode: PaymentMode;
  paidAt: Date;
  invoiceIds?: string[];
  referenceNo?: string | null;
  chequeNo?: string | null;
  bankName?: string | null;
  remarks?: string | null;
  collectedBy: { id: string; name: string } | null;
  status?: PaymentStatus;
  gateway?: { name: string; orderId: string; paymentId?: string | null };
}

export function invoiceStatus(total: Paise, paid: Paise): 'UNPAID' | 'PARTIAL' | 'PAID' {
  if (paid <= 0) return total <= 0 ? 'PAID' : 'UNPAID';
  return paid >= total ? 'PAID' : 'PARTIAL';
}

/**
 * Allocates a payment to the oldest outstanding invoices first and issues one
 * receipt per student (family-wise collection issues one per sibling).
 * Invoice rows are locked for the duration so two counters can't over-collect.
 */
export async function collectPayment(db: TenantDb, schoolId: string, settings: SchoolSettings, input: CollectInput) {
  if (input.amount <= 0) throw badRequest('Amount must be greater than zero.');
  if (!input.studentIds.length) throw badRequest('Select a student.');

  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM FeeInvoice WHERE schoolId = ${schoolId} AND studentId IN (${Prisma.join(input.studentIds)}) AND status IN ('UNPAID', 'PARTIAL') FOR UPDATE`;

      const invoices = await tx.feeInvoice.findMany({
        where: {
          studentId: { in: input.studentIds },
          status: { in: ['UNPAID', 'PARTIAL'] },
          ...(input.invoiceIds?.length ? { id: { in: input.invoiceIds } } : {}),
        },
        orderBy: [{ dueDate: 'asc' }, { period: 'asc' }],
        include: { student: { select: { firstName: true, lastName: true, campusId: true } } },
      });
      const outstanding = invoices.reduce((a, inv) => a + toPaise(inv.total) - toPaise(inv.paidAmount), 0);
      // Advance: counter payments beyond the dues are kept on the (first) student's account
      // and used automatically when the next invoices are raised.
      const advanceOk = settings.fees.allowAdvance && (input.status ?? 'SUCCESS') === 'SUCCESS' && !input.gateway;
      if (outstanding <= 0 && !advanceOk) throw conflict('There are no outstanding dues for the selected student(s).');
      if (input.amount > outstanding && !advanceOk) {
        throw badRequest(`Amount exceeds outstanding dues of ₹${(outstanding / 100).toFixed(2)}.`);
      }
      const advance = Math.max(0, input.amount - outstanding);
      if (!settings.fees.allowPartialPayment && input.amount < outstanding) {
        throw badRequest('Partial payments are disabled for this school. Collect the full outstanding amount.');
      }

      // Oldest-first allocation, grouped by student.
      let remaining = input.amount;
      const perStudent = new Map<string, Array<{ invoiceId: string; amount: Paise }>>();
      for (const inv of invoices) {
        if (remaining <= 0) break;
        const due = toPaise(inv.total) - toPaise(inv.paidAmount);
        const take = Math.min(due, remaining);
        if (take <= 0) continue;
        remaining -= take;
        const list = perStudent.get(inv.studentId) ?? [];
        list.push({ invoiceId: inv.id, amount: take });
        perStudent.set(inv.studentId, list);
      }
      const advanceStudentId = input.studentIds[0];
      if (advance > 0 && !perStudent.has(advanceStudentId)) perStudent.set(advanceStudentId, []);
      const names = advance > 0 ? await tx.student.findMany({ where: { id: { in: input.studentIds } }, select: { id: true, firstName: true, lastName: true, campusId: true } }) : [];

      const isSuccess = (input.status ?? 'SUCCESS') === 'SUCCESS';
      // Pending (online) payments get a placeholder; the real receipt number is issued on success
      // so the receipt series stays gap-free.
      const first = isSuccess ? await reserveSequence(tx, schoolId, 'receipt', perStudent.size) : 0;
      const payments = [];
      let i = 0;
      for (const [studentId, allocs] of perStudent) {
        const extra = studentId === advanceStudentId ? advance : 0;
        const amount = allocs.reduce((a, x) => a + x.amount, 0) + extra;
        const student = invoices.find((inv) => inv.studentId === studentId)?.student ?? names.find((n) => n.id === studentId)!;
        const payment = await tx.feePayment.create({
          data: {
            schoolId,
            receiptNo: isSuccess ? formatNumber(settings.numbering.receiptPrefix, first + i++, 6) : `PENDING-${crypto.randomUUID()}`,
            studentId,
            amount: fromPaise(amount),
            mode: input.mode,
            status: input.status ?? 'SUCCESS',
            referenceNo: input.referenceNo ?? null,
            chequeNo: input.chequeNo ?? null,
            bankName: input.bankName ?? null,
            remarks: extra > 0 ? [input.remarks, `Advance ₹${(extra / 100).toFixed(2)} kept for future fees`].filter(Boolean).join(' · ').slice(0, 250) : input.remarks ?? null,
            paidAt: input.paidAt,
            collectedById: input.collectedBy?.id ?? null,
            collectedByName: input.collectedBy?.name ?? null,
            gateway: input.gateway?.name ?? null,
            gatewayOrderId: perStudent.size === 1 ? input.gateway?.orderId ?? null : null,
            gatewayPaymentId: perStudent.size === 1 ? input.gateway?.paymentId ?? null : null,
            allocations: { create: allocs.map((a) => ({ schoolId, invoiceId: a.invoiceId, amount: fromPaise(a.amount) })) },
          },
        });
        if (isSuccess) {
          await applyAllocations(tx, allocs, +1);
          await postLedger(tx, schoolId, {
            kind: 'FEE',
            amount,
            date: input.paidAt,
            description: `Fee receipt ${payment.receiptNo} — ${student.firstName} ${student.lastName ?? ''}`.trim(),
            mode: input.mode,
            referenceNo: payment.receiptNo,
            party: `${student.firstName} ${student.lastName ?? ''}`.trim(),
            sourceId: payment.id,
            createdById: input.collectedBy?.id,
            campusId: student.campusId,
          });
        }
        payments.push(payment);
      }
      return payments;
    },
    { timeout: 30_000 }
  );
}

async function applyAllocations(tx: TenantTx, allocs: Array<{ invoiceId: string; amount: Paise }>, sign: 1 | -1) {
  // Read-modify-write under a row lock: two receipts cancelled (or confirmed) at the
  // same moment must not both read the old paid amount and lose one update.
  // The amounts must come from the locking read itself: under InnoDB's REPEATABLE READ
  // an ordinary SELECT returns the transaction's earlier snapshot, i.e. the stale value.
  // A fixed order (by id) keeps concurrent transactions from deadlocking.
  for (const a of [...allocs].sort((x, y) => (x.invoiceId < y.invoiceId ? -1 : x.invoiceId > y.invoiceId ? 1 : 0))) {
    const [inv] = await tx.$queryRaw<Array<{ total: Prisma.Decimal; paidAmount: Prisma.Decimal }>>`SELECT total, paidAmount FROM FeeInvoice WHERE id = ${a.invoiceId} FOR UPDATE`;
    if (!inv) throw notFound('Invoice');
    const paid = Math.max(0, toPaise(inv.paidAmount) + sign * a.amount);
    await tx.feeInvoice.update({
      where: { id: a.invoiceId },
      data: { paidAmount: fromPaise(paid), status: invoiceStatus(toPaise(inv.total), paid) },
    });
  }
}

/** Marks a PENDING (online) payment as successful and applies it. */
export async function confirmPendingPayment(db: TenantDb, schoolId: string, settings: SchoolSettings, paymentId: string, gatewayPaymentId: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM FeePayment WHERE id = ${paymentId} AND schoolId = ${schoolId} FOR UPDATE`;
    const payment = await tx.feePayment.findUnique({ where: { id: paymentId }, include: { allocations: true, student: true } });
    if (!payment) throw notFound('Payment');
    if (payment.status === 'SUCCESS') return payment; // webhook + redirect both arrive; idempotent
    if (payment.status !== 'PENDING') throw conflict('Payment is not pending.');
    const allocs = payment.allocations.map((a) => ({ invoiceId: a.invoiceId, amount: toPaise(a.amount) }));
    // If the same dues were settled at the counter meanwhile, keep the money on record but flag it.
    const invs = await tx.feeInvoice.findMany({ where: { id: { in: allocs.map((a) => a.invoiceId) } }, select: { id: true, total: true, paidAmount: true } });
    const over = allocs.some((a) => {
      const inv = invs.find((x) => x.id === a.invoiceId);
      return !inv || toPaise(inv.paidAmount) + a.amount > toPaise(inv.total);
    });
    await applyAllocations(tx, allocs, +1);
    const n = await reserveSequence(tx, schoolId, 'receipt', 1);
    const updated = await tx.feePayment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCESS',
        gatewayPaymentId,
        paidAt: new Date(),
        receiptNo: formatNumber(settings.numbering.receiptPrefix, n, 6),
        remarks: over ? 'Overpayment: dues were already settled — review for refund' : payment.remarks,
      },
    });
    await postLedger(tx, schoolId, {
      kind: 'FEE',
      amount: toPaise(payment.amount),
      date: new Date(),
      description: `Online fee receipt ${updated.receiptNo}`,
      mode: 'ONLINE',
      referenceNo: gatewayPaymentId,
      party: `${payment.student.firstName} ${payment.student.lastName ?? ''}`.trim(),
      sourceId: payment.id,
      campusId: payment.student.campusId,
    });
    return updated;
  });
}

export async function cancelPayment(db: TenantDb, paymentId: string, reason: string) {
  return db.$transaction(async (tx) => {
    // Lock the receipt first (same order as applyAdvance) so an advance being applied
    // from it cannot add an allocation that this cancellation would miss.
    await tx.$queryRaw`SELECT id FROM FeePayment WHERE id = ${paymentId} FOR UPDATE`;
    const payment = await tx.feePayment.findUnique({ where: { id: paymentId }, include: { allocations: true } });
    if (!payment) throw notFound('Payment');
    if (payment.status === 'CANCELLED') throw conflict('This receipt is already cancelled.');
    if (payment.status === 'SUCCESS') {
      await applyAllocations(
        tx,
        payment.allocations.map((a) => ({ invoiceId: a.invoiceId, amount: toPaise(a.amount) })),
        -1
      );
      await removeLedgerForSource(tx, 'FEE', payment.id);
    }
    return tx.feePayment.update({ where: { id: paymentId }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason } });
  });
}

// ----------------------------------------------------------------------------
// Advance (money received beyond the dues)
// ----------------------------------------------------------------------------

/**
 * Unused advance per student = successful receipts minus what has been allocated
 * to invoices. Nothing is stored separately, so cancelling a receipt or an
 * allocation can never leave the balance out of step.
 */
export async function advanceBalances(db: TenantDb | TenantTx, schoolId: string, studentIds: string[]): Promise<Map<string, Paise>> {
  const out = new Map<string, Paise>();
  if (!studentIds.length) return out;
  const rows = await db.$queryRaw<Array<{ studentId: string; paid: unknown; allocated: unknown }>>`
    SELECT p.studentId AS studentId, SUM(p.amount) AS paid, COALESCE(SUM(a.allocated), 0) AS allocated
    FROM FeePayment p
    LEFT JOIN (SELECT paymentId, SUM(amount) AS allocated FROM FeePaymentAllocation WHERE schoolId = ${schoolId} GROUP BY paymentId) a ON a.paymentId = p.id
    WHERE p.schoolId = ${schoolId} AND p.status = 'SUCCESS' AND p.studentId IN (${Prisma.join(studentIds)})
    GROUP BY p.studentId`;
  for (const r of rows) {
    const bal = toPaise(String(r.paid)) - toPaise(String(r.allocated));
    if (bal > 0) out.set(r.studentId, bal);
  }
  return out;
}

/**
 * Uses each student's advance on their open invoices, oldest first. Allocations
 * are linked to the original receipts, so the money trail stays intact and the
 * ledger is untouched (the cash was booked when it was received).
 */
export async function applyAdvance(db: TenantDb, schoolId: string, studentIds: string[]): Promise<{ applied: Paise; invoices: number }> {
  if (!studentIds.length) return { applied: 0, invoices: 0 };
  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM FeePayment WHERE schoolId = ${schoolId} AND studentId IN (${Prisma.join(studentIds)}) AND status = 'SUCCESS' FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM FeeInvoice WHERE schoolId = ${schoolId} AND studentId IN (${Prisma.join(studentIds)}) AND status IN ('UNPAID', 'PARTIAL') FOR UPDATE`;
      const balances = await advanceBalances(tx, schoolId, studentIds);
      let applied = 0;
      const touched = new Set<string>();
      for (const [studentId] of balances) {
        const [payments, open] = await Promise.all([
          tx.feePayment.findMany({ where: { studentId, status: 'SUCCESS' }, orderBy: { paidAt: 'asc' }, select: { id: true, amount: true, allocations: { select: { amount: true } } } }),
          tx.feeInvoice.findMany({ where: { studentId, status: { in: ['UNPAID', 'PARTIAL'] } }, orderBy: [{ dueDate: 'asc' }, { period: 'asc' }], select: { id: true, total: true, paidAmount: true } }),
        ]);
        const due = open.map((i) => ({ id: i.id, left: toPaise(i.total) - toPaise(i.paidAmount) })).filter((i) => i.left > 0);
        for (const p of payments) {
          let free = toPaise(p.amount) - p.allocations.reduce((a, x) => a + toPaise(x.amount), 0);
          for (const inv of due) {
            if (free <= 0) break;
            if (inv.left <= 0) continue;
            const take = Math.min(free, inv.left);
            await tx.feePaymentAllocation.create({ data: { schoolId, paymentId: p.id, invoiceId: inv.id, amount: fromPaise(take) } });
            await applyAllocations(tx, [{ invoiceId: inv.id, amount: take }], +1);
            free -= take;
            inv.left -= take;
            applied += take;
            touched.add(inv.id);
          }
        }
      }
      return { applied, invoices: touched.size };
    },
    { timeout: 30_000 }
  );
}

// ----------------------------------------------------------------------------
// Instant (ad-hoc) invoices
// ----------------------------------------------------------------------------

export interface InstantInvoiceInput {
  studentIds: string[];
  title: string;
  items: Array<{ description: string; amount: Paise; feeHeadId?: string | null }>;
  dueDate: Date;
  issueDate?: Date;
}

/** One-off charges outside the fee structure (trip, costume, exam re-sit…). One invoice per student. */
export async function createInstantInvoices(db: TenantDb, schoolId: string, settings: SchoolSettings, input: InstantInvoiceInput): Promise<string[]> {
  const total = input.items.reduce((a, it) => a + it.amount, 0);
  if (total <= 0) throw badRequest('The invoice total must be more than zero.');
  if (!input.studentIds.length) throw badRequest('Choose at least one student.');
  const ids: string[] = [];
  await db.$transaction(
    async (tx) => {
      const first = await reserveSequence(tx, schoolId, 'invoice', input.studentIds.length);
      const invoices: Prisma.FeeInvoiceCreateManyInput[] = [];
      const items: Prisma.FeeInvoiceItemCreateManyInput[] = [];
      input.studentIds.forEach((studentId, i) => {
        const id = crypto.randomUUID();
        ids.push(id);
        invoices.push({
          id,
          schoolId,
          invoiceNo: formatNumber(settings.numbering.invoicePrefix, first + i, 6),
          studentId,
          period: `X-${crypto.randomUUID().slice(0, 12)}`,
          title: input.title,
          issueDate: input.issueDate ?? new Date(),
          dueDate: input.dueDate,
          subtotal: fromPaise(total),
          discount: fromPaise(0),
          lateFee: fromPaise(0),
          previousBalance: fromPaise(0),
          total: fromPaise(total),
          paidAmount: fromPaise(0),
          status: 'UNPAID',
        });
        for (const it of input.items) items.push({ schoolId, invoiceId: id, feeHeadId: it.feeHeadId ?? null, description: it.description, amount: fromPaise(it.amount), discount: fromPaise(0) });
      });
      await tx.feeInvoice.createMany({ data: invoices });
      await tx.feeInvoiceItem.createMany({ data: items });
    },
    { timeout: 60_000 }
  );
  return ids;
}

/** Display label for an invoice: its title (instant invoices) or the billing month. */
export function invoiceLabel(inv: { period: string; title?: string | null }): string {
  return inv.title || periodLabel(inv.period);
}

// ----------------------------------------------------------------------------
// Summaries
// ----------------------------------------------------------------------------

export async function studentDues(db: TenantDb, studentIds: string[]) {
  const invoices = await db.feeInvoice.findMany({
    where: { studentId: { in: studentIds }, status: { in: ['UNPAID', 'PARTIAL'] } },
    orderBy: [{ dueDate: 'asc' }],
    include: { items: true, student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } } },
  });
  const total = invoices.reduce((a, inv) => a + toPaise(inv.total) - toPaise(inv.paidAmount), 0);
  return { invoices, totalDue: total };
}
