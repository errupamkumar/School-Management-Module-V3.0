'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Checkbox } from './form';
import { EmptyState, ErrorState, Skeleton } from './display';

export type { ColumnDef };

export interface ServerPagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  error,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  pagination,
  pageSize = 25,
  onRowClick,
  selectable,
  rowSelection,
  onRowSelectionChange,
  getRowId,
  className,
  dense,
}: {
  columns: ColumnDef<T, any>[];
  data: T[] | undefined;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
  emptyAction?: React.ReactNode;
  pagination?: ServerPagination;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (s: RowSelectionState) => void;
  getRowId?: (row: T) => string;
  className?: string;
  dense?: boolean;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [internalSelection, setInternalSelection] = React.useState<RowSelectionState>({});
  const selection = rowSelection ?? internalSelection;

  const allColumns = React.useMemo<ColumnDef<T, any>[]>(() => {
    if (!selectable) return columns;
    return [
      {
        id: '__select',
        size: 36,
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all"
            checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? 'indeterminate' : false}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          />
        ),
        cell: ({ row }) => <Checkbox aria-label="Select row" checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} onClick={(e) => e.stopPropagation()} />,
      },
      ...columns,
    ];
  }, [columns, selectable]);

  const table = useReactTable({
    data: data ?? [],
    columns: allColumns,
    state: { sorting, rowSelection: selection },
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(selection) : updater;
      (onRowSelectionChange ?? setInternalSelection)(next);
    },
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    enableRowSelection: !!selectable,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(pagination ? { manualPagination: true, pageCount: Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) } : { getPaginationRowModel: getPaginationRowModel() }),
    initialState: { pagination: { pageSize } },
  });

  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  const rows = table.getRowModel().rows;
  const pageIndex = pagination ? pagination.page - 1 : table.getState().pagination.pageIndex;
  const pageCount = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : table.getPageCount();
  const total = pagination ? pagination.total : (data ?? []).length;
  const size = pagination ? pagination.pageSize : table.getState().pagination.pageSize;

  return (
    <div className={cn('min-w-0', className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-line">
                {hg.headers.map((h) => {
                  const sortable = h.column.getCanSort() && h.column.id !== '__select';
                  const dir = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      style={{ width: h.column.columnDef.size ? h.getSize() : undefined }}
                      className={cn('whitespace-nowrap bg-canvas/60 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint', dense ? 'py-2' : 'py-3')}
                    >
                      {h.isPlaceholder ? null : sortable ? (
                        <button type="button" className="inline-flex items-center gap-1 hover:text-ink" onClick={h.column.getToggleSortingHandler()}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {dir === 'asc' ? <ArrowUp className="size-3" /> : dir === 'desc' ? <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-40" />}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-line/60">
                    {allColumns.map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full max-w-[10rem]" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={cn('border-b border-line/60 transition-colors last:border-0', onRowClick && 'cursor-pointer hover:bg-canvas/70', row.getIsSelected() && 'bg-brand-50/60 dark:bg-brand-500/5')}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={cn('px-4 align-middle text-ink', dense ? 'py-2' : 'py-3')}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {!loading && rows.length === 0 && <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />}
      {!loading && total > size && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-ink-soft">
          <span>
            {pageIndex * size + 1}–{Math.min(total, (pageIndex + 1) * size)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label="Previous page"
              disabled={pageIndex === 0}
              onClick={() => (pagination ? pagination.onPageChange(pagination.page - 1) : table.previousPage())}
            >
              <ChevronLeft />
            </Button>
            <span className="px-2">
              Page {pageIndex + 1} / {pageCount}
            </span>
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label="Next page"
              disabled={pageIndex + 1 >= pageCount}
              onClick={() => (pagination ? pagination.onPageChange(pagination.page + 1) : table.nextPage())}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
