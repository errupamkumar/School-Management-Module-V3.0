/**
 * Annotated screenshot generator for the user guide and the product tour.
 *
 *   node docs/tools/shoot.cjs [shot-id-prefix ...]
 *
 * Reads docs/tools/shots.json, signs in as each shot's role against the running
 * dev server (TEST_BASE_URL, default http://localhost:3000), opens the screen,
 * performs optional steps (click a tab, open a dialog), finds each marker target
 * by visible text / placeholder / CSS selector, and writes:
 *   docs/user-guide/images/<id>.png        numbered outlines drawn on the real UI
 *   docs/demo/shots/<id>.png               the same screen without annotations
 *   docs/demo/shots/<id>.json              marker boxes as % of the image (tour hotspots)
 * Missing markers are reported so the spec can be fixed; nothing is guessed.
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const req = createRequire(path.join(__dirname, '..', '..', 'package.json'));
const puppeteer = req('puppeteer-core');

const ROOT = path.join(__dirname, '..', '..');
const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ANN_DIR = path.join(ROOT, 'docs', 'user-guide', 'images');
const CLEAN_DIR = path.join(ROOT, 'docs', 'demo', 'shots');
const ACCENT = '#e11d48';

const spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'shots.json'), 'utf8'));
const only = process.argv.slice(2);
const shots = spec.shots.filter((s) => !only.length || only.some((p) => s.id.startsWith(p)));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Types into a field and verifies it; the login page pre-fills the school code after hydration. */
async function fillField(page, sel, value) {
  for (let i = 0; i < 5; i++) {
    await page.click(sel, { clickCount: 3 });
    await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    if (value) await page.type(sel, value);
    if ((await page.$eval(sel, (e) => e.value)) === value) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`could not fill ${sel}`);
}

async function login(page, user, school) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.evaluate(() => localStorage.removeItem('vidyalaya-school-code'));
  await page.waitForSelector('#school', { timeout: 120000 });
  await sleep(400);
  await new Promise((r) => setTimeout(r, 800));
  await fillField(page, '#school', school || '');
  await fillField(page, '#identifier', user);
  await fillField(page, '#password', spec.password);
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 }).catch(() => {}), page.click('button[type=submit]')]);
  await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 120000 }).catch(() => {});
  await sleep(800);
}

/** Runs in the page: locate the best element for a marker target. */
function locateInPage(t) {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05;
  };
  const norm = (x) => (x || '').replace(/\s+/g, ' ').trim().toLowerCase();
  let cands = [];
  if (t.sel) cands = [...document.querySelectorAll(t.sel)];
  else if (t.ph) cands = [...document.querySelectorAll('input,textarea')].filter((e) => norm(e.placeholder).startsWith(norm(t.ph)));
  else if (t.label) {
    // A form field by its visible label: return the label's field wrapper.
    const labels = [...document.querySelectorAll('label')].filter((l) => norm(l.textContent).startsWith(norm(t.label)));
    cands = labels.map((l) => l.closest('[data-field], .space-y-1\\.5, div') || l);
  } else if (t.text) {
    const want = norm(t.text);
    const all = [...document.querySelectorAll(t.within ? `${t.within} *` : 'body *')];
    const exact = all.filter((e) => norm(e.innerText ?? e.textContent) === want);
    const pool = exact.length ? exact : all.filter((e) => norm(e.innerText ?? e.textContent).startsWith(want) && norm(e.innerText).length < want.length + 40);
    // Prefer interactive ancestors (button, link, tab) so the outline wraps the whole control.
    cands = pool.map((e) => e.closest('button,a,[role=tab],[role=menuitem],label,select') || e);
  }
  cands = [...new Set(cands)].filter(visible);
  if (t.closest) cands = cands.map((e) => e.closest(t.closest) || e);
  if (t.up) cands = cands.map((e) => { let x = e; for (let i = 0; i < t.up && x.parentElement; i++) x = x.parentElement; return x; });
  if (t.nth !== undefined) cands = cands.slice(t.nth, t.nth + 1);
  // Smallest matching element is the most specific one.
  cands.sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height);
  if (t.largest) cands.reverse();
  const el = cands[0];
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

async function act(page, step) {
  if (step.wait) return sleep(step.wait);
  if (step.goto) return page.goto(BASE + step.goto, { waitUntil: 'networkidle2', timeout: 120000 });
  if (step.scroll !== undefined) return page.evaluate((y) => window.scrollTo(0, y), step.scroll);
  if (step.reveal) {
    await page.evaluate((t) => {
      const norm = (x) => (x || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const el = [...document.querySelectorAll('body *')].find((e) => norm(e.innerText) === norm(t.text));
      el?.scrollIntoView({ block: t.block || 'start' });
    }, step.reveal);
    return sleep(step.after ?? 600);
  }
  if (step.press) return page.keyboard.press(step.press);
  if (step.type) {
    const box = await page.evaluate(locateInPage, step.target);
    if (!box) throw new Error(`type target not found ${JSON.stringify(step.target)}`);
    await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2);
    await page.keyboard.type(step.type, { delay: 20 });
    return sleep(step.after ?? 900);
  }
  if (step.click) {
    // Bring the target into view first (e.g. a card in a horizontally scrolling board).
    await page.evaluate((t) => {
      const norm = (x) => (x || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const pool = t.sel ? [...document.querySelectorAll(t.sel)] : [...document.querySelectorAll(t.within ? `${t.within} *` : 'body *')].filter((e) => norm(e.innerText) === norm(t.text));
      const el = pool[t.nth ?? 0];
      el?.scrollIntoView({ block: 'center', inline: 'center' });
    }, step.click);
    await sleep(400);
    const box = await page.evaluate(locateInPage, step.click);
    if (!box) throw new Error(`click target not found ${JSON.stringify(step.click)}`);
    await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2);
    return sleep(step.after ?? 1200);
  }
}

async function drawMarkers(page, boxes) {
  await page.evaluate(
    (boxes, accent) => {
      const layer = document.createElement('div');
      layer.id = '__ann';
      layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647';
      boxes.forEach((b, i) => {
        if (!b) return;
        const pad = 4;
        const o = document.createElement('div');
        o.style.cssText = `position:absolute;left:${b.x - pad}px;top:${b.y - pad}px;width:${b.w + pad * 2}px;height:${b.h + pad * 2}px;border:3px solid ${accent};border-radius:10px;box-shadow:0 0 0 4px rgba(225,29,72,.18)`;
        const n = document.createElement('div');
        const size = 28;
        let nx = b.x - pad - size / 2;
        let ny = b.y - pad - size / 2;
        nx = Math.max(4, Math.min(window.innerWidth - size - 4, nx));
        ny = Math.max(4, Math.min(window.innerHeight - size - 4, ny));
        n.textContent = String(i + 1);
        n.style.cssText = `position:absolute;left:${nx}px;top:${ny}px;width:${size}px;height:${size}px;border-radius:50%;background:${accent};color:#fff;font:700 15px/28px system-ui,Segoe UI,sans-serif;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff`;
        layer.append(o, n);
      });
      document.body.append(layer);
    },
    boxes,
    ACCENT
  );
}

(async () => {
  fs.mkdirSync(ANN_DIR, { recursive: true });
  fs.mkdirSync(CLEAN_DIR, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--font-render-hinting=none'] });
  const contexts = new Map();
  const report = [];
  const ctxFor = async (user, school) => {
    const key = `${user ?? '-'}|${school ?? 'DEMO'}`;
    if (contexts.has(key)) return contexts.get(key);
    const ctx = await browser.createBrowserContext();
    const p = await ctx.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    if (user) await login(p, user, school === undefined ? 'DEMO' : school);
    await p.close();
    contexts.set(key, ctx);
    return ctx;
  };

  // Resolve {placeholders} in paths from live data, e.g. a real student id.
  const vars = {};
  for (const [name, v] of Object.entries(spec.vars ?? {})) {
    const ctx = await ctxFor(v.as);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    vars[name] = await p.evaluate(async (url, pick) => {
      const j = await (await fetch(url)).json();
      return pick.split('.').reduce((o, k) => (o == null ? o : o[k]), j);
    }, v.url, v.pick);
    await p.close();
    if (!vars[name]) console.log(`! var ${name} unresolved`);
  }
  const fill = (str) => str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);

  for (const shot of shots) {
    shot.path = fill(shot.path);
    for (const st of shot.steps ?? []) if (st.goto) st.goto = fill(st.goto);
    const ctx = await ctxFor(shot.user, shot.school);
    const page = await ctx.newPage();
    // Production builds send upgrade-insecure-requests, which breaks plain-http localhost captures.
    await page.setBypassCSP(true);
    if (shot.geo) {
      await ctx.overridePermissions(BASE, ['geolocation']);
      await page.setGeolocation({ latitude: shot.geo.lat, longitude: shot.geo.lng, accuracy: 6 });
    }
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
    try {
      const vw = shot.width ?? 1440;
      const vh = shot.height ?? (vw < 600 ? 844 : 900);
      await page.setViewport({ width: vw, height: vh, deviceScaleFactor: vw < 600 ? 2 : 1 });
      await page.evaluateOnNewDocument((t) => localStorage.setItem('vidyalaya-theme', t), shot.dark ? 'dark' : 'light');
      if (shot.storage) await page.evaluateOnNewDocument((kv) => Object.entries(kv).forEach(([k, v]) => localStorage.setItem(k, v)), shot.storage);
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: shot.dark ? 'dark' : 'light' }]);
      if (shot.lang) await page.evaluateOnNewDocument((l) => localStorage.setItem('vidyalaya-lang', l), shot.lang);
      await page.goto(BASE + shot.path, { waitUntil: 'networkidle2', timeout: 120000 });
      await sleep(shot.settle ?? 1500);
      for (const step of shot.steps ?? []) await act(page, step);
      // Hide the Next dev indicator and blinking carets so images are stable.
      await page.addStyleTag({ content: 'nextjs-portal,[data-nextjs-toast]{display:none!important} *{caret-color:transparent!important}' });
      await sleep(300);
      const boxes = [];
      const missing = [];
      for (const m of shot.markers ?? []) {
        const b = await page.evaluate(locateInPage, m);
        if (!b) missing.push(m.note);
        boxes.push(b);
      }
      await page.screenshot({ path: path.join(CLEAN_DIR, `${shot.id}.png`) });
      await drawMarkers(page, boxes);
      await page.screenshot({ path: path.join(ANN_DIR, `${shot.id}.png`) });
      fs.writeFileSync(
        path.join(CLEAN_DIR, `${shot.id}.json`),
        JSON.stringify({
          id: shot.id,
          width: vw,
          height: vh,
          markers: (shot.markers ?? []).map((m, i) => ({ n: i + 1, note: m.note, box: boxes[i] && { x: +(boxes[i].x / vw * 100).toFixed(2), y: +(boxes[i].y / vh * 100).toFixed(2), w: +(boxes[i].w / vw * 100).toFixed(2), h: +(boxes[i].h / vh * 100).toFixed(2) } })),
        }, null, 1)
      );
      if (missing.length && process.env.DUMP) {
        const seen = await page.evaluate(() => [...document.querySelectorAll('main button, main a, [role=tab], [role=dialog] button, main label, main h1, main h2, main h3, [role=dialog] label')]
          .filter((e) => e.getBoundingClientRect().width > 0).map((e) => `${e.tagName.toLowerCase()}${e.getAttribute('role') ? '[' + e.getAttribute('role') + ']' : ''}:${(e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40)}`).filter((x) => !x.endsWith(':')).slice(0, 80));
        console.log(`   visible: ${[...new Set(seen)].join(' | ')}`);
      }
      report.push({ id: shot.id, ok: !missing.length && !errors.length, missing, errors });
      console.log(`${missing.length || errors.length ? '!' : '✓'} ${shot.id}${missing.length ? `  missing: ${missing.join(' | ')}` : ''}${errors.length ? `  errors: ${errors.join(' | ')}` : ''}`);
    } catch (e) {
      report.push({ id: shot.id, ok: false, error: e.message });
      console.log(`✗ ${shot.id}  ${e.message.slice(0, 200)}`);
    } finally {
      await page.close();
    }
  }
  await browser.close();
  const bad = report.filter((r) => !r.ok);
  console.log(`\n${report.length - bad.length}/${report.length} shots clean`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
