import { prisma } from './db';

export interface AuditInput {
  schoolId: string | null;
  userId?: string | null;
  userName?: string | null;
  role?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  summary?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

/** Audit writes never break the request that triggered them. */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        schoolId: input.schoolId,
        userId: input.userId ?? null,
        userName: input.userName ?? null,
        role: input.role ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        summary: input.summary?.slice(0, 2000) ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent?.slice(0, 500) ?? null,
      },
    });
  } catch (err) {
    console.error('[audit] failed to write audit log', err);
  }
}
