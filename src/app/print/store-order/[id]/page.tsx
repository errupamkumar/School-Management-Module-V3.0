'use client';

import { useParams } from 'next/navigation';
import { formatDateTime, formatINR } from '@/lib/utils';
import { Letterhead, PrintPage, PrintState, usePrintData, type SchoolHeader } from '@/components/print';

interface Order {
  orderNo: string;
  customerName: string;
  subtotal: number;
  tax: number;
  total: number;
  mode: string;
  status: string;
  createdAt: string;
  soldByName: string;
  school: SchoolHeader;
  items: Array<{ id: string; name: string; qty: number; unitPrice: number; gstPercent: number; lineTotal: number }>;
}

export default function StoreBill() {
  const { id } = useParams<{ id: string }>();
  const { data: o, isLoading, error } = usePrintData<Order>(`/api/store/orders/${id}`);
  return (
    <PrintPage title={o ? `Bill ${o.orderNo}` : 'Bill'}>
      <PrintState loading={isLoading} error={error?.message} />
      {o && (
        <div className="mx-auto max-w-[120mm]">
          <Letterhead school={o.school} subtitle={<span className="text-xs font-bold uppercase">Tax invoice · school store</span>} />
          {o.status === 'CANCELLED' && <p className="mt-2 text-center font-bold text-rose-600">CANCELLED</p>}
          <div className="mt-3 flex justify-between text-[12px]">
            <span>
              Bill: <b>{o.orderNo}</b>
            </span>
            <span>{formatDateTime(o.createdAt)}</span>
          </div>
          <p className="text-[12px]">Customer: {o.customerName}</p>
          <table className="mt-3 w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-y border-slate-400">
                <th className="py-1 text-left">Item</th>
                <th className="py-1 text-right">Qty</th>
                <th className="py-1 text-right">Rate</th>
                <th className="py-1 text-right">GST</th>
                <th className="py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={i.id} className="border-b border-slate-200">
                  <td className="py-1">{i.name}</td>
                  <td className="py-1 text-right">{i.qty}</td>
                  <td className="py-1 text-right">{Number(i.unitPrice).toFixed(2)}</td>
                  <td className="py-1 text-right">{Number(i.gstPercent)}%</td>
                  <td className="py-1 text-right">{Number(i.lineTotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 space-y-0.5 text-right text-[12px]">
            <p>Taxable value: {formatINR(Number(o.subtotal))}</p>
            <p>
              CGST: {formatINR(Number(o.tax) / 2)} · SGST: {formatINR(Number(o.tax) / 2)}
            </p>
            <p className="text-base font-bold">Total: {formatINR(Number(o.total))}</p>
            <p className="text-slate-500">
              Paid by {o.mode.replace('_', ' ')} · billed by {o.soldByName}
            </p>
          </div>
          <p className="mt-6 text-center text-[11px] text-slate-500">Thank you!</p>
        </div>
      )}
    </PrintPage>
  );
}
