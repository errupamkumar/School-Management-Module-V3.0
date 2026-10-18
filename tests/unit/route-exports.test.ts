import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Next.js rejects route/page/layout files that export anything other than the
 * framework's names, and the error only surfaces at build time. Catch it here.
 */
const ROOT = path.resolve(__dirname, '../../src/app');
const ROUTE_OK = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'dynamic', 'revalidate', 'runtime', 'preferredRegion', 'maxDuration', 'fetchCache', 'dynamicParams']);
const PAGE_OK = new Set(['default', 'metadata', 'generateMetadata', 'generateStaticParams', 'viewport', 'generateViewport', 'dynamic', 'revalidate', 'runtime', 'dynamicParams', 'fetchCache']);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

function exportedNames(src: string): string[] {
  const names: string[] = [];
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:const|let|function|class|interface|type|enum)\s+([A-Za-z0-9_$]+)/gm)) names.push(m[1]);
  for (const m of src.matchAll(/^export\s+const\s*\{([^}]+)\}/gm)) names.push(...m[1].split(',').map((s) => s.trim().split(':').pop()!.trim()).filter(Boolean));
  for (const m of src.matchAll(/^export\s*\{([^}]+)\}/gm)) names.push(...m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()!.trim()).filter(Boolean));
  if (/^export\s+default\b/m.test(src)) names.push('default');
  return names;
}

describe('Next.js special files only export allowed names', () => {
  const files = walk(ROOT).filter((f) => /[\\/](route\.ts|page\.tsx|layout\.tsx)$/.test(f));
  it('finds the app files', () => expect(files.length).toBeGreaterThan(100));
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    it(rel, () => {
      const allowed = /route\.ts$/.test(f) ? ROUTE_OK : PAGE_OK;
      const bad = exportedNames(fs.readFileSync(f, 'utf8')).filter((n) => !allowed.has(n));
      expect(bad, `${rel} exports ${bad.join(', ')}`).toEqual([]);
    });
  }
});
