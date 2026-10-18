import { describe, expect, it } from 'vitest';
import { escapeHtml, renderTemplate, sanitizeHtml } from '@/server/services/html';

describe('sanitizeHtml (certificate templates)', () => {
  const cases: Array<[string, string]> = [
    ['<p onclick="alert(1)">Hi</p>', 'onclick'],
    ['<img src=x onerror=alert(1)>', '<img'],
    ['<script>alert(1)</script>ok', 'script'],
    ['<a href="javascript:alert(1)">x</a>', 'javascript:'],
    ['<svg onload=alert(1)><circle/></svg>', 'svg'],
    ['<p style="background:url(javascript:alert(1))">x</p>', 'style'],
    ['<iframe src="//evil.example"></iframe>', 'iframe'],
    ['<!-- <script>alert(1)</script> -->', 'script'],
    ['<math><mi xlink:href="javascript:alert(1)">x</mi></math>', 'javascript:'],
    ['<p>a</p><SCRIPT>alert(1)</SCRIPT>', 'SCRIPT'],
    ['<b/onmouseover=alert(1)>x</b>', 'onmouseover'],
  ];
  it.each(cases)('neutralises %s', (input, forbidden) => {
    expect(sanitizeHtml(input).toLowerCase()).not.toContain(forbidden.toLowerCase());
  });

  it('keeps the allowed formatting', () => {
    expect(sanitizeHtml('<p>This is <b>bold</b>, <i>italic</i> and <u>underlined</u>.</p><ul><li>one</li></ul>')).toBe('<p>This is <b>bold</b>, <i>italic</i> and <u>underlined</u>.</p><ul><li>one</li></ul>');
  });

  it('keeps placeholders intact', () => {
    expect(sanitizeHtml('<p>{{student.name}}</p>')).toBe('<p>{{student.name}}</p>');
  });
});

describe('renderTemplate', () => {
  it('escapes substituted values', () => {
    const out = renderTemplate('<p>Hello {{student.name}}</p>', { 'student.name': '<img src=x onerror=alert(1)>' });
    expect(out).toBe('<p>Hello &lt;img src=x onerror=alert(1)&gt;</p>');
  });
  it('blanks unknown placeholders', () => {
    expect(renderTemplate('<p>[{{nope}}]</p>', {})).toBe('<p>[]</p>');
  });
  it('sanitises the template before substitution', () => {
    expect(renderTemplate('<p onclick="x()">{{a}}</p>', { a: 'ok' })).toBe('<p>ok</p>');
  });
});

describe('escapeHtml', () => {
  it('escapes the HTML metacharacters', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  });
});
