import type { Gender, Role } from '@prisma/client';
import { formatNumber, nextSequence, type TenantDb, type TenantTx } from '../db';
import { encryptField, generateTempPassword, hashPassword } from '../crypto';
import { badRequest, conflict, forbidden, notFound } from '../api';
import type { SchoolSettings } from '../settings';
import { fromPaise } from './money';

type Db = TenantDb | TenantTx;

export interface IssuedCredential {
  name: string;
  role: Role;
  username: string;
  password: string;
}

export async function createLogin(
  tx: Db,
  schoolId: string,
  input: {
    username: string;
    name: string;
    role: Role;
    email?: string | null;
    phone?: string | null;
    campusId?: string | null;
    password?: string;
    /** Pre-hashed password (seeding); skips hashing and reports the password as preset. */
    passwordHash?: string;
    mustChange?: boolean;
  }
): Promise<{ userId: string; credential: IssuedCredential }> {
  const username = input.username.trim().toLowerCase();
  const clash = await tx.user.count({ where: { username } });
  if (clash) throw conflict(`Username "${username}" is already taken in this school.`);
  const password = input.password ?? generateTempPassword();
  const passwordHash = input.passwordHash ?? (await hashPassword(password, input.password ? 'chosen' : 'temporary'));
  const user = await tx.user.create({
    data: {
      schoolId,
      username,
      name: input.name,
      role: input.role,
      email: input.email?.toLowerCase() || null,
      phone: input.phone || null,
      campusId: input.campusId ?? null,
      passwordHash,
      mustChangePassword: input.mustChange ?? true,
      passwordChangedAt: new Date(),
    },
  });
  return { userId: user.id, credential: { name: input.name, role: input.role, username, password: input.passwordHash ? '(preset)' : password } };
}

export async function resetLogin(db: Db, userId: string): Promise<IssuedCredential> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('User');
  if (user.role === 'SUPER_ADMIN') throw badRequest('Owner passwords can only be changed by the owner.');
  const password = generateTempPassword();
  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(password, 'temporary'),
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
      sessionVersion: { increment: 1 }, // sign out every existing session
      passwordChangedAt: new Date(),
    },
  });
  return { name: user.name, role: user.role, username: user.username, password };
}

// ----------------------------------------------------------------------------
// Students
// ----------------------------------------------------------------------------

export interface GuardianInput {
  fatherName?: string | null;
  fatherPhone?: string | null;
  fatherEmail?: string | null;
  fatherOccupation?: string | null;
  fatherEducation?: string | null;
  motherName?: string | null;
  motherPhone?: string | null;
  motherOccupation?: string | null;
  motherEducation?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  guardianRelation?: string | null;
  primaryPhone: string;
  address?: string | null;
  annualIncome?: number | null;
}

export interface StudentInput {
  campusId: string;
  classId: string;
  sectionId: string;
  firstName: string;
  lastName?: string | null;
  gender: Gender;
  dob?: string | null;
  admissionDate?: string | null;
  admissionNo?: string | null;
  rollNo?: string | null;
  bloodGroup?: string | null;
  religion?: string | null;
  caste?: string | null;
  category?: string | null;
  motherTongue?: string | null;
  aadhaar?: string | null;
  apaarId?: string | null;
  apaarConsent?: 'PENDING' | 'GRANTED' | 'DECLINED';
  penNo?: string | null;
  identificationMark?: string | null;
  medicalNotes?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  previousSchool?: string | null;
  previousBoardRollNo?: string | null;
  isRte?: boolean;
  feeDiscountPercent?: number;
  notes?: string | null;
  photoUrl?: string | null;
}

export function aadhaarFields(aadhaar: string | null | undefined) {
  if (!aadhaar) return {};
  return { aadhaarEnc: encryptField(aadhaar), aadhaarLast4: aadhaar.slice(-4) };
}

/**
 * Admits a student. Siblings are detected by the guardian's primary phone: if
 * a family with that number exists, the child joins it (one parent login sees
 * all children; family-wise fee collection works automatically).
 */
/** Subscription plans cap active students; checked wherever a student becomes active. */
export async function assertStudentCapacity(db: TenantDb | TenantTx, schoolId: string, adding = 1): Promise<void> {
  const s = await db.school.findUnique({ where: { id: schoolId }, select: { plan: { select: { name: true, maxStudents: true } } } });
  const max = s?.plan?.maxStudents;
  if (max == null) return;
  const active = await db.student.count({ where: { status: 'ACTIVE' } });
  if (active + adding > max) throw forbidden(`Your ${s!.plan!.name} plan allows up to ${max.toLocaleString('en-IN')} active students (currently ${active.toLocaleString('en-IN')}). Upgrade the plan to admit more.`);
}

export async function admitStudent(
  db: TenantDb,
  schoolId: string,
  settings: SchoolSettings,
  input: { student: StudentInput; guardian: GuardianInput; createLogins?: boolean; passwordHash?: string; mustChange?: boolean }
): Promise<{ studentId: string; admissionNo: string; guardianId: string; siblingOf: number; credentials: IssuedCredential[] }> {
  const { student: s, guardian: g } = input;
  await assertStudentCapacity(db, schoolId);

  const section = await db.section.findUnique({ where: { id: s.sectionId }, include: { class: true, _count: { select: { students: { where: { status: 'ACTIVE' } } } } } });
  if (!section || section.classId !== s.classId) throw badRequest('Selected section does not belong to the selected class.');
  if (section.class.campusId !== s.campusId) throw badRequest('Selected class does not belong to the selected campus.');
  if (section._count.students >= section.capacity) {
    throw conflict(`Section ${section.class.name}-${section.name} is full (${section.capacity} seats).`);
  }

  return db.$transaction(
    async (tx) => {
      const credentials: IssuedCredential[] = [];

      let guardian = await tx.guardian.findFirst({ where: { primaryPhone: g.primaryPhone } });
      const siblingOf = guardian ? await tx.student.count({ where: { guardianId: guardian.id } }) : 0;
      if (!guardian) {
        const familyNo = await nextSequence(tx, schoolId, 'family');
        guardian = await tx.guardian.create({
          data: {
            schoolId,
            familyCode: formatNumber('FAM', familyNo, 5),
            fatherName: g.fatherName ?? null,
            fatherPhone: g.fatherPhone ?? null,
            fatherEmail: g.fatherEmail?.toLowerCase() ?? null,
            fatherOccupation: g.fatherOccupation ?? null,
            fatherEducation: g.fatherEducation ?? null,
            motherName: g.motherName ?? null,
            motherPhone: g.motherPhone ?? null,
            motherOccupation: g.motherOccupation ?? null,
            motherEducation: g.motherEducation ?? null,
            guardianName: g.guardianName ?? null,
            guardianPhone: g.guardianPhone ?? null,
            guardianRelation: g.guardianRelation ?? null,
            primaryPhone: g.primaryPhone,
            address: g.address ?? null,
            annualIncome: g.annualIncome != null ? fromPaise(Math.round(g.annualIncome * 100)) : null,
          },
        });
        if (input.createLogins !== false) {
          const parentName = g.fatherName || g.motherName || g.guardianName || 'Parent';
          const { userId, credential } = await createLogin(tx, schoolId, {
            username: g.primaryPhone,
            name: parentName,
            role: 'PARENT',
            phone: g.primaryPhone,
            email: g.fatherEmail ?? null,
            campusId: s.campusId,
            passwordHash: input.passwordHash,
            mustChange: input.mustChange,
          });
          await tx.guardian.update({ where: { id: guardian.id }, data: { userId } });
          credentials.push(credential);
        }
      }

      let admissionNo = s.admissionNo?.trim();
      if (!admissionNo) {
        const n = await nextSequence(tx, schoolId, 'admission');
        admissionNo = formatNumber(settings.numbering.admissionPrefix, n, 5);
      } else if (await tx.student.count({ where: { admissionNo } })) {
        throw conflict(`Admission number ${admissionNo} is already in use.`);
      }

      const student = await tx.student.create({
        data: {
          schoolId,
          campusId: s.campusId,
          classId: s.classId,
          sectionId: s.sectionId,
          guardianId: guardian.id,
          admissionNo,
          rollNo: s.rollNo ?? null,
          firstName: s.firstName,
          lastName: s.lastName ?? null,
          gender: s.gender,
          dob: s.dob ? new Date(s.dob) : null,
          admissionDate: s.admissionDate ? new Date(s.admissionDate) : new Date(),
          bloodGroup: s.bloodGroup ?? null,
          religion: s.religion ?? null,
          caste: s.caste ?? null,
          category: s.category ?? null,
          motherTongue: s.motherTongue ?? null,
          ...aadhaarFields(s.aadhaar),
          apaarId: s.apaarId ?? null,
          apaarConsent: s.apaarConsent ?? 'PENDING',
          penNo: s.penNo ?? null,
          identificationMark: s.identificationMark ?? null,
          medicalNotes: s.medicalNotes ?? null,
          address: s.address ?? g.address ?? null,
          city: s.city ?? null,
          state: s.state ?? null,
          pincode: s.pincode ?? null,
          previousSchool: s.previousSchool ?? null,
          previousBoardRollNo: s.previousBoardRollNo ?? null,
          isRte: s.isRte ?? false,
          feeDiscountPercent: s.feeDiscountPercent ?? 0,
          notes: s.notes ?? null,
          photoUrl: s.photoUrl ?? null,
        },
      });

      if (input.createLogins !== false) {
        const { userId, credential } = await createLogin(tx, schoolId, {
          username: admissionNo,
          name: `${s.firstName} ${s.lastName ?? ''}`.trim(),
          role: 'STUDENT',
          campusId: s.campusId,
          passwordHash: input.passwordHash,
          mustChange: input.mustChange,
        });
        await tx.student.update({ where: { id: student.id }, data: { userId } });
        credentials.push(credential);
      }

      return { studentId: student.id, admissionNo, guardianId: guardian.id, siblingOf, credentials };
    },
    { timeout: 30_000 }
  );
}

// ----------------------------------------------------------------------------
// Employees
// ----------------------------------------------------------------------------

export interface EmployeeInput {
  campusId: string;
  firstName: string;
  lastName?: string | null;
  gender: Gender;
  dob?: string | null;
  phone?: string | null;
  email?: string | null;
  designation: string;
  department?: string | null;
  isTeaching?: boolean;
  qualification?: string | null;
  experienceYears?: number | null;
  joiningDate: string;
  fatherSpouseName?: string | null;
  aadhaar?: string | null;
  panNo?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  ifsc?: string | null;
  uan?: string | null;
  address?: string | null;
  bloodGroup?: string | null;
  religion?: string | null;
  basicSalary?: number;
  allowances?: number;
  deductions?: number;
  photoUrl?: string | null;
}

export async function hireEmployee(
  db: TenantDb,
  schoolId: string,
  settings: SchoolSettings,
  input: { employee: EmployeeInput; loginRole?: Role | null; username?: string | null; passwordHash?: string; mustChange?: boolean }
): Promise<{ employeeId: string; employeeCode: string; credentials: IssuedCredential[] }> {
  const e = input.employee;
  if (input.loginRole === 'PARENT' || input.loginRole === 'STUDENT' || input.loginRole === 'PLATFORM_ADMIN') {
    throw badRequest('Employees can only be given staff roles.');
  }
  return db.$transaction(async (tx) => {
    const n = await nextSequence(tx, schoolId, 'employee');
    const employeeCode = formatNumber(settings.numbering.employeePrefix, n, 4);
    const credentials: IssuedCredential[] = [];
    let userId: string | null = null;
    if (input.loginRole) {
      const login = await createLogin(tx, schoolId, {
        username: input.username || employeeCode,
        name: `${e.firstName} ${e.lastName ?? ''}`.trim(),
        role: input.loginRole,
        email: e.email ?? null,
        phone: e.phone ?? null,
        campusId: e.campusId,
        passwordHash: input.passwordHash,
        mustChange: input.mustChange,
      });
      userId = login.userId;
      credentials.push(login.credential);
    }
    const employee = await tx.employee.create({
      data: {
        schoolId,
        campusId: e.campusId,
        userId,
        employeeCode,
        firstName: e.firstName,
        lastName: e.lastName ?? null,
        gender: e.gender,
        dob: e.dob ? new Date(e.dob) : null,
        phone: e.phone ?? null,
        email: e.email?.toLowerCase() ?? null,
        designation: e.designation,
        department: e.department ?? null,
        isTeaching: e.isTeaching ?? input.loginRole === 'TEACHER',
        qualification: e.qualification ?? null,
        experienceYears: e.experienceYears ?? null,
        joiningDate: new Date(e.joiningDate),
        fatherSpouseName: e.fatherSpouseName ?? null,
        ...aadhaarFields(e.aadhaar),
        panNo: e.panNo ?? null,
        bankName: e.bankName ?? null,
        bankAccount: e.bankAccount ?? null,
        ifsc: e.ifsc ?? null,
        uan: e.uan ?? null,
        address: e.address ?? null,
        bloodGroup: e.bloodGroup ?? null,
        religion: e.religion ?? null,
        basicSalary: fromPaise(Math.round((e.basicSalary ?? 0) * 100)),
        allowances: fromPaise(Math.round((e.allowances ?? 0) * 100)),
        deductions: fromPaise(Math.round((e.deductions ?? 0) * 100)),
        photoUrl: e.photoUrl ?? null,
      },
    });
    return { employeeId: employee.id, employeeCode, credentials };
  });
}
