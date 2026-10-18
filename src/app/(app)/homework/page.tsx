'use client';

import * as React from 'react';
import { BookMarked, CheckCircle2, ClipboardCheck, Clock, Paperclip, Plus, RotateCcw, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { allSectionOptions, findSection, subjectOptions, useLookups } from '@/lib/lookups';
import { cn, formatDate, todayISO } from '@/lib/utils';
import { useApp, useFocusChild } from '@/components/shell/app-context';
import { FileUpload, type UploadedFile } from '@/components/file-upload';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, EmptyState, LoadingBlock, PageHeader, StatusBadge } from '@/components/ui/display';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Dialog, useConfirm } from '@/components/ui/overlay';

interface HW {
  id: string;
  title: string;
  description: string;
  subject: string;
  classLabel: string;
  assignedOn: string;
  dueOn: string;
  createdByName: string;
  createdById: string;
  attachment: { id: string; fileName: string } | null;
  submissionCount: number;
  mySubmission?: { status: string; feedback: string | null; content: string | null; submittedAt: string } | null;
}

function NewHomework({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['classes', 'subjects', 'classSubjects'], { mine: true });
  const [v, setV] = React.useState({ sectionId: '', subjectId: '', title: '', description: '', assignedOn: todayISO(), dueOn: todayISO() });
  const [file, setFile] = React.useState<UploadedFile | null>(null);
  const [busy, setBusy] = React.useState(false);
  const sec = findSection(lk, v.sectionId);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Give homework"
      size="lg"
      footer={
        <Button
          loading={busy}
          disabled={!v.sectionId || !v.subjectId || !v.title || !v.description}
          onClick={async () => {
            setBusy(true);
            try {
              await api('/api/homework', { method: 'POST', body: { ...v, classId: sec?.cls.id, attachmentId: file?.id ?? null } });
              toast.success('Homework posted — students and parents notified');
              invalidate(['/api/homework']);
              onOpenChange(false);
              setV({ ...v, title: '', description: '' });
              setFile(null);
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Send /> Post homework
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Class & section" required>
          <Select value={v.sectionId} onChange={(e) => setV({ ...v, sectionId: e.target.value, subjectId: '' })} options={allSectionOptions(lk)} placeholder="Choose…" />
        </Field>
        <Field label="Subject" required>
          <Select value={v.subjectId} onChange={(e) => setV({ ...v, subjectId: e.target.value })} options={subjectOptions(lk, sec?.cls.id)} placeholder="Choose…" />
        </Field>
        <Field label="Title" required className="sm:col-span-2">
          <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Exercise 4.2, questions 1–10" />
        </Field>
        <Field label="Details" required className="sm:col-span-2">
          <Textarea rows={4} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </Field>
        <Field label="Assigned on">
          <Input type="date" value={v.assignedOn} onChange={(e) => setV({ ...v, assignedOn: e.target.value })} />
        </Field>
        <Field label="Due on">
          <Input type="date" value={v.dueOn} min={v.assignedOn} onChange={(e) => setV({ ...v, dueOn: e.target.value })} />
        </Field>
        <Field label="Attachment" className="sm:col-span-2">
          <FileUpload value={file} onChange={setFile} purpose="HOMEWORK" />
        </Field>
      </div>
    </Dialog>
  );
}

function SubmissionsDialog({ hw, onClose }: { hw: HW; onClose: () => void }) {
  const { data, isLoading, refetch } = useApiQuery<Array<{ studentId: string; name: string; rollNo: string | null; submission: { status: string; content: string | null; feedback: string | null; submittedAt: string; attachment: { id: string; fileName: string } | null } | null }>>(`/api/homework/${hw.id}/submissions`);
  const review = async (studentId: string, status: 'CHECKED' | 'REDO') => {
    try {
      await api(`/api/homework/${hw.id}/submissions`, { method: 'PATCH', body: { studentId, status } });
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const submitted = data?.filter((d) => d.submission).length ?? 0;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={hw.title} description={`${hw.classLabel} · ${submitted}/${data?.length ?? 0} submitted`} size="lg">
      {isLoading ? (
        <LoadingBlock />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {data?.map((r) => (
            <li key={r.studentId} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-6 text-right text-xs text-ink-faint">{r.rollNo}</span>
              <span className="min-w-0 flex-1 font-medium">{r.name}</span>
              {r.submission ? (
                <>
                  {r.submission.attachment && (
                    <a href={`/api/files/${r.submission.attachment.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-brand-600">
                      <Paperclip className="size-3" /> file
                    </a>
                  )}
                  <StatusBadge status={r.submission.status === 'SUBMITTED' ? 'PENDING' : r.submission.status === 'CHECKED' ? 'SUCCESS' : 'REJECTED'} label={r.submission.status.toLowerCase()} />
                  <Button size="sm" variant="soft" onClick={() => review(r.studentId, 'CHECKED')}>
                    <CheckCircle2 /> Checked
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => review(r.studentId, 'REDO')}>
                    <RotateCcw /> Redo
                  </Button>
                </>
              ) : (
                <Badge>Not submitted</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

function SubmitDialog({ hw, studentId, onClose }: { hw: HW; studentId: string; onClose: () => void }) {
  const invalidate = useInvalidate();
  const [content, setContent] = React.useState(hw.mySubmission?.content ?? '');
  const [file, setFile] = React.useState<UploadedFile | null>(null);
  const [busy, setBusy] = React.useState(false);
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Submit: ${hw.title}`}
      footer={
        <Button
          loading={busy}
          disabled={!content && !file}
          onClick={async () => {
            setBusy(true);
            try {
              await api(`/api/homework/${hw.id}/submit`, { method: 'POST', body: { studentId, content, attachmentId: file?.id ?? null } });
              toast.success('Submitted');
              invalidate(['/api/homework']);
              onClose();
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Send /> Submit
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Your answer">
          <Textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type your answer, or attach a photo of your notebook" />
        </Field>
        <FileUpload value={file} onChange={setFile} purpose="SUBMISSION" accept=".pdf,.jpg,.jpeg,.png,.webp" label="Attach photo / PDF" />
      </div>
    </Dialog>
  );
}

export default function HomeworkPage() {
  const { isFamily, can, me } = useApp();
  const child = useFocusChild();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['classes'], { mine: true });
  const [sectionId, setSectionId] = React.useState('');
  const { data, isLoading } = useApiQuery<HW[]>('/api/homework', isFamily ? { studentId: child?.id } : { sectionId: sectionId || undefined });
  const [open, setOpen] = React.useState(false);
  const [viewing, setViewing] = React.useState<HW | null>(null);
  const [submitting, setSubmitting] = React.useState<HW | null>(null);
  const today = todayISO();

  return (
    <>
      <PageHeader
        title="Homework"
        description={isFamily ? `${child?.name ?? ''} · ${child?.classLabel ?? ''}` : 'Daily homework diary with online submissions.'}
        icon={BookMarked}
        actions={
          !isFamily &&
          can('homework', 'create') && (
            <Button onClick={() => setOpen(true)}>
              <Plus /> Give homework
            </Button>
          )
        }
      />
      {!isFamily && (
        <Card className="mb-4">
          <CardBody className="py-3">
            <Select className="h-9 w-48" value={sectionId} onChange={(e) => setSectionId(e.target.value)} options={allSectionOptions(lk)} placeholder="All my sections" />
          </CardBody>
        </Card>
      )}
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <Card>
          <EmptyState icon={BookMarked} title="No homework" />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((h) => {
            const due = h.dueOn.slice(0, 10);
            const overdue = due < today;
            return (
              <Card key={h.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3 px-5 pt-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="brand">{h.subject}</Badge>
                      {!isFamily && <span className="text-xs text-ink-faint">{h.classLabel}</span>}
                    </div>
                    <p className="mt-1.5 font-semibold">{h.title}</p>
                  </div>
                  <span className={cn('flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium', overdue ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10' : due === today ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/10' : 'bg-canvas text-ink-soft')}>
                    <Clock className="size-3" /> Due {formatDate(h.dueOn)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap px-5 py-3 text-sm text-ink-soft">{h.description}</p>
                {h.attachment && (
                  <a href={`/api/files/${h.attachment.id}`} target="_blank" rel="noopener" className="mx-5 mb-3 inline-flex w-fit items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1.5 text-xs text-brand-700 hover:underline">
                    <Paperclip className="size-3.5" /> {h.attachment.fileName}
                  </a>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line px-5 py-3 text-xs text-ink-faint">
                  <span>
                    {h.createdByName} · {formatDate(h.assignedOn)}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    {isFamily ? (
                      h.mySubmission ? (
                        <>
                          <StatusBadge status={h.mySubmission.status === 'CHECKED' ? 'SUCCESS' : h.mySubmission.status === 'REDO' ? 'REJECTED' : 'PENDING'} label={h.mySubmission.status === 'SUBMITTED' ? 'submitted' : h.mySubmission.status.toLowerCase()} />
                          {h.mySubmission.status === 'REDO' && (
                            <Button size="sm" variant="soft" onClick={() => setSubmitting(h)}>
                              Resubmit
                            </Button>
                          )}
                        </>
                      ) : (
                        me.user.role === 'STUDENT' || me.user.role === 'PARENT' ? (
                          <Button size="sm" variant="soft" onClick={() => setSubmitting(h)}>
                            <Send /> Submit online
                          </Button>
                        ) : null
                      )
                    ) : (
                      <>
                        <Button size="sm" variant="soft" onClick={() => setViewing(h)}>
                          <ClipboardCheck /> {h.submissionCount} submitted
                        </Button>
                        {can('homework', 'delete') && (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Delete homework"
                            onClick={async () => {
                              if (!(await confirm({ title: 'Delete this homework?', confirmLabel: 'Delete' }))) return;
                              try {
                                await api(`/api/homework/${h.id}`, { method: 'DELETE' });
                                invalidate(['/api/homework']);
                              } catch (e) {
                                toast.error((e as Error).message);
                              }
                            }}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {isFamily && h.mySubmission?.feedback && <p className="border-t border-line bg-canvas/60 px-5 py-2 text-xs">Teacher’s feedback: {h.mySubmission.feedback}</p>}
              </Card>
            );
          })}
        </div>
      )}
      <NewHomework open={open} onOpenChange={setOpen} />
      {viewing && <SubmissionsDialog hw={viewing} onClose={() => setViewing(null)} />}
      {submitting && child && <SubmitDialog hw={submitting} studentId={child.id} onClose={() => setSubmitting(null)} />}
    </>
  );
}
