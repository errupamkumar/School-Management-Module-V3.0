'use client';

import { useApiQuery } from './api-client';

export interface LookupSection {
  id: string;
  name: string;
  label: string;
  capacity: number;
  classTeacherId: string | null;
}
export interface LookupClass {
  id: string;
  name: string;
  label: string;
  numericOrder: number;
  campusId: string;
  monthlyFee: number;
  sections: LookupSection[];
}
export interface Lookups {
  academicYear: string;
  classes?: LookupClass[];
  subjects?: Array<{ id: string; name: string; code: string }>;
  classSubjects?: Array<{ classId: string; subjectId: string; fullMarks: number; passMarks: number }>;
  teachers?: Array<{ id: string; name: string; designation: string; employeeCode: string; userId: string | null }>;
  employees?: Array<{ id: string; name: string; designation: string; employeeCode: string; isTeaching: boolean; userId: string | null }>;
  feeHeads?: Array<{ id: string; name: string; kind: string }>;
  campuses?: Array<{ id: string; name: string; code: string; isMain: boolean }>;
  years?: Array<{ id: string; name: string; isCurrent: boolean }>;
  periods?: Array<{ id: string; name: string; startTime: string; endTime: string; sortOrder: number; isBreak: boolean }>;
  routes?: Array<{ id: string; name: string; stops: Array<{ id: string; name: string; monthlyFee: number }> }>;
  accountHeads?: Array<{ id: string; name: string; type: 'INCOME' | 'EXPENSE'; isSystem: boolean }>;
  staffUsers?: Array<{ id: string; name: string; role: string }>;
}

export function useLookups(include: string[], opts: { mine?: boolean } = {}) {
  return useApiQuery<Lookups>('/api/lookups', { include: include.join(','), mine: opts.mine ? '1' : undefined }, { staleTime: 5 * 60_000 });
}

export const classOptions = (l?: Lookups) => (l?.classes ?? []).map((c) => ({ value: c.id, label: c.label }));
export const sectionOptions = (l: Lookups | undefined, classId?: string) =>
  (l?.classes ?? []).filter((c) => !classId || c.id === classId).flatMap((c) => c.sections.map((s) => ({ value: s.id, label: s.label })));
export const allSectionOptions = (l?: Lookups) => (l?.classes ?? []).flatMap((c) => c.sections.map((s) => ({ value: s.id, label: s.label })));
export const subjectOptions = (l?: Lookups, classId?: string) => {
  const subs = l?.subjects ?? [];
  if (!classId || !l?.classSubjects) return subs.map((s) => ({ value: s.id, label: s.name }));
  const ids = new Set(l.classSubjects.filter((c) => c.classId === classId).map((c) => c.subjectId));
  return subs.filter((s) => ids.has(s.id)).map((s) => ({ value: s.id, label: s.name }));
};
export const findSection = (l: Lookups | undefined, sectionId: string) => {
  for (const c of l?.classes ?? []) {
    const s = c.sections.find((x) => x.id === sectionId);
    if (s) return { cls: c, section: s };
  }
  return null;
};
