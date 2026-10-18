import { z } from 'zod';
import type { Role } from '@prisma/client';
import { badRequest, type Ctx } from '../api';
import type { TenantDb } from '../db';
import { ownClassSectionPairs } from '../scope';

/**
 * Who a poll, discussion or reminder is for: a set of roles, optionally
 * narrowed to classes (the class filter only applies to parents and students).
 * Owners and admins always see everything.
 */
export const AUDIENCE_ROLES = ['ADMIN', 'TEACHER', 'ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN', 'TRANSPORT_MANAGER', 'STORE_MANAGER', 'STAFF', 'PARENT', 'STUDENT'] as const;

export const audienceSchema = z.object({
  roles: z.array(z.enum(AUDIENCE_ROLES)).min(1, 'Choose who it is for').max(AUDIENCE_ROLES.length),
  classIds: z.array(z.string().min(1)).max(60).default([]),
});
export type Audience = z.infer<typeof audienceSchema>;

export function readAudience(raw: unknown): Audience {
  const p = audienceSchema.safeParse(raw);
  return p.success ? p.data : { roles: [], classIds: [] };
}

const FAMILY = new Set<string>(['PARENT', 'STUDENT']);

/** Pure check (unit-tested): may a user with this role and these class ids see it? */
export function audienceIncludes(aud: Audience, role: string, familyClassIds: string[]): boolean {
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;
  if (!(aud.roles as string[]).includes(role)) return false;
  if (FAMILY.has(role) && aud.classIds.length) return familyClassIds.some((c) => aud.classIds.includes(c));
  return true;
}

/** Class ids of a parent's children or a student's own class (empty for staff). */
export async function viewerClassIds(ctx: Ctx): Promise<string[]> {
  if (!FAMILY.has(ctx.user.role)) return [];
  return [...new Set((await ownClassSectionPairs(ctx)).map((p) => p.classId))];
}

/** Returns a predicate for filtering lists by audience for the current user. */
export async function audienceFilter(ctx: Ctx): Promise<(raw: unknown) => boolean> {
  const classIds = await viewerClassIds(ctx);
  return (raw) => audienceIncludes(readAudience(raw), ctx.user.role, classIds);
}

/** Verifies class ids belong to this school. */
export async function checkAudience(ctx: Ctx, aud: Audience): Promise<Audience> {
  const classIds = [...new Set(aud.classIds)];
  if (classIds.length) {
    const n = await ctx.db.class.count({ where: { id: { in: classIds } } });
    if (n !== classIds.length) throw badRequest('Unknown class in the audience.');
  }
  return { roles: [...new Set(aud.roles)], classIds };
}

/** Active user ids an audience reaches (for notifications). */
export async function audienceUserIds(db: TenantDb, aud: Audience): Promise<string[]> {
  const staffRoles = aud.roles.filter((r) => !FAMILY.has(r)) as Role[];
  const ids: string[] = [];
  if (staffRoles.length) {
    const staff = await db.user.findMany({ where: { role: { in: staffRoles }, isActive: true }, select: { id: true } });
    ids.push(...staff.map((u) => u.id));
  }
  const wantParents = aud.roles.includes('PARENT');
  const wantStudents = aud.roles.includes('STUDENT');
  if (wantParents || wantStudents) {
    const kids = await db.student.findMany({
      where: { status: 'ACTIVE', ...(aud.classIds.length ? { classId: { in: aud.classIds } } : {}) },
      select: { userId: true, guardian: { select: { userId: true } } },
    });
    for (const k of kids) {
      if (wantStudents && k.userId) ids.push(k.userId);
      if (wantParents && k.guardian?.userId) ids.push(k.guardian.userId);
    }
  }
  return [...new Set(ids)];
}
