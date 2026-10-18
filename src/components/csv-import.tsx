'use client';

import * as React from 'react';
import { CheckCircle2, Download, Upload, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { parseCsv } from '@/lib/csv';
import { downloadCsv } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/display';
import { Dialog } from '@/components/ui/overlay';

export interface ImportResult {
  valid?: number;
  created?: number;
  errors?: Array<{ row: number; error: string }>;
  failed?: Array<{ row: number; error: string }>;
  summary?: string;
}

/**
 * Spreadsheet import used across modules: download a template, upload a CSV,
 * check every row on the server (dry run) and only then import. The endpoint
 * receives `{ rows, dryRun, ...extra }` and validates everything again.
 */
export function CsvImportDialog({
  open,
  onOpenChange,
  title,
  description,
  endpoint,
  columns,
  required,
  sample,
  extra,
  maxRows = 1000,
  onDone,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: React.ReactNode;
  endpoint: string;
  columns: string[];
  required: string[];
  sample: Record<string, string>;
  extra?: Record<string, unknown>;
  maxRows?: number;
  onDone?: () => void;
  children?: React.ReactNode;
}) {
  const [rows, setRows] = React.useState<Array<Record<string, string>>>([]);
  const [fileName, setFileName] = React.useState('');
  const [checked, setChecked] = React.useState<ImportResult | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setRows([]);
      setFileName('');
      setChecked(null);
      setResult(null);
    }
  }, [open]);

  const missing = rows.length ? required.filter((h) => !(h in rows[0])) : [];

  async function run(dryRun: boolean) {
    setBusy(true);
    try {
      const r = await api<ImportResult>(endpoint, { method: 'POST', body: { rows, dryRun, ...extra } });
      if (dryRun) setChecked(r);
      else {
        setResult(r);
        toast.success(r.summary ?? `${r.created ?? 0} imported`);
        onDone?.();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const errors = (result?.failed ?? checked?.errors ?? []).slice(0, 50);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="lg"
      footer={
        result ? (
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {checked && !checked.errors?.length ? (
              <Button loading={busy} onClick={() => run(false)}>
                Import {checked.valid ?? rows.length} rows
              </Button>
            ) : (
              <Button loading={busy} disabled={!rows.length || !!missing.length || rows.length > maxRows} onClick={() => run(true)}>
                Check file
              </Button>
            )}
          </>
        )
      }
    >
      <div className="space-y-4 text-sm">
        {children}
        <div className="flex flex-wrap items-center gap-2 text-ink-soft">
          Required columns: {required.map((r) => <Badge key={r}>{r}</Badge>)}
          <Button variant="ghost" size="sm" onClick={() => downloadCsv(title.toLowerCase().replace(/[^a-z]+/g, '-') + '-template', [Object.fromEntries(columns.map((c) => [c, sample[c] ?? '']))])}>
            <Download /> Template
          </Button>
        </div>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line px-6 py-8 text-center hover:border-brand-400">
          <Upload className="size-6 text-brand-600" />
          <span className="font-medium">{fileName || 'Choose a CSV file'}</span>
          <span className="text-xs text-ink-faint">{rows.length ? `${rows.length} rows detected` : `Up to ${maxRows} rows · dates as YYYY-MM-DD or DD/MM/YYYY`}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setFileName(f.name);
              setChecked(null);
              setResult(null);
              setRows(parseCsv(await f.text()));
              e.target.value = '';
            }}
          />
        </label>
        {missing.length > 0 && <p className="text-rose-600">Missing columns: {missing.join(', ')}</p>}
        {rows.length > maxRows && <p className="text-rose-600">Too many rows — split the file into parts of {maxRows}.</p>}
        {checked && !result && (
          <p className={checked.errors?.length ? 'text-rose-600' : 'text-emerald-600'}>
            {checked.errors?.length ? (
              <>
                <XCircle className="mr-1 inline size-4" /> {checked.errors.length} rows need fixing. Correct the file and check again.
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1 inline size-4" /> All {checked.valid} rows are valid{checked.summary ? ` — ${checked.summary}` : ''}.
              </>
            )}
          </p>
        )}
        {result && (
          <p className="text-emerald-600">
            <CheckCircle2 className="mr-1 inline size-4" /> {result.summary ?? `${result.created} imported`}
            {result.failed?.length ? <span className="text-rose-600"> · {result.failed.length} rows failed</span> : null}
          </p>
        )}
        {errors.length > 0 && (
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line p-3 text-xs">
            {errors.map((e) => (
              <li key={`${e.row}-${e.error}`}>
                <b>Row {e.row}:</b> {e.error}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
