'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Eye, Globe, Newspaper, PenLine, Send, Trash2, Undo2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { Markdown } from '@/lib/markdown';
import { useApp } from '@/components/shell/app-context';
import { FileUpload, type UploadedFile } from '@/components/file-upload';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, EmptyState, LoadingBlock, PageHeader, StatusBadge } from '@/components/ui/display';
import { Field, Input, Segmented, Switch, Textarea } from '@/components/ui/form';
import { Dialog, Tabs, TabPanel, useConfirm, usePrompt } from '@/components/ui/overlay';

interface PostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverFileId: string | null;
  status: 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED';
  isPublic: boolean;
  authorName: string;
  reviewNote: string | null;
  publishedAt: string | null;
  updatedAt: string;
  mine: boolean;
  canEdit: boolean;
}
interface Post extends Omit<PostRow, 'excerpt'> {
  excerpt: string | null;
  body: string;
  canReview: boolean;
}

const STATUS = { DRAFT: 'Draft', PENDING: 'Waiting for review', PUBLISHED: 'Published', REJECTED: 'Changes requested' } as const;

export default function BlogPage() {
  return (
    <React.Suspense>
      <Blog />
    </React.Suspense>
  );
}

function Blog() {
  const params = useSearchParams();
  const id = params.get('post');
  return id ? <Reader id={id} /> : <Listing initialTab={params.get('tab') ?? 'news'} />;
}

function Listing({ initialTab }: { initialTab: string }) {
  const { can, me } = useApp();
  const [tab, setTab] = React.useState(initialTab);
  const [editing, setEditing] = React.useState<Post | 'new' | null>(null);
  const editor = can('blog', 'edit');
  const { data: published, isLoading } = useApiQuery<PostRow[]>('/api/blog');
  const { data: mine } = useApiQuery<PostRow[]>(can('blog', 'create') ? '/api/blog' : null, { status: 'MINE' });
  const { data: pending } = useApiQuery<PostRow[]>(editor ? '/api/blog' : null, { status: 'PENDING' });
  return (
    <>
      <PageHeader
        title="News & Blog"
        description="School news and stories, reviewed before they are published."
        icon={Newspaper}
        actions={
          <div className="flex gap-2">
            {editor && (
              <Button variant="secondary" onClick={() => window.open(`/news/${me.school.code}`, '_blank')}>
                <Globe /> Public page
              </Button>
            )}
            {can('blog', 'create') && (
              <Button onClick={() => setEditing('new')}>
                <PenLine /> Write a post
              </Button>
            )}
          </div>
        }
      />
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: 'news', label: 'News', count: published?.length },
          ...(can('blog', 'create') ? [{ value: 'mine', label: 'My posts', count: mine?.length }] : []),
          ...(editor ? [{ value: 'review', label: 'Review', count: pending?.length }] : []),
        ]}
      >
        <TabPanel value="news">{isLoading ? <LoadingBlock /> : <PostGrid rows={published ?? []} empty="No news yet" />}</TabPanel>
        <TabPanel value="mine">
          <PostList rows={mine ?? []} onEdit={async (r) => setEditing(await api<Post>(`/api/blog/${r.id}`))} />
        </TabPanel>
        <TabPanel value="review">
          <PostList rows={pending ?? []} onEdit={async (r) => setEditing(await api<Post>(`/api/blog/${r.id}`))} review />
        </TabPanel>
      </Tabs>
      <EditorDialog post={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function Cover({ fileId, className }: { fileId: string | null; className?: string }) {
  if (!fileId) return <div className={`flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 text-brand-400 dark:from-brand-500/10 dark:to-brand-500/5 ${className ?? ''}`}><Newspaper className="size-10" /></div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/api/files/${fileId}`} alt="" className={`object-cover ${className ?? ''}`} loading="lazy" />;
}

function PostGrid({ rows, empty }: { rows: PostRow[]; empty: string }) {
  const router = useRouter();
  if (!rows.length) return <Card><EmptyState icon={Newspaper} title={empty} /></Card>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((p) => (
        <button key={p.id} type="button" onClick={() => router.push(`/blog?post=${p.id}`)} className="card flex flex-col overflow-hidden text-left transition-shadow hover:shadow-pop">
          <Cover fileId={p.coverFileId} className="aspect-[16/9] w-full" />
          <div className="p-4">
            <p className="font-semibold">{p.title}</p>
            <p className="mt-1 line-clamp-3 text-sm text-ink-soft">{p.excerpt}</p>
            <p className="mt-2 text-xs text-ink-faint">
              {p.authorName} · {formatDate(p.publishedAt)} {p.isPublic && <Badge tone="info" className="ml-1">Public</Badge>}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

function PostList({ rows, onEdit, review }: { rows: PostRow[]; onEdit: (r: PostRow) => void; review?: boolean }) {
  const router = useRouter();
  if (!rows.length) return <Card><EmptyState icon={PenLine} title={review ? 'Nothing waiting for review' : 'You have not written any posts'} /></Card>;
  return (
    <Card>
      <ul className="divide-y divide-line">
        {rows.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{p.title}</p>
              <p className="text-xs text-ink-faint">
                {review ? `${p.authorName} · ` : ''}updated {formatDate(p.updatedAt)}
                {p.reviewNote && p.status === 'REJECTED' && <span className="text-rose-600"> · “{p.reviewNote}”</span>}
              </p>
            </div>
            <StatusBadge status={p.status === 'REJECTED' ? 'REJECTED' : p.status === 'PUBLISHED' ? 'APPROVED' : p.status === 'PENDING' ? 'PENDING' : 'INACTIVE'} label={STATUS[p.status]} />
            <Button size="sm" variant="ghost" onClick={() => router.push(`/blog?post=${p.id}`)}>
              <Eye /> View
            </Button>
            {p.canEdit && (
              <Button size="sm" variant="secondary" onClick={() => onEdit(p)}>
                <PenLine /> {review ? 'Review' : 'Edit'}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Reader({ id }: { id: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data, isLoading, error } = useApiQuery<Post>(`/api/blog/${id}`);
  const [editing, setEditing] = React.useState(false);
  if (isLoading) return <LoadingBlock />;
  if (!data) return <Card><EmptyState icon={Newspaper} title="Post not found" description={error?.message} /></Card>;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => router.push('/blog')}>
          <ArrowLeft /> News & Blog
        </Button>
        <div className="ml-auto flex gap-2">
          {data.canEdit && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <PenLine /> Edit
            </Button>
          )}
          {data.canEdit && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete post"
              onClick={async () => {
                if (!(await confirm({ title: `Delete "${data.title}"?`, confirmLabel: 'Delete' }))) return;
                try {
                  await api(`/api/blog/${id}`, { method: 'DELETE' });
                  invalidate(['/api/blog']);
                  router.push('/blog');
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </div>
      <article className="card mx-auto max-w-3xl overflow-hidden">
        {data.coverFileId && <Cover fileId={data.coverFileId} className="aspect-[21/9] w-full" />}
        <div className="p-6 sm:p-8">
          {data.status !== 'PUBLISHED' && <StatusBadge status={data.status === 'REJECTED' ? 'REJECTED' : 'PENDING'} label={STATUS[data.status]} />}
          <h1 className="mt-2 text-2xl font-bold">{data.title}</h1>
          <p className="mt-1 text-sm text-ink-faint">
            {data.authorName} · {formatDate(data.publishedAt ?? data.updatedAt, 'long')}
          </p>
          <Markdown text={data.body} className="mt-6 space-y-3 text-[15px]" />
        </div>
      </article>
      <EditorDialog post={editing ? data : null} onClose={() => setEditing(false)} />
    </>
  );
}

function EditorDialog({ post, onClose }: { post: Post | 'new' | null; onClose: () => void }) {
  const { can } = useApp();
  const invalidate = useInvalidate();
  const prompt = usePrompt();
  const editor = can('blog', 'edit');
  const existing = post && post !== 'new' ? post : null;
  const [v, setV] = React.useState({ title: '', excerpt: '', body: '', isPublic: false });
  const [cover, setCover] = React.useState<UploadedFile | null>(null);
  const [mode, setMode] = React.useState<'write' | 'preview'>('write');
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (!post) return;
    setMode('write');
    setV(existing ? { title: existing.title, excerpt: existing.excerpt ?? '', body: existing.body, isPublic: existing.isPublic } : { title: '', excerpt: '', body: '', isPublic: false });
    setCover(existing?.coverFileId ? { id: existing.coverFileId, fileName: 'Cover image' } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post]);
  if (!post) return null;
  const save = async (action: string, reviewNote?: string) => {
    setBusy(true);
    try {
      const body = { title: v.title, excerpt: v.excerpt || null, body: v.body, coverFileId: cover?.id ?? null, isPublic: v.isPublic, action, reviewNote };
      if (existing) await api(`/api/blog/${existing.id}`, { method: 'PUT', body });
      else await api('/api/blog', { method: 'POST', body });
      toast.success({ draft: 'Draft saved', submit: 'Sent for review', publish: editor ? 'Published' : 'Sent for review', reject: 'Sent back to the author', unpublish: 'Unpublished' }[action] ?? 'Saved');
      invalidate(['/api/blog']);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const ok = v.title.trim().length >= 3 && v.body.trim().length >= 20;
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={existing ? `Edit · ${existing.title}` : 'Write a post'}
      description={editor ? 'You can publish directly.' : 'An editor reviews your post before it is published.'}
      size="xl"
      footer={
        <>
          {existing?.status === 'PUBLISHED' && editor && (
            <Button variant="ghost" loading={busy} onClick={() => save('unpublish')}>
              <Undo2 /> Unpublish
            </Button>
          )}
          {existing?.status === 'PENDING' && editor && (
            <Button
              variant="danger-soft"
              loading={busy}
              onClick={async () => {
                const note = await prompt({ title: 'What should the author change?', label: 'Note to the author', minLength: 3, confirmLabel: 'Send back' });
                if (note) await save('reject', note);
              }}
            >
              <XCircle /> Request changes
            </Button>
          )}
          <Button variant="secondary" loading={busy} disabled={!ok} onClick={() => save('draft')}>
            Save draft
          </Button>
          <Button loading={busy} disabled={!ok} onClick={() => save(editor ? 'publish' : 'submit')}>
            {editor ? <><CheckCircle2 /> Publish</> : <><Send /> Send for review</>}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" required>
          <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={150} />
        </Field>
        <Field label="Summary (shown on cards)">
          <Input value={v.excerpt} onChange={(e) => setV({ ...v, excerpt: e.target.value })} maxLength={300} />
        </Field>
        <Field label="Cover image">
          <FileUpload value={cover} onChange={setCover} purpose="BLOG" accept=".jpg,.jpeg,.png,.webp" label="Upload cover" />
        </Field>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Story</p>
          <Segmented size="sm" value={mode} onChange={setMode} options={[{ value: 'write', label: 'Write' }, { value: 'preview', label: 'Preview' }]} />
        </div>
        {mode === 'write' ? (
          <Textarea rows={14} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} placeholder={'# Heading\n\nWrite paragraphs separated by a blank line.\n\n- bullet points\n- **bold** and *italic*\n- [links](https://example.com)'} className="font-mono text-sm" aria-label="Story" />
        ) : (
          <Card>
            <CardBody>{v.body.trim() ? <Markdown text={v.body} /> : <p className="text-sm text-ink-faint">Nothing to preview yet.</p>}</CardBody>
          </Card>
        )}
        {editor && (
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={v.isPublic} onCheckedChange={(c) => setV({ ...v, isPublic: c })} /> Also show on the public news page (turn the page on in School Settings)
          </label>
        )}
      </div>
    </Dialog>
  );
}
