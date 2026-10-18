import type { LedgerType, PaymentMode } from '@prisma/client';
import type { TenantDb, TenantTx } from '../db';
import { fromPaise, type Paise } from './money';

type Db = TenantDb | TenantTx;

export const SYSTEM_HEADS = {
  FEE: { name: 'Fee Collection', type: 'INCOME' as LedgerType },
  STORE: { name: 'Store Sales', type: 'INCOME' as LedgerType },
  SALARY: { name: 'Salaries', type: 'EXPENSE' as LedgerType },
};

export async function systemHeadId(db: Db, schoolId: string, kind: keyof typeof SYSTEM_HEADS): Promise<string> {
  const def = SYSTEM_HEADS[kind];
  const head = await db.accountHead.upsert({
    where: { schoolId_name_type: { schoolId, name: def.name, type: def.type } },
    update: {},
    create: { schoolId, name: def.name, type: def.type, isSystem: true },
  });
  return head.id;
}

export async function postLedger(
  db: Db,
  schoolId: string,
  entry: {
    kind: keyof typeof SYSTEM_HEADS;
    amount: Paise;
    date: Date;
    description: string;
    mode?: PaymentMode | null;
    referenceNo?: string | null;
    party?: string | null;
    sourceId: string;
    createdById?: string | null;
    campusId?: string | null;
  }
): Promise<void> {
  const headId = await systemHeadId(db, schoolId, entry.kind);
  await db.ledgerEntry.create({
    data: {
      schoolId,
      headId,
      campusId: entry.campusId ?? null,
      type: SYSTEM_HEADS[entry.kind].type,
      amount: fromPaise(entry.amount),
      date: entry.date,
      description: entry.description,
      mode: entry.mode ?? null,
      referenceNo: entry.referenceNo ?? null,
      party: entry.party ?? null,
      source: entry.kind,
      sourceId: entry.sourceId,
      createdById: entry.createdById ?? null,
    },
  });
}

export async function removeLedgerForSource(db: Db, source: keyof typeof SYSTEM_HEADS, sourceId: string): Promise<void> {
  await db.ledgerEntry.deleteMany({ where: { source, sourceId } });
}
