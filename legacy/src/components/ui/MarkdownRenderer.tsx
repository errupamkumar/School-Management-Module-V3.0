'use client';

import React, { useState } from 'react';
import { Copy, Check, BarChart3, FileText, ExternalLink } from 'lucide-react';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

interface ChartItem {
  label: string;
  value: string;
  percent: number;
}

interface ChartBlock {
  title: string;
  items: ChartItem[];
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  // Rigorously cleanse all solid ASCII block characters ("bullar") and bracketed bars
  const cleanContent = (content || '')
    .replace(/\[[█■▇▓▌▐░▒\s=-]+\]/g, '') // remove bracketed blocks like [██] or [====]
    .replace(/[█■▇▓▌▐░▒]/g, '')           // remove any lone solid blocks
    .replace(/[ \t]{2,}/g, ' ');         // clean double spaces

  // 1. Split content by code blocks: ```[lang]\n[code]\n```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  const blocks: Array<{ type: 'code' | 'markdown'; lang?: string; text: string }> = [];

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(cleanContent)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: 'markdown',
        text: cleanContent.substring(lastIndex, match.index),
      });
    }

    blocks.push({
      type: 'code',
      lang: match[1] || 'text',
      text: match[2].trim(),
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < cleanContent.length) {
    blocks.push({
      type: 'markdown',
      text: cleanContent.substring(lastIndex),
    });
  }

  return (
    <div className={cn('space-y-2.5 text-xs sm:text-sm leading-relaxed text-gray-800 dark:text-gray-200', className)}>
      {blocks.map((block, bIdx) => {
        if (block.type === 'code') {
          // Check if this code block is a visual metric distribution
          const chart = parseVisualChart(block.text);
          if (chart.isChart) {
            return renderVisualChartCard(chart, bIdx);
          }

          // Otherwise render clean, non-terminal code/text card
          return (
            <div
              key={`code-${bIdx}`}
              className="my-3 rounded-2xl bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden font-mono"
            >
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-gray-100/70 dark:bg-slate-800/60 border-b border-gray-200/80 dark:border-slate-800 text-[11px] text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5 font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  <FileText size={13} />
                  <span>{block.lang || 'SNIPPET'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCode(block.text, bIdx)}
                  className="flex items-center gap-1 hover:text-purple-600 dark:hover:text-purple-300 transition-colors px-2 py-0.5 rounded-md hover:bg-white dark:hover:bg-slate-700"
                  title="Copy text"
                >
                  {copiedCodeIdx === bIdx ? (
                    <>
                      <Check size={12} className="text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span className="text-[10px]">Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 sm:p-4 overflow-x-auto touch-scroll">
                <pre className="font-mono text-[11px] sm:text-xs leading-relaxed whitespace-pre text-gray-800 dark:text-gray-200">
                  {block.text}
                </pre>
              </div>
            </div>
          );
        }

        // Render Markdown block lines
        return <div key={`md-${bIdx}`}>{renderMarkdownLines(block.text)}</div>;
      })}
    </div>
  );
}

// Smart Parser to convert metric distributions into visual UI chart components
function parseVisualChart(text: string): { isChart: boolean; title: string; items: ChartItem[] } {
  const lines = text.split('\n');
  const items: ChartItem[] = [];
  let title = '';

  for (const line of lines) {
    const trimmed = line
      .replace(/\[[█■▇▓▌▐░▒\s=-]+\]/g, '')
      .replace(/[█■▇▓▌▐░▒]/g, '')
      .trim();
    if (!trimmed) continue;

    const pctMatch = trimmed.match(/(\d+(\.\d+)?)%/);
    if (pctMatch && (trimmed.includes(':') || trimmed.includes('-') || trimmed.includes('•') || trimmed.includes('~'))) {
      const parts = trimmed.split(/[:\-•~]/);
      const label = parts[0].trim();
      const valStr = parts.slice(1).join(' ').trim();
      const percent = parseFloat(pctMatch[1]);
      if (label && percent > 0) {
        items.push({ label, value: valStr || `${percent}%`, percent });
      }
    } else if (items.length === 0 && !title) {
      title = trimmed.replace(/[:\-]$/, '');
    }
  }

  return { isChart: items.length >= 2, title, items };
}

// Gorgeous Visual Progress Bar Chart Component
function renderVisualChartCard(chart: ChartBlock, keyIdx: number) {
  return (
    <div
      key={`visual-chart-${keyIdx}`}
      className="my-3.5 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 border border-purple-100 dark:border-slate-800 shadow-sm space-y-3.5"
    >
      {chart.title && (
        <div className="flex items-center justify-between pb-2 border-b border-purple-100/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center shadow-xs">
              <BarChart3 size={14} />
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100">{chart.title}</h4>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300">
            Visual Chart
          </span>
        </div>
      )}

      <div className="space-y-3 pt-0.5">
        {chart.items.map((item, i) => {
          const isNegative = /absent|due|unpaid|defaulter|overdue|drop/i.test(item.label);
          const isPositive = /present|paid|active|regular|pass/i.test(item.label);

          const gradient = isNegative
            ? 'from-rose-500 to-pink-500'
            : isPositive
            ? 'from-emerald-500 to-teal-500'
            : i === 0
            ? 'from-purple-600 to-indigo-600'
            : i === 1
            ? 'from-blue-500 to-cyan-500'
            : 'from-amber-500 to-orange-500';

          return (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700 dark:text-gray-200">{item.label}</span>
                <span className="font-bold text-gray-900 dark:text-gray-100 bg-white/90 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-gray-100 dark:border-slate-700 shadow-xs">
                  {item.value}
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 shadow-inner">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700 ease-out shadow-xs`}
                  style={{ width: `${Math.min(100, Math.max(4, item.percent))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Line-by-line parser for standard markdown elements
function renderMarkdownLines(rawText: string) {
  const lines = rawText.split('\n');
  const elements: React.ReactNode[] = [];
  let tableRows: string[] = [];

  const flushTable = () => {
    if (tableRows.length > 0) {
      elements.push(renderTable(tableRows, elements.length));
      tableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine
      .replace(/\[[█■▇▓▌▐░▒\s=-]+\]/g, '')
      .replace(/[█■▇▓▌▐░▒]/g, '')
      .replace(/[ \t]{2,}/g, ' ');
    const trimmed = line.trim();

    // Check for table lines
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableRows.push(trimmed);
      continue;
    } else {
      flushTable();
    }

    if (!trimmed) {
      elements.push(<div key={`spacer-${i}`} className="h-1" />);
      continue;
    }

    // Horizontal Rule
    if (trimmed === '***' || trimmed === '---' || trimmed === '___') {
      elements.push(<hr key={`hr-${i}`} className="my-2.5 border-gray-200 dark:border-slate-700" />);
      continue;
    }

    // Headers
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h3 key={`h1-${i}`} className="text-base sm:text-lg font-extrabold text-purple-700 dark:text-purple-300 pt-2 pb-1 border-b border-purple-100 dark:border-purple-900/50">
          {renderInline(trimmed.replace(/^#\s+/, ''))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h4 key={`h2-${i}`} className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 pt-2 pb-0.5">
          {renderInline(trimmed.replace(/^##\s+/, ''))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h5 key={`h3-${i}`} className="text-xs sm:text-sm font-bold text-purple-700 dark:text-purple-300 pt-1.5">
          {renderInline(trimmed.replace(/^###\s+/, ''))}
        </h5>
      );
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h6 key={`h4-${i}`} className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 pt-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400 flex-shrink-0" />
          <span>{renderInline(trimmed.replace(/^####\s+/, ''))}</span>
        </h6>
      );
      continue;
    }
    if (trimmed.startsWith('##### ')) {
      elements.push(
        <p key={`h5-${i}`} className="text-xs font-bold text-gray-800 dark:text-gray-200 pt-1">
          {renderInline(trimmed.replace(/^#####\s+/, ''))}
        </p>
      );
      continue;
    }

    // Standalone major title line like **Vidyalaya School Overview Report**
    if (/^\*\*([^*]+)\*\*$/.test(trimmed)) {
      const titleMatch = trimmed.match(/^\*\*([^*]+)\*\*$/);
      if (titleMatch) {
        elements.push(
          <div key={`title-${i}`} className="text-sm sm:text-base font-extrabold text-purple-700 dark:text-purple-300 pt-1 pb-0.5">
            {titleMatch[1]}
          </div>
        );
        continue;
      }
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        <div
          key={`quote-${i}`}
          className="border-l-4 border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 p-2.5 rounded-r-xl italic text-xs my-2 text-purple-950 dark:text-purple-200"
        >
          {renderInline(trimmed.replace(/^>\s+/, ''))}
        </div>
      );
      continue;
    }

    // Bullet points: • or - or *
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const bulletContent = trimmed.replace(/^[•\-*]\s+/, '');
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2 pl-2 my-1">
          <span className="text-purple-600 dark:text-purple-400 font-bold text-xs mt-0.5 flex-shrink-0">•</span>
          <div className="flex-1 leading-relaxed">{renderInline(bulletContent)}</div>
        </div>
      );
      continue;
    }

    // Numbered list: 1. 2. etc
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2 pl-2 my-1">
          <span className="text-purple-600 dark:text-purple-400 font-bold text-xs mt-0.5 flex-shrink-0">
            {numMatch[1]}.
          </span>
          <div className="flex-1 leading-relaxed">{renderInline(numMatch[2])}</div>
        </div>
      );
      continue;
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${i}`} className="leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  flushTable();
  return elements;
}

// Markdown Table Parser
function renderTable(rows: string[], keyIdx: number) {
  if (rows.length < 2) return null;

  const parseRow = (r: string) =>
    r
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());

  const headers = parseRow(rows[0]);
  const isSeparator = rows[1].includes('---');
  const bodyRows = isSeparator ? rows.slice(2) : rows.slice(1);

  return (
    <div key={`table-${keyIdx}`} className="my-3 overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-200 font-bold border-b border-gray-200 dark:border-slate-700">
          <tr>
            {headers.map((h, hIdx) => (
              <th key={hIdx} className="px-3.5 py-2.5">
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {bodyRows.map((r, rIdx) => {
            const cells = parseRow(r);
            return (
              <tr key={rIdx} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/60 transition-colors">
                {cells.map((c, cIdx) => (
                  <td key={cIdx} className="px-3.5 py-2 text-gray-700 dark:text-gray-300">
                    {renderInline(c)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Inline Formatter for **bold**, *italic*, `code`, and [link](url)
function renderInline(text: string): React.ReactNode {
  const tokenRegex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={idx} className="font-bold text-gray-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={idx} className="italic text-gray-800 dark:text-gray-300">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Inline Code: `text`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-mono text-[11px] border border-purple-200/60 dark:border-purple-800/60 font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Markdown link: [text](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 dark:text-purple-400 font-semibold hover:underline inline-flex items-center gap-0.5"
        >
          <span>{linkMatch[1]}</span>
          <ExternalLink size={10} />
        </a>
      );
    }

    return part;
  });
}
