'use client';

import * as React from 'react';
import { useLookups } from '@/lib/lookups';
import { Checkbox } from '@/components/ui/form';

export const AUDIENCE_ROLE_OPTIONS = [
  { value: 'PARENT', label: 'Parents' },
  { value: 'STUDENT', label: 'Students' },
  { value: 'TEACHER', label: 'Teachers' },
  { value: 'ADMIN', label: 'Principal / Admin' },
  { value: 'ACCOUNTANT', label: 'Accountants' },
  { value: 'RECEPTIONIST', label: 'Front office' },
  { value: 'LIBRARIAN', label: 'Librarians' },
  { value: 'TRANSPORT_MANAGER', label: 'Transport' },
  { value: 'STORE_MANAGER', label: 'Store' },
  { value: 'STAFF', label: 'Other staff' },
] as const;

export interface AudienceValue {
  roles: string[];
  classIds: string[];
}

export function audienceLabel(a: AudienceValue | null | undefined, classLabels?: Record<string, string>): string {
  if (!a?.roles?.length) return 'Only me';
  const roles = a.roles.map((r) => AUDIENCE_ROLE_OPTIONS.find((o) => o.value === r)?.label ?? r).join(', ');
  const classes = a.classIds?.length ? ` · ${a.classIds.map((c) => classLabels?.[c] ?? 'class').join(', ')}` : '';
  return roles + classes;
}

/** Choose roles, and optionally limit parents/students to some classes. */
export function AudiencePicker({ value, onChange, roles = AUDIENCE_ROLE_OPTIONS.map((r) => r.value) }: { value: AudienceValue; onChange: (v: AudienceValue) => void; roles?: readonly string[] }) {
  const { data: lk } = useLookups(['classes']);
  const family = value.roles.includes('PARENT') || value.roles.includes('STUDENT');
  const toggle = (list: string[], v: string, on: boolean) => (on ? [...new Set([...list, v])] : list.filter((x) => x !== v));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {AUDIENCE_ROLE_OPTIONS.filter((o) => roles.includes(o.value)).map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm">
            <Checkbox checked={value.roles.includes(o.value)} onCheckedChange={(c) => onChange({ ...value, roles: toggle(value.roles, o.value, !!c) })} /> {o.label}
          </label>
        ))}
      </div>
      {family && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-soft">Parents/students of {value.classIds.length ? 'these classes' : 'all classes'}</p>
          <div className="grid max-h-36 grid-cols-3 gap-1.5 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-4">
            {(lk?.classes ?? []).map((c) => (
              <label key={c.id} className="flex items-center gap-1.5 text-xs">
                <Checkbox checked={value.classIds.includes(c.id)} onCheckedChange={(on) => onChange({ ...value, classIds: toggle(value.classIds, c.id, !!on) })} /> {c.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
