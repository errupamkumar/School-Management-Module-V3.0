import { z } from 'zod';
import { body, notFound, route } from '@/server/api';
import { classLabel, displayName, todayUTC } from '@/server/common';
import { assertSectionAccess } from '@/server/scope';

/** ID-card scan (QR / barcode carries the admission number): marks the student present today. */
export const POST = route({ module: 'attendance', action: 'create' }, async (ctx, req) => {
  const input = await body(req, z.object({ code: z.string().trim().min(1).max(60), status: z.enum(['PRESENT', 'LATE']).default('PRESENT') }));
  const code = input.code.replace(/^.*[?&]adm=/, '');
  const s = await ctx.db.student.findFirst({
    where: { admissionNo: code, status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true, sectionId: true, photoUrl: true, class: { select: { name: true } }, section: { select: { name: true } } },
  });
  if (!s) throw notFound(`Student with ID ${code}`);
  await assertSectionAccess(ctx, s.sectionId);
  const date = todayUTC();
  const prev = await ctx.db.studentAttendance.findUnique({ where: { studentId_date: { studentId: s.id, date } } });
  await ctx.db.studentAttendance.upsert({
    where: { studentId_date: { studentId: s.id, date } },
    update: { status: input.status, source: 'CARD', markedById: ctx.user.id },
    create: { schoolId: ctx.user.schoolId, studentId: s.id, sectionId: s.sectionId, date, status: input.status, source: 'CARD', markedById: ctx.user.id },
  });
  return { studentId: s.id, name: displayName(s), classLabel: classLabel(s.class, s.section), photoUrl: s.photoUrl, status: input.status, alreadyMarked: !!prev };
});
