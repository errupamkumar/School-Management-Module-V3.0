'use client';

import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Download, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError, useApiQuery, useInvalidate } from '@/lib/api-client';
import type { Action, ModuleKey } from '@/lib/modules';
import { cn, downloadCsv } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Card, PageHeader } from '@/components/ui/display';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { Field, Input, Select, Switch, Textarea, type Option } from '@/components/ui/form';
import { Dialog, Menu, MenuContent, MenuItem, MenuTrigger, useConfirm } from '@/components/ui/overlay';

// ----------------------------------------------------------------------------
// Form fields
// ----------------------------------------------------------------------------

export interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'time' | 'datetime-local' | 'select' | 'textarea' | 'switch' | 'email' | 'tel' | 'url' | 'money';
  required?: boolean;
  options?: Option[];
  placeholder?: string;
  hint?: string;
  span?: 1 | 2;
  min?: number;
  max?: number;
  /** Hide the field when editing (e.g. immutable codes). */
  createOnly?: boolean;
  visible?: (values: Record<string, any>) => boolean;
}

export function FormFields({ fields, values, onChange, errors, editing }: { fields: FieldDef[]; values: Record<string, any>; onChange: (name: string, value: any) => void; errors: Record<string, string>; editing?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields
        .filter((f) => !(editing && f.createOnly) && (!f.visible || f.visible(values)))
        .map((f) => {
          const id = `f-${f.name}`;
          const value = values[f.name];
          const common = { id, name: f.name, invalid: !!errors[f.name], required: f.required, placeholder: f.placeholder };
          let control: React.ReactNode;
          switch (f.type) {
            case 'select':
              control = <Select {...common} value={value ?? ''} onChange={(e) => onChange(f.name, e.target.value)} options={f.options ?? []} placeholder={f.required ? 'Select…' : '—'} />;
              break;
            case 'textarea':
              control = <Textarea {...common} value={value ?? ''} onChange={(e) => onChange(f.name, e.target.value)} rows={4} />;
              break;
            case 'switch':
              control = (
                <div className="flex h-10 items-center">
                  <Switch id={id} checked={!!value} onCheckedChange={(v) => onChange(f.name, v)} />
                </div>
              );
              break;
            case 'number':
            case 'money':
              control = (
                <div className="relative">
                  {f.type === 'money' && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">₹</span>}
                  <Input
                    {...common}
                    type="number"
                    inputMode="decimal"
                    step={f.type === 'money' ? '0.01' : 'any'}
                    min={f.min}
                    max={f.max}
                    className={f.type === 'money' ? 'pl-7' : undefined}
                    value={value ?? ''}
                    onChange={(e) => onChange(f.name, e.target.value === '' ? '' : e.target.value)}
                  />
                </div>
              );
              break;
            default:
              control = <Input {...common} type={f.type ?? 'text'} value={value ?? ''} onChange={(e) => onChange(f.name, e.target.value)} />;
          }
          return (
            <Field key={f.name} label={f.label} required={f.required} error={errors[f.name]} hint={f.hint} htmlFor={id} className={f.span === 2 || f.type === 'textarea' ? 'sm:col-span-2' : undefined}>
              {control}
            </Field>
          );
        })}
    </div>
  );
}

/** Converts form strings into API payload types based on field definitions. */
export function coerce(fields: FieldDef[], values: Record<string, any>, editing?: boolean): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of fields) {
    if (editing && f.createOnly) continue;
    if (f.visible && !f.visible(values)) continue;
    const v = values[f.name];
    if (f.type === 'number' || f.type === 'money') out[f.name] = v === '' || v === undefined || v === null ? (f.required ? undefined : null) : Number(v);
    else if (f.type === 'switch') out[f.name] = !!v;
    else if (typeof v === 'string') out[f.name] = v.trim() === '' ? (f.required ? '' : null) : v.trim();
    else out[f.name] = v ?? null;
  }
  return out;
}

// ----------------------------------------------------------------------------
// Form dialog
// ----------------------------------------------------------------------------

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initial,
  onSubmit,
  submitLabel = 'Save',
  editing,
  size = 'lg',
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  /** Static list, or computed from current values for dependent dropdowns. */
  fields: FieldDef[] | ((values: Record<string, any>) => FieldDef[]);
  initial: Record<string, any>;
  onSubmit: (payload: Record<string, any>) => Promise<unknown>;
  submitLabel?: string;
  editing?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children?: React.ReactNode;
}) {
  const [values, setValues] = React.useState<Record<string, any>>(initial);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const fieldList = typeof fields === 'function' ? fields(values) : fields;

  React.useEffect(() => {
    if (open) {
      setValues(initial);
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const missing = fieldList.filter((f) => f.required && !(editing && f.createOnly) && (!f.visible || f.visible(values)) && (values[f.name] === undefined || values[f.name] === null || values[f.name] === ''));
    if (missing.length) {
      setErrors(Object.fromEntries(missing.map((f) => [f.name, `${f.label} is required`])));
      return;
    }
    setSaving(true);
    try {
      await onSubmit(coerce(fieldList, values, editing));
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size={size}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="resource-form" loading={saving}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id="resource-form" onSubmit={submit} noValidate>
        <FormFields fields={fieldList} values={values} errors={errors} editing={editing} onChange={(n, v) => setValues((s) => ({ ...s, [n]: v }))} />
        {children}
      </form>
    </Dialog>
  );
}

// ----------------------------------------------------------------------------
// Resource page
// ----------------------------------------------------------------------------

export interface ResourceProps<T extends { id: string }> {
  title: string;
  description?: string;
  icon?: LucideIcon;
  endpoint: string;
  module: ModuleKey;
  columns: ColumnDef<T, any>[];
  fields?: FieldDef[];
  defaults?: Record<string, any>;
  toForm?: (row: T) => Record<string, any>;
  /** Transform form values into the API payload. */
  fromForm?: (values: Record<string, any>) => Record<string, any>;
  params?: Record<string, string | undefined>;
  filters?: React.ReactNode;
  searchPlaceholder?: string;
  rowActions?: (row: T) => React.ReactNode;
  headerActions?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  entityLabel?: string;
  dialogSize?: 'sm' | 'md' | 'lg' | 'xl';
  exportName?: string;
  exportRow?: (row: T) => Record<string, unknown>;
  onRowClick?: (row: T) => void;
  embedded?: boolean;
  createLabel?: string;
  canAction?: (action: Action) => boolean;
  invalidate?: string[];
}

export function ResourcePage<T extends { id: string }>(props: ResourceProps<T>) {
  const { can } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [editing, setEditing] = React.useState<T | null>(null);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const allowed = (a: Action) => (props.canAction ? props.canAction(a) : can(props.module, a));
  const { data, isLoading, error, refetch } = useApiQuery<T[]>(props.endpoint, { ...props.params, search: debounced || undefined });
  const label = props.entityLabel ?? props.title.replace(/s$/, '');
  const refresh = () => invalidate([props.endpoint, ...(props.invalidate ?? [])]);

  const actionColumn: ColumnDef<T, any> | null =
    props.fields && (allowed('edit') || allowed('delete')) || props.rowActions
      ? {
          id: '__actions',
          header: '',
          size: 48,
          enableSorting: false,
          cell: ({ row }) => (
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <Menu>
                <MenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Actions">
                    <MoreHorizontal />
                  </Button>
                </MenuTrigger>
                <MenuContent>
                  {props.rowActions?.(row.original)}
                  {props.fields && allowed('edit') && (
                    <MenuItem onSelect={() => setEditing(row.original)}>
                      <Pencil /> Edit
                    </MenuItem>
                  )}
                  {props.fields && allowed('delete') && (
                    <MenuItem
                      danger
                      onSelect={async () => {
                        if (!(await confirm({ title: `Delete this ${label.toLowerCase()}?`, description: 'This cannot be undone.', confirmLabel: 'Delete' }))) return;
                        try {
                          await api(`${props.endpoint}/${row.original.id}`, { method: 'DELETE' });
                          toast.success(`${label} deleted`);
                          refresh();
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      <Trash2 /> Delete
                    </MenuItem>
                  )}
                </MenuContent>
              </Menu>
            </div>
          ),
        }
      : null;

  const columns = actionColumn ? [...props.columns, actionColumn] : props.columns;

  const content = (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={props.searchPlaceholder ?? 'Search…'} className="h-9 pl-9" />
        </div>
        {props.filters}
        <div className="ml-auto flex items-center gap-2">
          {props.exportRow && (
            <Button variant="secondary" size="sm" disabled={!data?.length} onClick={() => downloadCsv(props.exportName ?? props.title.toLowerCase().replace(/\s+/g, '-'), (data ?? []).map(props.exportRow!))}>
              <Download /> Export
            </Button>
          )}
          {props.embedded && props.fields && allowed('create') && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus /> {props.createLabel ?? `Add ${label.toLowerCase()}`}
            </Button>
          )}
        </div>
      </div>
      <DataTable
        columns={columns}
        data={data}
        loading={isLoading}
        error={error?.message}
        onRetry={() => refetch()}
        emptyTitle={props.emptyTitle ?? `No ${props.title.toLowerCase()} yet`}
        emptyDescription={props.emptyDescription}
        onRowClick={props.onRowClick}
      />
    </Card>
  );

  return (
    <div className={cn(props.embedded ? '' : '')}>
      {!props.embedded && (
        <PageHeader
          title={props.title}
          description={props.description}
          icon={props.icon}
          actions={
            <>
              {props.headerActions}
              {props.fields && allowed('create') && (
                <Button onClick={() => setCreating(true)}>
                  <Plus /> {props.createLabel ?? `Add ${label.toLowerCase()}`}
                </Button>
              )}
            </>
          }
        />
      )}
      {content}
      {props.fields && (
        <>
          <FormDialog
            open={creating}
            onOpenChange={setCreating}
            title={`Add ${label.toLowerCase()}`}
            fields={props.fields}
            initial={props.defaults ?? {}}
            size={props.dialogSize}
            onSubmit={async (payload) => {
              await api(props.endpoint, { method: 'POST', body: props.fromForm ? props.fromForm(payload) : payload });
              toast.success(`${label} added`);
              refresh();
            }}
          />
          <FormDialog
            open={!!editing}
            onOpenChange={(o) => !o && setEditing(null)}
            title={`Edit ${label.toLowerCase()}`}
            fields={props.fields}
            editing
            initial={editing ? (props.toForm ? props.toForm(editing) : (editing as Record<string, any>)) : {}}
            size={props.dialogSize}
            onSubmit={async (payload) => {
              await api(`${props.endpoint}/${editing!.id}`, { method: 'PUT', body: props.fromForm ? props.fromForm(payload) : payload });
              toast.success(`${label} updated`);
              refresh();
            }}
          />
        </>
      )}
    </div>
  );
}

export const dateInput = (v: string | null | undefined) => (v ? String(v).slice(0, 10) : '');
