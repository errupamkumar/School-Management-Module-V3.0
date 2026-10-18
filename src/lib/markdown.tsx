import * as React from 'react';

/**
 * Minimal, safe Markdown for blog posts and announcements. It builds React
 * elements (never raw HTML), so user text cannot inject markup or scripts.
 * Supported: # headings, paragraphs, - and 1. lists, > quotes, **bold**,
 * *italic*, `code` and [links](https://…) (http/https only).
 */
export function safeHref(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

export function renderInline(text: string, keyPrefix = 'i'): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const tok = m[0];
    const key = `${keyPrefix}-${n++}`;
    if (tok.startsWith('**')) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) out.push(<code key={key} className="rounded bg-canvas px-1 py-0.5 text-[0.9em]">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith('[')) {
      const mm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok)!;
      const href = safeHref(mm[2]);
      out.push(href ? <a key={key} href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-600 underline">{mm[1]}</a> : mm[1]);
    } else out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const cls = level === 1 ? 'text-xl font-bold mt-5' : level === 2 ? 'text-lg font-semibold mt-4' : 'font-semibold mt-3';
      blocks.push(React.createElement(`h${level + 1}`, { key: k++, className: cls }, renderInline(h[2], `h${k}`)));
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/).test(lines[i])) {
        items.push(lines[i].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/, ''));
        i++;
      }
      const Tag = ordered ? 'ol' : 'ul';
      blocks.push(
        <Tag key={k++} className={ordered ? 'ml-5 list-decimal space-y-1' : 'ml-5 list-disc space-y-1'}>
          {items.map((it, j) => (
            <li key={j}>{renderInline(it, `l${k}-${j}`)}</li>
          ))}
        </Tag>
      );
      continue;
    }
    if (/^>\s?/.test(line)) {
      const q: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push(
        <blockquote key={k++} className="border-l-4 border-brand-200 pl-3 italic text-ink-soft">
          {renderInline(q.join(' '), `q${k}`)}
        </blockquote>
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|>|\s*[-*]\s+|\s*\d+[.)]\s+)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(
      <p key={k++} className="leading-relaxed">
        {para.flatMap((p, j) => (j ? [<br key={`br${j}`} />, ...renderInline(p, `p${k}-${j}`)] : renderInline(p, `p${k}-${j}`)))}
      </p>
    );
  }
  return <div className={className ?? 'space-y-3 text-sm'}>{blocks}</div>;
}

/** Plain-text excerpt (Markdown syntax removed) for cards and previews. */
export function plainExcerpt(text: string, max = 220): string {
  const plain = text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain;
}
