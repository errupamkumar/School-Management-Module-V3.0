import { body, route } from '@/server/api';
import { employeeSchema } from '@/server/resources/employees';
import { hireEmployee } from '@/server/services/people';
import { importBody, parseSheetDate, sheetRow, type RowError } from '@/server/services/imports';

const GENDER: Record<string, 'MALE' | 'FEMALE' | 'OTHER'> = { m: 'MALE', male: 'MALE', f: 'FEMALE', female: 'FEMALE', o: 'OTHER', other: 'OTHER' };
const YES = new Set(['yes', 'y', 'true', '1', 'teaching']);
/** "25,000" or "₹ 25000" → "25000"; blank → 0. Anything else is left for validation to reject. */
const money = (v: string | undefined) => (v?.trim() ? v.replace(/[₹,\s]/g, '') : 0);

/**
 * Staff import from a spreadsheet (no logins are created — give logins from
 * the staff profile). Every row is checked first; nothing is written while any
 * row is invalid.
 */
export const POST = route({ module: 'employees', action: 'create' }, async (ctx, req) => {
  const input = await body(req, importBody);
  const campus = await ctx.db.campus.findFirstOrThrow({ where: { isMain: true }, select: { id: true } });
  const errors: RowError[] = [];
  const parsed: Array<ReturnType<typeof employeeSchema.parse>> = [];
  input.rows.forEach((r, i) => {
    const raw = {
      firstName: r.firstName,
      lastName: r.lastName || null,
      gender: GENDER[(r.gender ?? '').trim().toLowerCase()],
      dob: r.dob ? parseSheetDate(r.dob) ?? 'invalid' : null,
      phone: r.phone?.replace(/[\s-]/g, '') || undefined,
      email: r.email || null,
      designation: r.designation,
      department: r.department || null,
      isTeaching: YES.has((r.isTeaching ?? '').trim().toLowerCase()),
      qualification: r.qualification || null,
      joiningDate: parseSheetDate(r.joiningDate) ?? 'invalid',
      panNo: r.panNo || null,
      bankName: r.bankName || null,
      bankAccount: r.bankAccount || null,
      ifsc: r.ifsc || null,
      uan: r.uan || null,
      basicSalary: money(r.basicSalary),
      allowances: money(r.allowances),
      deductions: money(r.deductions),
    };
    const res = employeeSchema.safeParse(raw);
    if (!res.success) {
      const issue = res.error.issues[0];
      errors.push({ row: sheetRow(i), error: `${issue.path.join('.') || 'row'}: ${issue.message}` });
    } else parsed.push(res.data);
  });
  if (input.dryRun || errors.length) return { valid: parsed.length, errors, summary: `${parsed.length} staff` };
  const failed: RowError[] = [];
  let created = 0;
  for (const [i, e] of parsed.entries()) {
    try {
      await hireEmployee(ctx.db, ctx.user.schoolId, ctx.school.settings, { employee: { ...e, campusId: campus.id } });
      created++;
    } catch (err) {
      failed.push({ row: sheetRow(i), error: (err as Error).message });
    }
  }
  await ctx.audit('IMPORT', 'Employee', null, `Imported ${created} staff; ${failed.length} failed`);
  return { created, failed, summary: `${created} staff added` };
});
