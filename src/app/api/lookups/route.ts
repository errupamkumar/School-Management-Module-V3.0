import { route } from '@/server/api';
import { classLabel, currentAcademicYear, displayName } from '@/server/common';
import { hasSchoolWideScope, teacherSectionIds } from '@/server/scope';

/**
 * Small, non-sensitive reference lists used by dropdowns across the app.
 * `?include=classes,subjects,teachers,employees,feeHeads,campuses,years,periods,routes`
 */
export const GET = route({ authenticated: true }, async (ctx, req) => {
  const include = new Set((req.nextUrl.searchParams.get('include') ?? 'classes').split(','));
  const isStaff = !['PARENT', 'STUDENT'].includes(ctx.user.role);
  const out: Record<string, unknown> = { academicYear: await currentAcademicYear(ctx) };

  if (include.has('classes')) {
    const mineOnly = ctx.user.role === 'TEACHER' && req.nextUrl.searchParams.get('mine') === '1';
    const mySections = mineOnly ? await teacherSectionIds(ctx) : null;
    const classes = await ctx.db.class.findMany({
      where: { isActive: true },
      orderBy: { numericOrder: 'asc' },
      select: {
        id: true,
        name: true,
        numericOrder: true,
        campusId: true,
        monthlyFee: true,
        sections: { orderBy: { name: 'asc' }, select: { id: true, name: true, capacity: true, classTeacherId: true } },
      },
    });
    out.classes = classes
      .map((c) => ({
        ...c,
        label: classLabel(c),
        sections: c.sections.filter((s) => !mySections || mySections.includes(s.id)).map((s) => ({ ...s, label: classLabel(c, s) })),
      }))
      .filter((c) => !mySections || c.sections.length > 0);
  }
  if (include.has('subjects')) out.subjects = await ctx.db.subject.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } });
  if (include.has('classSubjects')) out.classSubjects = await ctx.db.classSubject.findMany({ select: { classId: true, subjectId: true, fullMarks: true, passMarks: true } });
  if (isStaff && (include.has('teachers') || include.has('employees'))) {
    const rows = await ctx.db.employee.findMany({
      where: { status: 'ACTIVE', ...(include.has('employees') ? {} : { isTeaching: true }) },
      orderBy: { firstName: 'asc' },
      select: { id: true, firstName: true, lastName: true, designation: true, employeeCode: true, isTeaching: true, userId: true },
    });
    out[include.has('employees') ? 'employees' : 'teachers'] = rows.map((e) => ({ ...e, name: displayName(e) }));
  }
  if (isStaff && include.has('feeHeads')) out.feeHeads = await ctx.db.feeHead.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, kind: true } });
  if (include.has('campuses')) out.campuses = await ctx.db.campus.findMany({ where: { isActive: true }, select: { id: true, name: true, code: true, isMain: true } });
  if (include.has('years')) out.years = await ctx.db.academicYear.findMany({ orderBy: { startDate: 'desc' }, select: { id: true, name: true, isCurrent: true } });
  if (include.has('periods')) out.periods = await ctx.db.period.findMany({ orderBy: { sortOrder: 'asc' } });
  if (isStaff && include.has('routes')) {
    out.routes = await ctx.db.transportRoute.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, stops: { orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, monthlyFee: true } } } });
  }
  if (isStaff && include.has('accountHeads') && (ctx.can('accounts') || hasSchoolWideScope(ctx))) {
    out.accountHeads = await ctx.db.accountHead.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, type: true, isSystem: true } });
  }
  // Staff accounts (for assigning tasks and choosing people); names and roles only.
  if (isStaff && include.has('staffUsers')) {
    out.staffUsers = await ctx.db.user.findMany({ where: { isActive: true, role: { notIn: ['PARENT', 'STUDENT', 'PLATFORM_ADMIN'] } }, orderBy: { name: 'asc' }, select: { id: true, name: true, role: true } });
  }
  return out;
});
