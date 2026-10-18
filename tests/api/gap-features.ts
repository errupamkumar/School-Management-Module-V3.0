/**
 * The 2026-10 gap-closing modules end to end across real roles: advance and
 * instant fees, fee/staff/book imports, gate, discipline, remarks, gradebook,
 * online exams, polls/forms, discussions, gallery, blog + public news, tasks,
 * documents, reminders + cron, alumni, placements, email, SSO, App Frame,
 * BigBlueButton, QuickBooks/Paybooks, data export and the report builder.
 * Restores settings and removes what it creates.
 *   TEST_BASE_URL=http://localhost:3100 npx tsx tests/api/gap-features.ts
 */
import { PrismaClient } from '@prisma/client';
import { resetLoginRateLimits } from '../reset-rate-limits';
import { as, BASE, Session, type ApiResult } from './client';

const SCHOOL = process.env.TEST_SCHOOL || 'DEMO';
const CRON = process.env.CRON_SECRET || 'test-cron-secret-0123456789';
let passed = 0;
const failures: string[] = [];
let flow = '';
const check = (name: string, cond: unknown, detail?: unknown) => {
  if (cond) return void passed++;
  failures.push(`${flow} › ${name}${detail !== undefined ? `  (${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 260)})` : ''}`);
};
const okr = (r: ApiResult, name: string) => check(name, r.ok, `${r.status} ${r.error ?? ''}`);
const is = (r: ApiResult, status: number, name: string) => check(`${name} → ${status}`, r.status === status, `${r.status} ${r.error ?? ''}`);
async function run(name: string, fn: () => Promise<void>) {
  flow = name;
  const before = failures.length;
  try {
    await fn();
  } catch (e) {
    failures.push(`${name} › threw: ${(e as Error).stack?.split('\n').slice(0, 3).join(' ') ?? e}`);
  }
  console.log(`${failures.length === before ? '✓' : '✗'} ${name}`);
}
const db = new PrismaClient();
const uniq = Date.now().toString().slice(-6);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const iso = (msFromNow: number) => new Date(Date.now() + msFromNow).toISOString();

// Smallest valid PNG (1×1) and PDF, for upload tests.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
async function upload(s: Session, purpose: string, buf: Buffer, name: string, type: string): Promise<ApiResult> {
  const form = new FormData();
  form.set('file', new Blob([new Uint8Array(buf)], { type }), name);
  form.set('purpose', purpose);
  const res = await s.raw('/api/files', { method: 'POST', body: form });
  const raw = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok && raw?.success !== false, data: raw?.data, error: raw?.error, raw };
}

(async () => {
  await resetLoginRateLimits();
  const [owner, admin, teacher, accountant, reception, staff, student] = await Promise.all(['owner', 'admin', 'teacher', 'accountant', 'reception', 'staff', 'student'].map((u) => as(SCHOOL, u)));
  const original = (await admin.get('/api/settings')).data.settings;
  const restore = async (...sections: string[]) => admin.put('/api/settings', { settings: Object.fromEntries(sections.map((k) => [k, original[k]])) });
  const sMe = (await student.get('/api/me')).data;
  const kid = sMe.children[0] as { id: string; name: string; classId: string; sectionId: string };
  // The demo "parent" login belongs to another family; use the student's own guardian
  // so student and parent checks are about the same child.
  const guardianLogin = (await db.student.findUniqueOrThrow({ where: { id: kid.id }, select: { guardian: { select: { user: { select: { username: true } } } } } })).guardian?.user?.username;
  if (!guardianLogin) throw new Error("The demo student's guardian has no login");
  const parent = await as(SCHOOL, guardianLogin);
  const pMe = (await parent.get('/api/me')).data;
  const parentUserId = pMe.user.id as string;
  const school = await db.school.findUniqueOrThrow({ where: { code: SCHOOL }, select: { id: true } });
  const notifCount = async (userId: string, title: string) => db.notification.count({ where: { userId, title: { contains: title } } });

  await run('Advance fees: overpayment kept, used on the next invoice; switchable', async () => {
    const dues = (await accountant.get(`/api/fees/dues?studentId=${kid.id}`)).data;
    const before = dues.advance as number;
    const paid = await accountant.post('/api/fees/collect', { studentIds: [kid.id], amount: Number(dues.totalDue) + 500, mode: 'CASH' });
    okr(paid, 'collect dues + ₹500 extra');
    const receipt = paid.data?.[0];
    let instantId: string | null = null;
    try {
      const after = (await accountant.get(`/api/fees/dues?studentId=${kid.id}`)).data;
      check('dues cleared and ₹500 kept as advance', after.totalDue === 0 && Math.round((after.advance - before) * 100) === 50000, { totalDue: after.totalDue, advance: after.advance });
      const inst = await accountant.post('/api/fees/invoices', { title: `Science trip ${uniq}`, studentIds: [kid.id], dueDate: iso(7 * 86_400_000).slice(0, 10), items: [{ description: 'Bus and entry', amount: 300 }], notify: false });
      okr(inst, 'instant invoice raised');
      check('advance paid the instant invoice', inst.data?.advanceApplied === 300, inst.data);
      const list = (await accountant.get('/api/fees/invoices?period=INSTANT&pageSize=50')).data as Array<{ id: string; title: string; status: string }>;
      const row = list.find((i) => i.title === `Science trip ${uniq}`);
      instantId = row?.id ?? null;
      check('one-off invoice listed with its title and paid', row?.status === 'PAID', row);
      check('advance reduced by ₹300', Math.round(((await accountant.get(`/api/fees/dues?studentId=${kid.id}`)).data.advance - before) * 100) === 20000);
      const fam = (await parent.get(`/api/students/${kid.id}/overview`)).data;
      check('family sees the advance balance', fam.fees.advance >= 200, fam.fees.advance);
      okr(await admin.put('/api/settings', { settings: { fees: { allowAdvance: false } } }), 'school turns advance off');
      is(await accountant.post('/api/fees/collect', { studentIds: [kid.id], amount: 100, mode: 'CASH' }), 409, 'no dues and advance off');
      is(await teacher.post('/api/fees/invoices', { title: 'x trip', studentIds: [kid.id], dueDate: '2026-12-01', items: [{ description: 'a', amount: 10 }] }), 403, 'teacher cannot raise invoices');
      is(await accountant.post('/api/fees/invoices', { title: 'Empty', classId: 'nope', dueDate: '2026-12-01', items: [{ description: 'a', amount: 10 }] }), 404, 'unknown class');
    } finally {
      await restore('fees');
      if (receipt) okr(await accountant.post(`/api/fees/payments/${receipt.id}`, { reason: 'gap test cleanup' }), 'cleanup: cancel receipt (reverses allocations)');
      if (instantId) okr(await accountant.del(`/api/fees/invoices/${instantId}`, { reason: 'gap test cleanup' }), 'cleanup: cancel instant invoice');
    }
  });

  await run('Concurrent receipt cancellations keep the invoice consistent', async () => {
    const debtor = (await accountant.get('/api/fees/defaulters')).data.rows[0].studentId as string;
    const before = (await accountant.get(`/api/fees/dues?studentId=${debtor}`)).data.totalDue as number;
    const a = await accountant.post('/api/fees/collect', { studentIds: [debtor], amount: 100, mode: 'CASH' });
    const b = await accountant.post('/api/fees/collect', { studentIds: [debtor], amount: 100, mode: 'CASH' });
    okr(a, 'first part payment');
    okr(b, 'second part payment');
    const [ca, cb] = await Promise.all([a, b].map((p) => accountant.post(`/api/fees/payments/${p.data[0].id}`, { reason: 'concurrency test' })));
    okr(ca, 'cancel first');
    okr(cb, 'cancel second at the same moment');
    check('dues fully restored (no lost update)', (await accountant.get(`/api/fees/dues?studentId=${debtor}`)).data.totalDue === before, before);
  });

  await run('Imports: fee dues/receipts, staff and books — checked before writing', async () => {
    const adm = (await db.student.findUniqueOrThrow({ where: { id: kid.id }, select: { admissionNo: true } })).admissionNo;
    const bad = await accountant.post('/api/fees/import', { kind: 'DUES', dryRun: true, rows: [{ admissionNo: 'NOPE', title: 'Old dues', amount: '100', dueDate: '01/04/2026' }, { admissionNo: adm, title: 'Old dues', amount: 'abc', dueDate: '31/02/2026' }] });
    check('dry run lists every bad row', bad.ok && bad.data.errors.length === 2, bad.data);
    const good = await accountant.post('/api/fees/import', { kind: 'DUES', dryRun: false, rows: [{ admissionNo: adm, title: `Opening balance ${uniq}`, amount: '1,250', dueDate: '30/04/2026' }] });
    check('dues imported', good.ok && good.data.created === 1, good.data ?? good.error);
    const inv = await db.feeInvoice.findFirst({ where: { studentId: kid.id, title: `Opening balance ${uniq}` } });
    check('imported as an invoice of ₹1250', inv && Number(inv.total) === 1250);
    if (inv) {
      if (Number(inv.paidAmount) === 0) await accountant.del(`/api/fees/invoices/${inv.id}`, { reason: 'gap test cleanup' });
      else failures.push(`${flow} › imported invoice was paid from an existing advance; left in place`);
    }
    const pays = await accountant.post('/api/fees/import', { kind: 'PAYMENTS', dryRun: true, rows: [{ admissionNo: adm, amount: '500', date: '2099-01-01', mode: 'cash' }, { admissionNo: adm, amount: '500', date: '05/04/2026', mode: 'bitcoin' }] });
    check('receipt import refuses future dates and unknown modes', pays.data?.errors?.length === 2, pays.data);
    is(await teacher.post('/api/fees/import', { kind: 'DUES', rows: [{}] }), 403, 'teacher cannot import fees');
    const staffDry = await admin.post('/api/employees/import', { dryRun: true, rows: [{ firstName: 'Test', gender: 'F', designation: 'TGT', joiningDate: '01/04/2026' }, { firstName: 'X', gender: 'robot', designation: 'TGT', joiningDate: 'soon' }] });
    check('staff import validates rows', staffDry.ok && staffDry.data.valid === 1 && staffDry.data.errors.length === 1, staffDry.data);
    const title = `Gap Test Book ${uniq}`;
    const books = await admin.post('/api/library/import', { dryRun: false, rows: [{ title, author: 'Tester', copies: '2' }, { title, author: 'Tester', copies: '3' }] });
    okr(books, 'books imported');
    const b = await db.book.findFirst({ where: { schoolId: school.id, title } });
    check('same title + author adds copies', b?.copies === 5 && b?.available === 5, b);
    if (b) await db.book.delete({ where: { id: b.id } });
  });

  await run('Gate: visitor register, gate pass with parent alerts, guard checkout', async () => {
    is(await reception.post('/api/gate/visitors', { name: 'Ramesh', phone: '9876543210', purpose: 'MEETING', idProof: 'Aadhaar 123456789012' }), 400, 'full ID numbers are refused');
    const v = await reception.post('/api/gate/visitors', { name: 'Ramesh Kumar', phone: '9876543210', purpose: 'MEETING', whomToMeet: 'Principal', idProof: 'Aadhaar 9012' });
    okr(v, 'visitor checked in');
    check('pass number issued', /^V\d{6}$/.test(v.data?.passNo ?? ''), v.data?.passNo);
    check('visitor is "inside"', ((await reception.get('/api/gate/visitors?inside=1')).data as Array<{ id: string }>).some((x) => x.id === v.data.id));
    okr(await staff.patch(`/api/gate/visitors/${v.data.id}`, {}), 'guard (staff) checks the visitor out');
    is(await staff.patch(`/api/gate/visitors/${v.data.id}`, {}), 409, 'cannot check out twice');
    okr(await reception.get(`/api/gate/visitors/${v.data.id}`), 'printable pass data');
    is(await parent.get('/api/gate/visitors'), 403, 'parents cannot see the register');
    const n0 = await notifCount(parentUserId, 'Gate pass issued');
    const p = await reception.post('/api/gate/passes', { studentId: kid.id, reason: 'Dentist appointment', pickedUpBy: 'Father', relation: 'Father', pickerPhone: '9876500000' });
    okr(p, 'gate pass issued');
    check('parent told about the pass', (await notifCount(parentUserId, 'Gate pass issued')) === n0 + 1);
    okr(await staff.patch(`/api/gate/passes/${p.data.id}`, { action: 'left' }), 'guard records the child leaving');
    check('parent told the child has left', (await notifCount(parentUserId, 'has left school')) > 0);
    is(await staff.patch(`/api/gate/passes/${p.data.id}`, { action: 'cancel' }), 409, 'used pass cannot be cancelled');
    is(await teacher.post('/api/gate/passes', { studentId: kid.id, reason: 'x x x', pickedUpBy: 'A B', relation: 'Uncle' }), 403, 'teacher (view only) cannot issue passes');
    await db.gatePass.delete({ where: { id: p.data.id } });
    await db.visitor.delete({ where: { id: v.data.id } });
  });

  await run('Discipline: record, share or hide from family, resolve', async () => {
    const cats = original.disciplineCategories as string[];
    is(await admin.post('/api/discipline', { studentId: kid.id, incidentDate: new Date().toISOString().slice(0, 10), category: 'Not a category', severity: 'LOW', title: 'Test', description: 'Testing' }), 400, 'category must come from settings');
    const shared = await admin.post('/api/discipline', { studentId: kid.id, incidentDate: new Date().toISOString().slice(0, 10), category: cats[0], severity: 'MEDIUM', title: `Late ${uniq}`, description: 'Late three days', notifyParent: true });
    const hidden = await admin.post('/api/discipline', { studentId: kid.id, incidentDate: new Date().toISOString().slice(0, 10), category: cats[0], severity: 'LOW', title: `Private ${uniq}`, description: 'Staff note', visibleToFamily: false });
    okr(shared, 'shared incident recorded');
    const fam = (await parent.get(`/api/discipline?studentId=${kid.id}`)).data as Array<{ title: string }>;
    check('parent sees the shared incident only', fam.some((i) => i.title === `Late ${uniq}`) && !fam.some((i) => i.title === `Private ${uniq}`), fam.map((i) => i.title));
    check('parent notified', (await notifCount(parentUserId, 'Discipline note')) > 0);
    is(await student.post('/api/discipline', { studentId: kid.id }), 403, 'students cannot record incidents');
    okr(await admin.put(`/api/discipline/${shared.data.id}`, { status: 'RESOLVED', actionTaken: 'Parent meeting held' }), 'resolve with action taken');
    const r = await db.disciplineIncident.findUnique({ where: { id: shared.data.id } });
    check('resolved time recorded', !!r?.resolvedAt);
    await admin.del(`/api/discipline/${shared.data.id}`);
    await admin.del(`/api/discipline/${hidden.data.id}`);
  });

  await run('Report-card remarks and the weighted gradebook', async () => {
    const exams = (await admin.get('/api/exams')).data as Array<{ id: string; name: string; isPublished: boolean }>;
    check('there are exams to work with', exams.length >= 1);
    const ex = exams.find((e) => e.isPublished) ?? exams[0];
    const sheet = await admin.get(`/api/remarks?examId=${ex.id}&sectionId=${kid.sectionId}`);
    okr(sheet, 'section remark sheet');
    const prev = (sheet.data as Array<{ studentId: string; text: string }>).find((r) => r.studentId === kid.id)?.text ?? '';
    okr(await admin.post('/api/remarks', { examId: ex.id, entries: [{ studentId: kid.id, text: `Excellent effort ${uniq}` }] }), 'save remark');
    const card = await admin.get(`/api/report-card?examIds=${ex.id}&studentId=${kid.id}`);
    check('report card carries the remark', card.data?.cards?.[0]?.remark === `Excellent effort ${uniq}`, card.data?.cards?.[0]?.remark);
    is(await parent.post('/api/remarks', { examId: ex.id, entries: [] }), 403, 'parents cannot write remarks');
    await admin.post('/api/remarks', { examId: ex.id, entries: [{ studentId: kid.id, text: prev }] });
    const two = exams.slice(0, 2);
    const book = await admin.get(`/api/exams/gradebook?sectionId=${kid.sectionId}&exams=${two.map((e, i) => `${e.id}:${i ? 70 : 30}`).join(',')}`);
    okr(book, 'gradebook built');
    check('gradebook has subjects, rows and shares adding to 100', book.data?.rows?.length > 0 && Math.round(book.data.exams.reduce((a: number, e: { share: number }) => a + e.share, 0)) === 100, book.data?.exams);
    is(await admin.get(`/api/exams/gradebook?sectionId=${kid.sectionId}&exams=${ex.id}:0`), 400, 'zero weight refused');
    is(await parent.get(`/api/exams/gradebook?sectionId=${kid.sectionId}&exams=${ex.id}:1`), 403, 'families do not see the gradebook');
  });

  await run('Online exams: timed attempt, no answer key leak, auto + manual marking, results', async () => {
    const q = await db.question.findMany({ where: { schoolId: school.id, classId: kid.classId, type: { in: ['MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'SHORT'] } }, take: 6 });
    const objective = q.filter((x) => x.type === 'MCQ');
    if (!objective.length) {
      // The demo bank may not cover this class: add a temporary MCQ.
      const subj = await db.classSubject.findFirstOrThrow({ where: { schoolId: school.id, classId: kid.classId } });
      q.push(await db.question.create({ data: { schoolId: school.id, classId: kid.classId, subjectId: subj.subjectId, type: 'MCQ', text: `2 + 2 = ? (${uniq})`, options: ['3', '4', '5'], answer: '4', marks: 2, createdById: 'test' } }));
    }
    const subjectId = q[0].subjectId;
    const qs = q.filter((x) => x.subjectId === subjectId);
    const mk = await admin.post('/api/online-exams', { title: `Quiz ${uniq}`, classId: kid.classId, sectionId: kid.sectionId, subjectId, startsAt: iso(-60_000), endsAt: iso(3600_000), durationMins: 20, questionIds: qs.map((x) => x.id), negativeMarks: 0 });
    okr(mk, 'exam created as draft');
    const id = mk.data?.id;
    try {
      is(await student.post(`/api/online-exams/${id}/attempt`, {}), 404, 'draft exams cannot be started');
      okr(await admin.put(`/api/online-exams/${id}`, { status: 'PUBLISHED' }), 'publish');
      is(await parent.post(`/api/online-exams/${id}/attempt`, {}), 403, 'parent cannot take the exam');
      okr(await student.post(`/api/online-exams/${id}/attempt`, {}), 'student starts');
      const a = await student.get(`/api/online-exams/${id}/attempt`);
      okr(a, 'student loads questions');
      check('no answer key sent to the student', !JSON.stringify(a.raw).includes('"answer"') && !JSON.stringify(a.raw).includes('keyIndex'), Object.keys(a.data?.questions?.[0] ?? {}));
      check('deadline is start + duration', Math.abs(new Date(a.data.attempt.deadline).getTime() - Date.now() - 20 * 60_000) < 120_000);
      const answers: Record<string, string> = {};
      for (const x of qs) {
        const opts = (x.options as string[] | null) ?? [];
        if (x.type === 'MCQ') answers[x.id] = String(opts.findIndex((o) => o.trim().toLowerCase() === String(x.answer).trim().toLowerCase()) >= 0 ? opts.findIndex((o) => o.trim().toLowerCase() === String(x.answer).trim().toLowerCase()) : 0);
        else if (x.type === 'SHORT') answers[x.id] = 'My written answer';
        else answers[x.id] = String(x.answer ?? '');
      }
      okr(await student.put(`/api/online-exams/${id}/attempt`, { answers }), 'autosave');
      okr(await student.patch(`/api/online-exams/${id}/attempt`, {}), 'submit');
      is(await student.post(`/api/online-exams/${id}/attempt`, {}), 409, 'cannot restart after submitting');
      const hidden = await student.get(`/api/online-exams/${id}/attempt`);
      check('score hidden until results are published', hidden.data?.attempt?.score === undefined && hidden.data?.exam?.resultsPublished === false, hidden.data);
      const sheets = await admin.get(`/api/online-exams/${id}/attempts`);
      const sheet = sheets.data.attempts[0];
      check('auto marks computed', Number(sheet.autoScore) > 0, sheet);
      if (sheets.data.descriptive.length) {
        is(await admin.put(`/api/online-exams/${id}`, { resultsPublished: true }), 409, 'results wait for manual marking');
        is(await admin.patch(`/api/online-exams/${id}/attempts`, { attemptId: sheet.id, marks: { [sheets.data.descriptive[0].id]: 999 } }), 400, 'cannot award more than the maximum');
        okr(await admin.patch(`/api/online-exams/${id}/attempts`, { attemptId: sheet.id, marks: Object.fromEntries(sheets.data.descriptive.map((d: { id: string; marks: number }) => [d.id, d.marks])) }), 'teacher marks written answers');
      }
      okr(await admin.put(`/api/online-exams/${id}`, { resultsPublished: true }), 'publish results');
      const rev = await student.get(`/api/online-exams/${id}/attempt`);
      check('student sees score and review', rev.data?.attempt?.score > 0 && rev.data?.review?.length === qs.length, rev.data?.attempt);
      const plist = (await parent.get('/api/online-exams')).data as Array<{ id: string; attempts: Array<{ score: number | null }> }>;
      check('parent sees the score', (plist.find((e) => e.id === id)?.attempts?.[0]?.score ?? 0) > 0);
      is(await admin.put(`/api/online-exams/${id}`, { durationMins: 60 }), 409, 'timing locked after attempts');
      const future = await admin.post('/api/online-exams', { title: `Later ${uniq}`, classId: kid.classId, subjectId, startsAt: iso(86_400_000), endsAt: iso(90_000_000), durationMins: 10, questionIds: [qs[0].id] });
      await admin.put(`/api/online-exams/${future.data.id}`, { status: 'PUBLISHED' });
      is(await student.post(`/api/online-exams/${future.data.id}/attempt`, {}), 400, 'cannot start before the window');
      await admin.del(`/api/online-exams/${future.data.id}`);
      is(await admin.post('/api/online-exams', { title: 'Bad window', classId: kid.classId, subjectId, startsAt: iso(0), endsAt: iso(5 * 60_000), durationMins: 30, questionIds: [qs[0].id] }), 400, 'window shorter than the duration');
    } finally {
      if (id) {
        await admin.put(`/api/online-exams/${id}`, { resultsPublished: false });
        await admin.del(`/api/online-exams/${id}`);
      }
      await db.question.deleteMany({ where: { schoolId: school.id, text: { contains: `(${uniq})` } } });
    }
  });

  await run('Polls & forms: audience, one vote each, anonymous results, closing', async () => {
    const poll = await admin.post('/api/forms', { kind: 'POLL', title: `PTM slot ${uniq}`, fields: [{ id: 'slot', label: 'Which slot?', type: 'SINGLE', required: true, options: ['Sat 10am', 'Sat 12pm'] }], audience: { roles: ['PARENT'], classIds: [kid.classId] }, notify: true });
    okr(poll, 'poll published to one class');
    is(await admin.post('/api/forms', { kind: 'POLL', title: 'Two questions', fields: [{ id: 'a', label: 'A', type: 'TEXT', options: [] }], audience: { roles: ['PARENT'] } }), 400, 'a poll is one choice question');
    check('parent sees it', ((await parent.get('/api/forms')).data as Array<{ id: string }>).some((f) => f.id === poll.data.id));
    check('accountant (not in audience) does not', !((await accountant.get('/api/forms')).data as Array<{ id: string }>).some((f) => f.id === poll.data.id));
    is(await parent.post(`/api/forms/${poll.data.id}/respond`, { answers: { slot: 'Sun' } }), 400, 'invalid option');
    okr(await parent.post(`/api/forms/${poll.data.id}/respond`, { answers: { slot: 'Sat 10am' } }), 'parent votes');
    is(await parent.post(`/api/forms/${poll.data.id}/respond`, { answers: { slot: 'Sat 12pm' } }), 409, 'one vote per person');
    const mine = ((await parent.get('/api/forms')).data as Array<{ id: string; results: Array<{ counts: Array<{ count: number }> }> }>).find((f) => f.id === poll.data.id);
    check('voter sees live results', mine?.results?.[0]?.counts?.[0]?.count === 1, mine?.results);
    is(await accountant.post(`/api/forms/${poll.data.id}/respond`, { answers: { slot: 'Sat 10am' } }), 404, 'outsiders cannot vote');
    const form = await admin.post('/api/forms', { kind: 'FORM', title: `Staff survey ${uniq}`, anonymous: true, fields: [{ id: 'mood', label: 'How are you?', type: 'RATING', required: true, options: [] }, { id: 'idea', label: 'Idea', type: 'PARAGRAPH', required: false, options: [] }], audience: { roles: ['TEACHER', 'ACCOUNTANT'], classIds: [] } });
    okr(await accountant.post(`/api/forms/${form.data.id}/respond`, { answers: { mood: 4, idea: 'More plants' } }), 'staff answer anonymously');
    const res = await admin.get(`/api/forms/${form.data.id}`);
    check('anonymous results show answers but never names', res.data.results[1].texts?.[0]?.value === 'More plants' && !res.data.results[1].texts[0].by && res.data.responses.length === 0, res.data);
    okr(await admin.put(`/api/forms/${form.data.id}`, { status: 'CLOSED' }), 'close form');
    is(await teacher.post(`/api/forms/${form.data.id}/respond`, { answers: { mood: 3 } }), 400, 'closed forms take no answers');
    await admin.del(`/api/forms/${poll.data.id}`);
    await admin.del(`/api/forms/${form.data.id}`);
  });

  await run('Discussions: family topics stay in their class, replies, lock and moderation', async () => {
    const otherClass = await db.class.findFirst({ where: { schoolId: school.id, id: { not: kid.classId } } });
    if (otherClass) is(await parent.post('/api/discussions', { title: 'Hello all', body: 'x', audience: { roles: ['PARENT'], classIds: [otherClass.id] } }), 400, 'parents cannot post to another class');
    const t = await parent.post('/api/discussions', { title: `Class picnic ${uniq}`, body: 'Shall we plan a picnic?', audience: { roles: ['PARENT'], classIds: [] } });
    okr(t, 'parent starts a class discussion');
    const topic = await db.discussionTopic.findUniqueOrThrow({ where: { id: t.data.id } });
    check('audience forced to own class with teachers', JSON.stringify((topic.audience as { classIds: string[] }).classIds) === JSON.stringify([kid.classId]) && (topic.audience as { roles: string[] }).roles.includes('TEACHER'), topic.audience);
    okr(await teacher.post(`/api/discussions/${t.data.id}/posts`, { body: 'Good idea — after exams.' }), 'teacher replies');
    check('author notified of the reply', (await notifCount(parentUserId, 'New reply')) > 0);
    is(await accountant.get(`/api/discussions/${t.data.id}`), 404, 'outside the audience');
    const thread = await parent.get(`/api/discussions/${t.data.id}`);
    check('thread shows the reply', thread.data.posts.length === 1);
    is(await parent.patch(`/api/discussions/${t.data.id}`, { locked: true }), 403, 'only moderators lock');
    okr(await admin.patch(`/api/discussions/${t.data.id}`, { locked: true, pinned: true }), 'admin locks and pins');
    is(await parent.post(`/api/discussions/${t.data.id}/posts`, { body: 'more' }), 400, 'locked topics take no replies');
    okr(await admin.call('DELETE', `/api/discussions/${t.data.id}/posts?postId=${thread.data.posts[0].id}`), 'moderator removes a reply');
    check('removed reply text is gone', ((await admin.get(`/api/discussions/${t.data.id}`)).data.posts[0] as { removed: boolean; body?: string }).removed === true);
    okr(await admin.del(`/api/discussions/${t.data.id}`), 'delete topic');
  });

  await run('Gallery: albums, photo uploads, staff-only albums hidden from families', async () => {
    is(await upload(parent, 'GALLERY', PNG, 'x.png', 'image/png'), 400, 'families cannot upload gallery photos');
    is(await upload(teacher, 'GALLERY', PDF, 'x.pdf', 'application/pdf'), 400, 'gallery accepts images only');
    const f = await upload(teacher, 'GALLERY', PNG, 'sports.png', 'image/png');
    okr(f, 'teacher uploads a photo');
    const al = await teacher.post('/api/gallery', { title: `Sports Day ${uniq}`, eventDate: new Date().toISOString().slice(0, 10), visibility: 'ALL' });
    okr(await teacher.post(`/api/gallery/${al.data.id}`, { photos: [{ fileId: f.data.id, caption: 'Relay' }], notify: false }), 'photos added to own album');
    const fam = (await parent.get('/api/gallery')).data as Array<{ id: string; cover: string }>;
    check('family sees the album with a cover', fam.find((a) => a.id === al.data.id)?.cover === f.data.id);
    check('family can open the photo', (await parent.raw(`/api/files/${f.data.id}`)).status === 200);
    okr(await admin.put(`/api/gallery/${al.data.id}`, { visibility: 'STAFF' }), 'make album staff-only');
    is(await parent.get(`/api/gallery/${al.data.id}`), 404, 'staff-only album hidden');
    check('staff-only photo blocked for families', (await parent.raw(`/api/files/${f.data.id}`)).status === 403);
    is(await accountant.post(`/api/gallery/${al.data.id}`, { photos: [{ fileId: f.data.id }] }), 403, 'others cannot add to the album');
    okr(await teacher.del(`/api/gallery/${al.data.id}`), 'delete album');
    await db.storedFile.delete({ where: { id: f.data.id } });
  });

  await run('News & blog: review before publishing, public news page and cover images', async () => {
    const cover = await upload(teacher, 'BLOG', PNG, 'cover.png', 'image/png');
    const draft = await teacher.post('/api/blog', { title: `Science fair ${uniq}`, body: 'Our students built **amazing** projects this year at the fair.', coverFileId: cover.data.id, action: 'publish', isPublic: true });
    okr(draft, 'teacher writes a post');
    check('non-editors go to review, not public', draft.data.status === 'PENDING' && draft.data.isPublic === false, draft.data);
    is(await parent.get(`/api/blog/${draft.data.id}`), 404, 'families cannot see unpublished posts');
    okr(await admin.put(`/api/blog/${draft.data.id}`, { action: 'reject', reviewNote: 'Add photos' }), 'editor requests changes');
    check('author notified', (await db.notification.count({ where: { title: { contains: `Changes requested: Science fair ${uniq}` } } })) === 1);
    okr(await teacher.put(`/api/blog/${draft.data.id}`, { action: 'submit' }), 'author resubmits');
    okr(await admin.put(`/api/blog/${draft.data.id}`, { action: 'publish', isPublic: true }), 'editor publishes publicly');
    check('family reads it', ((await parent.get('/api/blog')).data as Array<{ id: string }>).some((p) => p.id === draft.data.id));
    is(await teacher.put(`/api/blog/${draft.data.id}`, { title: 'Edited after publish' }), 403, 'authors cannot edit published posts');
    check('public page off by default', (await fetch(`${BASE}/api/public/blog/${SCHOOL}`)).status === 404);
    okr(await admin.put('/api/settings', { settings: { blog: { publicPage: true } } }), 'turn the public page on');
    try {
      const pub = await fetch(`${BASE}/api/public/blog/${SCHOOL}`).then((r) => r.json());
      const p = pub.data?.posts?.find((x: { title: string }) => x.title === `Science fair ${uniq}`);
      check('public page lists the post without ids', !!p && !/"(id|authorId|schoolId)"/.test(JSON.stringify(pub)), pub.data?.posts?.length);
      check('public cover image served', (await fetch(`${BASE}/api/public/blog/${SCHOOL}/image/${cover.data.id}`)).status === 200);
      const other = await upload(teacher, 'BLOG', PNG, 'private.png', 'image/png');
      check('non-cover files are not public', (await fetch(`${BASE}/api/public/blog/${SCHOOL}/image/${other.data.id}`)).status === 404);
      await db.storedFile.delete({ where: { id: other.data.id } });
      const one = await fetch(`${BASE}/api/public/blog/${SCHOOL}/${p.slug}`).then((r) => r.json());
      check('single public post', one.data?.post?.title === `Science fair ${uniq}`);
    } finally {
      await restore('blog');
    }
    const stu = await student.post('/api/blog', { title: `My trip ${uniq}`, body: 'A short story about the school trip to the museum.', action: 'publish' });
    check('student posts wait for review', stu.data?.status === 'PENDING', stu.data);
    await admin.del(`/api/blog/${stu.data.id}`);
    await admin.del(`/api/blog/${draft.data.id}`);
    await db.storedFile.delete({ where: { id: cover.data.id } });
  });

  await run('Tasks: assign staff, progress rolls up, comments, access', async () => {
    const users = await db.user.findMany({ where: { schoolId: school.id, username: { in: ['teacher', 'accountant', 'parent'] } }, select: { id: true, username: true } });
    const uid = (u: string) => users.find((x) => x.username === u)!.id;
    is(await admin.post('/api/tasks', { title: 'Collect forms', assigneeIds: [uid('parent')] }), 400, 'tasks go to staff only');
    const t = await admin.post('/api/tasks', { title: `Board list ${uniq}`, priority: 'HIGH', dueDate: new Date().toISOString().slice(0, 10), assigneeIds: [uid('teacher'), uid('accountant')] });
    okr(t, 'task assigned to two people');
    check('assignee sees it under "mine"', ((await teacher.get('/api/tasks?scope=mine')).data as Array<{ id: string }>).some((x) => x.id === t.data.id));
    okr(await teacher.patch(`/api/tasks/${t.data.id}`, { myStatus: 'DONE' }), 'teacher finishes their part');
    check('task in progress until everyone is done', (await db.task.findUnique({ where: { id: t.data.id } }))?.status === 'IN_PROGRESS');
    okr(await accountant.patch(`/api/tasks/${t.data.id}`, { myStatus: 'DONE' }), 'accountant finishes');
    check('task done', (await db.task.findUnique({ where: { id: t.data.id } }))?.status === 'DONE');
    okr(await accountant.post(`/api/tasks/${t.data.id}`, { body: 'Uploaded to the portal.' }), 'comment');
    is(await teacher.patch(`/api/tasks/${t.data.id}`, { title: 'Hijack' }), 403, 'assignees cannot rewrite the task');
    is(await parent.get('/api/tasks'), 403, 'families have no tasks');
    is(await reception.get(`/api/tasks/${t.data.id}`), 404, 'others cannot open it');
    okr(await admin.del(`/api/tasks/${t.data.id}`), 'delete task');
  });

  await run('Documents: role-based access, versions and expiry alerts', async () => {
    const f1 = await upload(admin, 'DOCS', PDF, 'fire-noc.pdf', 'application/pdf');
    const doc = await admin.post('/api/documents', { title: `Fire NOC ${uniq}`, fileId: f1.data.id, roles: ['TEACHER'], expiresOn: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10) });
    okr(doc, 'document uploaded for teachers');
    const list = await admin.get('/api/documents');
    check('expiring soon flagged for managers', list.data.documents.find((d: { id: string }) => d.id === doc.data.id)?.expiringSoon === true);
    check('teacher can list and open it', ((await teacher.get('/api/documents')).data.documents as Array<{ id: string }>).some((d) => d.id === doc.data.id) && (await teacher.raw(`/api/files/${f1.data.id}`)).status === 200);
    check('accountant cannot list or open it', !((await accountant.get('/api/documents')).data.documents as Array<{ id: string }>).some((d) => d.id === doc.data.id) && (await accountant.raw(`/api/files/${f1.data.id}`)).status === 403);
    is(await upload(teacher, 'DOCS', PDF, 'x.pdf', 'application/pdf'), 400, 'teachers cannot upload managed documents');
    const f2 = await upload(admin, 'DOCS', PDF, 'fire-noc-2027.pdf', 'application/pdf');
    const v2 = await admin.put(`/api/documents/${doc.data.id}`, { fileId: f2.data.id });
    check('new upload becomes version 2', v2.data?.version === 2, v2.data);
    okr(await admin.del(`/api/documents/${doc.data.id}`), 'delete document');
    await db.storedFile.deleteMany({ where: { id: { in: [f1.data.id, f2.data.id] } } });
  });

  await run('Reminders: personal vs broadcast rights, scheduler sends once', async () => {
    is(await teacher.post('/api/reminders', { title: 'Parents', message: 'x', remindAt: iso(3600_000), forSelf: false, audience: { roles: ['PARENT'], classIds: [] } }), 403, 'teacher cannot remind other people by default');
    const mine = await teacher.post('/api/reminders', { title: `Mark registers ${uniq}`, message: 'Before 9', remindAt: iso(3600_000), repeat: 'DAILY' });
    okr(mine, 'teacher sets a personal repeating reminder');
    is(await teacher.post('/api/reminders', { title: 'Past', message: 'x', remindAt: iso(-3600_000) }), 400, 'past times refused');
    const b = await admin.post('/api/reminders', { title: `Trip tomorrow ${uniq}`, message: 'Bring lunch', remindAt: iso(1500), forSelf: false, audience: { roles: ['PARENT'], classIds: [kid.classId] }, channels: ['APP'] });
    okr(b, 'admin schedules a class reminder');
    await sleep(2500);
    check('cron needs the secret', (await fetch(`${BASE}/api/public/cron`, { method: 'POST' })).status === 401);
    const c = await fetch(`${BASE}/api/public/cron`, { method: 'POST', headers: { Authorization: `Bearer ${CRON}` } }).then((r) => r.json());
    // Either the cron or the in-app fallback (any user loading notifications, e.g. an open
    // browser tab on another server sharing this database) may send it first; what matters
    // is that it goes out exactly once.
    check('cron ran and the reminder went out', c.success === true && ((c.data?.reminders?.sent ?? 0) >= 1 || (await notifCount(parentUserId, `Reminder: Trip tomorrow ${uniq}`)) === 1), c);
    check('parent received it', (await notifCount(parentUserId, `Reminder: Trip tomorrow ${uniq}`)) === 1);
    await fetch(`${BASE}/api/public/cron`, { method: 'POST', headers: { Authorization: `Bearer ${CRON}` } });
    check('sent only once', (await notifCount(parentUserId, `Reminder: Trip tomorrow ${uniq}`)) === 1);
    check('one-off reminder marked sent', (await db.reminder.findUnique({ where: { id: b.data.id } }))?.status === 'SENT');
    is(await accountant.del(`/api/reminders/${mine.data.id}`), 403, "cannot delete someone else's reminder");
    await teacher.del(`/api/reminders/${mine.data.id}`);
    await admin.del(`/api/reminders/${b.data.id}`);
  });

  await run('Alumni: directory, former students, public self-registration with approval', async () => {
    const a = await admin.post('/api/alumni', { name: `Priya Old ${uniq}`, passingYear: 2015, organisation: 'ISRO', currentStatus: 'EMPLOYED', isMentor: true });
    okr(a, 'add alumnus');
    is(await parent.get('/api/alumni'), 403, 'families cannot see the directory');
    okr(await admin.get('/api/alumni/from-students'), 'former students list');
    check('registration closed by default', (await fetch(`${BASE}/api/public/alumni/${SCHOOL}`)).status === 404);
    okr(await admin.put('/api/settings', { settings: { alumni: { selfRegistration: true } } }), 'open self-registration');
    try {
      const reg = await fetch(`${BASE}/api/public/alumni/${SCHOOL}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `Rahul Self ${uniq}`, passingYear: 2018, phone: '9876512345', consentToContact: true }) });
      check('public registration accepted', reg.status === 200);
      const pending = ((await admin.get('/api/alumni?status=PENDING')).data as Array<{ id: string; name: string }>).find((x) => x.name === `Rahul Self ${uniq}`);
      check('self-registration waits for approval', !!pending);
      if (pending) {
        okr(await admin.put(`/api/alumni/${pending.id}`, { status: 'APPROVED' }), 'approve');
        await admin.del(`/api/alumni/${pending.id}`);
      }
      const noContact = await fetch(`${BASE}/api/public/alumni/${SCHOOL}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'No Contact', passingYear: 2018 }) });
      check('needs an email or phone', noContact.status === 400);
    } finally {
      await restore('alumni');
    }
    await admin.del(`/api/alumni/${a.data.id}`);
  });

  await run('Placements: eligible students apply, shortlist and selection notify the family', async () => {
    const d = await admin.post('/api/placements', { company: `Acme ${uniq}`, role: 'Summer intern', eligibleClassIds: [kid.classId], notify: false });
    okr(d, 'drive published for one class');
    is(await student.post('/api/placements', { company: 'Me', role: 'Boss' }), 403, 'students cannot create drives');
    check('student sees the drive', ((await student.get('/api/placements')).data as Array<{ id: string }>).some((x) => x.id === d.data.id));
    const app = await student.post(`/api/placements/${d.data.id}`, { note: 'Interested in data work' });
    okr(app, 'student applies');
    okr(await admin.patch(`/api/placements/${d.data.id}`, { applicationId: app.data.id, status: 'SELECTED' }), 'placement cell selects');
    check('family told', (await db.notification.count({ where: { title: { contains: `Acme ${uniq}: selected` } } })) >= 1);
    is(await student.post(`/api/placements/${d.data.id}`, { withdraw: true }), 409, 'selected students cannot withdraw online');
    const fam = (await parent.get('/api/placements')).data as Array<{ id: string; myApplications: Array<{ status: string }> }>;
    check('parent sees the selection', fam.find((x) => x.id === d.data.id)?.myApplications?.[0]?.status === 'SELECTED');
    okr(await admin.del(`/api/placements/${d.data.id}`), 'delete drive');
  });

  await run('Email channel: SMTP settings write-only, sends logged as skipped without a server', async () => {
    is(await admin.put('/api/settings', { settings: { messaging: { emailProvider: 'SMTP', smtpHost: '', fromEmail: '' } } }), 400, 'SMTP needs a host and From address');
    const s = await admin.put('/api/settings', { settings: { messaging: { emailProvider: 'NONE', smtpHost: 'smtp.example.com', smtpPort: 587, smtpUser: 'office', fromEmail: 'office@example.com' } }, secrets: { smtpPassword: 'gap-test-password' } });
    check('password stored, never echoed', s.data?.settings.messaging.smtpPasswordSet === true && !JSON.stringify(s.raw).includes('gap-test-password'));
    const send = await admin.post('/api/sms/send', { channel: 'EMAIL', audience: 'CUSTOM', emails: [`test${uniq}@example.com`], subject: 'Hello', body: 'Testing email' });
    check('email logged; no server so not sent', send.ok && send.data.gatewayMissing === true, send.data ?? send.error);
    is(await admin.post('/api/sms/send', { channel: 'EMAIL', audience: 'CUSTOM', emails: ['a@b.co'], body: 'No subject here' }), 400, 'email needs a subject');
    is(await admin.post('/api/sms/send', { channel: 'SMS', audience: 'CUSTOM', numbers: ['9876543210'], body: 'x'.repeat(1200) }), 400, 'long text only for email');
    await db.outboundMessage.deleteMany({ where: { recipient: `test${uniq}@example.com` } });
    await admin.put('/api/settings', { secrets: { smtpPassword: null }, settings: { messaging: { emailProvider: original.messaging.emailProvider, smtpHost: original.messaging.smtpHost, smtpUser: original.messaging.smtpUser, fromEmail: original.messaging.fromEmail } } });
  });

  await run('SSO, App Frame and BigBlueButton settings', async () => {
    const info = await fetch(`${BASE}/api/public/sso`).then((r) => r.json());
    check('login page learns which providers exist', typeof info.data?.google === 'boolean');
    if (!info.data.google) {
      is(await admin.put('/api/settings', { settings: { sso: { google: true } } }), 400, 'cannot enable an unconfigured provider');
      check('SSO start refused', (await fetch(`${BASE}/api/public/sso`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schoolCode: SCHOOL, provider: 'google' }) })).status === 400);
    }
    is(await admin.put('/api/settings', { settings: { sso: { allowedDomains: ['not a domain'] } } }), 400, 'domain format checked');
    is(await admin.put('/api/settings', { settings: { apps: [{ id: 'a', title: 'Insecure', url: 'http://example.com', roles: ['TEACHER'] }] } }), 400, 'apps must use https');
    okr(await admin.put('/api/settings', { settings: { apps: [{ id: 'gc', title: 'Classroom', url: 'https://classroom.google.com', roles: ['TEACHER', 'STUDENT'], newTab: true }] } }), 'add an app for teachers and students');
    try {
      check('teacher sees it', ((await teacher.get('/api/apps')).data as Array<{ id: string }>).some((a) => a.id === 'gc') && (await teacher.get('/api/me')).data.appCount === 1);
      check('parent does not', !((await parent.get('/api/apps')).data as Array<{ id: string }>).length);
    } finally {
      await restore('apps');
    }
    const lc = await admin.post('/api/live-classes', { title: 'BBB class', platform: 'BIGBLUEBUTTON', audience: 'SECTION', sectionId: kid.sectionId, startsAt: iso(60_000), durationMins: 30 });
    is(lc, 400, 'BigBlueButton needs a server first');
    is(await admin.put('/api/settings', { settings: { liveClasses: { bbbUrl: 'http://insecure' } } }), 400, 'BBB server must be https');
    const set = await admin.put('/api/settings', { settings: { liveClasses: { bbbUrl: 'https://bbb.invalid/bigbluebutton/' } }, secrets: { bbbSecret: 'gap-test-bbb-secret' } });
    check('BBB secret write-only', set.data?.settings.liveClasses.bbbSecretSet === true && !JSON.stringify(set.raw).includes('gap-test-bbb-secret'));
    try {
      const c = await admin.post('/api/live-classes', { title: `BBB ${uniq}`, platform: 'BIGBLUEBUTTON', audience: 'SECTION', sectionId: kid.sectionId, startsAt: iso(60_000), durationMins: 30 });
      okr(c, 'BBB class scheduled without a link');
      check('no meeting link in the list', ((await student.get('/api/live-classes')).data as Array<{ id: string; meetingUrl: string }>).find((l) => l.id === c.data.id)?.meetingUrl === '');
      const j = await student.get(`/api/live-classes/${c.data.id}/join`);
      check('join contacts the BBB server (unreachable test host → clear error)', j.status === 400, j);
      await admin.del(`/api/live-classes/${c.data.id}`);
    } finally {
      await admin.put('/api/settings', { secrets: { bbbSecret: null }, settings: { liveClasses: { bbbUrl: original.liveClasses.bbbUrl } } });
    }
  });

  await run('QuickBooks, Paybooks, data export and the report builder', async () => {
    const from = `${new Date().getFullYear() - 1}-04-01`;
    const to = new Date().toISOString().slice(0, 10);
    const csv = await accountant.raw(`/api/accounts/quickbooks?kind=journal&format=csv&from=${from}&to=${to}`);
    const body = await csv.text();
    check('QuickBooks Online CSV', csv.status === 200 && body.startsWith('Journal No,Journal Date,Account,Debits,Credits'), body.slice(0, 80));
    const rows = body.trim().split('\r\n').slice(1).map((r) => r.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map((x) => x.replace(/,$/, '')));
    const sum = (i: number) => Math.round(rows.reduce((a, r) => a + Number(r[i] || 0), 0) * 100);
    check('debits equal credits', sum(3) === sum(4), [sum(3), sum(4)]);
    const iif = await (await accountant.raw(`/api/accounts/quickbooks?kind=journal&format=iif&from=${from}&to=${to}`)).text();
    check('QuickBooks Desktop IIF', iif.startsWith('!TRNS'));
    check('chart of accounts IIF', (await (await accountant.raw('/api/accounts/quickbooks?kind=accounts')).text()).startsWith('!ACCNT'));
    check('teacher blocked from QuickBooks', (await teacher.raw('/api/accounts/quickbooks?kind=accounts')).status === 403);
    const pb = await (await accountant.raw('/api/payroll/export?kind=employees')).text();
    check('Paybooks employee master', pb.startsWith('Employee Code,First Name'));
    check('Paybooks attendance', (await (await accountant.raw(`/api/payroll/export?kind=attendance&month=${to.slice(0, 7)}`)).text()).includes('LOP Days'));
    check('teacher blocked from payroll export', (await teacher.raw('/api/payroll/export?kind=employees')).status === 403);
    await db.rateLimit.deleteMany({ where: { key: { startsWith: 'data-export:' } } }); // 3/hour; earlier runs may have used it
    check('data export is owner-only', (await admin.raw('/api/settings/export')).status === 403);
    const x = await owner.raw('/api/settings/export');
    const buf = Buffer.from(await x.arrayBuffer());
    check('owner downloads an Excel workbook', x.status === 200 && buf.subarray(0, 2).toString() === 'PK' && buf.length > 20_000, [x.status, buf.length]);
    check('no password hashes in the export', !buf.includes(Buffer.from('$2a$')) && !buf.includes(Buffer.from('$2b$')));
    const cat = await admin.get('/api/reports/builder');
    check('builder catalog offers students and fees', (cat.data as Array<{ key: string }>).some((s) => s.key === 'students') && (cat.data as Array<{ key: string }>).some((s) => s.key === 'payments'));
    const rep = await admin.post('/api/reports/builder', { entity: 'students', columns: ['admissionNo', 'name', 'class', 'passwordHash'], filters: { classId: kid.classId } });
    check('runs with allowed columns only', rep.ok && rep.data.columns.length === 3 && rep.data.rows.length > 0, rep.data?.columns ?? rep.error);
    is(await admin.post('/api/reports/builder', { entity: 'attendance', columns: [], filters: {} }), 400, 'attendance needs a date range');
    is(await teacher.post('/api/reports/builder', { entity: 'students', columns: ['name'] }), 403, 'teacher without Reports');
    const saved = await admin.post('/api/reports/saved', { name: `Class list ${uniq}`, entity: 'students', columns: ['name'], filters: { classId: kid.classId }, shared: true });
    okr(saved, 'save report');
    okr(await accountant.call('DELETE', `/api/reports/saved?id=${saved.data.id}`).then((r) => ({ ...r, ok: r.status === 403 })), 'others cannot delete it');
    okr(await admin.call('DELETE', `/api/reports/saved?id=${saved.data.id}`), 'delete saved report');
  });

  await run('Invariant: every invoice’s paid amount equals its active receipt allocations', async () => {
    const drift = await db.$queryRaw<Array<{ invoiceNo: string }>>`
      SELECT i.invoiceNo FROM FeeInvoice i
      WHERE i.schoolId = ${school.id} AND ROUND(i.paidAmount * 100) <> ROUND(COALESCE((SELECT SUM(a.amount) FROM FeePaymentAllocation a JOIN FeePayment p ON p.id = a.paymentId WHERE a.invoiceId = i.id AND p.status = 'SUCCESS'), 0) * 100)`;
    check('no drifted invoices', drift.length === 0, drift.map((d) => d.invoiceNo));
  });

  await db.$disconnect();
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('\nFailures:\n' + failures.map((f) => `  ✗ ${f}`).join('\n'));
    process.exit(1);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
