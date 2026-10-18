import { prisma, tenantDb } from '../db';
import { DEFAULT_CERTIFICATE_TEMPLATES, DEFAULT_EXPENSE_HEADS, DEFAULT_FEE_HEADS, DEFAULT_INCOME_HEADS, DEFAULT_RULES } from '../defaults';
import { conflict } from '../api';
import { DEFAULT_GRADES } from './exams';
import { academicYearFor } from './fees';
import { createLogin, type IssuedCredential } from './people';

export interface ProvisionInput {
  code: string;
  name: string;
  city?: string | null;
  state?: string | null;
  board?: string | null;
  phone?: string | null;
  email?: string | null;
  planId: string;
  status: 'TRIAL' | 'ACTIVE';
  trialDays: number;
  subscriptionEndsAt?: Date | null;
  owner: { name: string; username: string; email?: string | null; phone?: string | null };
}

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

/**
 * Creates a ready-to-use school: main campus, current session, CBSE grade scale,
 * common fee/account heads, certificate templates, rules and an owner login that
 * must change its temporary password on first sign-in.
 */
export async function provisionSchool(input: ProvisionInput): Promise<{ schoolId: string; code: string; credential: IssuedCredential }> {
  if (await prisma.school.findUnique({ where: { code: input.code }, select: { id: true } })) throw conflict(`School code ${input.code} is already taken.`);
  const startMonth = 4;
  const school = await prisma.school.create({
    data: {
      code: input.code,
      name: input.name,
      city: input.city ?? null,
      state: input.state ?? null,
      board: input.board ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      planId: input.planId,
      status: input.status,
      trialEndsAt: input.status === 'TRIAL' ? new Date(Date.now() + input.trialDays * 86_400_000) : null,
      subscriptionEndsAt: input.status === 'ACTIVE' ? input.subscriptionEndsAt ?? null : null,
      academicYearStartMonth: startMonth,
      settings: { rules: DEFAULT_RULES },
    },
  });
  try {
    const db = tenantDb(school.id);
    const credential = await db.$transaction(
      async (tx) => {
        const schoolId = school.id;
        const campus = await tx.campus.create({ data: { schoolId, name: 'Main Campus', code: 'MAIN', isMain: true, city: input.city ?? null } });
        const ay = academicYearFor(new Date(), startMonth);
        const y = Number(ay.slice(0, 4));
        await tx.academicYear.create({ data: { schoolId, name: ay, startDate: utc(y, startMonth, 1), endDate: utc(y + 1, startMonth, 0), isCurrent: true } });
        await tx.gradeScale.createMany({ data: DEFAULT_GRADES.map((g) => ({ schoolId, grade: g.grade, minPercent: g.minPercent, maxPercent: g.maxPercent, gradePoint: g.gradePoint, remark: g.remark, isPass: g.isPass })) });
        await tx.feeHead.createMany({ data: DEFAULT_FEE_HEADS.map(([name, kind], i) => ({ schoolId, name, kind, sortOrder: i })) });
        await tx.accountHead.createMany({ data: [...DEFAULT_EXPENSE_HEADS.map((name) => ({ schoolId, name, type: 'EXPENSE' as const })), ...DEFAULT_INCOME_HEADS.map((name) => ({ schoolId, name, type: 'INCOME' as const }))] });
        await tx.certificateTemplate.createMany({ data: DEFAULT_CERTIFICATE_TEMPLATES.map(([name, kind, recipientType, body]) => ({ schoolId, name, kind, recipientType, body })) });
        const login = await createLogin(tx, schoolId, { username: input.owner.username, name: input.owner.name, role: 'SUPER_ADMIN', email: input.owner.email ?? null, phone: input.owner.phone ?? null, campusId: campus.id, mustChange: true });
        return login.credential;
      },
      { timeout: 20_000 }
    );
    return { schoolId: school.id, code: school.code, credential };
  } catch (e) {
    // Nothing tenant-side was committed; drop the bare school row so the code can be reused.
    await prisma.school.delete({ where: { id: school.id } }).catch(() => undefined);
    throw e;
  }
}
