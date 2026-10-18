import type { Prisma } from '@prisma/client';
import type { Ctx } from '../api';
import { hasSchoolWideScope, ownClassSectionPairs, teacherSectionIds } from '../scope';

const OFFICE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'] as const;

/**
 * Who a user may start a conversation with:
 *  - office staff: anyone in the school
 *  - teachers: all staff + parents/students of their sections
 *  - parents/students: their children's teachers + the school office (never other families)
 */
export async function contactWhere(ctx: Ctx): Promise<Prisma.UserWhereInput> {
  const base: Prisma.UserWhereInput = { isActive: true, id: { not: ctx.user.id } };
  if (hasSchoolWideScope(ctx)) return base;
  if (ctx.user.role === 'TEACHER') {
    const secs = await teacherSectionIds(ctx);
    return {
      ...base,
      OR: [
        { role: { notIn: ['PARENT', 'STUDENT'] } },
        { student: { sectionId: { in: secs }, status: 'ACTIVE' } },
        { guardian: { students: { some: { sectionId: { in: secs }, status: 'ACTIVE' } } } },
      ],
    };
  }
  const pairs = await ownClassSectionPairs(ctx);
  const sectionIds = pairs.map((p) => p.sectionId);
  const [classTeachers, subjectTeachers] = await Promise.all([
    ctx.db.section.findMany({ where: { id: { in: sectionIds } }, select: { classTeacher: { select: { userId: true } } } }),
    ctx.db.teacherAssignment.findMany({ where: { sectionId: { in: sectionIds } }, select: { employee: { select: { userId: true } } } }),
  ]);
  const teacherUserIds = [...classTeachers.map((s) => s.classTeacher?.userId), ...subjectTeachers.map((t) => t.employee.userId)].filter((x): x is string => !!x);
  return { ...base, OR: [{ id: { in: teacherUserIds } }, { role: { in: [...OFFICE_ROLES] } }] };
}

export async function canContact(ctx: Ctx, userId: string): Promise<boolean> {
  return (await ctx.db.user.count({ where: { AND: [await contactWhere(ctx), { id: userId }] } })) > 0;
}
