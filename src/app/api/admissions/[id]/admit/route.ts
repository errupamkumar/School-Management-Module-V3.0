import { z } from 'zod';
import { badRequest, body, conflict, forbidden, route } from '@/server/api';
import { admitStudent } from '@/server/services/people';

/** Convert an application into an enrolled student (with family and logins). */
export const POST = route({ module: 'admissions', action: 'edit' }, async (ctx, req, { id }) => {
  if (!ctx.can('students', 'create')) throw forbidden('You also need permission to create students.');
  const input = await body(req, z.object({ sectionId: z.string().min(1), admissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), createLogins: z.boolean().default(true), consent: z.literal(true, { error: 'Guardian consent to data processing is required (DPDP Act)' }) }));
  const app = await ctx.db.admissionApplication.findUniqueOrThrow({ where: { id } });
  if (app.stage === 'ADMITTED') throw conflict('Already admitted.');
  if (app.stage === 'REJECTED' || app.stage === 'WITHDRAWN') throw badRequest('Re-open the application before admitting.');
  const section = await ctx.db.section.findUnique({ where: { id: input.sectionId }, include: { class: true } });
  if (!section || section.classId !== app.classId) throw badRequest('Choose a section of the class applied for.');
  if (!app.gender) throw badRequest('Record the applicant’s gender first.');
  const [firstName, ...rest] = app.studentName.trim().split(/\s+/);
  const res = await admitStudent(ctx.db, ctx.user.schoolId, ctx.school.settings, {
    student: { campusId: section.class.campusId, classId: app.classId, sectionId: input.sectionId, firstName, lastName: rest.join(' ') || null, gender: app.gender, dob: app.dob ? app.dob.toISOString().slice(0, 10) : null, admissionDate: input.admissionDate ?? null, previousSchool: app.previousSchool, address: app.address },
    guardian: { guardianName: app.guardianName, fatherName: app.guardianName, primaryPhone: app.guardianPhone, fatherPhone: app.guardianPhone, fatherEmail: app.guardianEmail, address: app.address },
    createLogins: input.createLogins,
  });
  await ctx.db.admissionApplication.update({ where: { id }, data: { stage: 'ADMITTED', studentId: res.studentId } });
  await ctx.db.consent.create({ data: { schoolId: ctx.user.schoolId, studentId: res.studentId, guardianId: res.guardianId, purpose: 'DATA_PROCESSING', status: 'GRANTED', recordedBy: ctx.user.id, ip: ctx.ip, decidedAt: new Date() } });
  await ctx.audit('CREATE', 'Student', res.studentId, `Admitted from application ${app.applicationNo} (${res.admissionNo})`);
  return res;
});
