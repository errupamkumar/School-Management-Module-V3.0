/**
 * Security suite: anonymous access to every API route, sign-in hardening
 * (generic errors, rate limits, lockout, no internal details), session cookie,
 * CSRF and redirect protections, tenant isolation by id, mass assignment,
 * injection probes, upload handling, public-endpoint limits and headers.
 * Unlocks every account it locks and removes what it creates.
 *   TEST_BASE_URL=http://localhost:3100 npx tsx tests/api/security.ts
 *
 * Rate-limit checks send their own X-Forwarded-For so they never use up the
 * allowance of other suites. That only works on a server without a proxy in
 * front; on Vercel the header is overwritten with the real client address.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { resetLoginRateLimits } from '../reset-rate-limits';
import { as, BASE, PASSWORD, Session, type ApiResult } from './client';

const SCHOOL = process.env.TEST_SCHOOL || 'DEMO';
let passed = 0;
const failures: string[] = [];
const notes: string[] = [];
let flow = '';
const check = (name: string, cond: unknown, detail?: unknown) => {
  if (cond) return void passed++;
  failures.push(`${flow} › ${name}${detail !== undefined ? `  (${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 240)})` : ''}`);
};
const is = (r: ApiResult, status: number, name: string) => check(`${name} → ${status}`, r.status === status, `${r.status} ${r.error ?? ''}`);
async function run(name: string, fn: () => Promise<void>) {
  flow = name;
  const before = failures.length;
  try {
    await fn();
  } catch (e) {
    failures.push(`${name} › threw: ${(e as Error).stack?.split('\n').slice(0, 2).join(' ') ?? e}`);
  }
  console.log(`${failures.length === before ? '✓' : '✗'} ${name}`);
}
const db = new PrismaClient();
const uniq = Date.now().toString().slice(-6);
const SIGN_IN_CODES = new Set(['INVALID', 'LOCKED', 'SUSPENDED', 'RATE_LIMITED', 'UNAVAILABLE']);
const LEAK = /prisma|stack|at \w+ \(|node_modules|[A-Z]:\\|\/var\/task|ECONNREFUSED|SELECT |INSERT /i;

/** Every API route file outside /api/public and /api/auth, with the methods it exports. */
function apiRoutes(dir = path.join('src', 'app', 'api'), url = '/api'): Array<{ url: string; methods: string[] }> {
  const out: Array<{ url: string; methods: string[] }> = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (url === '/api' && (name === 'public' || name === 'auth')) continue;
      out.push(...apiRoutes(full, `${url}/${name.replace(/^\[\.{0,3}.+\]$/, 'x')}`));
    } else if (name === 'route.ts') {
      const src = readFileSync(full, 'utf8');
      const methods = new Set<string>();
      for (const m of src.matchAll(/export const \{([^}]+)\}/g)) for (const k of m[1].split(',')) methods.add(k.trim());
      for (const m of src.matchAll(/export (?:const|async function) (GET|POST|PUT|PATCH|DELETE)\b/g)) methods.add(m[1]);
      out.push({ url, methods: [...methods].filter((m) => /^(GET|POST|PUT|PATCH|DELETE)$/.test(m)) });
    }
  }
  return out;
}

/** Signs in with raw fetch so the response headers and the error code can be inspected. */
async function signIn(schoolCode: string, identifier: string, password: string, opts: { ip?: string; callbackUrl?: string; csrf?: boolean } = {}) {
  const ipHeader: Record<string, string> = opts.ip ? { 'X-Forwarded-For': opts.ip } : {};
  const c = await fetch(`${BASE}/api/auth/csrf`, { headers: ipHeader });
  const csrfCookie = (c.headers.getSetCookie?.() ?? []).map((x) => x.split(';')[0]).join('; ');
  const { csrfToken } = (await c.json()) as { csrfToken: string };
  const form = new URLSearchParams({ ...(opts.csrf === false ? {} : { csrfToken }), schoolCode, identifier, password, json: 'true', ...(opts.callbackUrl ? { callbackUrl: opts.callbackUrl } : {}) });
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: csrfCookie, ...ipHeader }, body: form.toString() });
  const cookies = res.headers.getSetCookie?.() ?? [];
  const text = await res.text();
  let url = '';
  try {
    url = (JSON.parse(text) as { url?: string }).url ?? '';
  } catch {
    url = res.headers.get('location') ?? '';
  }
  const error = url ? new URL(url, BASE).searchParams.get('error') : null;
  return { status: res.status, cookies, url, error, session: cookies.some((x) => /session-token=[^;]+/.test(x) && !/expires=Thu, 01 Jan 1970/i.test(x)) };
}

async function upload(s: Session, name: string, type: string, content: Buffer | string, purpose: string) {
  const form = new FormData();
  form.append('purpose', purpose);
  form.append('file', new Blob([typeof content === 'string' ? content : new Uint8Array(content)], { type }), name);
  const res = await s.raw('/api/files', { method: 'POST', body: form });
  const raw = (await res.json().catch(() => null)) as { data?: { id: string; mimeType: string } } | null;
  return { status: res.status, id: raw?.data?.id, mimeType: raw?.data?.mimeType };
}

(async () => {
  await resetLoginRateLimits();
  const created: { files: string[] } = { files: [] };

  await run('Every non-public API route refuses anonymous callers', async () => {
    const routes = apiRoutes();
    let probes = 0;
    for (const r of routes) {
      for (const method of r.methods) {
        const res = await fetch(BASE + r.url, { method, redirect: 'manual', headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : '{}' });
        probes++;
        check(`${method} ${r.url} anonymous → 401/403/404/405`, [401, 403, 404, 405].includes(res.status), res.status);
        await res.body?.cancel();
      }
    }
    notes.push(`anonymous sweep: ${probes} method × route probes across ${routes.length} route files`);
  });

  await run('Sign-in: generic errors, no account enumeration, no internal details', async () => {
    const unknownUser = await signIn(SCHOOL, `nobody${uniq}`, 'Wrong@12345', { ip: `198.51.100.${uniq.slice(-2)}` });
    const wrongPassword = await signIn(SCHOOL, 'reception', 'Wrong@12345', { ip: `198.51.100.${uniq.slice(-2)}` });
    const unknownSchool = await signIn(`ZZ${uniq}`, 'owner', 'Wrong@12345', { ip: `198.51.100.${uniq.slice(-2)}` });
    check('unknown user → INVALID', unknownUser.error === 'INVALID' && !unknownUser.session, unknownUser.error);
    check('wrong password → same INVALID code', wrongPassword.error === 'INVALID' && !wrongPassword.session, wrongPassword.error);
    check('unknown school → same INVALID code', unknownSchool.error === 'INVALID', unknownSchool.error);
    for (const r of [unknownUser, wrongPassword, unknownSchool]) check('error is a known code, nothing internal', r.error !== null && SIGN_IN_CODES.has(r.error) && !LEAK.test(r.url), r.url);
    const long = await signIn(SCHOOL, 'owner', 'x'.repeat(5000));
    check('5,000-character password refused without a session', !long.session && long.error === 'INVALID', long.error);
    const noCsrf = await signIn(SCHOOL, 'owner', PASSWORD, { csrf: false });
    check('sign-in without a CSRF token creates no session', !noCsrf.session, noCsrf.status);
    await db.user.updateMany({ where: { username: 'reception', school: { code: SCHOOL } }, data: { failedLoginCount: 0, lockedUntil: null } });
  });

  await run('Sign-in: account lockout after 5 wrong passwords', async () => {
    const who = 'librarian';
    try {
      const codes: Array<string | null> = [];
      for (let i = 0; i < 5; i++) codes.push((await signIn(SCHOOL, who, `Wrong@${i}${uniq}`, { ip: `198.51.100.${10 + i}` })).error);
      check('attempts 1–4 → INVALID, 5th → LOCKED', codes.slice(0, 4).every((c) => c === 'INVALID') && codes[4] === 'LOCKED', codes);
      const right = await signIn(SCHOOL, who, PASSWORD, { ip: '198.51.100.20' });
      check('correct password while locked → LOCKED, no session', right.error === 'LOCKED' && !right.session, right.error);
    } finally {
      await db.user.updateMany({ where: { username: who, school: { code: SCHOOL } }, data: { failedLoginCount: 0, lockedUntil: null } });
      await resetLoginRateLimits();
    }
    const after = await signIn(SCHOOL, who, PASSWORD);
    check('unlocked account signs in again', after.session, after.error);
  });

  await run('Sign-in: per-IP rate limit (30 attempts / 15 min)', async () => {
    const ip = `203.0.113.${Number(uniq.slice(-2)) + 1}`;
    try {
      let first429 = 0;
      for (let i = 1; i <= 31; i++) {
        const r = await signIn(SCHOOL, `ghost${i}x${uniq}`, 'Wrong@12345', { ip });
        if (r.error === 'RATE_LIMITED') {
          first429 = i;
          break;
        }
      }
      check('31st attempt from one address → RATE_LIMITED', first429 === 31, first429);
      const good = await signIn(SCHOOL, 'owner', PASSWORD, { ip });
      check('even the right password is refused from that address', !good.session && good.error === 'RATE_LIMITED', good.error);
    } finally {
      await resetLoginRateLimits();
    }
  });

  await run('Session cookie and token', async () => {
    const r = await signIn(SCHOOL, 'owner', PASSWORD);
    const cookie = r.cookies.find((c) => /session-token=/.test(c)) ?? '';
    check('session cookie is HttpOnly', /;\s*HttpOnly/i.test(cookie), cookie.split(';').slice(1).join(';'));
    check('session cookie is SameSite=Lax or Strict', /;\s*SameSite=(Lax|Strict)/i.test(cookie), cookie.split(';').slice(1).join(';'));
    if (BASE.startsWith('https:')) check('session cookie is Secure on HTTPS', /;\s*Secure/i.test(cookie), cookie);
    else notes.push('Secure cookie flag not checked: test server is plain HTTP');
    const token = cookie.split(';')[0];
    const ok = await fetch(`${BASE}/api/me`, { headers: { cookie: token } });
    check('valid token reads /api/me', ok.status === 200, ok.status);
    const [name, value] = [token.slice(0, token.indexOf('=')), token.slice(token.indexOf('=') + 1)];
    const tampered = value.slice(0, -6) + (value.endsWith('AAAAAA') ? 'BBBBBB' : 'AAAAAA');
    const bad = await fetch(`${BASE}/api/me`, { headers: { cookie: `${name}=${tampered}` } });
    check('tampered token → 401', bad.status === 401, bad.status);
    const forged = await fetch(`${BASE}/api/me`, { headers: { cookie: `${name}=eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4Iiwicm9sZSI6IlNVUEVSX0FETUlOIn0.` } });
    check('unsigned (alg none) token → 401', forged.status === 401, forged.status);
  });

  const [owner, teacher, parent, student, gvs] = await Promise.all([as(SCHOOL, 'owner'), as(SCHOOL, 'teacher'), as(SCHOOL, 'parent'), as(SCHOOL, 'student'), as('GVS', 'owner')]);

  await run('CSRF and redirects', async () => {
    is(await owner.call('POST', '/api/notices', { title: 'CSRF probe', body: 'should be blocked' }, { Origin: 'https://evil.example' }), 403, 'cross-origin POST with a valid session');
    is(await owner.call('DELETE', '/api/notices/x', undefined, { Origin: 'https://evil.example' }), 403, 'cross-origin DELETE with a valid session');
    const r = await signIn(SCHOOL, 'owner', PASSWORD, { callbackUrl: 'https://evil.example/steal' });
    check('callbackUrl to another site is not followed', r.url !== '' && new URL(r.url).origin === new URL(BASE).origin, r.url);
    const r2 = await signIn(SCHOOL, 'owner', PASSWORD, { callbackUrl: '//evil.example/steal' });
    check('protocol-relative callbackUrl stays on this site', new URL(r2.url, BASE).host === new URL(BASE).host, r2.url);
  });

  await run('Tenant isolation and object-level access by id', async () => {
    const list = await owner.get('/api/students?pageSize=1');
    const rows = (list.data?.items ?? list.data?.rows ?? list.data ?? []) as Array<{ id: string }>;
    const demoStudentId = rows[0]?.id;
    check('DEMO owner can list students', !!demoStudentId, list.status);
    if (demoStudentId) {
      const cross = await gvs.get(`/api/students/${demoStudentId}`);
      check('GVS owner cannot read a DEMO student by id', [403, 404].includes(cross.status), cross.status);
      const crossEdit = await gvs.put(`/api/students/${demoStudentId}`, { firstName: 'Hacked' });
      check('GVS owner cannot edit a DEMO student by id', [400, 403, 404].includes(crossEdit.status), crossEdit.status);
      const kid = await student.get(`/api/students/${demoStudentId}`);
      check('a student cannot open another student record', [403, 404].includes(kid.status) || (kid.ok && kid.data?.id === (await student.get('/api/me')).data?.children?.[0]?.id), kid.status);
    }
    const f = await upload(teacher, `notes-${uniq}.pdf`, 'application/pdf', Buffer.from('%PDF-1.4\n%probe\n'), 'NOTICE');
    if (f.id) created.files.push(f.id);
    check('teacher uploads a notice attachment', f.status === 200 && !!f.id, f.status);
    if (f.id) {
      const other = await gvs.raw(`/api/files/${f.id}`);
      check('another school cannot download it', [403, 404].includes(other.status), other.status);
      await other.body?.cancel();
    }
  });

  await run('Mass assignment and privilege escalation', async () => {
    const before = (await teacher.get('/api/me')).data;
    const r = await teacher.patch('/api/me', { role: 'SUPER_ADMIN', schoolId: null, isActive: true, language: before?.user?.language ?? 'en' });
    const after = (await teacher.get('/api/me')).data;
    check('PATCH /api/me ignores role and schoolId', (r.ok || r.status === 400) && (after?.user?.role ?? after?.role) === 'TEACHER', { status: r.status, role: after?.user?.role ?? after?.role });
    is(await teacher.post('/api/employees', { firstName: 'Evil', gender: 'MALE', designation: 'Owner', loginRole: 'SUPER_ADMIN', username: `evil${uniq}` }), 403, 'teacher hires an employee with owner access');
    const teacherUser = await db.user.findFirstOrThrow({ where: { username: 'teacher', school: { code: SCHOOL } }, select: { id: true } });
    const admin = await as(SCHOOL, 'admin');
    is(await admin.patch(`/api/users/${teacherUser.id}`, { role: 'SUPER_ADMIN' }), 403, 'principal grants owner access');
    is(await admin.patch(`/api/users/${teacherUser.id}`, { role: 'ADMIN' }), 403, 'principal grants administrator access');
    is(await parent.get('/api/platform/stats'), 403, 'parent reads platform stats');
    is(await owner.get('/api/platform/schools'), 403, 'school owner reads the platform school list');
  });

  await run('Injection probes never cause server errors', async () => {
    const payloads = ["' OR '1'='1", '"; DROP TABLE Student; --', '%', '\\', '<script>alert(1)</script>', '${7*7}', '{{7*7}}', '../../etc/passwd'];
    for (const p of payloads) {
      const enc = encodeURIComponent(p);
      for (const u of [`/api/students?q=${enc}`, `/api/students?search=${enc}`, `/api/employees?q=${enc}`, `/api/library/books?q=${enc}`, `/api/students/${enc}`, `/api/files/${enc}`]) {
        const r = await owner.raw(u);
        const text = await r.text();
        check(`GET ${u} → no 5xx, nothing internal`, r.status < 500 && !LEAK.test(text), `${r.status} ${text.slice(0, 120)}`);
      }
    }
    const obj = await owner.call('POST', '/api/notices', { title: { $ne: null }, body: ['x'] });
    is(obj, 400, 'object/array where text is expected');
    const broken = await owner.raw('/api/notices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"title": "unterminated' });
    const bt = await broken.text();
    check('malformed JSON → 400 without internals', broken.status === 400 && !LEAK.test(bt), `${broken.status} ${bt.slice(0, 160)}`);
    const big = await owner.raw('/api/notices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Big', body: 'x'.repeat(3_000_000) }) });
    check('3 MB body → 4xx, not a crash', big.status >= 400 && big.status < 500, big.status);
    await big.body?.cancel();
  });

  await run('Uploads cannot deliver active content', async () => {
    const html = await upload(teacher, `page-${uniq}.html`, 'text/html', '<html><script>alert(document.cookie)</script></html>', 'NOTICE');
    if (html.id) created.files.push(html.id);
    if (html.id) {
      const r = await teacher.raw(`/api/files/${html.id}`);
      check('HTML upload is not served as text/html', !/text\/html/i.test(r.headers.get('content-type') ?? ''), r.headers.get('content-type'));
      check('HTML upload is served as an attachment', /attachment/i.test(r.headers.get('content-disposition') ?? ''), r.headers.get('content-disposition'));
      check('file responses carry a sandbox CSP and nosniff', /sandbox/.test(r.headers.get('content-security-policy') ?? '') && r.headers.get('x-content-type-options') === 'nosniff', r.headers.get('content-security-policy'));
      await r.body?.cancel();
    } else check('HTML upload accepted or refused cleanly', html.status === 400, html.status);
    const svg = await upload(teacher, `pic-${uniq}.svg`, 'image/svg+xml', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'NOTICE');
    if (svg.id) created.files.push(svg.id);
    if (svg.id) {
      const r = await teacher.raw(`/api/files/${svg.id}`);
      const ct = r.headers.get('content-type') ?? '';
      const inline = !/attachment/i.test(r.headers.get('content-disposition') ?? '');
      check('SVG with script is never rendered with scripts enabled', !(/svg/i.test(ct) && inline) || /sandbox/.test(r.headers.get('content-security-policy') ?? ''), { ct, inline });
      await r.body?.cancel();
    }
    const exe = await upload(teacher, `photo-${uniq}.png.exe`, 'application/octet-stream', Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]), 'NOTICE');
    if (exe.id) created.files.push(exe.id);
    check('executable is not stored as an image', exe.status === 400 || !/^image\//.test(exe.mimeType ?? ''), exe);
    const stu = await upload(student, `notice-${uniq}.pdf`, 'application/pdf', Buffer.from('%PDF-1.4\n'), 'NOTICE');
    check('student cannot upload a notice attachment', stu.status === 400 || stu.status === 403, stu.status);
    const huge = await upload(teacher, `big-${uniq}.pdf`, 'application/pdf', Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(6 * 1024 * 1024)]), 'NOTICE');
    check('file over the size limit is refused', huge.status === 400 || huge.status === 413, huge.status);
  });

  await run('Public endpoints: limits, secrets and honeypot', async () => {
    const ip = `192.0.2.${Number(uniq.slice(-2)) + 1}`;
    try {
      const codes: number[] = [];
      for (let i = 0; i < 9; i++) {
        const r = await fetch(`${BASE}/api/public/website/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip }, body: 'not json' });
        codes.push(r.status);
        await r.body?.cancel();
      }
      check('lead form: 8 requests an hour per address, 9th → 429', codes.slice(0, 8).every((c) => c === 400) && codes[8] === 429, codes);
    } finally {
      await db.rateLimit.deleteMany({ where: { key: { startsWith: 'public:website-lead:' } } });
    }
    for (const auth of [undefined, 'Bearer wrong-secret']) {
      const r = await fetch(`${BASE}/api/public/cron`, { method: 'POST', headers: auth ? { Authorization: auth } : {} });
      check(`cron ${auth ? 'with a wrong secret' : 'without a secret'} → 401/403`, [401, 403].includes(r.status), r.status);
      await r.body?.cancel();
    }
    const info = await fetch(`${BASE}/api/public/schools/${SCHOOL}`);
    const text = await info.text();
    check('public school info exposes no keys or contact secrets', !/(key_secret|keySecret|passwordHash|apiKey|webhookSecret|accountNo)/i.test(text), text.slice(0, 200));
  });

  await run('Security headers', async () => {
    const page = await fetch(`${BASE}/login`);
    const h = (k: string) => page.headers.get(k) ?? '';
    check("CSP blocks framing (frame-ancestors 'none')", /frame-ancestors 'none'/.test(h('content-security-policy')), h('content-security-policy').slice(0, 80));
    check("CSP has object-src 'none' and base-uri 'self'", /object-src 'none'/.test(h('content-security-policy')) && /base-uri 'self'/.test(h('content-security-policy')));
    check('X-Frame-Options: DENY', h('x-frame-options') === 'DENY', h('x-frame-options'));
    check('X-Content-Type-Options: nosniff', h('x-content-type-options') === 'nosniff');
    check('Referrer-Policy set', !!h('referrer-policy'));
    check('Cross-Origin-Opener-Policy: same-origin', h('cross-origin-opener-policy') === 'same-origin');
    check('no X-Powered-By header', !page.headers.has('x-powered-by'));
    if (BASE.startsWith('https:')) check('HSTS with a long max-age', /max-age=(\d+)/.test(h('strict-transport-security')) && Number(/max-age=(\d+)/.exec(h('strict-transport-security'))![1]) >= 15552000, h('strict-transport-security'));
    await page.body?.cancel();
    const api = await owner.raw('/api/me');
    check('API responses are not cached (no-store)', /no-store/.test(api.headers.get('cache-control') ?? ''), api.headers.get('cache-control'));
    await api.body?.cancel();
    if (/unsafe-inline/.test(h('content-security-policy'))) notes.push("CSP allows 'unsafe-inline' scripts (documented trade-off in next.config.js: Next.js inline bootstrap scripts)");
  });

  if (created.files.length) await db.storedFile.deleteMany({ where: { id: { in: created.files } } });
  await resetLoginRateLimits();
  await db.$disconnect();
  console.log(`\n${passed} passed, ${failures.length} failed  (${BASE})`);
  if (notes.length) console.log('\nNotes:\n  ' + notes.join('\n  '));
  if (failures.length) {
    console.log('\nFailures:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
})().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
