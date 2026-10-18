'use client';

import * as React from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { compactINR, formatINR } from '@/lib/utils';

const SERIES = ['rgb(var(--series-1))', 'rgb(var(--series-2))', 'rgb(var(--series-3))'];
const AXIS = { fontSize: 11, fill: 'rgb(var(--ink-faint))' };
const GRID = 'rgb(var(--line))';

function ChartTooltip({ active, payload, label, money }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; money?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-ink-soft">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {payload.length > 1 && <span>{p.name}</span>}
          <span className="ml-auto font-semibold text-ink">{money ? formatINR(p.value, true) : p.value.toLocaleString('en-IN')}</span>
        </p>
      ))}
    </div>
  );
}

export interface Series {
  key: string;
  label: string;
}

/** Vertical bars. One series → no legend (the card title names it); 2–3 series → grouped with legend. */
export function BarsChart({ data, xKey, series, money, height = 260 }: { data: Array<Record<string, unknown>>; xKey: string; series: Series[]; money?: boolean; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label={series.map((s) => s.label).join(' and ')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={money ? 56 : 36} tickFormatter={(v: number) => (money ? compactINR(v) : String(v))} />
          <Tooltip cursor={{ fill: 'rgb(var(--brand-500) / 0.06)' }} content={<ChartTooltip money={money} />} />
          {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'rgb(var(--ink-soft))' }} />}
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={SERIES[i]} radius={[4, 4, 0, 0]} maxBarSize={28} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Single-series trend with a soft area fill and crosshair tooltip. */
export function TrendChart({ data, xKey, yKey, label, money, height = 260 }: { data: Array<Record<string, unknown>>; xKey: string; yKey: string; label: string; money?: boolean; height?: number }) {
  const id = React.useId().replace(/:/g, '');
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.25} />
              <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={money ? 56 : 36} tickFormatter={(v: number) => (money ? compactINR(v) : String(v))} />
          <Tooltip cursor={{ stroke: 'rgb(var(--ink-faint))', strokeDasharray: '3 3' }} content={<ChartTooltip money={money} />} />
          <Area type="monotone" dataKey={yKey} name={label} stroke={SERIES[0]} strokeWidth={2} fill={`url(#g${id})`} activeDot={{ r: 5, strokeWidth: 2, stroke: 'rgb(var(--surface))' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Labelled horizontal proportion bars — used instead of pie charts. */
export function ShareBars({ items, money }: { items: Array<{ label: string; value: number }>; money?: boolean }) {
  const total = items.reduce((a, i) => a + i.value, 0) || 1;
  const sorted = [...items].sort((a, b) => b.value - a.value);
  return (
    <ul className="space-y-3">
      {sorted.map((it) => (
        <li key={it.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-ink-soft">{it.label}</span>
            <span className="font-semibold text-ink">
              {money ? formatINR(it.value, true) : it.value.toLocaleString('en-IN')} <span className="font-normal text-ink-faint">· {Math.round((it.value / total) * 100)}%</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full" style={{ width: `${(it.value / total) * 100}%`, background: SERIES[0] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
