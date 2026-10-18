'use client';

import * as React from 'react';
import { FileText, Loader2, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export interface UploadedFile {
  id: string;
  fileName: string;
  mimeType?: string;
  size?: number;
}

export function FileUpload({ value, onChange, purpose, accept = '.pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.pptx', label = 'Attach file' }: { value: UploadedFile | null; onChange: (f: UploadedFile | null) => void; purpose: string; accept?: string; label?: string }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  async function upload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('purpose', purpose);
      const res = await fetch('/api/files', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Upload failed');
      onChange(json.data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  }
  return (
    <div>
      {value ? (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2 text-sm">
          <FileText className="size-4 text-brand-600" />
          <a href={`/api/files/${value.id}`} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate hover:underline">
            {value.fileName}
          </a>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove attachment" onClick={() => onChange(null)}>
            <X />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <Paperclip />} {busy ? 'Uploading…' : label}
        </Button>
      )}
      <input ref={ref} type="file" hidden accept={accept} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <p className="mt-1 text-[11px] text-ink-faint">PDF, images or Office files, up to 5 MB.</p>
    </div>
  );
}
