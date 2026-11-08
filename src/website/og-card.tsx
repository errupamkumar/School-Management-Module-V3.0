/**
 * 1200×630 social-share card (WhatsApp, LinkedIn, Facebook, X) rendered with next/og.
 * Satori supports a subset of CSS: every element with several children needs display:flex.
 */
import { siteUrl } from './site-url';

export const OG_SIZE = { width: 1200, height: 630 };

export function OgCard({ eyebrow, title, subtitle, chips }: { eyebrow: string; title: string; subtitle: string; chips: string[] }) {
  const host = siteUrl().replace(/^https?:\/\//, '');
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '64px 72px', color: 'white', backgroundImage: 'linear-gradient(135deg, #312e81 0%, #4f46e5 45%, #7c3aed 75%, #a21caf 100%)', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <rect width="64" height="64" rx="14" fill="rgba(255,255,255,0.18)" />
          <path d="M32 16 8 27l24 11 18-8.25V40h4V27z" fill="#fff" />
          <path d="M18 34v8c0 3.9 6.3 7 14 7s14-3.1 14-7v-8l-14 6.4z" fill="#fff" opacity="0.9" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 18 }}>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.5 }}>Vidyalaya</div>
          <div style={{ fontSize: 16, letterSpacing: 4, opacity: 0.75 }}>SCHOOL ERP FOR INDIA</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', padding: '10px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.14)', fontSize: 22, fontWeight: 600 }}>{eyebrow}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
        <div style={{ fontSize: title.length > 40 ? 62 : 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5, maxWidth: 1000 }}>{title}</div>
        <div style={{ fontSize: 28, marginTop: 22, opacity: 0.88, maxWidth: 980, lineHeight: 1.35 }}>{subtitle}</div>
        <div style={{ display: 'flex', marginTop: 34 }}>
          {chips.map((c) => (
            <div key={c} style={{ display: 'flex', marginRight: 14, padding: '10px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.95)', color: '#4338ca', fontSize: 22, fontWeight: 700 }}>
              {c}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', marginTop: 40, fontSize: 20, opacity: 0.75 }}>
        <div>{host}</div>
        <div style={{ marginLeft: 'auto' }}>Powered by SRM ECO TECH</div>
      </div>
    </div>
  );
}
