import { z } from 'zod';
import { body, route } from '@/server/api';
import { admitStudent, type IssuedCredential } from '@/server/services/people';
import { guardianInputSchema, studentInputSchema } from '@/server/resources/students';

const row = z.object({
  className: z.string().trim().min(1, 'class is required'),
  sectionName: z.string().trim().min(1, 'section is required'),
  firstName: z.string(),
  lastName: z.string().optional(),
  gender: z.string(),
  dob: z.string().optional(),
  admissionNo: z.string().optional(),
  rollNo: z.string().optional(),
  admissionDate: z.string().optional(),
  category: z.string().optional(),
  religion: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  primaryPhone: z.string(),
  fatherOccupation: z.string().optional(),
  email: z.string().optional(),
});

const GENDER: Record<string, 'MALE' | 'FEMALE' | 'OTHER'> = { m: 'MALE', male: 'MALE', boy: 'MALE', f: 'FEMALE', female: 'FEMALE', girl: 'FEMALE', o: 'OTHER', other: 'OTHER' };

/** Bulk admission from a parsed CSV. Each row is validated and admitted independently. */
export const POST = route({ module: 'students', action: 'create' }, async (ctx, req) => {
  const input = await body(req, z.object({ rows: z.array(z.record(z.string(), z.string())).min(1).max(500), createLogins: z.boolean().default(true), consent: z.literal(true, { error: 'Confirm that guardian consent has been collected' }) }));
  const classes = await ctx.db.class.findMany({ include: { sections: true } });
  const norm = (s: string) => s.trim().toLowerCase().replace(/^class\s*/, '');

  const created: Array<{ row: number; admissionNo: string; name: string }> = [];
  const failed: Array<{ row: number; error: string }> = [];
  const credentials: IssuedCredential[] = [];

  for (const [i, raw] of input.rows.entries()) {
    const n = i + 2; // spreadsheet row number (header is row 1)
    try {
      const r = row.parse(raw);
      const cls = classes.find((c) => norm(c.name) === norm(r.className));
      if (!cls) throw new Error(`class "${r.className}" not found`);
      const sec = cls.sections.find((s) => s.name.toLowerCase() === r.sectionName.trim().toLowerCase());
      if (!sec) throw new Error(`section "${r.sectionName}" not found in ${cls.name}`);
      const gender = GENDER[r.gender.trim().toLowerCase()];
      if (!gender) throw new Error('gender must be Male/Female/Other');
      const toIso = (v?: string) => {
        if (!v?.trim()) return null;
        const t = v.trim();
        const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(t);
        return dmy ? `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}` : t;
      };
      const student = studentInputSchema.parse({
        classId: cls.id,
        sectionId: sec.id,
        firstName: r.firstName,
        lastName: r.lastName || null,
        gender,
        dob: toIso(r.dob),
        admissionDate: toIso(r.admissionDate),
        admissionNo: r.admissionNo || null,
        rollNo: r.rollNo || null,
        category: r.category ? r.category.toUpperCase() : null,
        religion: r.religion || null,
        bloodGroup: r.bloodGroup || null,
        address: r.address || null,
      });
      const guardian = guardianInputSchema.parse({ fatherName: r.fatherName || null, motherName: r.motherName || null, primaryPhone: r.primaryPhone, fatherPhone: r.primaryPhone, fatherOccupation: r.fatherOccupation || null, fatherEmail: r.email || null, address: r.address || null });
      const res = await admitStudent(ctx.db, ctx.user.schoolId, ctx.school.settings, { student: { ...student, campusId: cls.campusId }, guardian, createLogins: input.createLogins });
      await ctx.db.consent.create({ data: { schoolId: ctx.user.schoolId, studentId: res.studentId, guardianId: res.guardianId, purpose: 'DATA_PROCESSING', status: 'GRANTED', recordedBy: ctx.user.id, ip: ctx.ip, decidedAt: new Date() } });
      credentials.push(...res.credentials);
      created.push({ row: n, admissionNo: res.admissionNo, name: `${student.firstName} ${student.lastName ?? ''}`.trim() });
    } catch (e) {
      const msg = e instanceof z.ZodError ? e.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ') : (e as Error).message;
      failed.push({ row: n, error: msg });
    }
  }
  await ctx.audit('CREATE', 'Student', null, `Bulk import: ${created.length} admitted, ${failed.length} failed`);
  return { created, failed, credentials };
});
