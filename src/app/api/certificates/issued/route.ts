import crypto from 'node:crypto';
import { z } from 'zod';
import { badRequest, body, query, route, type Ctx } from '@/server/api';
import { classLabel, currentAcademicYear, displayName } from '@/server/common';
import { formatNumber, nextSequence } from '@/server/db';
import { renderTemplate } from '@/server/services/html';

const fmt = (d: Date | null | undefined) => (d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');

/** Values available to templates as {{placeholders}}. */
async function values(ctx: Ctx, recipientType: 'STUDENT' | 'EMPLOYEE', recipientId: string, customText: string | null) {
  const school = await ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { name: true, city: true, board: true, affiliationNo: true } });
  const base: Record<string, unknown> = {
    'school.name': school.name,
    'school.city': school.city,
    'school.board': school.board,
    'school.affiliationNo': school.affiliationNo,
    academicYear: await currentAcademicYear(ctx),
    today: fmt(new Date()),
    customText: customText ?? '',
  };
  if (recipientType === 'STUDENT') {
    const s = await ctx.db.student.findUniqueOrThrow({
      where: { id: recipientId },
      include: { class: { select: { name: true } }, section: { select: { name: true } }, guardian: { select: { fatherName: true, motherName: true } } },
    });
    return {
      name: displayName(s),
      values: {
        ...base,
        'student.name': displayName(s),
        'student.admissionNo': s.admissionNo,
        // Bare "5-A": templates write "Class {{student.class}}".
        'student.class': s.section ? `${s.class.name}-${s.section.name}` : s.class.name,
        'student.classLabel': classLabel(s.class, s.section),
        'student.dob': fmt(s.dob),
        'student.fatherName': s.guardian?.fatherName ?? '',
        'student.motherName': s.guardian?.motherName ?? '',
        'student.admissionDate': fmt(s.admissionDate),
        'student.leftOn': fmt(s.leftOn),
        'student.leavingReason': s.leavingReason ?? '',
        'student.category': s.category ?? '',
        'student.penNo': s.penNo ?? '',
      },
    };
  }
  const e = await ctx.db.employee.findUniqueOrThrow({ where: { id: recipientId } });
  return {
    name: displayName(e),
    values: { ...base, 'employee.name': displayName(e), 'employee.code': e.employeeCode, 'employee.designation': e.designation, 'employee.department': e.department ?? '', 'employee.joiningDate': fmt(e.joiningDate), 'employee.leftOn': fmt(e.leftOn) },
  };
}

export const GET = route({ module: 'certificates' }, async (ctx, req) => {
  const q = query(req, z.object({ recipientId: z.string().optional(), search: z.string().max(80).optional() }));
  return ctx.db.issuedCertificate.findMany({
    where: { ...(q.recipientId ? { recipientId: q.recipientId } : {}), ...(q.search ? { OR: [{ recipientName: { contains: q.search } }, { serialNo: { contains: q.search } }] } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 300,
    select: { id: true, serialNo: true, recipientType: true, recipientId: true, recipientName: true, issuedOn: true, revokedAt: true, verifyCode: true, template: { select: { name: true, kind: true } } },
  });
});

/** Issue a certificate: the rendered content is frozen at issue time and gets a public verification code. */
export const POST = route({ module: 'certificates', action: 'create' }, async (ctx, req) => {
  const input = await body(req, z.object({ templateId: z.string().min(1), recipientId: z.string().min(1), customText: z.string().trim().max(500).optional().nullable(), issuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }));
  const tpl = await ctx.db.certificateTemplate.findUnique({ where: { id: input.templateId } });
  if (!tpl) throw badRequest('Unknown template.');
  const recipientType = tpl.recipientType as 'STUDENT' | 'EMPLOYEE';
  const v = await values(ctx, recipientType, input.recipientId, input.customText ?? null);
  const content = renderTemplate(tpl.body, v.values);
  const cert = await ctx.db.$transaction(async (tx) => {
    const n = await nextSequence(tx, ctx.user.schoolId, `certificate:${tpl.kind}`);
    return tx.issuedCertificate.create({
      data: {
        schoolId: ctx.user.schoolId,
        serialNo: formatNumber(`${ctx.school.settings.numbering.certificatePrefix}/${tpl.kind.slice(0, 3)}/`, n, 4),
        templateId: tpl.id,
        recipientType,
        recipientId: input.recipientId,
        recipientName: v.name,
        content,
        verifyCode: crypto.randomBytes(9).toString('base64url'),
        issuedOn: input.issuedOn ? new Date(input.issuedOn) : new Date(),
        issuedById: ctx.user.id,
      },
    });
  });
  await ctx.audit('CREATE', 'IssuedCertificate', cert.id, `${tpl.name} ${cert.serialNo} for ${v.name}`);
  return cert;
});
