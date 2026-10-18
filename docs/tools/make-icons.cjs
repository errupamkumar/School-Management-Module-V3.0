// Renders public/icons/*.png from src/app/icon.svg (run after changing the logo).
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const req = createRequire(path.join(__dirname, '..', '..', 'package.json'));
const puppeteer = req('puppeteer-core');
const svg = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'app', 'icon.svg'), 'utf8');
const out = path.join(__dirname, '..', '..', 'public', 'icons');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  const p = await b.newPage();
  for (const [name, size, pad, bg] of [['icon-192.png', 192, 0, null], ['icon-512.png', 512, 0, null], ['maskable-512.png', 512, 0.18, '#4f46e5'], ['apple-touch-icon.png', 180, 0.12, '#4f46e5'], ['badge-96.png', 96, 0, null]]) {
    await p.setViewport({ width: size, height: size });
    const inner = Math.round(size * (1 - pad * 2));
    await p.setContent(`<html><body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:${bg ?? 'transparent'}">${svg.replace('<svg', `<svg width="${inner}" height="${inner}"`)}</body></html>`);
    await p.screenshot({ path: path.join(out, name), omitBackground: !bg });
    console.log('wrote', name);
  }
  await b.close();
})();
