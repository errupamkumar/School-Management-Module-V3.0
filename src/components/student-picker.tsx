'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import { ChevronsUpDown, Search } from 'lucide-react';
import { usePagedQuery } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/display';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay';

export interface PickedStudent {
  id: string;
  name: string;
  admissionNo: string;
  classLabel: string;
  photoUrl: string | null;
  guardian?: { fatherName: string | null; primaryPhone: string } | null;
}

export function StudentPicker({ value, onChange, placeholder = 'Search student by name, admission no. or mobile…', className, status = 'ACTIVE' }: { value: PickedStudent | null; onChange: (s: PickedStudent | null) => void; placeholder?: string; className?: string; status?: string }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);
  const { data, isFetching } = usePagedQuery<PickedStudent>(open && debounced.length >= 2 ? '/api/students' : null, { search: debounced, pageSize: 10, status, sort: 'name' });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn('input flex items-center gap-2 text-left', className)} aria-haspopup="listbox">
          {value ? (
            <>
              <Avatar name={value.name} src={value.photoUrl} size={24} />
              <span className="truncate font-medium">{value.name}</span>
              <span className="truncate text-xs text-ink-faint">
                {value.admissionNo} · {value.classLabel}
              </span>
            </>
          ) : (
            <span className="flex items-center gap-2 text-ink-faint">
              <Search className="size-4" /> {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-auto size-4 shrink-0 text-ink-faint" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,28rem)] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search className="size-4 text-ink-faint" />
            <Command.Input autoFocus value={search} onValueChange={setSearch} placeholder="Type at least 2 characters…" className="h-11 w-full bg-transparent text-sm outline-none" />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-1">
            {debounced.length < 2 ? (
              <p className="px-3 py-6 text-center text-xs text-ink-faint">Start typing a name, admission number or parent mobile</p>
            ) : isFetching && !data ? (
              <p className="px-3 py-6 text-center text-xs text-ink-faint">Searching…</p>
            ) : (
              <>
                <Command.Empty className="px-3 py-6 text-center text-xs text-ink-faint">No students found</Command.Empty>
                {data?.data.map((s) => (
                  <Command.Item
                    key={s.id}
                    value={s.id}
                    onSelect={() => {
                      onChange(s);
                      setOpen(false);
                      setSearch('');
                    }}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 data-[selected=true]:bg-brand-50 dark:data-[selected=true]:bg-brand-500/10"
                  >
                    <Avatar name={s.name} src={s.photoUrl} size={32} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="truncate text-xs text-ink-faint">
                        {s.admissionNo} · {s.classLabel} · {s.guardian?.fatherName ?? ''} {s.guardian?.primaryPhone ?? ''}
                      </p>
                    </div>
                  </Command.Item>
                ))}
              </>
            )}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
