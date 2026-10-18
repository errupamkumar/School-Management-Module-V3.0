'use client';

import * as React from 'react';
import { BookOpen, CalendarRange, CheckCircle2, Layers, MoreHorizontal, Pencil, Plus, School, Trash2, UserCog, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { classOptions, subjectOptions, useLookups, allSectionOptions } from '@/lib/lookups';
import { cn, formatDate, formatINR } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { FormDialog, ResourcePage, dateInput, type FieldDef } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardHeader, EmptyState, LoadingBlock, PageHeader, Progress } from '@/components/ui/display';
import { Checkbox, Input, Select } from '@/components/ui/form';
import { Dialog, Menu, MenuContent, MenuItem, MenuTrigger, Tabs, TabPanel, useConfirm } from '@/components/ui/overlay';

interface SectionRow {
  id: string;
  name: string;
  capacity: number;
  room: string | null;
  classTeacherId: string | null;
  classTeacherName: string | null;
  students: number;
}
interface ClassRow {
  id: string;
  name: string;
  label: string;
  numericOrder: number;
  monthlyFee: number;
  isActive: boolean;
  students: number;
  sections: SectionRow[];
  subjects: Array<{ subjectId: string; fullMarks: number; passMarks: number; subject: { id: string; name: string; code: string } }>;
}

const classFields: FieldDef[] = [
  { name: 'name', label: 'Class name', required: true, placeholder: 'e.g. 5 or LKG' },
  { name: 'numericOrder', label: 'Sort order', type: 'number', required: true, hint: 'Nursery=1, LKG=2, UKG=3, Class 1=4 …' },
  { name: 'monthlyFee', label: 'Default monthly tuition', type: 'money' },
  { name: 'sections', label: 'Sections', placeholder: 'A, B, C', hint: 'Comma separated', createOnly: true },
];

function ClassesTab() {
  const { can } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data, isLoading } = useApiQuery<ClassRow[]>('/api/classes');
  const { data: lk } = useLookups(['teachers', 'subjects']);
  const [classDialog, setClassDialog] = React.useState<{ open: boolean; row?: ClassRow }>({ open: false });
  const [sectionDialog, setSectionDialog] = React.useState<{ open: boolean; classId?: string; row?: SectionRow }>({ open: false });
  const [subjectsFor, setSubjectsFor] = React.useState<ClassRow | null>(null);
  const refresh = () => invalidate(['/api/classes', '/api/lookups']);

  const teacherOptions = (lk?.teachers ?? []).map((t) => ({ value: t.id, label: `${t.name} (${t.designation})` }));
  const sectionFields: FieldDef[] = [
    { name: 'name', label: 'Section', required: true, placeholder: 'A' },
    { name: 'capacity', label: 'Capacity', type: 'number', required: true },
    { name: 'room', label: 'Room' },
    { name: 'classTeacherId', label: 'Class teacher', type: 'select', options: teacherOptions },
  ];

  if (isLoading) return <LoadingBlock />;
  return (
    <>
      {can('academics', 'create') && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setClassDialog({ open: true })}>
            <Plus /> Add class
          </Button>
        </div>
      )}
      {!data?.length ? (
        <Card>
          <EmptyState icon={School} title="No classes yet" description="Add your first class to start admitting students." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <Card key={c.id} className={cn(!c.isActive && 'opacity-60')}>
              <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div>
                  <p className="text-base font-semibold">{c.label}</p>
                  <p className="text-xs text-ink-soft">
                    {c.students} students · {c.subjects.length} subjects · {formatINR(c.monthlyFee, true)}/month
                  </p>
                </div>
                {(can('academics', 'edit') || can('academics', 'delete')) && (
                  <Menu>
                    <MenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Class actions">
                        <MoreHorizontal />
                      </Button>
                    </MenuTrigger>
                    <MenuContent>
                      {can('academics', 'edit') && (
                        <>
                          <MenuItem onSelect={() => setClassDialog({ open: true, row: c })}>
                            <Pencil /> Edit class
                          </MenuItem>
                          <MenuItem onSelect={() => setSubjectsFor(c)}>
                            <BookOpen /> Subjects & marks
                          </MenuItem>
                        </>
                      )}
                      {can('academics', 'create') && (
                        <MenuItem onSelect={() => setSectionDialog({ open: true, classId: c.id })}>
                          <Plus /> Add section
                        </MenuItem>
                      )}
                      {can('academics', 'delete') && (
                        <MenuItem
                          danger
                          onSelect={async () => {
                            if (!(await confirm({ title: `Delete ${c.label}?`, description: 'Only empty classes can be deleted.', confirmLabel: 'Delete' }))) return;
                            try {
                              await api(`/api/classes/${c.id}`, { method: 'DELETE' });
                              toast.success('Class deleted');
                              refresh();
                            } catch (e) {
                              toast.error((e as Error).message);
                            }
                          }}
                        >
                          <Trash2 /> Delete class
                        </MenuItem>
                      )}
                    </MenuContent>
                  </Menu>
                )}
              </div>
              <ul className="divide-y divide-line">
                {c.sections.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{s.name}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.classTeacherName ?? <span className="text-ink-faint">No class teacher</span>}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Progress value={(s.students / s.capacity) * 100} tone={s.students >= s.capacity ? 'danger' : 'brand'} className="h-1.5" />
                        <span className="shrink-0 text-[11px] text-ink-faint">
                          {s.students}/{s.capacity}
                        </span>
                      </div>
                    </div>
                    {can('academics', 'edit') && (
                      <Button variant="ghost" size="icon-sm" aria-label="Edit section" onClick={() => setSectionDialog({ open: true, classId: c.id, row: s })}>
                        <Pencil />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              {c.subjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-t border-line px-5 py-3">
                  {c.subjects.map((s) => (
                    <Badge key={s.subjectId}>{s.subject.code}</Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <FormDialog
        open={classDialog.open}
        onOpenChange={(o) => setClassDialog({ open: o })}
        title={classDialog.row ? `Edit ${classDialog.row.label}` : 'Add class'}
        fields={classFields}
        editing={!!classDialog.row}
        initial={classDialog.row ? { name: classDialog.row.name, numericOrder: classDialog.row.numericOrder, monthlyFee: classDialog.row.monthlyFee } : { sections: 'A', monthlyFee: '' }}
        onSubmit={async (v) => {
          if (classDialog.row) {
            await api(`/api/classes/${classDialog.row.id}`, { method: 'PUT', body: v });
          } else {
            await api('/api/classes', { method: 'POST', body: { ...v, sections: String(v.sections ?? 'A').split(',').map((s) => s.trim()).filter(Boolean) } });
          }
          toast.success('Saved');
          refresh();
        }}
      />
      <FormDialog
        open={sectionDialog.open}
        onOpenChange={(o) => setSectionDialog({ open: o })}
        title={sectionDialog.row ? `Edit section ${sectionDialog.row.name}` : 'Add section'}
        fields={sectionFields}
        initial={sectionDialog.row ? { name: sectionDialog.row.name, capacity: sectionDialog.row.capacity, room: sectionDialog.row.room ?? '', classTeacherId: sectionDialog.row.classTeacherId ?? '' } : { capacity: 40 }}
        onSubmit={async (v) => {
          if (sectionDialog.row) await api(`/api/sections/${sectionDialog.row.id}`, { method: 'PUT', body: v });
          else await api(`/api/classes/${sectionDialog.classId}/sections`, { method: 'POST', body: v });
          toast.success('Section saved');
          refresh();
        }}
      />
      {subjectsFor && <ClassSubjectsDialog cls={subjectsFor} subjects={lk?.subjects ?? []} onClose={() => setSubjectsFor(null)} onSaved={refresh} />}
    </>
  );
}

function ClassSubjectsDialog({ cls, subjects, onClose, onSaved }: { cls: ClassRow; subjects: Array<{ id: string; name: string; code: string }>; onClose: () => void; onSaved: () => void }) {
  const [rows, setRows] = React.useState(() =>
    subjects.map((s) => {
      const existing = cls.subjects.find((x) => x.subjectId === s.id);
      return { subjectId: s.id, name: s.name, code: s.code, on: !!existing, fullMarks: existing?.fullMarks ?? 100, passMarks: existing?.passMarks ?? 33 };
    })
  );
  const [saving, setSaving] = React.useState(false);
  const update = (id: string, patch: Partial<(typeof rows)[number]>) => setRows((r) => r.map((x) => (x.subjectId === id ? { ...x, ...patch } : x)));
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Subjects for ${cls.label}`}
      description="Tick the subjects taught in this class and set the default full and pass marks."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await api(`/api/classes/${cls.id}/subjects`, { method: 'PUT', body: { subjects: rows.filter((r) => r.on).map((r) => ({ subjectId: r.subjectId, fullMarks: Number(r.fullMarks), passMarks: Number(r.passMarks) })) } });
                toast.success('Subjects updated');
                onSaved();
                onClose();
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="divide-y divide-line rounded-xl border border-line">
        {rows.map((r) => (
          <div key={r.subjectId} className="flex items-center gap-3 px-4 py-2.5">
            <Checkbox checked={r.on} onCheckedChange={(v) => update(r.subjectId, { on: !!v })} aria-label={r.name} />
            <span className="flex-1 text-sm">
              {r.name} <span className="text-xs text-ink-faint">{r.code}</span>
            </span>
            <Input type="number" className="h-8 w-20" value={r.fullMarks} disabled={!r.on} onChange={(e) => update(r.subjectId, { fullMarks: Number(e.target.value) })} aria-label="Full marks" />
            <Input type="number" className="h-8 w-20" value={r.passMarks} disabled={!r.on} onChange={(e) => update(r.subjectId, { passMarks: Number(e.target.value) })} aria-label="Pass marks" />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-faint">Columns: full marks · pass marks</p>
    </Dialog>
  );
}

function AllocationTab() {
  const { can } = useApp();
  const { data: lk } = useLookups(['classes', 'teachers']);
  const [sectionId, setSectionId] = React.useState('');
  const { data, isLoading, refetch } = useApiQuery<Array<{ subjectId: string; subjectName: string; employeeId: string | null }>>(sectionId ? `/api/sections/${sectionId}/teachers` : null);
  const [draft, setDraft] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    if (data) setDraft(Object.fromEntries(data.map((d) => [d.subjectId, d.employeeId ?? ''])));
  }, [data]);
  const sections = allSectionOptions(lk);
  return (
    <Card>
      <CardHeader title="Subject teachers" description="Assign who teaches each subject in a section. Teachers can only enter marks and attendance for their own sections." icon={UserCog} />
      <div className="p-5">
        <Select className="max-w-xs" value={sectionId} onChange={(e) => setSectionId(e.target.value)} options={sections} placeholder="Choose a section…" />
        {sectionId && (isLoading ? (
          <LoadingBlock />
        ) : !data?.length ? (
          <EmptyState title="No subjects mapped to this class" description="Add subjects to the class first from the Classes tab." />
        ) : (
          <div className="mt-4 space-y-2">
            {data.map((d) => (
              <div key={d.subjectId} className="grid grid-cols-1 items-center gap-2 rounded-xl border border-line px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_20rem]">
                <span className="text-sm font-medium">{d.subjectName}</span>
                <Select disabled={!can('academics', 'edit')} value={draft[d.subjectId] ?? ''} onChange={(e) => setDraft((s) => ({ ...s, [d.subjectId]: e.target.value }))} options={(lk?.teachers ?? []).map((t) => ({ value: t.id, label: t.name }))} placeholder="Not assigned" />
              </div>
            ))}
            {can('academics', 'edit') && (
              <div className="flex justify-end pt-2">
                <Button
                  loading={saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await api(`/api/sections/${sectionId}/teachers`, { method: 'PUT', body: { assignments: Object.entries(draft).map(([subjectId, employeeId]) => ({ subjectId, employeeId: employeeId || null })) } });
                      toast.success('Teachers allocated');
                      refetch();
                    } catch (e) {
                      toast.error((e as Error).message);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Save allocation
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

interface YearRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

function YearsTab() {
  const invalidate = useInvalidate();
  const { can } = useApp();
  return (
    <ResourcePage<YearRow>
      embedded
      title="Academic years"
      entityLabel="Academic year"
      endpoint="/api/academic-years"
      module="academics"
      invalidate={['/api/me', '/api/lookups']}
      columns={[
        { accessorKey: 'name', header: 'Session', cell: ({ row }) => <span className="font-semibold">{row.original.name}</span> },
        { accessorKey: 'startDate', header: 'Starts', cell: ({ getValue }) => formatDate(getValue()) },
        { accessorKey: 'endDate', header: 'Ends', cell: ({ getValue }) => formatDate(getValue()) },
        { accessorKey: 'isCurrent', header: 'Status', cell: ({ getValue }) => (getValue() ? <Badge tone="success" dot>Current</Badge> : <Badge>Past / upcoming</Badge>) },
      ]}
      fields={[
        { name: 'name', label: 'Session name', required: true, placeholder: '2027-28' },
        { name: 'startDate', label: 'Start date', type: 'date', required: true },
        { name: 'endDate', label: 'End date', type: 'date', required: true },
      ]}
      toForm={(r) => ({ name: r.name, startDate: dateInput(r.startDate), endDate: dateInput(r.endDate) })}
      rowActions={(r) =>
        !r.isCurrent && can('academics', 'edit') ? (
          <MenuItem
            onSelect={async () => {
              await api(`/api/academic-years/${r.id}`, { method: 'PATCH' });
              toast.success(`${r.name} is now the current session`);
              invalidate(['/api/academic-years', '/api/me', '/api/lookups']);
            }}
          >
            <CheckCircle2 /> Make current
          </MenuItem>
        ) : null
      }
    />
  );
}

function ChaptersTab() {
  const { data: lk } = useLookups(['classes', 'subjects', 'classSubjects']);
  const [classId, setClassId] = React.useState('');
  const [subjectId, setSubjectId] = React.useState('');
  return (
    <ResourcePage<{ id: string; name: string; sortOrder: number; classId: string; subjectId: string }>
      embedded
      title="Chapters"
      entityLabel="Chapter"
      endpoint="/api/chapters"
      module="academics"
      params={{ classId: classId || undefined, subjectId: subjectId || undefined }}
      filters={
        <>
          <Select className="h-9 w-40" value={classId} onChange={(e) => setClassId(e.target.value)} options={classOptions(lk)} placeholder="All classes" />
          <Select className="h-9 w-44" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} options={subjectOptions(lk, classId)} placeholder="All subjects" />
        </>
      }
      columns={[
        { accessorKey: 'sortOrder', header: '#', size: 40 },
        { accessorKey: 'name', header: 'Chapter', cell: ({ getValue }) => <span className="font-medium">{getValue()}</span> },
        { id: 'class', header: 'Class', cell: ({ row }) => lk?.classes?.find((c) => c.id === row.original.classId)?.label ?? '—' },
        { id: 'subject', header: 'Subject', cell: ({ row }) => lk?.subjects?.find((s) => s.id === row.original.subjectId)?.name ?? '—' },
      ]}
      fields={[
        { name: 'classId', label: 'Class', type: 'select', required: true, options: classOptions(lk) },
        { name: 'subjectId', label: 'Subject', type: 'select', required: true, options: subjectOptions(lk) },
        { name: 'name', label: 'Chapter name', required: true, span: 2 },
        { name: 'sortOrder', label: 'Order', type: 'number' },
      ]}
      defaults={{ classId, subjectId, sortOrder: 1 }}
    />
  );
}

export default function AcademicsPage() {
  const [tab, setTab] = React.useState('classes');
  return (
    <>
      <PageHeader title="Classes & Subjects" description="Academic structure: sessions, classes, sections, subjects and teacher allocation." icon={School} />
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: 'classes', label: <><Layers className="size-4" /> Classes & sections</> },
          { value: 'subjects', label: <><BookOpen className="size-4" /> Subjects</> },
          { value: 'allocation', label: <><Users className="size-4" /> Teacher allocation</> },
          { value: 'chapters', label: 'Chapters' },
          { value: 'years', label: <><CalendarRange className="size-4" /> Academic years</> },
        ]}
      >
        <TabPanel value="classes">
          <ClassesTab />
        </TabPanel>
        <TabPanel value="subjects">
          <ResourcePage<{ id: string; name: string; code: string; type: string; isOptional: boolean; _count: { classes: number } }>
            embedded
            title="Subjects"
            entityLabel="Subject"
            endpoint="/api/subjects"
            module="academics"
            invalidate={['/api/lookups']}
            searchPlaceholder="Search subjects…"
            columns={[
              { accessorKey: 'code', header: 'Code', cell: ({ getValue }) => <Badge tone="brand">{getValue()}</Badge> },
              { accessorKey: 'name', header: 'Subject', cell: ({ getValue }) => <span className="font-medium">{getValue()}</span> },
              { accessorKey: 'type', header: 'Type', cell: ({ getValue }) => String(getValue()).toLowerCase() },
              { accessorKey: 'isOptional', header: 'Optional', cell: ({ getValue }) => (getValue() ? 'Yes' : 'No') },
              { id: 'classes', header: 'Classes', cell: ({ row }) => row.original._count.classes },
            ]}
            fields={[
              { name: 'name', label: 'Subject name', required: true },
              { name: 'code', label: 'Code', required: true, placeholder: 'MAT' },
              { name: 'type', label: 'Type', type: 'select', options: [{ value: 'THEORY', label: 'Theory' }, { value: 'PRACTICAL', label: 'Practical' }, { value: 'BOTH', label: 'Theory + Practical' }] },
              { name: 'isOptional', label: 'Optional subject', type: 'switch' },
            ]}
            defaults={{ type: 'THEORY', isOptional: false }}
          />
        </TabPanel>
        <TabPanel value="allocation">
          <AllocationTab />
        </TabPanel>
        <TabPanel value="chapters">
          <ChaptersTab />
        </TabPanel>
        <TabPanel value="years">
          <YearsTab />
        </TabPanel>
      </Tabs>
    </>
  );
}
