import { z } from 'zod';
import { badRequest, notFound, publicRoute } from '@/server/api';
import { formatNumber, nextSequence, prisma, tenantDb } from '@/server/db';
import { writeAudit } from '@/server/audit';
import { enabledModules } from '@/server/permissions';
import { readSettings } from '@/server/settings';
import { academicYearFor } from '@/server/services/fees';
import { notifyRoles } from '@/server/services/notify';
import { optionalText, phoneIN } from '@/lib/validators';

const schema = z.object({
  studentName: z.string().trim().min(2, 'Enter the child’s name').max(100),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter date of birth'),
  classId: z.string().min(1, 'Choose a class'),
  guardianName: z.string().trim().min(2, 'Enter parent’s name').max(100),
  guardianPhone: phoneIN,
  guardianEmail: z.email('Enter a valid email').optional().nullable().or(z.literal('').transform(() => null)),
  address: optionalText(300),
  previousSchool: optionalText(120),
  message: optionalText(1000),
  consent: z.literal(true, { error: 'Please accept the privacy consent' }),
  website: z.string().max(0).optional(), // honeypot: real users never fill this hidden field
});

/** Online admission form submission (public). Rate limited per IP. */
export const POST = publicRoute({ name: 'apply', limit: 10, windowSec: 3600 }, async (req, { code }, ip) => {
  const school = await prisma.school.findUnique({ where: { code: code.toUpperCase() }, select: { id: true, status: true, settings: true, academicYearStartMonth: true } });
  if (!school || school.status === 'SUSPENDED' || school.status === 'CANCELLED') throw notFound('School');
  if (!(await enabledModules(school.id)).has('admissions')) throw notFound('Online admissions');
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest('Invalid form data.');
  }
  const input = schema.parse(raw);
  const db = tenantDb(school.id);
  const cls = await db.class.findUnique({ where: { id: input.classId } });
  if (!cls) throw badRequest('Choose a valid class.');
  // One open application per phone + child name, to stop accidental double submits.
  const dupe = await db.admissionApplication.findFirst({ where: { guardianPhone: input.guardianPhone, studentName: input.studentName, stage: { notIn: ['REJECTED', 'WITHDRAWN'] } } });
  if (dupe) return { applicationNo: dupe.applicationNo, duplicate: true };
  const settings = readSettings(school.settings);
  const app = await db.$transaction(async (tx) => {
    const n = await nextSequence(tx, school.id, 'application');
    return tx.admissionApplication.create({
      data: {
        schoolId: school.id,
        applicationNo: formatNumber(settings.numbering.applicationPrefix, n, 5),
        stage: 'APPLIED',
        source: 'ONLINE',
        classId: input.classId,
        academicYear: academicYearFor(new Date(), school.academicYearStartMonth),
        studentName: input.studentName,
        gender: input.gender,
        dob: new Date(input.dob),
        guardianName: input.guardianName,
        guardianPhone: input.guardianPhone,
        guardianEmail: input.guardianEmail ?? null,
        address: input.address,
        previousSchool: input.previousSchool,
        notes: input.message,
        consentGiven: true,
      },
    });
  });
  await notifyRoles(db, school.id, ['ADMIN', 'RECEPTIONIST'], { title: 'New online admission application', body: `${input.studentName} for ${cls.name} — ${app.applicationNo}`, link: '/admissions' });
  await writeAudit({ schoolId: school.id, action: 'CREATE', entity: 'AdmissionApplication', entityId: app.id, summary: `Online application ${app.applicationNo}`, ip });
  return { applicationNo: app.applicationNo, duplicate: false };
});
