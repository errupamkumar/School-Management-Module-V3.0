'use client';

import * as React from 'react';
import { BookOpen, Eye, ExternalLink, FileText, Link2, Plus, Search, Trash2, Video } from 'lucide-react';
import { embedUrl, googleAppName } from '@/lib/embed';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { classOptions, subjectOptions, useLookups } from '@/lib/lookups';
import { formatDate } from '@/lib/utils';
import { useApp, useFocusChild } from '@/components/shell/app-context';
import { FileUpload, type UploadedFile } from '@/components/file-upload';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, EmptyState, LoadingBlock, PageHeader } from '@/components/ui/display';
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/form';
import { Dialog, useConfirm } from '@/components/ui/overlay';

interface Material {
  id: string;
  title: string;
  description: string | null;
  kind: 'DOCUMENT' | 'VIDEO' | 'LINK';
  url: string | null;
  subject: string;
  classLabel: string;
  createdAt: string;
  createdById: string;
  file: { id: string; fileName: string; size: number } | null;
}

const ICON = { DOCUMENT: FileText, VIDEO: Video, LINK: Link2 };

export default function LmsPage() {
  const { isFamily, can } = useApp();
  const child = useFocusChild();
  const confirm = useConfirm();
  const [preview, setPreview] = React.useState<{ title: string; src: string } | null>(null);
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['classes', 'subjects', 'classSubjects']);
  const [classId, setClassId] = React.useState('');
  const [subjectId, setSubjectId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const { data, isLoading } = useApiQuery<Material[]>('/api/materials', isFamily ? { studentId: child?.id, subjectId: subjectId || undefined, search: search || undefined } : { classId: classId || undefined, subjectId: subjectId || undefined, search: search || undefined });
  const [open, setOpen] = React.useState(false);
  const [v, setV] = React.useState({ classId: '', subjectId: '', title: '', description: '', kind: 'DOCUMENT' as Material['kind'], url: '' });
  const [file, setFile] = React.useState<UploadedFile | null>(null);
  const famClass = isFamily ? child?.classId : classId;

  return (
    <>
      <PageHeader
        title="Study material"
        description={isFamily ? `${child?.classLabel ?? ''} notes, videos and links` : 'Share notes, worksheets, videos and links by class and subject.'}
        icon={BookOpen}
        actions={
          !isFamily &&
          can('lms', 'create') && (
            <Button onClick={() => setOpen(true)}>
              <Plus /> Add material
            </Button>
          )
        }
      />
      <Card className="mb-4">
        <CardBody className="flex flex-wrap gap-2 py-3">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="h-9 pl-9" />
          </div>
          {!isFamily && <Select className="h-9 w-36" value={classId} onChange={(e) => setClassId(e.target.value)} options={classOptions(lk)} placeholder="All classes" />}
          <Select className="h-9 w-44" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} options={subjectOptions(lk, famClass)} placeholder="All subjects" />
        </CardBody>
      </Card>
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <Card>
          <EmptyState icon={BookOpen} title="No study material yet" />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((m) => {
            const Icon = ICON[m.kind];
            const href = m.file ? `/api/files/${m.file.id}` : m.url ?? '#';
            const embed = m.file ? null : embedUrl(m.url);
            const gApp = googleAppName(m.url);
            return (
              <Card key={m.id} className="flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{m.title}</p>
                    <p className="text-xs text-ink-faint">
                      {m.subject} · {m.classLabel} · {formatDate(m.createdAt)}
                    </p>
                  </div>
                </div>
                {m.description && <p className="mt-3 line-clamp-3 text-sm text-ink-soft">{m.description}</p>}
                <div className="mt-auto flex items-center gap-2 pt-4">
                  <Button asChild size="sm" variant="soft">
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      <ExternalLink /> {m.kind === 'DOCUMENT' ? 'Open' : m.kind === 'VIDEO' ? 'Watch' : 'Visit'}
                    </a>
                  </Button>
                  {embed && (
                    <Button size="sm" variant="ghost" onClick={() => setPreview({ title: m.title, src: embed.src })}>
                      <Eye /> Preview
                    </Button>
                  )}
                  <Badge>{gApp ?? m.kind.toLowerCase()}</Badge>
                  {!isFamily && can('lms', 'delete') && (
                    <Button
                      className="ml-auto"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Delete material"
                      onClick={async () => {
                        if (!(await confirm({ title: `Delete ${m.title}?`, confirmLabel: 'Delete' }))) return;
                        try {
                          await api(`/api/materials/${m.id}`, { method: 'DELETE' });
                          invalidate(['/api/materials']);
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Add study material"
        size="lg"
        footer={
          <Button
            disabled={!v.classId || !v.subjectId || !v.title || (v.kind === 'DOCUMENT' ? !file : !v.url)}
            onClick={async () => {
              try {
                await api('/api/materials', { method: 'POST', body: { ...v, fileId: file?.id ?? null, url: v.kind === 'DOCUMENT' ? null : v.url } });
                toast.success('Material shared');
                invalidate(['/api/materials']);
                setOpen(false);
                setFile(null);
                setV({ ...v, title: '', description: '', url: '' });
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            Share
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Class" required>
            <Select value={v.classId} onChange={(e) => setV({ ...v, classId: e.target.value, subjectId: '' })} options={classOptions(lk)} placeholder="Choose…" />
          </Field>
          <Field label="Subject" required>
            <Select value={v.subjectId} onChange={(e) => setV({ ...v, subjectId: e.target.value })} options={subjectOptions(lk, v.classId)} placeholder="Choose…" />
          </Field>
          <Field label="Title" required className="sm:col-span-2">
            <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
          </Field>
          <Field label="Type" className="sm:col-span-2">
            <Segmented value={v.kind} onChange={(k) => setV({ ...v, kind: k })} options={[{ value: 'DOCUMENT', label: 'File' }, { value: 'VIDEO', label: 'Video link' }, { value: 'LINK', label: 'Web link' }]} />
          </Field>
          <div className="sm:col-span-2">
            {v.kind === 'DOCUMENT' ? (
              <FileUpload value={file} onChange={setFile} purpose="LMS" />
            ) : (
              <Field label="Link (https://)">
                <Input value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} placeholder="YouTube, Google Docs / Sheets / Slides / Drive link" />
              </Field>
            )}
          </div>
        </div>
      </Dialog>
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)} title={preview?.title ?? ''} size="xl">
        {preview && <iframe src={preview.src} title={preview.title} className="h-[70vh] w-full rounded-xl border border-line" allow="autoplay; encrypted-media; fullscreen" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation" referrerPolicy="no-referrer" />}
      </Dialog>
    </>
  );
}
