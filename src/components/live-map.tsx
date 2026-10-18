'use client';

import * as React from 'react';
import 'leaflet/dist/leaflet.css';
import type * as Leaflet from 'leaflet';
import { useApp } from '@/components/shell/app-context';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  kind: 'bus' | 'stop' | 'home';
  label: string;
  /** Faded when the position is stale. */
  stale?: boolean;
  heading?: number | null;
}

const ICON: Record<MapMarker['kind'], (m: MapMarker) => string> = {
  bus: (m) =>
    `<div style="position:relative;width:34px;height:34px;border-radius:50%;background:${m.stale ? '#94a3b8' : '#e11d48'};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:grid;place-items:center">` +
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6M15 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>` +
    (m.heading != null && !m.stale ? `<span style="position:absolute;top:-9px;left:50%;transform:translateX(-50%) rotate(${m.heading}deg);transform-origin:50% 26px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:8px solid #e11d48"></span>` : '') +
    `</div>`,
  stop: () => `<div style="width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid #4f46e5;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
  home: () => `<div style="width:22px;height:22px;border-radius:50%;background:#16a34a;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
};
const SIZE: Record<MapMarker['kind'], number> = { bus: 34, stop: 14, home: 22 };

/**
 * OpenStreetMap-based live map (tile server configurable per school). Draws
 * bus, stop and home markers and an optional route line, and keeps the view
 * fitted to the markers unless the user has moved the map.
 */
export function LiveMap({ markers, path, className, height = 420, follow = true }: { markers: MapMarker[]; path?: Array<[number, number]>; className?: string; height?: number; follow?: boolean }) {
  const { me } = useApp();
  const el = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<Leaflet.Map | null>(null);
  const L = React.useRef<typeof Leaflet | null>(null);
  const layer = React.useRef<Leaflet.LayerGroup | null>(null);
  const touched = React.useRef(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    import('leaflet').then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const lib = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as unknown as typeof Leaflet);
      L.current = lib;
      const m = lib.map(el.current, { zoomControl: true, attributionControl: true }).setView([22.6, 79.0], 5);
      lib.tileLayer(me.settings.maps?.tileUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: me.settings.maps?.attribution || '© OpenStreetMap contributors' }).addTo(m);
      layer.current = lib.layerGroup().addTo(m);
      m.on('dragstart zoomstart', (e) => {
        if ((e as unknown as { originalEvent?: unknown }).originalEvent) touched.current = true;
      });
      map.current = m;
      setReady(true);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const lib = L.current;
    if (!ready || !lib || !map.current || !layer.current) return;
    layer.current.clearLayers();
    if (path && path.length > 1) lib.polyline(path, { color: '#4f46e5', weight: 4, opacity: 0.55, dashArray: '6 8' }).addTo(layer.current);
    for (const m of markers) {
      const s = SIZE[m.kind];
      lib
        .marker([m.lat, m.lng], { icon: lib.divIcon({ html: ICON[m.kind](m), className: '', iconSize: [s, s], iconAnchor: [s / 2, s / 2] }), zIndexOffset: m.kind === 'bus' ? 1000 : 0, title: m.label })
        .bindTooltip(m.label, { direction: 'top', offset: [0, -s / 2] })
        .addTo(layer.current);
    }
    if (follow && !touched.current) {
      const pts = [...markers.map((m) => [m.lat, m.lng] as [number, number]), ...(path ?? [])];
      if (pts.length === 1) map.current.setView(pts[0], 15);
      else if (pts.length > 1) map.current.fitBounds(lib.latLngBounds(pts), { padding: [36, 36], maxZoom: 16 });
    }
  }, [markers, path, ready, follow]);

  return <div ref={el} className={className} style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden', zIndex: 0 }} role="region" aria-label="Live map" />;
}
