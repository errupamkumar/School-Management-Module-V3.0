import { z } from 'zod';
import { badRequest, body, forbidden, query, route } from '@/server/api';
import { displayName } from '@/server/common';
import { formatNumber, reserveSequence } from '@/server/db';
import { fromPaise, toPaise } from '@/server/services/money';
import { postLedger } from '@/server/services/ledger';
import { notifyUsers } from '@/server/services/notify';
import { periodLabel } from '@/server/services/fees';

const month = z.string().regex(/^\d{4}-\d{2}$/, 'Choose a month');

/**
 * ?month=YYYY-MM  salary sheet for all staff (payroll managers)
 * ?mine=1         the signed-in employee's own payslips
 */
export const GET = route({ module: 'payroll' }, async (ctx, req) => {
  if (req.nextUrl.searchParams.get('mine') === '1') {
    if (!ctx.user.employeeId) return [];
    return ctx.db.salaryPayment.findMany({ where: { employeeId: ctx.user.employeeId }, orderBy: { month: 'desc' } });
  }
  if (!ctx.can('payroll', 'create')) throw forbidden();
  const q = query(req, z.object({ month }));
  const [employees, paid] = await Promise.all([
    ctx.db.employee.findMany({
      where: { OR: [{ status: 'ACTIVE' }, { salaries: { some: { month: q.month } } }] },
      orderBy: [{ isTeaching: 'desc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true, department: true, basicSalary: true, allowances: true, deductions: true, bankName: true, bankAccount: true, ifsc: true, photoUrl: true },
    }),
    ctx.db.salaryPayment.findMany({ where: { month: q.month } }),
  ]);
  const rows = employees.map((e) => {
    const slip = paid.find((p) => p.employeeId === e.id);
    return {
      employeeId: e.id,
      name: displayName(e),
      code: e.employeeCode,
      designation: e.designation,
      department: e.department,
      photoUrl: e.photoUrl,
      bank: e.bankAccount ? `${e.bankName ?? ''} ••${e.bankAccount.slice(-4)} ${e.ifsc ?? ''}`.trim() : null,
      basic: Number(e.basicSalary),
      allowances: Number(e.allowances),
      deductions: Number(e.deductions),
      net: Number(e.basicSalary) + Number(e.allowances) - Number(e.deductions),
      slip: slip ? { id: slip.id, slipNo: slip.slipNo, net: Number(slip.net), paidAt: slip.paidAt, mode: slip.mode } : null,
    };
  });
  const totals = rows.reduce((a, r) => ({ payable: a.payable + r.net, paid: a.paid + (r.slip?.net ?? 0) }), { payable: 0, paid: 0 });
  return { month: q.month, rows, totals };
});

/** Pay salaries for a month (one slip per employee per month; re-paying is rejected). */
export const POST = route({ module: 'payroll', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      month,
      mode: z.enum(['CASH', 'UPI', 'NET_BANKING', 'CHEQUE', 'BANK_TRANSFER']).default('BANK_TRANSFER'),
      paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      items: z
        .array(
          z.object({
            employeeId: z.string().min(1),
            basic: z.coerce.number().min(0).max(10_000_000),
            allowances: z.coerce.number().min(0).max(10_000_000).default(0),
            bonus: z.coerce.number().min(0).max(10_000_000).default(0),
            deductions: z.coerce.number().min(0).max(10_000_000).default(0),
            referenceNo: z.string().trim().max(60).optional().nullable(),
            remarks: z.string().trim().max(200).optional().nullable(),
          })
        )
        .min(1)
        .max(500),
    })
  );
  const ids = input.items.map((i) => i.employeeId);
  const [employees, existing] = await Promise.all([
    ctx.db.employee.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true, userId: true, campusId: true } }),
    ctx.db.salaryPayment.findMany({ where: { month: input.month, employeeId: { in: ids } }, select: { employeeId: true } }),
  ]);
  if (employees.length !== new Set(ids).size) throw badRequest('Unknown employee.');
  if (existing.length) throw badRequest(`${existing.length} employee(s) are already paid for ${periodLabel(input.month)}.`);
  for (const i of input.items) if (i.basic + i.allowances + i.bonus - i.deductions < 0) throw badRequest('Deductions cannot exceed gross pay.');

  const paidAt = input.paidOn ? new Date(`${input.paidOn}T00:00:00.000Z`) : new Date();
  const slips = await ctx.db.$transaction(
    async (tx) => {
      const first = await reserveSequence(tx, ctx.user.schoolId, 'salary', input.items.length);
      const out = [];
      for (const [n, i] of input.items.entries()) {
        const e = employees.find((x) => x.id === i.employeeId)!;
        const net = Math.round((i.basic + i.allowances + i.bonus - i.deductions) * 100);
        const slip = await tx.salaryPayment.create({
          data: {
            schoolId: ctx.user.schoolId,
            slipNo: formatNumber(ctx.school.settings.numbering.salarySlipPrefix, first + n, 5),
            employeeId: i.employeeId,
            month: input.month,
            basic: fromPaise(Math.round(i.basic * 100)),
            allowances: fromPaise(Math.round(i.allowances * 100)),
            bonus: fromPaise(Math.round(i.bonus * 100)),
            deductions: fromPaise(Math.round(i.deductions * 100)),
            net: fromPaise(net),
            mode: input.mode,
            referenceNo: i.referenceNo ?? null,
            remarks: i.remarks ?? null,
            paidAt,
            paidById: ctx.user.id,
          },
        });
        await postLedger(tx, ctx.user.schoolId, { kind: 'SALARY', amount: net, date: paidAt, description: `Salary ${periodLabel(input.month)} — ${displayName(e)}`, mode: input.mode, referenceNo: slip.slipNo, party: displayName(e), sourceId: slip.id, createdById: ctx.user.id, campusId: e.campusId });
        out.push({ slip, userId: e.userId });
      }
      return out;
    },
    { timeout: 60_000 }
  );
  for (const s of slips) await notifyUsers(ctx.db, ctx.user.schoolId, [s.userId], { title: `Salary credited for ${periodLabel(input.month)}`, body: `Net pay ₹${(toPaise(s.slip.net) / 100).toLocaleString('en-IN')}. Your payslip is available under Payroll.`, link: '/payroll' });
  await ctx.audit('CREATE', 'SalaryPayment', null, `Paid ${slips.length} salaries for ${input.month}`);
  return { paid: slips.length, slips: slips.map((s) => ({ id: s.slip.id, slipNo: s.slip.slipNo })) };
});
