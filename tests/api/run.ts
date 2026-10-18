/**
 * API integration suite. Run against a freshly seeded database:
 *   npm run db:reset && npm run dev   (other terminal)
 *   npm run test:api                  (TEST_BASE_URL to target another server)
 *
 * Exercises the real HTTP surface — sign-in, RBAC, tenant isolation, family data
 * scope, and the main admin workflows — and exits non-zero on any failure.
 */
import { resetLoginRateLimits } from '../reset-rate-limits';
import { as, BASE, Session, type ApiResult } from './client';

let passed = 0;
const failures: string[] = [];
let suite = '';

function check(name: string, cond: unknown, detail?: unknown) {
  if (cond) {
    passed++;
    return;
  }
  failures.push(`${suite} › ${name}${detail !== undefined ? `  (${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 200)})` : ''}`);
}
const status = (r: ApiResult, code: number, name: string) => check(`${name} → ${code}`, r.status === code, `${r.status} ${r.error ?? ''}`);

async function section(name: string, fn: () => Promise<void>) {
  suite = name;
  const before = failures.length;
  try {
    await fn();
  } catch (e) {
    failures.push(`${name} › crashed: ${(e as Error).message}`);
  }
  console.log(`${failures.length === before ? '✓' : '✗'} ${name}`);
}

async function main() {
  await resetLoginRateLimits();
  const admin = await as('DEMO', 'admin');
  const owner = await as('DEMO', 'owner');
  const teacher = await as('DEMO', 'teacher');
  const accountant = await as('DEMO', 'accountant');
  const parent = await as('DEMO', 'parent');
  const student = await as('DEMO', 'student');
  const gvs = await as('GVS', 'admin');

  await section('authentication', async () => {
    check('wrong password rejected', !(await new Session().login('DEMO', 'admin', 'wrong-password-1')));
    check('wrong school code rejected', !(await new Session().login('NOPE', 'admin', 'Demo@12345')));
    status(await new Session().get('/api/me'), 401, 'anonymous /api/me');
    const me = await admin.get('/api/me');
    check('session carries role and school', me.data?.user.role === 'ADMIN' && me.data?.school.code === 'DEMO');
    check('no secrets in /api/me', !/passwordHash|aadhaarEnc|sessionVersion|Enc"/.test(JSON.stringify(me.raw)));
    const xorigin = await admin.call('POST', '/api/notices', { title: 'x' }, { Origin: 'https://evil.example' });
    status(xorigin, 403, 'cross-origin POST');
  });

  await section('role-based access', async () => {
    status(await teacher.get('/api/payroll'), 403, 'teacher → payroll');
    status(await teacher.get('/api/settings'), 403, 'teacher → settings');
    status(await accountant.get('/api/fees/report?from=2026-04-01&to=2026-10-31'), 200, 'accountant → fee report');
    status(await accountant.get('/api/access-control'), 403, 'accountant → access control');
    status(await teacher.post('/api/fees/collect', {}), 403, 'teacher → collect fees');
    status(await admin.get('/api/audit-logs'), 200, 'admin → audit log');
  });

  await section('family data scope', async () => {
    const me = (await parent.get('/api/me')).data;
    const kids = new Set<string>(me.children.map((c: { id: string }) => c.id));
    check('parent has children', kids.size > 0);
    const list = await parent.get('/api/students?pageSize=200');
    check('student directory closed to parents', list.status === 403, list.status);
    // Endpoints families may call return only their own children's rows.
    for (const url of ['/api/fees/defaulters', '/api/fees/invoices?pageSize=100', '/api/doubts?status=ALL']) {
      const r = await parent.get(url);
      const rows: Array<{ studentId?: string }> = Array.isArray(r.data) ? r.data : r.data?.rows ?? r.data?.items ?? [];
      check(`${url} scoped to own children`, r.status === 403 || rows.every((x) => !x.studentId || kids.has(x.studentId)), r.status);
    }
    const staffOnly = ['/api/employees', '/api/users', '/api/guardians', '/api/fees/concessions', '/api/fees/report', '/api/transport/vehicles', '/api/transport/allocations', '/api/accounts/entries', '/api/payroll', '/api/audit-logs', '/api/settings', '/api/access-control', '/api/reports/students', '/api/campuses', '/api/certificates/templates', '/api/certificates/issued', '/api/id-cards?type=EMPLOYEE', '/api/admissions', '/api/assets', '/api/sms/log'];
    for (const who of [parent, student]) {
      for (const url of staffOnly) {
        const r = await who.get(url);
        check(`${who === parent ? 'parent' : 'student'} blocked from ${url}`, r.status === 403 || r.status === 404, r.status);
      }
    }
    const other = (await admin.get('/api/students?pageSize=200')).data.find((s: { id: string }) => !kids.has(s.id));
    status(await parent.get(`/api/students/${other.id}`), 403, "parent → another family's student");
    status(await parent.get(`/api/study/sessions?studentId=${other.id}`), 403, "parent → another child's study log");
  });

  await section('tenant isolation', async () => {
    const demoStudent = (await admin.get('/api/students?pageSize=1')).data[0];
    const demoEmployee = (await admin.get('/api/employees?pageSize=1')).data[0];
    for (const [what, url] of [['student', `/api/students/${demoStudent.id}`], ['employee', `/api/employees/${demoEmployee.id}`]]) {
      const r = await gvs.get(url);
      check(`other school cannot read DEMO ${what}`, r.status === 404 || r.status === 403, r.status);
    }
    const gvsList = await gvs.get('/api/students?pageSize=200');
    check('GVS list has no DEMO students', !gvsList.data.some((s: { id: string }) => s.id === demoStudent.id));
    const upd = await gvs.put(`/api/students/${demoStudent.id}`, { notes: 'cross-tenant write' });
    check('cross-tenant update blocked', upd.status === 404 || upd.status === 403, upd.status);
  });

  await section('notifications', async () => {
    const n = await parent.get('/api/notifications?all=1');
    check('returns items and unread count', Array.isArray(n.data?.items) && typeof n.data?.unread === 'number');
    const me = (await parent.get('/api/me')).data.user.id;
    check('only own notifications', n.data.items.every((x: { userId: string }) => x.userId === me));
    const foreign = (await admin.get('/api/notifications?all=1')).data.items[0];
    if (foreign) {
      await parent.patch('/api/notifications', { ids: [foreign.id] });
      const still = (await admin.get('/api/notifications?all=1')).data.items.find((x: { id: string }) => x.id === foreign.id);
      check("cannot mark someone else's notification read", still?.isRead === foreign.isRead);
    }
    const r = await parent.patch('/api/notifications', { all: true });
    check('mark all read', r.ok && (await parent.get('/api/notifications')).data.unread === 0);
  });

  await section('roles & permissions', async () => {
    status(await admin.put('/api/access-control/modules', { changes: [{ module: 'settings', enabled: false }] }), 400, 'core module cannot be switched off');
    status(await admin.put('/api/access-control/modules', { changes: [{ module: 'library', enabled: false }] }), 200, 'switch library off');
    status(await teacher.get('/api/library/books'), 403, 'teacher after library off');
    status(await admin.put('/api/access-control/modules', { changes: [{ module: 'library', enabled: true }] }), 200, 'switch library on');
    status(await teacher.get('/api/library/books'), 200, 'teacher after library on');
    status(await admin.put('/api/access-control/permissions', { changes: [{ role: 'ADMIN', module: 'payroll', perm: { view: true, create: true, edit: true, delete: true } }] }), 403, 'admin cannot edit own role');
    status(await admin.put('/api/access-control/permissions', { changes: [{ role: 'PARENT', module: 'employees', perm: { view: true, create: false, edit: false, delete: false } }] }), 400, 'family roles cannot be widened');
    status(await admin.put('/api/access-control/permissions', { changes: [{ role: 'TEACHER', module: 'homework', perm: { view: false, create: false, edit: false, delete: false } }] }), 200, 'restrict teacher homework');
    status(await teacher.get('/api/homework'), 403, 'teacher homework after restriction');
    status(await admin.del('/api/access-control/permissions?role=TEACHER'), 200, 'reset teacher');
    status(await teacher.get('/api/homework'), 200, 'teacher homework after reset');
    status(await owner.put('/api/access-control/permissions', { changes: [{ role: 'ADMIN', module: 'audit_logs', perm: { view: true, create: false, edit: false, delete: false } }] }), 200, 'owner may edit admin role');
  });

  await section('settings', async () => {
    const before = (await admin.get('/api/settings')).data.settings;
    status(await admin.put('/api/settings', { settings: { exams: { overallPassPercent: 40 } } }), 200, 'partial save');
    const after = (await admin.get('/api/settings')).data.settings;
    check('other sections untouched by partial save', JSON.stringify(after.rules) === JSON.stringify(before.rules) && after.bankAccounts.length === before.bankAccounts.length && after.numbering.receiptPrefix === before.numbering.receiptPrefix);
    check('other fields of the section kept', after.exams.subjectPassPercent === before.exams.subjectPassPercent);
    status(await admin.put('/api/settings', { settings: { payments: { razorpayKeyId: '', razorpayKeySecretEnc: 'x' } } }), 400, 'encrypted fields cannot be injected');
    status(await admin.put('/api/settings', { profile: { logoUrl: 'data:image/svg+xml;base64,PHN2Zz4=' } }), 400, 'SVG logo rejected');
    const s = await admin.put('/api/settings', { secrets: { smsApiKey: 'integration-test-key' } });
    check('secret stored but never echoed', s.data?.settings.messaging.smsApiKeySet === true && !JSON.stringify(s.raw).includes('integration-test-key'));
    await admin.put('/api/settings', { secrets: { smsApiKey: null }, settings: { exams: before.exams } });
  });

  await section('certificates', async () => {
    const tpls = (await admin.get('/api/certificates/templates')).data;
    const evil = await admin.post('/api/certificates/templates', { name: `Probe ${Date.now()}`, kind: 'CUSTOM', recipientType: 'STUDENT', body: '<p onclick="alert(1)">{{student.name}} {{customText}}</p><script>alert(2)</script>' });
    check('template body sanitised on save', evil.ok && !/onclick|script/i.test(evil.data.body), evil.data?.body);
    const stu = (await admin.get('/api/students?pageSize=1')).data[0];
    const cert = await admin.post('/api/certificates/issued', { templateId: evil.data.id, recipientId: stu.id, customText: '<img src=x onerror=alert(1)>' });
    check('substituted values escaped', cert.ok && cert.data.content.includes('&lt;img'), cert.data?.content);
    const pub = await fetch(`${BASE}/api/public/verify/${cert.data.verifyCode}`).then((r) => r.json());
    check('public verification works', pub.data?.valid === true && pub.data?.serialNo === cert.data.serialNo);
    check('public verification leaks no ids or content', !/"(id|schoolId|recipientId|content)"/.test(JSON.stringify(pub)));
    status(await admin.post(`/api/certificates/issued/${cert.data.id}`, { reason: 'integration test' }), 200, 'revoke');
    check('revoked shows as invalid', (await fetch(`${BASE}/api/public/verify/${cert.data.verifyCode}`).then((r) => r.json())).data?.valid === false);
    status(await admin.del(`/api/certificates/templates/${evil.data.id}`), 409, 'template with issued certificates cannot be deleted');
    status(await gvs.get('/api/certificates/templates'), 403, 'module disabled for GVS');
    check('seeded templates present', tpls.length >= 5);
  });

  await section('activities & study tools', async () => {
    const a = await admin.post('/api/activities', { name: `Test Club ${Date.now()}`, category: 'CLUB', capacity: 1, isActive: true });
    const kids = (await admin.get('/api/students?pageSize=2')).data;
    await admin.post(`/api/activities/${a.data.id}/members`, { studentId: kids[0].id });
    const j = await student.post(`/api/activities/${a.data.id}/members`, {});
    check('full activity puts student on waitlist', j.data?.status === 'WAITLISTED', j.data?.status ?? j.error);
    status(await student.post('/api/activities', { name: 'Hack', category: 'CLUB' }), 403, 'student cannot create activity');
    status(await teacher.put(`/api/activities/${a.data.id}`, { capacity: 5 }), 403, 'teacher not in charge cannot edit');
    await admin.del(`/api/activities/${a.data.id}`);
    status(await student.post('/api/study/sessions', { minutes: 500 }), 400, 'unrealistic study session rejected');
    status(await teacher.post('/api/study/sessions', { minutes: 10 }), 403, 'only students log study sessions');
  });

  await section('reports', async () => {
    const s = await admin.get('/api/reports/students');
    const strength = await admin.get('/api/reports/strength');
    check('strength totals match student report', strength.data.totals.total === s.data.rows.length, [strength.data.totals.total, s.data.rows.length]);
    check('no encrypted Aadhaar in report', !JSON.stringify(s.raw).includes('aadhaarEnc'));
    status(await teacher.get('/api/reports/students'), 403, 'teacher without reports permission');
  });

  await section('AI assistant guards', async () => {
    status(await student.post('/api/ai-assistant', { messages: [{ role: 'user', content: 'x'.repeat(4001) }] }), 400, 'oversized message');
    status(await student.post('/api/ai-assistant', { messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }] }), 400, 'last turn must be the user');
    status(await (await as('DEMO', 'librarian')).get('/api/ai-assistant'), 403, 'role without the module');
  });

  await section('platform & subscriptions', async () => {
    const p = await as('', 'platform');
    status(await admin.get('/api/platform/stats'), 403, 'school admin → platform');
    status(await p.get('/api/students'), 403, 'platform → school data');
    const plans = (await p.get('/api/platform/plans')).data.plans;
    const code = `IT${Date.now() % 1_000_000}`;
    const ob = await p.post('/api/platform/schools', { code, name: 'Integration Test School', planId: plans[0].id, status: 'TRIAL', trialDays: 14, owner: { name: 'Test Owner', username: 'owner' } });
    check('onboard school', ob.ok && ob.data.credential?.password, ob.error);
    const o = new Session();
    check('new owner signs in', await o.login(code, 'owner', ob.data.credential.password));
    status(await o.get('/api/students'), 403, 'must change temporary password first');
    await o.post('/api/me/password', { currentPassword: ob.data.credential.password, newPassword: 'Integration#2026' });
    const o2 = await as(code, 'owner', 'Integration#2026');
    status(await o2.get('/api/campuses'), 200, 'provisioned school usable');
    await p.patch(`/api/platform/schools/${ob.data.schoolId}`, { trialEndsAt: '2026-01-01' });
    status(await o2.post('/api/classes', { name: '1', numericOrder: 1 }), 402, 'expired trial is read-only');
    status(await o2.get('/api/students'), 200, 'expired trial can still read');
    await p.patch(`/api/platform/schools/${ob.data.schoolId}`, { status: 'SUSPENDED', reason: 'integration test' });
    status(await o2.get('/api/me'), 403, 'suspended school blocked');
  });

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('\nFailures:\n' + failures.map((f) => `  ✗ ${f}`).join('\n'));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
