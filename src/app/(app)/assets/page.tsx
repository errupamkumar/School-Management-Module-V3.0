'use client';

import { Package } from 'lucide-react';
import { useApiQuery } from '@/lib/api-client';
import { formatDate, formatINR } from '@/lib/utils';
import { ResourcePage, dateInput } from '@/components/resource';
import { Badge, StatCard } from '@/components/ui/display';
import { Boxes, IndianRupee, Wrench } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitCost: number;
  location: string | null;
  condition: string;
  purchasedOn: string | null;
  supplier: string | null;
}

const CATEGORIES = ['Furniture', 'Electronics', 'Lab Equipment', 'Sports', 'Electrical', 'Books', 'Vehicles', 'Other'];

export default function AssetsPage() {
  const { data } = useApiQuery<Asset[]>('/api/assets');
  const value = (data ?? []).reduce((a, x) => a + x.quantity * Number(x.unitCost), 0);
  const repair = (data ?? []).filter((x) => x.condition === 'POOR' || x.condition === 'DAMAGED').length;
  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Asset lines" value={data?.length ?? 0} icon={Boxes} />
        <StatCard label="Book value" value={formatINR(value, true)} icon={IndianRupee} tone="emerald" />
        <StatCard label="Need repair" value={repair} icon={Wrench} tone={repair ? 'amber' : 'emerald'} />
      </div>
      <ResourcePage<Asset>
        title="Assets & inventory"
        description="Furniture, equipment and lab assets register."
        icon={Package}
        entityLabel="Asset"
        endpoint="/api/assets"
        module="inventory"
        searchPlaceholder="Name, category, location…"
        exportRow={(a) => ({ Asset: a.name, Category: a.category, Quantity: a.quantity, 'Unit cost': Number(a.unitCost), Value: a.quantity * Number(a.unitCost), Location: a.location, Condition: a.condition, Purchased: a.purchasedOn?.slice(0, 10) ?? '', Supplier: a.supplier })}
        columns={[
          { accessorKey: 'name', header: 'Asset', cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p><p className="text-xs text-ink-faint">{row.original.supplier ?? ''}</p></div> },
          { accessorKey: 'category', header: 'Category', cell: ({ getValue }) => <Badge>{getValue()}</Badge> },
          { accessorKey: 'quantity', header: 'Qty' },
          { id: 'value', header: 'Value', cell: ({ row }) => formatINR(row.original.quantity * Number(row.original.unitCost), true) },
          { accessorKey: 'location', header: 'Location' },
          { accessorKey: 'condition', header: 'Condition', cell: ({ getValue }) => <Badge tone={getValue() === 'GOOD' ? 'success' : getValue() === 'FAIR' ? 'warning' : 'danger'}>{String(getValue()).toLowerCase()}</Badge> },
          { accessorKey: 'purchasedOn', header: 'Purchased', cell: ({ getValue }) => formatDate(getValue()) },
        ]}
        fields={[
          { name: 'name', label: 'Asset name', required: true, span: 2 },
          { name: 'category', label: 'Category', type: 'select', required: true, options: CATEGORIES.map((c) => ({ value: c, label: c })) },
          { name: 'quantity', label: 'Quantity', type: 'number', required: true },
          { name: 'unitCost', label: 'Unit cost', type: 'money' },
          { name: 'location', label: 'Location', placeholder: 'Physics Lab' },
          { name: 'condition', label: 'Condition', type: 'select', options: ['GOOD', 'FAIR', 'POOR', 'DAMAGED'].map((c) => ({ value: c, label: c.toLowerCase() })) },
          { name: 'purchasedOn', label: 'Purchase date', type: 'date' },
          { name: 'supplier', label: 'Supplier' },
        ]}
        defaults={{ category: 'Furniture', quantity: 1, condition: 'GOOD' }}
        toForm={(a) => ({ ...a, unitCost: Number(a.unitCost), purchasedOn: dateInput(a.purchasedOn) })}
      />
    </>
  );
}
