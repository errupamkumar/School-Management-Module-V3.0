/**
 * End-to-end workflow suite: the day-to-day journeys that cross roles.
 *   npx tsx tests/api/workflows.ts      (dev server running, demo data seeded)
 *
 * Every flow asserts the hand-offs between roles (e.g. teacher posts, student
 * submits, teacher reviews) and undoes what it creates, so it can be re-run
 * against the demo school. Exits non-zero on any failure.
 */
import { PrismaClient } from '@prisma/client';
import { resetLoginRateLimits } from '../reset-rate-limits';
import { as, type ApiResult, type Session } from './client';

const SCHOOL = process.env.TEST_SCHOOL || 'DEMO';
let passed = 0;
const failures: string[] = [];
let flow = '';

function check(name: string, cond: unknown, detail?: unknown) {
  if (cond) return void passed++;
  failures.push(`${flow} › ${name}${detail !== undefined ? `  (${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 240)})` : ''}`);
}
const okr = (r: ApiResult, name: string) => check(name, r.ok, `${r.status} ${r.error ?? ''}`);
const is = (r: ApiResult, status: number, name: string) => check(`${name} → ${status}`, r.status === status, `${r.status} ${r.error ?? ''}`);

async function run(name: string, fn: () => Promise<void>) {
  flow = name;
  const before = failures.length;
  try {
    await fn();
  } catch (e) {
    failures.push(`${name} › threw: ${(e as Error).message}`);
  }
  console.log(`${failures.length === before ? '✓' : '✗'} ${name}`);
}

const testCertIds: string[] = [];
const startedAt = new Date();
/** Notifications the flows trigger as side effects. */
const SIDE_EFFECT_TITLES = ['Homework needs to be redone', 'Leave application', 'Leave approved', 'Staff leave application', '⭐ Appreciation from school', 'New homework', 'Homework checked'];

/** Remove what the flows leave visible in the demo school (test rows carry the run marker). */
async function removeTestTraces() {
  const db = new PrismaClient();
  try {
    // Remove only the test's messages; a parent–teacher pair has one conversation that may hold real history.
    const testMsgs = await db.chatMessage.findMany({ where: { OR: [{ body: { contains: `test ${uniq}` } }, { body: 'Thanks, noted.', createdAt: { gte: startedAt } }] }, select: { id: true, conversationId: true } });
    await db.chatMessage.deleteMany({ where: { id: { in: testMsgs.map((m) => m.id) } } });
    for (const convId of new Set(testMsgs.map((m) => m.conversationId))) {
      if ((await db.chatMessage.count({ where: { conversationId: convId } })) === 0) await db.conversation.delete({ where: { id: convId } });
    }
    await db.meeting.deleteMany({ where: { topic: { contains: uniq } } });
    await db.admissionApplication.deleteMany({ where: { studentName: { contains: uniq } } });
    await db.issuedCertificate.deleteMany({ where: { id: { in: testCertIds } } });
    await db.notification.deleteMany({
      where: {
        createdAt: { gte: startedAt },
        OR: [{ title: { contains: uniq } }, { body: { contains: uniq } }, { body: { in: ['Get well soon', 'Thanks, noted.'] } }, { title: { in: SIDE_EFFECT_TITLES } }, { title: { startsWith: 'Salary credited for January 2031' } }, { title: { startsWith: 'Fee received' } }, { title: { startsWith: 'Meeting ' } }, { title: { startsWith: 'Message from ' } }],
      },
    });
  } finally {
    await db.$disconnect();
  }
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const today = ymd(new Date());
const plusDays = (n: number) => ymd(new Date(Date.now() + n * 86_400_000));
const uniq = Date.now().toString().slice(-6);

(async () => {
  await resetLoginRateLimits();
  const [owner, admin, teacher, accountant, reception, librarian, store, transport, parent, student, staff] = await Promise.all(
    ['owner', 'admin', 'teacher', 'accountant', 'reception', 'librarian', 'store', 'transport', 'parent', 'student', 'staff'].map((u) => as(SCHOOL, u))
  );
  const meOf = async (s: Session) => (await s.get('/api/me')).data;
  const [tMe, pMe, sMe, staffMe] = await Promise.all([meOf(teacher), meOf(parent), meOf(student), meOf(staff)]);
  const teacherUserId: string = tMe.user.id;
  const teacherEmpId: string = tMe.user.employeeId;
  const kabir = pMe.children.find((c: { classLabel: string }) => c.classLabel === 'Class 3-B') ?? pMe.children[0];
  const khushi = sMe.children[0];

  // The teacher's own sections, the section they are class teacher of, and a subject they teach in Kabir's section.
  const tLook = (await teacher.get('/api/lookups?include=classes&mine=1')).data;
  const mySections: Array<{ id: string; classId: string; classTeacherId: string | null }> = tLook.classes.flatMap((c: { id: string; sections: Array<{ id: string; classTeacherId: string | null }> }) => c.sections.map((s) => ({ ...s, classId: c.id })));
  const ownSection = mySections.find((s) => s.classTeacherId === teacherEmpId)!;
  const alloc = (await teacher.get(`/api/sections/${kabir.sectionId}/teachers`)).data as Array<{ subjectId: string; employeeId: string | null }>;
  const mySubject = alloc.find((a) => a.employeeId === teacherEmpId)!;
  const otherSubject = alloc.find((a) => a.employeeId !== teacherEmpId)!;
  const allLook = (await owner.get('/api/lookups?include=classes')).data;
  const foreignSection = allLook.classes.flatMap((c: { sections: Array<{ id: string }> }) => c.sections).find((s: { id: string }) => !mySections.some((m) => m.id === s.id));

  await run('Admission: enquiry → pipeline → admit → logins → leaving → delete', async () => {
    const enquiry = await reception.post('/api/admissions', { studentName: `Test Child ${uniq}`, gender: 'FEMALE', classId: kabir.classId, guardianName: 'Test Guardian', guardianPhone: `9${uniq}321`.slice(0, 10), source: 'WALK_IN' });
    okr(enquiry, 'front office records enquiry');
    const id = enquiry.data.id;
    okr(await reception.patch(`/api/admissions/${id}`, { stage: 'SEAT_OFFERED', notes: 'Test passed', followUpAt: plusDays(2) }), 'move to seat offered');
    is(await teacher.patch(`/api/admissions/${id}`, { stage: 'REJECTED' }), 403, 'teacher cannot touch admissions');
    is(await reception.post(`/api/admissions/${id}/admit`, { sectionId: kabir.sectionId }), 400, 'admit without consent rejected');
    const admitted = await admin.post(`/api/admissions/${id}/admit`, { sectionId: kabir.sectionId, consent: true });
    okr(admitted, 'admin admits applicant');
    const studentId = admitted.data.studentId;
    check('admission number issued', !!admitted.data.admissionNo, admitted.data);
    check('student + parent logins issued once', (admitted.data.credentials ?? []).length >= 2, admitted.data.credentials);
    is(await admin.post(`/api/admissions/${id}/admit`, { sectionId: kabir.sectionId, consent: true }), 409, 'cannot admit twice');
    okr(await admin.get(`/api/students/${studentId}`), 'student appears in register');
    okr(await admin.post(`/api/students/${studentId}/status`, { status: 'TRANSFERRED', leftOn: today, reason: 'Test' }), 'mark transferred');
    const cred = (admitted.data.credentials as Array<{ role: string; username: string; password: string }>).find((c) => c.role === 'STUDENT')!;
    const { Session } = await import('./client');
    check('transferred student cannot sign in', !(await new Session().login(SCHOOL, cred.username, cred.password)));
    okr(await admin.del(`/api/students/${studentId}`), 'delete test record (and its family)');
  });

  await run('Attendance: class teacher marks, scope + edit window enforced', async () => {
    const roster = await teacher.get(`/api/attendance?sectionId=${ownSection.id}&date=${today}`);
    okr(roster, 'class teacher opens roster');
    const entries = (roster.data.roster as Array<{ studentId: string; status: string | null }>).map((r) => ({ studentId: r.studentId, status: r.status ?? 'PRESENT' }));
    if (roster.data.isWorkingDay && entries.length) {
      okr(await teacher.put('/api/attendance', { sectionId: ownSection.id, date: today, entries, notifyAbsent: false }), 'save attendance');
      check('roster now marked', (await teacher.get(`/api/attendance?sectionId=${ownSection.id}&date=${today}`)).data.marked);
    }
    is(await teacher.get(`/api/attendance?sectionId=${foreignSection.id}&date=${today}`), 403, 'teacher blocked from another section');
    const old = await teacher.put('/api/attendance', { sectionId: ownSection.id, date: plusDays(-10), entries: entries.slice(0, 1) });
    check('edit window blocks 10-day-old change', old.status === 400 || old.status === 403, `${old.status} ${old.error}`);
    const fam = await parent.get(`/api/attendance/report?view=student&studentId=${kabir.id}&month=${today.slice(0, 7)}`);
    okr(fam, 'parent sees child attendance');
    is(await parent.get(`/api/attendance/report?view=student&studentId=${khushi.id}&month=${today.slice(0, 7)}`), 403, 'parent blocked from other child');
  });

  await run('Leave: parent applies → teacher scope → admin approves → parent notified', async () => {
    const from = plusDays(400 + (Number(uniq) % 900));
    const apply = await parent.post('/api/leave', { leaveType: 'SICK', fromDate: from, toDate: from, reason: 'Fever (test)', studentId: kabir.id });
    okr(apply, 'parent applies for child');
    const id = apply.data.id;
    try {
      is(await parent.post('/api/leave', { leaveType: 'SICK', fromDate: from, toDate: from, reason: 'Duplicate', studentId: kabir.id }), 400, 'overlap rejected');
      is(await teacher.patch(`/api/leave/${id}`, { status: 'APPROVED' }), 403, 'non-class-teacher cannot approve');
      const before = (await parent.get('/api/notifications')).data.unread;
      okr(await admin.patch(`/api/leave/${id}`, { status: 'APPROVED', reviewNote: 'Get well soon' }), 'admin approves');
      check('parent notified', (await parent.get('/api/notifications')).data.unread > before);
      is(await parent.patch(`/api/leave/${id}`, { status: 'CANCELLED' }), 400, 'approved leave cannot be withdrawn');
    } finally {
      const db = new PrismaClient();
      await db.leaveRequest.deleteMany({ where: { id } }).finally(() => db.$disconnect());
    }
  });

  await run('Exams: setup → teacher marks (own subject only) → publish → family results', async () => {
    const exam = await admin.post('/api/exams', { name: `Test Exam ${uniq}`, term: 'TERM_1', startDate: today, endDate: plusDays(5), maxMarks: 50 });
    okr(exam, 'admin creates exam');
    const examId = exam.data.id;
    try {
      okr(await admin.put(`/api/exams/${examId}/schedule`, { classIds: [kabir.classId], rows: [mySubject, otherSubject].map((a) => ({ subjectId: a.subjectId, date: today, maxMarks: 50, passMarks: 17 })) }), 'date sheet saved');
      const sheet = await teacher.get(`/api/exams/${examId}/marks?sectionId=${kabir.sectionId}&subjectId=${mySubject.subjectId}`);
      okr(sheet, 'teacher opens marks for own subject');
      const rows = sheet.data.rows as Array<{ studentId: string }>;
      is(await teacher.put(`/api/exams/${examId}/marks`, { sectionId: kabir.sectionId, subjectId: mySubject.subjectId, entries: [{ studentId: rows[0].studentId, marks: 60 }] }), 400, 'marks above maximum rejected');
      okr(await teacher.put(`/api/exams/${examId}/marks`, { sectionId: kabir.sectionId, subjectId: mySubject.subjectId, entries: rows.map((r, i) => ({ studentId: r.studentId, marks: 20 + (i % 25) })) }), 'teacher saves marks');
      is(await teacher.put(`/api/exams/${examId}/marks`, { sectionId: kabir.sectionId, subjectId: otherSubject.subjectId, entries: [{ studentId: rows[0].studentId, marks: 30 }] }), 403, 'teacher blocked on a subject they do not teach');
      is(await parent.get(`/api/exams/${examId}/results?studentId=${kabir.id}`), 403, 'family cannot see unpublished results');
      is(await teacher.post(`/api/exams/${examId}/publish`, { publish: true }), 403, 'teacher cannot publish');
      okr(await admin.post(`/api/exams/${examId}/publish`, { publish: true }), 'admin publishes');
      const res = await parent.get(`/api/exams/${examId}/results?studentId=${kabir.id}`);
      okr(res, 'parent sees published result');
      check('result has subject marks', res.data?.result?.subjects?.some((s: { marks: number | null }) => s.marks !== null), res.data?.result);
      okr(await parent.get(`/api/report-card?examIds=${examId}&studentId=${kabir.id}`), 'parent downloads report card');
      is(await teacher.put(`/api/exams/${examId}/marks`, { sectionId: kabir.sectionId, subjectId: mySubject.subjectId, entries: [{ studentId: rows[0].studentId, marks: 10 }] }), 403, 'marks locked for teachers after publishing');
    } finally {
      await admin.post(`/api/exams/${examId}/publish`, { publish: false });
      // Deleting an exam with marks is blocked by design (protects results); clear the test marks directly.
      const db = new PrismaClient();
      await db.examMark.deleteMany({ where: { examId } }).finally(() => db.$disconnect());
      okr(await admin.del(`/api/exams/${examId}`), 'cleanup exam');
    }
  });

  await run('Homework: post → student submits → teacher reviews → redo/resubmit', async () => {
    const hw = await admin.post('/api/homework', { classId: khushi.classId, sectionId: khushi.sectionId, subjectId: mySubject.subjectId, title: `Test homework ${uniq}`, description: 'Exercise 1', assignedOn: today, dueOn: plusDays(3), notify: false });
    okr(hw, 'homework posted');
    const id = hw.data.id;
    try {
      const list = await student.get('/api/homework');
      check('student sees it', (list.data as Array<{ id: string }>).some((h) => h.id === id));
      okr(await student.post(`/api/homework/${id}/submit`, { content: 'My answer' }), 'student submits online');
      const subs = await admin.get(`/api/homework/${id}/submissions`);
      okr(subs, 'teacher opens submissions');
      okr(await admin.patch(`/api/homework/${id}/submissions`, { studentId: khushi.id, status: 'REDO', feedback: 'Show working' }), 'teacher asks for redo');
      okr(await student.post(`/api/homework/${id}/submit`, { content: 'My answer with working' }), 'student resubmits');
      is(await parent.post(`/api/homework/${id}/submit`, { content: 'not my class' }), 403, 'other family cannot submit');
    } finally {
      okr(await admin.del(`/api/homework/${id}`), 'cleanup homework');
    }
  });

  await run('Fees: dues → part payment → scoped receipt → cancel restores dues', async () => {
    const defaulters = await accountant.get('/api/fees/defaulters');
    okr(defaulters, 'defaulter list loads');
    const debtor: string = defaulters.data.rows[0].studentId;
    const dues = await accountant.get(`/api/fees/dues?studentId=${debtor}`);
    okr(dues, 'accountant loads dues');
    // Overpayment becomes advance by default (see gap-features.ts); with advance off it is refused.
    const feesBefore = (await admin.get('/api/settings')).data.settings.fees;
    await admin.put('/api/settings', { settings: { fees: { allowAdvance: false } } });
    try {
      is(await accountant.post('/api/fees/collect', { studentIds: [debtor], amount: dues.data.totalDue + 1, mode: 'CASH' }), 400, 'overpayment rejected when advance is off');
    } finally {
      await admin.put('/api/settings', { settings: { fees: { allowAdvance: feesBefore.allowAdvance } } });
    }
    is(await accountant.post('/api/fees/collect', { studentIds: [debtor], amount: 100, mode: 'UPI' }), 400, 'UPI without UTR rejected');
    const pay = await reception.post('/api/fees/collect', { studentIds: [debtor], amount: 500, mode: 'UPI', referenceNo: `UTR${uniq}` });
    okr(pay, 'front office collects part payment');
    const pid = pay.data[0].id;
    check('receipt number issued', !!pay.data[0].receiptNo);
    if (debtor !== kabir.id && debtor !== khushi.id) is(await student.get(`/api/fees/payments/${pid}`), 403, 'another family cannot open it');
    is(await teacher.post('/api/fees/collect', { studentIds: [debtor], amount: 10, mode: 'CASH' }), 403, 'teacher cannot collect');
    is(await reception.post(`/api/fees/payments/${pid}`, { reason: 'test' }), 403, 'front office cannot cancel receipts');
    okr(await accountant.post(`/api/fees/payments/${pid}`, { reason: 'Test reversal' }), 'accountant cancels receipt');
    check('dues restored', (await accountant.get(`/api/fees/dues?studentId=${debtor}`)).data.totalDue === dues.data.totalDue);
    const gen = await accountant.post('/api/fees/invoices/generate', { period: today.slice(0, 7) });
    check('re-running invoice generation is safe', gen.ok || gen.status === 400, `${gen.status} ${gen.error}`);
  });

  await run('Online payment: parent pays in sandbox → receipt → reversal', async () => {
    const debtor: string = (await accountant.get('/api/fees/defaulters')).data.rows[0].studentId;
    const phone: string = (await owner.get(`/api/students/${debtor}`)).data.guardian.primaryPhone;
    const payer = await as(SCHOOL, phone);
    const before = (await accountant.get(`/api/fees/dues?studentId=${debtor}`)).data.totalDue;
    const order = await payer.post('/api/fees/online/order', { studentId: debtor });
    okr(order, 'parent starts online payment');
    check('order is for the full outstanding amount', order.data?.amount === Math.round(before * 100), { order: order.data?.amount, due: before });
    is(await student.post('/api/fees/online/order', { studentId: debtor }), 403, 'another family cannot pay for this child');
    is(await payer.post('/api/fees/online/verify', { paymentId: order.data.paymentId, razorpayOrderId: 'order_fake', razorpayPaymentId: 'pay_fake', razorpaySignature: 'bad' }), 400, 'forged confirmation rejected');
    const done = await payer.post('/api/fees/online/verify', { paymentId: order.data.paymentId, sandbox: true });
    okr(done, 'sandbox payment confirmed');
    check('receipt issued', !!done.data?.receiptNo, done.data);
    check('dues cleared', (await accountant.get(`/api/fees/dues?studentId=${debtor}`)).data.totalDue === 0);
    okr(await accountant.post(`/api/fees/payments/${order.data.paymentId}`, { reason: 'Test reversal' }), 'accountant reverses test payment');
    check('dues restored', (await accountant.get(`/api/fees/dues?studentId=${debtor}`)).data.totalDue === before);
  });

  await run('Bulk import: valid row admitted, bad row reported', async () => {
    const res = await admin.post('/api/students/import', {
      consent: true,
      rows: [
        { className: 'Class 3', sectionName: 'B', firstName: 'Import', lastName: `Test${uniq}`, gender: 'F', primaryPhone: `7${uniq}9876`.slice(0, 10) },
        { className: 'Class 99', sectionName: 'Z', firstName: 'Bad', gender: 'M', primaryPhone: '7000000000' },
      ],
    });
    okr(res, 'import runs');
    check('one row admitted', res.data?.created?.length === 1, res.data);
    check('bad row reported with its row number', res.data?.failed?.[0]?.row === 3 && /class/.test(res.data.failed[0].error), res.data?.failed);
    check('login credentials returned', (res.data?.credentials ?? []).length >= 1);
    const found = await admin.get(`/api/students?search=Test${uniq}`);
    const id = found.data?.[0]?.id;
    check('imported student is in the register', !!id);
    if (id) okr(await admin.del(`/api/students/${id}`), 'cleanup imported student');
  });

  await run('Payroll: pay → staff sees own slip only → reverse', async () => {
    const monthKey = '2031-01';
    const pay = await accountant.post('/api/payroll', { month: monthKey, mode: 'BANK_TRANSFER', items: [{ employeeId: staffMe.user.employeeId, basic: 18000 }] });
    okr(pay, 'accountant pays salary');
    const slipId = pay.data.slips[0].id;
    try {
      is(await accountant.post('/api/payroll', { month: monthKey, items: [{ employeeId: staffMe.user.employeeId, basic: 18000 }] }), 400, 'double payment blocked');
      const mine = await staff.get('/api/payroll?mine=1');
      check('staff sees own payslip', (mine.data as Array<{ id: string }>).some((s) => s.id === slipId));
      okr(await staff.get(`/api/payroll/slips/${slipId}`), 'staff opens payslip');
      is(await teacher.get(`/api/payroll/slips/${slipId}`), 403, 'colleague cannot open it');
      is(await staff.get(`/api/payroll?month=${monthKey}`), 403, 'staff cannot see salary sheet');
    } finally {
      okr(await accountant.del(`/api/payroll/slips/${slipId}`), 'reverse payment');
    }
  });

  await run('Library: issue → family sees → return with fine rule', async () => {
    const books = (await librarian.get('/api/library/books')).data as Array<{ id: string; available: number }>;
    const book = books.find((b) => b.available > 0)!;
    const issue = await librarian.post('/api/library/issues', { bookId: book.id, borrowerType: 'STUDENT', borrowerId: khushi.id, dueOn: plusDays(7) });
    okr(issue, 'librarian issues book');
    const mine = await student.get('/api/library/issues');
    check('student sees borrowed book', JSON.stringify(mine.data).includes(issue.data.id));
    is(await teacher.post('/api/library/issues', { bookId: book.id, borrowerType: 'STUDENT', borrowerId: khushi.id, dueOn: plusDays(7) }), 403, 'teacher cannot issue');
    okr(await librarian.patch(`/api/library/issues/${issue.data.id}`, {}), 'librarian records return');
    check('copy back on shelf', ((await librarian.get('/api/library/books')).data as Array<{ id: string; available: number }>).find((b) => b.id === book.id)?.available === book.available);
  });

  await run('Store: sale reduces stock → cancel restores it', async () => {
    const products = (await store.get('/api/store/products')).data as Array<{ id: string; stock: number }>;
    const p = products.find((x) => x.stock > 2)!;
    const sale = await store.post('/api/store/orders', { items: [{ productId: p.id, qty: 2 }], customerName: 'Walk-in (test)', mode: 'CASH' });
    okr(sale, 'store manager bills a sale');
    check('stock reduced', ((await store.get('/api/store/products')).data as Array<{ id: string; stock: number }>).find((x) => x.id === p.id)?.stock === p.stock - 2);
    is(await accountant.post('/api/store/orders', { items: [{ productId: p.id, qty: 1 }], mode: 'CASH' }), 403, 'accountant (view only) cannot bill');
    okr(await store.post(`/api/store/orders/${sale.data.id}`, { reason: 'Test cancel' }), 'cancel sale');
    check('stock restored', ((await store.get('/api/store/products')).data as Array<{ id: string; stock: number }>).find((x) => x.id === p.id)?.stock === p.stock);
  });

  await run('Transport: assign → family sees route → remove', async () => {
    const routes = (await transport.get('/api/transport/routes')).data as Array<{ id: string; stops?: Array<{ id: string }> }>;
    const stops = (await transport.get(`/api/transport/routes/${routes[0].id}`)).data?.stops ?? routes[0].stops ?? [];
    const allocs = (await transport.get('/api/transport/allocations')).data as Array<{ id: string; studentId: string }>;
    const existing = allocs.find((a) => a.studentId === khushi.id);
    if (existing) return check('family sees route', (await student.get('/api/transport/mine')).data?.route);
    const add = await transport.post('/api/transport/allocations', { studentId: khushi.id, stopId: stops[0].id, tripType: 'BOTH' });
    okr(add, 'transport manager assigns student');
    check('student sees route and stop', !!(await student.get('/api/transport/mine')).data?.route);
    is(await reception.post('/api/transport/allocations', { studentId: khushi.id, stopId: stops[0].id }), 403, 'front office (view only) cannot assign');
    okr(await transport.del(`/api/transport/allocations/${add.data.id}`), 'remove from transport');
  });

  await run('Noticeboard: teacher targets own class only', async () => {
    const n = await teacher.post('/api/notices', { title: `Test notice ${uniq}`, body: 'Bring art supplies', roles: ['PARENT'], classIds: [kabir.classId] });
    okr(n, 'teacher posts to own class parents');
    try {
      check('parent of that class sees it', JSON.stringify((await parent.get('/api/notices')).data).includes(`Test notice ${uniq}`));
      check('student of another class does not', !JSON.stringify((await student.get('/api/notices')).data).includes(`Test notice ${uniq}`));
      is(await teacher.post('/api/notices', { title: 'All staff', body: 'Not allowed', roles: ['TEACHER'], classIds: [kabir.classId] }), 403, 'teacher cannot address staff');
      is(await teacher.post('/api/notices', { title: 'Pinned', body: 'Not allowed', roles: ['PARENT'], classIds: [kabir.classId], isPinned: true }), 403, 'teacher cannot pin');
    } finally {
      okr(await teacher.del(`/api/notices/${n.data.id}`), 'author deletes own notice');
    }
  });

  await run('Messages & meetings: parent ↔ child’s teacher', async () => {
    const msg = await parent.post('/api/messages', { toUserId: teacherUserId, body: `Hello from test ${uniq}` });
    okr(msg, 'parent messages child’s teacher');
    const convs = await teacher.get('/api/messages');
    check('teacher sees conversation', (convs.data as Array<{ id: string }>).some((c) => c.id === msg.data.conversationId));
    okr(await teacher.post(`/api/messages/${msg.data.conversationId}`, { body: 'Thanks, noted.' }), 'teacher replies');
    is(await student.get(`/api/messages/${msg.data.conversationId}`), 403, 'outsider cannot read it');
    const meet = await parent.post('/api/meetings', { withUserId: teacherUserId, studentId: kabir.id, topic: `Progress check ${uniq}`, mode: 'VIDEO', scheduledAt: `${plusDays(3)}T10:00:00.000Z` });
    okr(meet, 'parent requests meeting');
    is(await parent.patch(`/api/meetings/${meet.data.id}`, { status: 'CONFIRMED' }), 403, 'requester cannot confirm');
    okr(await teacher.patch(`/api/meetings/${meet.data.id}`, { status: 'CONFIRMED', meetingUrl: 'https://meet.example.com/test' }), 'teacher confirms');
    okr(await teacher.patch(`/api/meetings/${meet.data.id}`, { status: 'COMPLETED', outcome: 'Discussed progress' }), 'teacher completes with outcome');
  });

  await run('Behaviour: ratings + shared observation reach the parent', async () => {
    const obs = await teacher.post('/api/observations', { studentId: kabir.id, kind: 'POSITIVE', note: `Helped a classmate ${uniq}`, observedOn: today, shareWithParent: true });
    okr(obs, 'teacher records shared observation');
    const ov = await parent.get(`/api/students/${kabir.id}/overview`);
    check('parent sees it on the overview', JSON.stringify(ov.data?.behaviour ?? {}).includes(uniq), ov.status);
    is(await teacher.post('/api/observations', { studentId: khushi.id, kind: 'NEGATIVE', note: 'not my student', observedOn: today, shareWithParent: false }), 403, 'teacher blocked for students outside their sections');
    if (obs.ok) okr(await teacher.del(`/api/observations/${obs.data.id}`), 'teacher deletes own observation');
  });

  await run('Certificates: issue → public verify → revoke', async () => {
    const tpl = ((await reception.get('/api/certificates/templates')).data as Array<{ id: string; kind: string }>).find((t) => t.kind === 'BONAFIDE')!;
    const cert = await reception.post('/api/certificates/issued', { templateId: tpl.id, recipientId: kabir.id, issuedOn: today });
    okr(cert, 'front office issues bonafide');
    const code = cert.data?.verifyCode;
    testCertIds.push(cert.data.id);
    const { Session } = await import('./client');
    const pub = await new Session().get(`/api/public/verify/${code}`);
    check('public verification says valid', pub.ok && pub.data.valid, pub.data);
    okr(await admin.post(`/api/certificates/issued/${cert.data.id}`, { reason: 'Test revoke' }), 'admin revokes');
    check('verification now says revoked', (await new Session().get(`/api/public/verify/${code}`)).data?.valid === false);
  });

  await removeTestTraces();
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('\nFailures:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
