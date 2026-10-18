import { forbidden, route } from '@/server/api';
import { displayName } from '@/server/common';
import { amountInWords } from '@/server/services/money';
import { removeLedgerForSource } from '@/server/services/ledger';
import { periodLabel } from '@/server/services/fees';

/** Payslip: payroll managers see all; other staff only their own. */
export const GET = route({ module: 'payroll' }, async (ctx, _req, { id }) => {
  const s = await ctx.db.salaryPayment.findUniqueOrThrow({
    where: { id },
    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true, department: true, joiningDate: true, panNo: true, uan: true, bankName: true, bankAccount: true, ifsc: true } } },
  });
  if (!ctx.can('payroll', 'create') && s.employeeId !== ctx.user.employeeId) throw forbidden();
  const school = await ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { name: true, logoUrl: true, address: true, city: true, state: true, pincode: true, phone: true, email: true } });
  const [y, m] = s.month.split('-').map(Number);
  const [present, leave, absent] = await Promise.all(
    [['PRESENT', 'LATE', 'HALF_DAY'], ['LEAVE'], ['ABSENT']].map((st) =>
      ctx.db.employeeAttendance.count({ where: { employeeId: s.employeeId, status: { in: st as never }, date: { gte: new Date(Date.UTC(y, m - 1, 1)), lte: new Date(Date.UTC(y, m, 0)) } } })
    )
  );
  return {
    ...s,
    monthLabel: periodLabel(s.month),
    employeeName: displayName(s.employee),
    employee: { ...s.employee, bankAccount: s.employee.bankAccount ? `XXXX${s.employee.bankAccount.slice(-4)}` : null },
    gross: Number(s.basic) + Number(s.allowances) + Number(s.bonus),
    netInWords: amountInWords(Number(s.net)),
    attendance: { present, leave, absent },
    school,
  };
});

/** Reverse a salary payment made in error (removes the ledger posting). */
export const DELETE = route({ module: 'payroll', action: 'delete' }, async (ctx, _req, { id }) => {
  const s = await ctx.db.salaryPayment.findUniqueOrThrow({ where: { id } });
  await ctx.db.$transaction(async (tx) => {
    await removeLedgerForSource(tx, 'SALARY', id);
    await tx.salaryPayment.delete({ where: { id } });
  });
  await ctx.audit('DELETE', 'SalaryPayment', id, `Reversed ${s.slipNo} (${s.month})`);
  return { deleted: true };
});
