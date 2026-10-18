import { z } from 'zod';
import { badRequest, query, route } from '@/server/api';
import { classLabel, currentAcademicYear, displayName } from '@/server/common';

/** Data for printing ID cards: ?type=STUDENT&sectionId=… | ?type=STUDENT&ids=a,b | ?type=EMPLOYEE */
export const GET = route({ module: 'certificates' }, async (ctx, req) => {
  const q = query(req, z.object({ type: z.enum(['STUDENT', 'EMPLOYEE']), sectionId: z.string().optional(), ids: z.string().max(5000).optional() }));
  const ids = q.ids?.split(',').filter(Boolean).slice(0, 300);
  const school = await ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { name: true, logoUrl: true, address: true, city: true, phone: true, themeColor: true } });
  const ay = await currentAcademicYear(ctx);
  if (q.type === 'STUDENT') {
    if (!q.sectionId && !ids?.length) throw badRequest('Choose a section or students.');
    const rows = await ctx.db.student.findMany({
      where: { status: 'ACTIVE', ...(q.sectionId ? { sectionId: q.sectionId } : {}), ...(ids?.length ? { id: { in: ids } } : {}) },
      orderBy: [{ rollNo: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, admissionNo: true, rollNo: true, dob: true, bloodGroup: true, photoUrl: true, address: true, class: { select: { name: true } }, section: { select: { name: true } }, guardian: { select: { fatherName: true, primaryPhone: true } }, transport: { select: { route: { select: { name: true } } } } },
    });
    return { school, academicYear: ay, type: q.type, cards: rows.map((s) => ({ id: s.id, name: displayName(s), code: s.admissionNo, line1: classLabel(s.class, s.section) + (s.rollNo ? ` · Roll ${s.rollNo}` : ''), dob: s.dob, bloodGroup: s.bloodGroup, photoUrl: s.photoUrl, guardian: s.guardian?.fatherName ?? null, phone: s.guardian?.primaryPhone ?? null, address: s.address, transport: s.transport?.route.name ?? null })) };
  }
  const rows = await ctx.db.employee.findMany({ where: { status: 'ACTIVE', ...(ids?.length ? { id: { in: ids } } : {}) }, orderBy: { firstName: 'asc' }, select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true, department: true, bloodGroup: true, photoUrl: true, phone: true, dob: true, address: true } });
  return { school, academicYear: ay, type: q.type, cards: rows.map((e) => ({ id: e.id, name: displayName(e), code: e.employeeCode, line1: [e.designation, e.department].filter(Boolean).join(' · '), dob: e.dob, bloodGroup: e.bloodGroup, photoUrl: e.photoUrl, guardian: null, phone: e.phone, address: e.address, transport: null })) };
});
