'use client';

import * as React from 'react';
import { ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { RowSelectionState } from '@tanstack/react-table';
import { api, usePagedQuery, useInvalidate } from '@/lib/api-client';
import { classOptions, sectionOptions, useLookups } from '@/lib/lookups';
import { Button } from '@/components/ui/button';
import { Card, CardBody, EmptyState, PageHeader } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Field, Segmented, Select } from '@/components/ui/form';
import { useConfirm } from '@/components/ui/overlay';

interface Row {
  id: string;
  name: string;
  admissionNo: string;
  rollNo: string | null;
  classLabel: string;
}

export default function PromotePage() {
  const { data: lk } = useLookups(['classes']);
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const [classId, setClassId] = React.useState('');
  const [sectionId, setSectionId] = React.useState('');
  const [result, setResult] = React.useState<'PROMOTED' | 'DETAINED' | 'PASSED_OUT'>('PROMOTED');
  const [toClassId, setToClassId] = React.useState('');
  const [toSectionId, setToSectionId] = React.useState('');
  const [selection, setSelection] = React.useState<RowSelectionState>({});
  const [saving, setSaving] = React.useState(false);
  const { data, isLoading } = usePagedQuery<Row>(classId ? '/api/students' : null, { classId, sectionId: sectionId || undefined, pageSize: 200, sort: 'name' });

  React.useEffect(() => {
    // Default target: the next class up.
    const cls = lk?.classes?.find((c) => c.id === classId);
    const next = lk?.classes?.find((c) => c.numericOrder > (cls?.numericOrder ?? 999));
    setToClassId(next?.id ?? '');
    setToSectionId(next?.sections[0]?.id ?? '');
    setSelection({});
  }, [classId, lk]);

  React.useEffect(() => {
    if (data?.data) setSelection(Object.fromEntries(data.data.map((r) => [r.id, true])));
  }, [data]);

  const ids = Object.keys(selection).filter((k) => selection[k]);

  return (
    <>
      <PageHeader title="Promote students" description="Move students to the next class at the end of the session, detain them, or mark them as passed out." icon={ArrowUpCircle} />
      <Card className="mb-6">
        <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="From class">
            <Select value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }} options={classOptions(lk)} placeholder="Choose class…" />
          </Field>
          <Field label="From section">
            <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} options={sectionOptions(lk, classId)} placeholder="All sections" disabled={!classId} />
          </Field>
          <Field label="Action" className="xl:col-span-1">
            <Segmented
              value={result}
              onChange={setResult}
              size="sm"
              options={[
                { value: 'PROMOTED', label: 'Promote' },
                { value: 'DETAINED', label: 'Detain' },
                { value: 'PASSED_OUT', label: 'Pass out' },
              ]}
            />
          </Field>
          {result === 'PROMOTED' && (
            <>
              <Field label="To class">
                <Select value={toClassId} onChange={(e) => { setToClassId(e.target.value); setToSectionId(''); }} options={classOptions(lk)} placeholder="Choose…" />
              </Field>
              <Field label="To section">
                <Select value={toSectionId} onChange={(e) => setToSectionId(e.target.value)} options={sectionOptions(lk, toClassId)} placeholder="Choose…" />
              </Field>
            </>
          )}
        </CardBody>
      </Card>
      <Card>
        {!classId ? (
          <EmptyState title="Choose a class to list its students" />
        ) : (
          <>
            <DataTable<Row>
              selectable
              rowSelection={selection}
              onRowSelectionChange={setSelection}
              getRowId={(r) => r.id}
              data={data?.data}
              loading={isLoading}
              pageSize={200}
              columns={[
                { accessorKey: 'name', header: 'Student', cell: ({ getValue }) => <span className="font-medium">{getValue()}</span> },
                { accessorKey: 'admissionNo', header: 'Admission no.' },
                { accessorKey: 'rollNo', header: 'Roll' },
                { accessorKey: 'classLabel', header: 'Current class' },
              ]}
            />
            <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
              <span className="text-sm text-ink-soft">{ids.length} selected</span>
              <Button
                loading={saving}
                disabled={!ids.length || (result === 'PROMOTED' && (!toClassId || !toSectionId))}
                onClick={async () => {
                  const verb = result === 'PROMOTED' ? 'promote' : result === 'DETAINED' ? 'detain' : 'mark as passed out';
                  if (!(await confirm({ title: `${verb[0].toUpperCase() + verb.slice(1)} ${ids.length} students?`, description: 'A promotion record is kept for each student.', confirmLabel: 'Confirm', tone: 'primary' }))) return;
                  setSaving(true);
                  try {
                    const res = await api<{ count: number }>('/api/students/promote', { method: 'POST', body: { studentIds: ids, result, toClassId, toSectionId } });
                    toast.success(`${res.count} students updated`);
                    invalidate(['/api/students', '/api/classes', '/api/lookups']);
                    setSelection({});
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <ArrowUpCircle /> Apply to {ids.length} students
              </Button>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
