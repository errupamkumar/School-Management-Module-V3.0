/**
 * Screenshots of the public website, the sign-in / sign-up pages and the
 * platform console's "Website leads" tab, for the README.
 *
 *   node docs/tools/shoot-website.cjs [shot-id-prefix ...]
 *
 * Runs against TEST_BASE_URL (default http://localhost:3000) and writes
 * docs/screenshots/v3/<id>.png. Every page is scrolled top to bottom first so
 * scroll animations have played. The "platform-leads" shot signs in as the
 * platform operator (empty school code, user "platform", SEED_PASSWORD).
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const req = createRequire(path.join(__dirname, '..', '..', 'package.json'));
const puppeteer = req('puppeteer-core');
const sharp = req('sharp');

const ROOT = path.join(__dirname, '..', '..');
const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PASSWORD = process.env.SEED_PASSWORD || 'Demo@12345';
const OUT = path.join(ROOT, 'docs', 'screenshots', 'v3');

// section: CSS selector, or { heading } = the <section> whose h2 contains that text.
const SHOTS = [
  { id: 'website-home', path: '/' },
  { id: 'website-home-dark', path: '/', theme: 'dark' },
  { id: 'website-features', path: '/', section: '#features' },
  { id: 'website-orbit', path: '/', section: { heading: 'One source of truth' } },
  { id: 'website-insights', path: '/', section: { heading: 'at a glance' } },
  { id: 'website-roles', path: '/', section: { heading: 'tailored experience' } },
  { id: 'website-pricing', path: '/', section: '#pricing' },
  { id: 'website-feature-page', path: '/features/transport' },
  { id: 'website-feature-gallery', path: '/features/transport', section: { heading: 'screen by screen' } },
  { id: 'website-mobile-dark', path: '/', theme: 'dark', width: 390, height: 844 },
  { id: 'login', path: '/login' },
  { id: 'login-dark', path: '/login', theme: 'dark' },
  { id: 'signup', path: '/get-started', height: 1100 },
  { id: 'platform-leads', path: '/platform', operator: true, tab: 'Website leads' },
];

const only = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function signInOperator(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#identifier');
  await sleep(500);
  await page.$eval('#school', (el) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(el, '');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.type('#identifier', 'platform');
  await page.type('#password', PASSWORD);
  await Promise.all([page.waitForFunction(() => location.pathname === '/platform', { timeout: 60000 }), page.click('button[type="submit"]')]);
}

async function playScrollAnimations(page) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 450) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await sleep(110);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(700);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--font-render-hinting=none'] });
  for (const shot of SHOTS.filter((s) => !only.length || only.some((p) => s.id.startsWith(p)))) {
    const page = await browser.newPage();
    const width = shot.width ?? 1440;
    await page.setViewport({ width, height: shot.height ?? 900, deviceScaleFactor: width < 600 ? 2 : 1, isMobile: width < 600, hasTouch: width < 600 });
    await page.evaluateOnNewDocument((t) => localStorage.setItem('vidyalaya-theme', t), shot.theme ?? 'light');
    if (shot.operator) await signInOperator(page);
    await page.goto(BASE + shot.path, { waitUntil: 'networkidle0', timeout: 180000 });
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    if (shot.tab) {
      const tabs = await page.$$('[role="tab"]');
      for (const t of tabs) if ((await t.evaluate((el) => el.textContent.trim())) === shot.tab) await t.click();
      await sleep(1500);
    }
    await playScrollAnimations(page);
    const file = path.join(OUT, `${shot.id}.png`);
    if (shot.section) {
      const handle =
        typeof shot.section === 'string'
          ? await page.$(shot.section)
          : await page.evaluateHandle((text) => [...document.querySelectorAll('section')].find((s) => s.querySelector('h2')?.textContent.includes(text)), shot.section.heading);
      if (!handle || !(await handle.asElement())) throw new Error(`${shot.id}: section not found`);
      await page.evaluate(() => document.querySelector('header')?.style.setProperty('visibility', 'hidden'));
      await handle.asElement().evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await sleep(2200);
      await handle.asElement().screenshot({ path: file });
    } else {
      await sleep(1200);
      await page.screenshot({ path: file });
    }
    const optimised = await sharp(file).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
    fs.writeFileSync(file, optimised);
    console.log(`${shot.id.padEnd(26)} ${Math.round(optimised.length / 1024)} KB`);
    await page.close();
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
