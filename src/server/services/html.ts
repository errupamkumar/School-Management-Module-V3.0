/**
 * Minimal allowlist HTML sanitizer for admin-authored templates (certificates,
 * rules). Every attribute is dropped, so event handlers, javascript: URLs and
 * inline styles cannot survive; only simple formatting tags remain.
 */
const ALLOWED = new Set(['p', 'b', 'strong', 'i', 'em', 'u', 'br', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'div', 'span', 'blockquote', 'hr', 'small', 'sup', 'sub']);
const VOID = new Set(['br', 'hr']);

export function sanitizeHtml(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|template|noscript|svg|math)[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (tag, name: string) => {
      const n = name.toLowerCase();
      if (!ALLOWED.has(n)) return '';
      if (VOID.has(n)) return `<${n}>`;
      return tag.startsWith('</') ? `</${n}>` : `<${n}>`;
    })
    .replace(/<(?![a-z/])/gi, '&lt;');
}

export function escapeHtml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Replaces {{a.b}} placeholders with HTML-escaped values; unknown keys become blanks. */
export function renderTemplate(body: string, values: Record<string, unknown>): string {
  return sanitizeHtml(body).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => escapeHtml(values[key] ?? ''));
}
