'use client';

import * as React from 'react';
import { Minus, PackagePlus, Plus, Printer, Search, ShoppingCart, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, usePagedQuery, useInvalidate } from '@/lib/api-client';
import { cn, formatDateTime, formatINR } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { ResourcePage } from '@/components/resource';
import { StudentPicker, type PickedStudent } from '@/components/student-picker';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, EmptyState, LoadingBlock, PageHeader, StatusBadge } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input, Select } from '@/components/ui/form';
import { Dialog, MenuItem, Tabs, TabPanel, usePrompt } from '@/components/ui/overlay';

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  gstPercent: number;
  stock: number;
  reorderAt: number;
  isActive: boolean;
  categoryId: string | null;
  category: { name: string } | null;
}

function Pos() {
  const invalidate = useInvalidate();
  const { data: products, isLoading } = useApiQuery<Product[]>('/api/store/products');
  const { data: cats } = useApiQuery<Array<{ id: string; name: string }>>('/api/store/categories');
  const [cat, setCat] = React.useState('');
  const [q, setQ] = React.useState('');
  const [cart, setCart] = React.useState<Record<string, number>>({});
  const [student, setStudent] = React.useState<PickedStudent | null>(null);
  const [customer, setCustomer] = React.useState('');
  const [mode, setMode] = React.useState('CASH');
  const [busy, setBusy] = React.useState(false);
  const list = (products ?? []).filter((p) => p.isActive && (!cat || p.categoryId === cat) && (!q || `${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase())));
  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ p: products?.find((x) => x.id === id), qty }))
    .filter((l): l is { p: Product; qty: number } => !!l.p);
  const sub = lines.reduce((a, l) => a + Number(l.p.price) * l.qty, 0);
  const tax = lines.reduce((a, l) => a + (Number(l.p.price) * l.qty * Number(l.p.gstPercent)) / 100, 0);
  const add = (p: Product, d = 1) =>
    setCart((c) => {
      const next = Math.max(0, Math.min(p.stock, (c[p.id] ?? 0) + d));
      const { [p.id]: _, ...rest } = c;
      return next ? { ...rest, [p.id]: next } : rest;
    });

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or scan SKU…" className="h-9 pl-9" />
          </div>
          <Select className="h-9 w-40" value={cat} onChange={(e) => setCat(e.target.value)} options={(cats ?? []).map((c) => ({ value: c.id, label: c.name }))} placeholder="All categories" />
        </div>
        {isLoading ? (
          <LoadingBlock />
        ) : !list.length ? (
          <EmptyState title="No products" description="Add products in the Products tab." />
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={p.stock === 0}
                onClick={() => add(p)}
                className={cn('flex flex-col rounded-xl border border-line p-3 text-left transition-all hover:border-brand-400 hover:shadow-card disabled:opacity-50', cart[p.id] && 'border-brand-500 ring-2 ring-brand-500/20')}
              >
                <p className="line-clamp-2 text-sm font-semibold">{p.name}</p>
                <p className="text-[11px] text-ink-faint">{p.sku}</p>
                <div className="mt-auto flex items-end justify-between pt-3">
                  <span className="font-bold">{formatINR(Number(p.price))}</span>
                  <Badge tone={p.stock === 0 ? 'danger' : p.stock <= p.reorderAt ? 'warning' : 'neutral'}>{p.stock} left</Badge>
                </div>
                {cart[p.id] && <span className="mt-2 text-xs font-semibold text-brand-700">In cart: {cart[p.id]}</span>}
              </button>
            ))}
          </div>
        )}
      </Card>
      <Card className="flex flex-col xl:sticky xl:top-20 xl:max-h-[calc(100dvh-7rem)]">
        <CardHeader title="Bill" icon={ShoppingCart} actions={lines.length > 0 && <Button variant="ghost" size="sm" onClick={() => setCart({})}>Clear</Button>} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!lines.length ? (
            <EmptyState title="Cart is empty" description="Tap products to add them." />
          ) : (
            <ul className="divide-y divide-line">
              {lines.map(({ p, qty }) => (
                <li key={p.id} className="flex items-center gap-2 px-5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-[11px] text-ink-faint">
                      {formatINR(Number(p.price))} × {qty} · GST {Number(p.gstPercent)}%
                    </p>
                  </div>
                  <Button variant="secondary" size="icon-sm" aria-label="Less" onClick={() => add(p, -1)}>
                    <Minus />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                  <Button variant="secondary" size="icon-sm" aria-label="More" onClick={() => add(p, 1)}>
                    <Plus />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <CardBody className="space-y-3 border-t border-line">
          <StudentPicker value={student} onChange={setStudent} placeholder="Bill to student (optional)…" />
          {!student && <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Or customer name" />}
          <Select value={mode} onChange={(e) => setMode(e.target.value)} options={[{ value: 'CASH', label: 'Cash' }, { value: 'UPI', label: 'UPI' }, { value: 'CARD', label: 'Card' }, { value: 'BANK_TRANSFER', label: 'Bank transfer' }]} />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-ink-soft">
              <span>Subtotal</span>
              <span>{formatINR(sub)}</span>
            </div>
            <div className="flex justify-between text-ink-soft">
              <span>GST</span>
              <span>{formatINR(tax)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatINR(sub + tax)}</span>
            </div>
          </div>
          <Button
            className="w-full"
            size="lg"
            loading={busy}
            disabled={!lines.length}
            onClick={async () => {
              setBusy(true);
              try {
                const o = await api<{ id: string; orderNo: string }>('/api/store/orders', { method: 'POST', body: { items: lines.map((l) => ({ productId: l.p.id, qty: l.qty })), studentId: student?.id ?? null, customerName: customer || null, mode } });
                toast.success(`Sale ${o.orderNo} recorded`, { action: { label: 'Print', onClick: () => window.open(`/print/store-order/${o.id}`, '_blank') } });
                setCart({});
                setStudent(null);
                setCustomer('');
                invalidate(['/api/store', '/api/accounts', '/api/dashboard']);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Charge {formatINR(sub + tax)}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

interface Order {
  id: string;
  orderNo: string;
  customerName: string;
  total: number;
  tax: number;
  mode: string;
  status: string;
  createdAt: string;
  items: Array<{ name: string; qty: number }>;
}

function Orders() {
  const { can } = useApp();
  const prompt = usePrompt();
  const invalidate = useInvalidate();
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = usePagedQuery<Order>('/api/store/orders', { page, pageSize: 25 });
  return (
    <Card>
      <div className="border-b border-line px-5 py-3 text-sm">
        Sales: <b>{formatINR(Number(data?.sumTotal ?? 0), true)}</b> · GST collected: <b>{formatINR(Number(data?.sumTax ?? 0), true)}</b>
      </div>
      <DataTable<Order>
        data={data?.data}
        loading={isLoading}
        pagination={data ? { page, pageSize: 25, total: data.total, onPageChange: setPage } : undefined}
        emptyTitle="No sales yet"
        columns={[
          { accessorKey: 'orderNo', header: 'Bill', cell: ({ row }) => <div><p className="font-medium">{row.original.orderNo}</p><p className="text-xs text-ink-faint">{formatDateTime(row.original.createdAt)}</p></div> },
          { accessorKey: 'customerName', header: 'Customer' },
          { id: 'items', header: 'Items', cell: ({ row }) => <span className="text-xs text-ink-soft">{row.original.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}</span> },
          { accessorKey: 'mode', header: 'Mode' },
          { accessorKey: 'total', header: 'Total', cell: ({ getValue }) => <span className="font-semibold">{formatINR(Number(getValue()))}</span> },
          { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
          {
            id: 'a',
            header: '',
            cell: ({ row }) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" aria-label="Print bill" onClick={() => window.open(`/print/store-order/${row.original.id}`, '_blank')}>
                  <Printer />
                </Button>
                {can('store', 'delete') && row.original.status === 'PAID' && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Cancel sale"
                    onClick={async () => {
                      const reason = await prompt({ title: `Cancel ${row.original.orderNo}?`, description: 'Stock is restored and the sale is removed from Accounts.', label: 'Reason', minLength: 3, confirmLabel: 'Cancel sale' });
                      if (!reason) return;
                      await api(`/api/store/orders/${row.original.id}`, { method: 'POST', body: { reason } });
                      toast.success('Sale cancelled');
                      invalidate(['/api/store', '/api/accounts']);
                    }}
                  >
                    <XCircle />
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
}

function Products() {
  const { can } = useApp();
  const invalidate = useInvalidate();
  const { data: cats } = useApiQuery<Array<{ id: string; name: string }>>('/api/store/categories');
  const [adjust, setAdjust] = React.useState<Product | null>(null);
  const [delta, setDelta] = React.useState('10');
  const [reason, setReason] = React.useState('PURCHASE');
  return (
    <>
      <ResourcePage<Product>
        embedded
        title="Products"
        entityLabel="Product"
        endpoint="/api/store/products"
        module="store"
        searchPlaceholder="Name or SKU…"
        exportRow={(p) => ({ SKU: p.sku, Product: p.name, Category: p.category?.name ?? '', Price: Number(p.price), 'GST %': Number(p.gstPercent), Stock: p.stock })}
        columns={[
          { accessorKey: 'name', header: 'Product', cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p><p className="text-xs text-ink-faint">{row.original.sku} · {row.original.category?.name ?? 'Uncategorised'}</p></div> },
          { accessorKey: 'price', header: 'Price', cell: ({ getValue }) => formatINR(Number(getValue())) },
          { accessorKey: 'gstPercent', header: 'GST', cell: ({ getValue }) => `${Number(getValue())}%` },
          { accessorKey: 'stock', header: 'Stock', cell: ({ row }) => <Badge tone={row.original.stock === 0 ? 'danger' : row.original.stock <= row.original.reorderAt ? 'warning' : 'success'}>{row.original.stock} {row.original.unit}</Badge> },
          { accessorKey: 'isActive', header: 'Status', cell: ({ getValue }) => (getValue() ? <Badge tone="success">On sale</Badge> : <Badge>Hidden</Badge>) },
        ]}
        fields={[
          { name: 'name', label: 'Name', required: true, span: 2 },
          { name: 'sku', label: 'SKU / barcode', required: true },
          { name: 'categoryId', label: 'Category', type: 'select', options: (cats ?? []).map((c) => ({ value: c.id, label: c.name })) },
          { name: 'price', label: 'Price (before GST)', type: 'money', required: true },
          { name: 'gstPercent', label: 'GST %', type: 'select', required: true, options: [0, 5, 12, 18, 28].map((g) => ({ value: String(g), label: `${g}%` })) },
          { name: 'unit', label: 'Unit', placeholder: 'pcs, set, kg' },
          { name: 'reorderAt', label: 'Low-stock alert at', type: 'number' },
          { name: 'openingStock', label: 'Opening stock', type: 'number', createOnly: true },
          { name: 'isActive', label: 'Available for sale', type: 'switch' },
        ]}
        defaults={{ unit: 'pcs', gstPercent: '5', reorderAt: 10, isActive: true, openingStock: 0 }}
        fromForm={(v) => ({ ...v, gstPercent: Number(v.gstPercent) })}
        toForm={(p) => ({ ...p, price: Number(p.price), gstPercent: String(Number(p.gstPercent)), categoryId: p.categoryId ?? '' })}
        rowActions={(p) =>
          can('store', 'edit') ? (
            <MenuItem onSelect={() => setAdjust(p)}>
              <PackagePlus /> Adjust stock
            </MenuItem>
          ) : null
        }
      />
      <Dialog
        open={!!adjust}
        onOpenChange={(o) => !o && setAdjust(null)}
        title={`Adjust stock · ${adjust?.name ?? ''}`}
        description={`Current stock: ${adjust?.stock ?? 0}. Use a negative number to remove stock.`}
        size="sm"
        footer={
          <Button
            onClick={async () => {
              try {
                const r = await api<{ stock: number }>(`/api/store/products/${adjust!.id}/stock`, { method: 'POST', body: { delta: Number(delta), reason } });
                toast.success(`Stock now ${r.stock}`);
                invalidate(['/api/store', '/api/dashboard']);
                setAdjust(null);
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            Save
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantity (+/−)">
            <Input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} />
          </Field>
          <Field label="Reason">
            <Select value={reason} onChange={(e) => setReason(e.target.value)} options={['PURCHASE', 'RETURN', 'DAMAGE', 'AUDIT', 'OTHER'].map((r) => ({ value: r, label: r.toLowerCase() }))} />
          </Field>
        </div>
      </Dialog>
    </>
  );
}

export default function StorePage() {
  const { can } = useApp();
  const [tab, setTab] = React.useState(can('store', 'create') ? 'pos' : 'orders');
  return (
    <>
      <PageHeader title="Store & POS" description="Uniforms, books and stationery with GST billing and stock control." icon={ShoppingCart} />
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[...(can('store', 'create') ? [{ value: 'pos', label: 'Billing' }] : []), { value: 'orders', label: 'Sales' }, { value: 'products', label: 'Products' }, { value: 'categories', label: 'Categories' }]}
      >
        <TabPanel value="pos">
          <Pos />
        </TabPanel>
        <TabPanel value="orders">
          <Orders />
        </TabPanel>
        <TabPanel value="products">
          <Products />
        </TabPanel>
        <TabPanel value="categories">
          <ResourcePage<{ id: string; name: string; _count: { products: number } }>
            embedded
            title="Categories"
            entityLabel="Category"
            endpoint="/api/store/categories"
            module="store"
            columns={[
              { accessorKey: 'name', header: 'Category', cell: ({ getValue }) => <span className="font-medium">{getValue()}</span> },
              { id: 'n', header: 'Products', cell: ({ row }) => row.original._count.products },
            ]}
            fields={[{ name: 'name', label: 'Name', required: true }]}
          />
        </TabPanel>
      </Tabs>
    </>
  );
}

