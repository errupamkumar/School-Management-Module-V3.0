/**
 * Export a Markdown document (with its images) to an A4 PDF.
 *   npx --yes marked@12.0.2 --gfm -i docs/USER_GUIDE.md -o docs/tools/.tmp-guide.html
 *   node docs/tools/export-pdf.cjs docs/tools/.tmp-guide.html docs/Vidyalaya-User-Guide.pdf "Vidyalaya ERP — User Guide"
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const req = createRequire(path.join(__dirname, '..', '..', 'package.json'));
const puppeteer = req('puppeteer-core');

const [, , inHtml, outPdf, title = 'Vidyalaya ERP', footer = 'Vidyalaya ERP · v2.0 · October 2026'] = process.argv;
const DOCS = path.join(__dirname, '..');
const body = fs.readFileSync(inHtml, 'utf8')
  // Images are referenced relative to docs/; make them absolute for the renderer.
  .replace(/src="(user-guide\/images\/[^"]+)"/g, (_, p) => `src="file:///${path.join(DOCS, p).replace(/\\/g, '/')}"`)
  // Internal .md links become in-document anchors where possible.
  .replace(/href="USER_GUIDE\.md#/g, 'href="#').replace(/href="(USER_GUIDE|USE_CASES)\.md"/g, 'href="#"');

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<style>
  @page { size: A4; margin: 18mm 15mm 18mm 15mm; }
  body { font: 10.5pt/1.55 "Segoe UI", system-ui, sans-serif; color: #13201b; }
  h1 { font-size: 24pt; color: #1d4a3b; margin: 0 0 8pt; }
  h2 { font-size: 16pt; color: #1d4a3b; border-bottom: 2px solid #d9e1db; padding-bottom: 4pt; margin-top: 22pt; page-break-after: avoid; }
  h2 { page-break-before: always; }
  h1 + table + hr + h2, h1 + table + h2 { page-break-before: auto; }
  h3 { font-size: 13pt; margin-top: 16pt; page-break-after: avoid; }
  h4 { font-size: 11pt; margin-top: 12pt; page-break-after: avoid; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 9pt; page-break-inside: auto; }
  th, td { border: 1px solid #d9e1db; padding: 4pt 6pt; text-align: left; vertical-align: top; }
  th { background: #eef2ec; }
  tr { page-break-inside: avoid; }
  code { font: 9pt Consolas, monospace; background: #eef2ec; padding: 0 3pt; border-radius: 3pt; }
  pre { background: #eef2ec; padding: 8pt; border-radius: 6pt; white-space: pre-wrap; font-size: 9pt; }
  blockquote { margin: 6pt 0; padding: 6pt 10pt; background: #fff7e6; border-left: 3px solid #f2a91c; font-size: 9.5pt; }
  img { max-width: 100%; border: 1px solid #d9e1db; border-radius: 6pt; display: block; margin: 8pt auto 2pt; page-break-inside: avoid; }
  img[src*="mobile"] { max-width: 45%; }
  p > em:only-child { display: block; text-align: center; color: #44524b; font-size: 9pt; }
  hr { border: 0; border-top: 1px solid #d9e1db; margin: 14pt 0; }
  a { color: #1d4a3b; }
</style></head><body>${body}</body></html>`;

(async () => {
  const tmp = path.resolve(path.dirname(inHtml), '.tmp-print.html');
  fs.writeFileSync(tmp, html);
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.goto('file:///' + tmp.replace(/\\/g, '/'), { waitUntil: 'networkidle0', timeout: 120000 });
  await page.pdf({
    path: outPdf,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `<div style="font:8px sans-serif;color:#6c7a72;width:100%;padding:0 15mm;text-align:right">${title}</div>`,
    footerTemplate: `<div style="font:8px sans-serif;color:#6c7a72;width:100%;padding:0 15mm;display:flex;justify-content:space-between"><span>${footer}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
    margin: { top: '18mm', bottom: '18mm', left: '15mm', right: '15mm' },
  });
  await browser.close();
  fs.unlinkSync(tmp);
  console.log(`wrote ${outPdf} (${(fs.statSync(outPdf).size / 1024 / 1024).toFixed(1)} MB)`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
