'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, ImagePlus, Images, Loader2, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { cn, formatDate } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { FormDialog, dateInput, type FieldDef } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Badge, Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui/display';
import { Switch } from '@/components/ui/form';
import { Dialog, useConfirm } from '@/components/ui/overlay';

interface Album {
  id: string;
  title: string;
  description: string | null;
  eventDate: string | null;
  visibility: 'ALL' | 'STAFF';
  coverFileId: string | null;
  cover: string | null;
  preview: string[];
  canEdit: boolean;
  _count: { photos: number };
}
interface Photo {
  id: string;
  fileId: string;
  caption: string | null;
}

const img = (fileId: string) => `/api/files/${fileId}`;

export default function GalleryPage() {
  return (
    <React.Suspense>
      <Gallery />
    </React.Suspense>
  );
}

function Gallery() {
  const params = useSearchParams();
  const id = params.get('album');
  return id ? <AlbumView id={id} /> : <Albums />;
}

const albumFields: FieldDef[] = [
  { name: 'title', label: 'Album title', required: true, span: 2, placeholder: 'Annual Day 2026' },
  { name: 'eventDate', label: 'Event date', type: 'date' },
  { name: 'visibility', label: 'Who can see it', type: 'select', required: true, options: [{ value: 'ALL', label: 'Everyone (parents and students too)' }, { value: 'STAFF', label: 'Staff only' }] },
  { name: 'description', label: 'Description', type: 'textarea' },
];

function Albums() {
  const { can, isFamily } = useApp();
  const router = useRouter();
  const invalidate = useInvalidate();
  const [open, setOpen] = React.useState(false);
  const { data, isLoading } = useApiQuery<Album[]>('/api/gallery');
  return (
    <>
      <PageHeader
        title="Gallery"
        description={isFamily ? 'Photos from school events.' : 'Photo albums of school events shared with families.'}
        icon={Images}
        actions={
          can('gallery', 'create') &&
          !isFamily && (
            <Button onClick={() => setOpen(true)}>
              <Plus /> New album
            </Button>
          )
        }
      />
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <Card>
          <EmptyState icon={Images} title="No albums yet" description={isFamily ? 'Event photos shared by the school appear here.' : 'Create an album for an event, then add photos.'} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((a) => (
            <button key={a.id} type="button" onClick={() => router.push(`/gallery?album=${a.id}`)} className="card group flex flex-col overflow-hidden text-left">
              <div className="aspect-[4/3] bg-canvas">
                {a.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img(a.cover)} alt="" className="size-full object-cover transition-transform group-hover:scale-[1.02]" loading="lazy" />
                ) : (
                  <div className="flex size-full items-center justify-center text-ink-faint">
                    <Images className="size-10" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="font-semibold">{a.title}</p>
                <p className="text-xs text-ink-faint">
                  {a.eventDate ? formatDate(a.eventDate) : 'No date'} · {a._count.photos} photos
                  {a.visibility === 'STAFF' && ' · staff only'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="New album"
        fields={albumFields}
        initial={{ visibility: 'ALL' }}
        onSubmit={async (payload) => {
          const a = await api<{ id: string }>('/api/gallery', { method: 'POST', body: payload });
          invalidate(['/api/gallery']);
          router.push(`/gallery?album=${a.id}`);
        }}
      />
    </>
  );
}

function AlbumView({ id }: { id: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data, isLoading } = useApiQuery<Album & { photos: Photo[] }>(`/api/gallery/${id}`);
  const [editing, setEditing] = React.useState(false);
  const [viewer, setViewer] = React.useState<number | null>(null);
  const [uploading, setUploading] = React.useState<{ done: number; total: number } | null>(null);
  const [notify, setNotify] = React.useState(true);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const refresh = () => invalidate([`/api/gallery/${id}`, '/api/gallery']);

  async function upload(files: FileList) {
    const list = Array.from(files).slice(0, 100);
    setUploading({ done: 0, total: list.length });
    const ids: Array<{ fileId: string }> = [];
    for (const f of list) {
      try {
        const form = new FormData();
        form.set('file', f);
        form.set('purpose', 'GALLERY');
        const res = await fetch('/api/files', { method: 'POST', body: form });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error ?? 'Upload failed');
        ids.push({ fileId: json.data.id });
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message}`);
      }
      setUploading((u) => (u ? { ...u, done: u.done + 1 } : u));
    }
    if (ids.length) {
      try {
        await api(`/api/gallery/${id}`, { method: 'POST', body: { photos: ids, notify } });
        toast.success(`${ids.length} photos added`);
        refresh();
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
    setUploading(null);
  }

  if (isLoading || !data) return <LoadingBlock />;
  const photos = data.photos;
  return (
    <>
      <PageHeader
        title={data.title}
        description={[data.eventDate ? formatDate(data.eventDate) : null, `${photos.length} photos`, data.visibility === 'STAFF' ? 'staff only' : null].filter(Boolean).join(' · ')}
        icon={Images}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => router.push('/gallery')}>
              <ArrowLeft /> Albums
            </Button>
            {data.canEdit && (
              <>
                <label className="flex items-center gap-2 text-xs text-ink-soft">
                  <Switch checked={notify} onCheckedChange={setNotify} /> Tell families
                </label>
                <Button onClick={() => fileRef.current?.click()} disabled={!!uploading}>
                  {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} {uploading ? `Uploading ${uploading.done}/${uploading.total}` : 'Add photos'}
                </Button>
                <Button variant="secondary" size="icon" aria-label="Edit album" onClick={() => setEditing(true)}>
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete album"
                  onClick={async () => {
                    if (!(await confirm({ title: `Delete "${data.title}"?`, description: 'All photos in the album are removed.', confirmLabel: 'Delete' }))) return;
                    try {
                      await api(`/api/gallery/${id}`, { method: 'DELETE' });
                      invalidate(['/api/gallery']);
                      router.push('/gallery');
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  <Trash2 />
                </Button>
                <input ref={fileRef} type="file" multiple hidden accept=".jpg,.jpeg,.png,.webp" onChange={(e) => e.target.files?.length && upload(e.target.files).finally(() => fileRef.current && (fileRef.current.value = ''))} />
              </>
            )}
          </div>
        }
      />
      {data.description && <p className="mb-4 max-w-3xl text-sm text-ink-soft">{data.description}</p>}
      {!photos.length ? (
        <Card>
          <EmptyState icon={ImagePlus} title="No photos yet" description={data.canEdit ? 'Add JPG, PNG or WebP photos (up to 5 MB each).' : 'Photos will appear here soon.'} />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {photos.map((p, i) => (
            <button key={p.id} type="button" onClick={() => setViewer(i)} className="relative aspect-square overflow-hidden rounded-xl bg-canvas">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(p.fileId)} alt={p.caption ?? ''} className="size-full object-cover" loading="lazy" />
              {data.coverFileId === p.fileId && (
                <Badge tone="brand" className="absolute left-2 top-2">
                  Cover
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}
      {viewer !== null && photos[viewer] && (
        <Dialog open onOpenChange={(o) => !o && setViewer(null)} title={`${viewer + 1} / ${photos.length}`} size="2xl">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(photos[viewer].fileId)} alt={photos[viewer].caption ?? ''} className="mx-auto max-h-[70vh] rounded-xl object-contain" />
            <Button className="absolute left-2 top-1/2 -translate-y-1/2" size="icon" variant="secondary" aria-label="Previous" disabled={viewer === 0} onClick={() => setViewer((v) => (v! > 0 ? v! - 1 : v))}>
              <ChevronLeft />
            </Button>
            <Button className="absolute right-2 top-1/2 -translate-y-1/2" size="icon" variant="secondary" aria-label="Next" disabled={viewer === photos.length - 1} onClick={() => setViewer((v) => (v! < photos.length - 1 ? v! + 1 : v))}>
              <ChevronRight />
            </Button>
          </div>
          <div className={cn('mt-3 flex flex-wrap items-center gap-2', !data.canEdit && 'hidden')}>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await api(`/api/gallery/${id}`, { method: 'PUT', body: { coverFileId: photos[viewer].fileId } });
                toast.success('Cover updated');
                refresh();
              }}
            >
              <Star /> Make cover
            </Button>
            <Button
              size="sm"
              variant="danger-soft"
              onClick={async () => {
                if (!(await confirm({ title: 'Remove this photo?', confirmLabel: 'Remove' }))) return;
                await api(`/api/gallery/${id}`, { method: 'PATCH', body: { removePhotoId: photos[viewer].id } });
                setViewer(null);
                refresh();
              }}
            >
              <Trash2 /> Remove
            </Button>
          </div>
        </Dialog>
      )}
      <FormDialog
        open={editing}
        onOpenChange={setEditing}
        title="Edit album"
        editing
        fields={albumFields}
        initial={{ title: data.title, description: data.description ?? '', eventDate: dateInput(data.eventDate), visibility: data.visibility }}
        onSubmit={async (payload) => {
          await api(`/api/gallery/${id}`, { method: 'PUT', body: payload });
          refresh();
        }}
      />
    </>
  );
}
