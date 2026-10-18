import type { Prisma } from '@prisma/client';
import { forbidden, type Ctx } from './api';

/**
 * Row-level data scope by role. Module permissions decide *whether* a user can
 * use a feature; these helpers decide *which records* they see within it.
 */

const FULL_ACCESS_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN', 'TRANSPORT_MANAGER', 'STORE_MANAGER', 'STAFF']);

export function hasSchoolWideScope(ctx: Ctx): boolean {
  return FULL_ACCESS_ROLES.has(ctx.user.role);
}

const sectionCache = new WeakMap<Ctx, Promise<string[]>>();

/** Sections a teacher is class teacher of or teaches a subject in. */
export function teacherSectionIds(ctx: Ctx): Promise<string[]> {
  let p = sectionCache.get(ctx);
  if (!p) {
    p = (async () => {
      const employeeId = ctx.user.employeeId;
      if (!employeeId) return [];
      const [own, taught] = await Promise.all([
        ctx.db.section.findMany({ where: { classTeacherId: employeeId }, select: { id: true } }),
        ctx.db.teacherAssignment.findMany({ where: { employeeId }, select: { sectionId: true } }),
      ]);
      return [...new Set([...own.map((s) => s.id), ...taught.map((t) => t.sectionId)])];
    })();
    sectionCache.set(ctx, p);
  }
  return p;
}

/** Sections where the teacher is the class teacher (attendance ownership). */
export async function classTeacherSectionIds(ctx: Ctx): Promise<string[]> {
  if (!ctx.user.employeeId) return [];
  const rows = await ctx.db.section.findMany({ where: { classTeacherId: ctx.user.employeeId }, select: { id: true } });
  return rows.map((r) => r.id);
}

export async function guardianStudentIds(ctx: Ctx): Promise<string[]> {
  if (!ctx.user.guardianId) return [];
  const rows = await ctx.db.student.findMany({ where: { guardianId: ctx.user.guardianId }, select: { id: true } });
  return rows.map((r) => r.id);
}

/** Prisma `where` restricting Student queries to what this user may see. */
export async function studentWhere(ctx: Ctx): Promise<Prisma.StudentWhereInput> {
  if (hasSchoolWideScope(ctx)) return {};
  switch (ctx.user.role) {
    case 'STUDENT':
      return { id: ctx.user.studentId ?? '__none__' };
    case 'PARENT':
      return { guardianId: ctx.user.guardianId ?? '__none__' };
    case 'TEACHER':
      return { sectionId: { in: await teacherSectionIds(ctx) } };
    default:
      return { id: '__none__' };
  }
}

/** Student ids visible to the user, or null meaning "all students in the school". */
export async function visibleStudentIds(ctx: Ctx): Promise<string[] | null> {
  if (hasSchoolWideScope(ctx)) return null;
  if (ctx.user.role === 'STUDENT') return ctx.user.studentId ? [ctx.user.studentId] : [];
  if (ctx.user.role === 'PARENT') return guardianStudentIds(ctx);
  if (ctx.user.role === 'TEACHER') {
    const sections = await teacherSectionIds(ctx);
    const rows = await ctx.db.student.findMany({ where: { sectionId: { in: sections } }, select: { id: true } });
    return rows.map((r) => r.id);
  }
  return [];
}

export async function assertStudentAccess(ctx: Ctx, studentId: string): Promise<void> {
  const where = await studentWhere(ctx);
  const n = await ctx.db.student.count({ where: { AND: [where, { id: studentId }] } });
  if (n === 0) throw forbidden('You do not have access to this student.');
}

export async function assertSectionAccess(ctx: Ctx, sectionId: string): Promise<void> {
  if (hasSchoolWideScope(ctx)) {
    const n = await ctx.db.section.count({ where: { id: sectionId } });
    if (n === 0) throw forbidden('Section not found.');
    return;
  }
  if (ctx.user.role === 'TEACHER' && (await teacherSectionIds(ctx)).includes(sectionId)) return;
  throw forbidden('You do not have access to this class section.');
}

/** Class ids for students/parents (to filter homework, timetable, notices…). */
export async function ownClassSectionPairs(ctx: Ctx): Promise<Array<{ classId: string; sectionId: string; studentId: string }>> {
  if (ctx.user.role === 'STUDENT' && ctx.user.studentId) {
    const s = await ctx.db.student.findUnique({ where: { id: ctx.user.studentId }, select: { id: true, classId: true, sectionId: true } });
    return s ? [{ classId: s.classId, sectionId: s.sectionId, studentId: s.id }] : [];
  }
  if (ctx.user.role === 'PARENT' && ctx.user.guardianId) {
    const rows = await ctx.db.student.findMany({ where: { guardianId: ctx.user.guardianId, status: 'ACTIVE' }, select: { id: true, classId: true, sectionId: true } });
    return rows.map((s) => ({ classId: s.classId, sectionId: s.sectionId, studentId: s.id }));
  }
  return [];
}
