'use client';

import * as React from 'react';
import { AlertTriangle, FileText, FolderOpen, FolderPlus, Search, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { cn, formatDate } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { AUDIENCE_ROLE_OPTIONS } from '@/components/audience-picker';
import { FileUpload, type UploadedFile } from '@/components/file-upload';
import { FormDialog } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Badge, Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Checkbox, Field, Input, Select, Switch, Textarea } from '@/components/ui/form';
import { Dialog, useConfirm } from '@/components/ui/overlay';

interface Doc {
  id: string;
  title: string;
  description: string | null;
  folderId: string | null;
  folder: { name: string } | null;
  fileId: string;
  fileName: string;
  version: number;
  tags: string | null;
  roles: string[];
  expiresOn: string | null;
  expired: boolean;
  expiringSoon: boolean;
  uploadedByName: string;
  updatedAt: string;
}
interface DocsRes {
  folders: Array<{ id: string; name: string; count: number }>;
  documents: Doc[];
  canManage: boolean;
}

const roleLabel = (r: string) => AUDIENCE_ROLE_OPTIONS.find((o) => o.value === r)?.label ?? r;

export default function DocumentsPage() {
  const { can } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const [folderId, setFolderId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [uploading, setUploading] = React.useState<Doc | 'new' | null>(null);
  const [folderOpen, setFolderOpen] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);
  const { data, isLoading } = useApiQuery<DocsRes>('/api/documents', { folderId: folderId || undefined, search: debounced || undefined });
  const alerts = (data?.documents ?? []).filter((d) => d.expired || d.expiringSoon);
  return (
    <>
      <PageHeader
        title="Documents"
        description="Policies, circulars and licences in folders, shared by role, with expiry alerts."
        icon={FolderOpen}
        actions={
          can('documents', 'create') && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setFolderOpen(true)}>
                <FolderPlus /> Folder
              </Button>
              <Button onClick={() => setUploading('new')}>
                <Upload /> Upload document
              </Button>
            </div>
          )
        }
      />
      {data?.canManage && alerts.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            <b>Renewals due:</b> {alerts.map((d) => `${d.title} (${d.expired ? 'expired' : 'expires'} ${formatDate(d.expiresOn)})`).join(' · ')}
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <Card className="h-fit p-2">
          {[{ id: '', name: 'All documents', count: undefined as number | undefined }, ...(data?.folders ?? []), { id: 'none', name: 'Not in a folder', count: undefined }].map((f) => (
            <div key={f.id || 'all'} className="group flex items-center">
              <button type="button" onClick={() => setFolderId(f.id)} className={cn('flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm', folderId === f.id ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'hover:bg-canvas')}>
                <FolderOpen className="size-4" /> <span className="flex-1 truncate">{f.name}</span>
                {f.count !== undefined && <span className="text-xs text-ink-faint">{f.count}</span>}
              </button>
              {f.id && f.id !== 'none' && can('documents', 'delete') && (
                <button
                  type="button"
                  aria-label={`Delete folder ${f.name}`}
                  className="hidden rounded p-1 text-ink-faint hover:text-rose-600 group-hover:block"
                  onClick={async () => {
                    if (!(await confirm({ title: `Delete folder "${f.name}"?`, description: 'Only empty folders can be deleted.', confirmLabel: 'Delete' }))) return;
                    try {
                      await api(`/api/doc-folders/${f.id}`, { method: 'DELETE' });
                      setFolderId('');
                      invalidate(['/api/documents']);
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </Card>
        <Card className="min-w-0">
          <div className="border-b border-line p-3">
            <div className="relative sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or tag…" className="h-9 pl-9" />
            </div>
          </div>
          {isLoading ? (
            <LoadingBlock />
          ) : !data?.documents.length ? (
            <EmptyState icon={FileText} title="No documents" description={can('documents', 'create') ? 'Upload policies, circulars, licences and forms, and choose who can open each one.' : 'Documents shared with you appear here.'} />
          ) : (
            <DataTable<Doc>
              data={data.documents}
              columns={[
                { accessorKey: 'title', header: 'Document', cell: ({ row }) => <div className="max-w-sm"><a href={`/api/files/${row.original.fileId}`} target="_blank" rel="noopener" className="font-medium hover:underline">{row.original.title}</a><p className="truncate text-xs text-ink-faint">{row.original.fileName}{row.original.version > 1 ? ` · v${row.original.version}` : ''}{row.original.tags ? ` · ${row.original.tags}` : ''}</p></div> },
                { id: 'folder', header: 'Folder', cell: ({ row }) => row.original.folder?.name ?? '—' },
                ...(data.canManage ? [{ id: 'roles', header: 'Shared with', cell: ({ row }: { row: { original: Doc } }) => <div className="flex min-w-[12rem] flex-wrap gap-1" title={row.original.roles.map(roleLabel).join(', ')}>{row.original.roles.slice(0, 3).map((r) => <Badge key={r}>{roleLabel(r)}</Badge>)}{row.original.roles.length > 3 && <Badge tone="brand">+{row.original.roles.length - 3}</Badge>}</div> }] : []),
                { accessorKey: 'expiresOn', header: 'Valid till', cell: ({ row }) => (row.original.expiresOn ? <Badge tone={row.original.expired ? 'danger' : row.original.expiringSoon ? 'warning' : 'neutral'}>{formatDate(row.original.expiresOn)}</Badge> : '—') },
                { accessorKey: 'updatedAt', header: 'Updated', cell: ({ row }) => <div><p>{formatDate(row.original.updatedAt)}</p><p className="text-xs text-ink-faint">{row.original.uploadedByName}</p></div> },
                {
                  id: 'a',
                  header: '',
                  cell: ({ row }) =>
                    data.canManage ? (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setUploading(row.original)}>
                          Edit
                        </Button>
                        {can('documents', 'delete') && (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Delete document"
                            onClick={async () => {
                              if (!(await confirm({ title: `Delete "${row.original.title}"?`, confirmLabel: 'Delete' }))) return;
                              await api(`/api/documents/${row.original.id}`, { method: 'DELETE' });
                              invalidate(['/api/documents']);
                            }}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    ) : null,
                },
              ]}
            />
          )}
        </Card>
      </div>
      <FormDialog
        open={folderOpen}
        onOpenChange={setFolderOpen}
        title="New folder"
        size="sm"
        fields={[{ name: 'name', label: 'Folder name', required: true, span: 2, placeholder: 'Policies' }]}
        initial={{}}
        onSubmit={async (p) => {
          await api('/api/doc-folders', { method: 'POST', body: p });
          invalidate(['/api/documents']);
        }}
      />
      <UploadDialog doc={uploading} folders={data?.folders ?? []} onClose={() => setUploading(null)} />
    </>
  );
}

function UploadDialog({ doc, folders, onClose }: { doc: Doc | 'new' | null; folders: Array<{ id: string; name: string }>; onClose: () => void }) {
  const invalidate = useInvalidate();
  const existing = doc && doc !== 'new' ? doc : null;
  const [v, setV] = React.useState({ title: '', description: '', folderId: '', tags: '', expiresOn: '' });
  const [roles, setRoles] = React.useState<string[]>([]);
  const [file, setFile] = React.useState<UploadedFile | null>(null);
  const [notify, setNotify] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (!doc) return;
    setV(existing ? { title: existing.title, description: existing.description ?? '', folderId: existing.folderId ?? '', tags: existing.tags ?? '', expiresOn: existing.expiresOn?.slice(0, 10) ?? '' } : { title: '', description: '', folderId: '', tags: '', expiresOn: '' });
    setRoles(existing?.roles ?? ['TEACHER', 'ADMIN']);
    setFile(null);
    setNotify(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);
  if (!doc) return null;
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={existing ? `Edit · ${existing.title}` : 'Upload document'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={v.title.trim().length < 2 || !roles.length || (!existing && !file)}
            onClick={async () => {
              setBusy(true);
              try {
                const body = { title: v.title, description: v.description || null, folderId: v.folderId || null, tags: v.tags || null, expiresOn: v.expiresOn || null, roles, ...(file ? { fileId: file.id } : {}) };
                if (existing) await api(`/api/documents/${existing.id}`, { method: 'PUT', body });
                else await api('/api/documents', { method: 'POST', body: { ...body, notify } });
                toast.success(existing ? (file ? 'New version uploaded' : 'Document updated') : 'Document uploaded');
                invalidate(['/api/documents']);
                onClose();
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={existing ? 'Replace file (new version)' : 'File'} required={!existing} className="sm:col-span-2">
          <FileUpload value={file} onChange={setFile} purpose="DOCS" />
        </Field>
        <Field label="Title" required className="sm:col-span-2">
          <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Fire safety NOC" />
        </Field>
        <Field label="Folder">
          <Select value={v.folderId} onChange={(e) => setV({ ...v, folderId: e.target.value })} options={folders.map((f) => ({ value: f.id, label: f.name }))} placeholder="No folder" />
        </Field>
        <Field label="Valid till" hint="You are warned 30 days before it expires.">
          <Input type="date" value={v.expiresOn} onChange={(e) => setV({ ...v, expiresOn: e.target.value })} />
        </Field>
        <Field label="Tags" className="sm:col-span-2">
          <Input value={v.tags} onChange={(e) => setV({ ...v, tags: e.target.value })} placeholder="compliance, CBSE" />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </Field>
        <Field label="Who can open it" required className="sm:col-span-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {AUDIENCE_ROLE_OPTIONS.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm">
                <Checkbox checked={roles.includes(o.value)} onCheckedChange={(c) => setRoles((r) => (c ? [...r, o.value] : r.filter((x) => x !== o.value)))} /> {o.label}
              </label>
            ))}
          </div>
        </Field>
        {!existing && (
          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <Switch checked={notify} onCheckedChange={setNotify} /> Notify these people
          </label>
        )}
      </div>
    </Dialog>
  );
}

