import { z } from 'zod';
import { badRequest, body, route } from '@/server/api';
import { publicSettings } from '@/server/settings';
import { classLabel, currentAcademicYear, displayName } from '@/server/common';
import { ROLE_LABELS } from '@/lib/modules';
import { LANG_CODES, type Lang } from '@/lib/i18n';

export const GET = route({ allowPasswordChange: true }, async (ctx) => {
  const [user, school, ay, unread] = await Promise.all([
    ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { id: true, name: true, role: true, username: true, email: true, phone: true, avatarUrl: true, language: true, mustChangePassword: true, lastLoginAt: true },
    }),
    ctx.db.school.findUniqueOrThrow({
      where: { id: ctx.user.schoolId },
      select: { id: true, code: true, name: true, shortName: true, tagline: true, logoUrl: true, themeColor: true, board: true, city: true, state: true, currencySymbol: true, status: true, trialEndsAt: true, plan: { select: { name: true } } },
    }),
    currentAcademicYear(ctx),
    ctx.db.notification.count({ where: { userId: ctx.user.id, isRead: false } }),
  ]);

  let children: Array<{ id: string; name: string; admissionNo: string; classLabel: string; classId: string; sectionId: string; photoUrl: string | null }> = [];
  if (ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT') {
    const rows = await ctx.db.student.findMany({
      where: ctx.user.role === 'PARENT' ? { guardianId: ctx.user.guardianId ?? '__none__', status: 'ACTIVE' } : { id: ctx.user.studentId ?? '__none__' },
      select: { id: true, firstName: true, lastName: true, admissionNo: true, classId: true, sectionId: true, photoUrl: true, class: { select: { name: true } }, section: { select: { name: true } } },
      orderBy: { class: { numericOrder: 'desc' } },
    });
    children = rows.map((s) => ({ id: s.id, name: displayName(s), admissionNo: s.admissionNo, classLabel: classLabel(s.class, s.section), classId: s.classId, sectionId: s.sectionId, photoUrl: s.photoUrl }));
  }

  return {
    user: { ...user, roleLabel: ROLE_LABELS[user.role], studentId: ctx.user.studentId, guardianId: ctx.user.guardianId, employeeId: ctx.user.employeeId },
    school: { ...school, planName: school.plan?.name ?? null, academicYear: ay, readOnlyReason: ctx.school.readOnlyReason },
    permissions: ctx.perms,
    settings: publicSettings(ctx.school.settings),
    isDriver: !!ctx.user.employeeId && (await ctx.db.vehicle.count({ where: { driverEmployeeId: ctx.user.employeeId, isActive: true } })) > 0,
    children,
    unreadNotifications: unread,
    // App Frame entries this role may open (owners/admins see all).
    appCount: ['SUPER_ADMIN', 'ADMIN'].includes(ctx.user.role) ? ctx.school.settings.apps.length : ctx.school.settings.apps.filter((a) => (a.roles as string[]).includes(ctx.user.role)).length,
  };
});

export const PATCH = route({ authenticated: true }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      language: z.enum(LANG_CODES as [Lang, ...Lang[]]).optional(),
      avatarUrl: z.string().max(400_000).nullable().optional(),
    })
  );
  if (input.language && !ctx.school.settings.languages.enabled.includes(input.language)) throw badRequest('This language is not enabled for your school.');
  if (input.avatarUrl && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(input.avatarUrl)) {
    throw badRequest('Avatar must be a PNG, JPEG or WebP image.');
  }
  await ctx.db.user.update({ where: { id: ctx.user.id }, data: input });
  return { updated: true };
});
