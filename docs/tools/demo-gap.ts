/**
 * Sample content for the 2026-10 modules (gate, discipline, online exams, polls,
 * discussions, gallery, blog, tasks, documents, reminders, alumni, placements,
 * apps), so screenshots and the product tour show real use. Uses the public API
 * as the real roles and skips anything that already exists (safe to re-run).
 *
 *   TEST_BASE_URL=http://localhost:3100 npx tsx docs/tools/demo-gap.ts
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';
import { as, type Session } from '../../tests/api/client';

const SCHOOL = process.env.TEST_SCHOOL || 'DEMO';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const db = new PrismaClient();
const done: string[] = [];
const must = <T>(r: { ok: boolean; error?: string; data: T }, what: string): T => {
  if (!r.ok) throw new Error(`${what}: ${r.error}`);
  return r.data;
};
const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/** Illustrated cards (gradient, emoji, caption) rendered by headless Chrome — stand-ins for event photos. */
async function renderImages(cards: Array<{ title: string; emoji: string; from: string; to: string }>): Promise<Buffer[]> {
  const puppeteer = createRequire(path.join(process.cwd(), 'package.json'))('puppeteer-core');
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 640 });
  const out: Buffer[] = [];
  for (const c of cards) {
    await page.setContent(`<html><body style="margin:0;width:960px;height:640px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,${c.from},${c.to});font-family:Segoe UI,Arial;color:white"><div style="font-size:180px;line-height:1">${c.emoji}</div><div style="margin-top:24px;font-size:44px;font-weight:700;text-shadow:0 2px 8px rgba(0,0,0,.25)">${c.title}</div></body></html>`);
    out.push(Buffer.from(await page.screenshot({ type: 'png' })));
  }
  await browser.close();
  return out;
}

async function upload(s: Session, purpose: string, buf: Buffer, name: string, type: string): Promise<string> {
  const form = new FormData();
  form.set('file', new Blob([new Uint8Array(buf)], { type }), name);
  form.set('purpose', purpose);
  const res = await s.raw('/api/files', { method: 'POST', body: form });
  const j = await res.json();
  if (!res.ok || !j.success) throw new Error(`upload ${name}: ${j.error}`);
  return j.data.id;
}

(async () => {
  const [admin, teacher, accountant, reception, staff, parent, student] = await Promise.all(['admin', 'teacher', 'accountant', 'reception', 'staff', 'parent', 'student'].map((u) => as(SCHOOL, u)));
  const pMe = (await parent.get('/api/me')).data;
  const sMe = (await student.get('/api/me')).data;
  const kabir = pMe.children[0] as { id: string; name: string; classId: string; sectionId: string };
  const khushi = sMe.children[0] as { id: string; name: string; classId: string; sectionId: string };
  const school = await db.school.findUniqueOrThrow({ where: { code: SCHOOL }, select: { id: true } });

  // ---------------- Gate ----------------
  const today = (await reception.get('/api/gate/visitors')).data as Array<{ name: string; id: string; outAt: string | null }>;
  for (const v of [
    { name: 'Suresh Agarwal', phone: '9431012345', purpose: 'ADMISSION', whomToMeet: 'Admission desk', idProof: 'Aadhaar 4412', out: true },
    { name: 'Blue Dart courier', phone: '9835012345', purpose: 'DELIVERY', whomToMeet: 'Office', out: true },
    { name: 'Meena Sinha', phone: '9709012345', purpose: 'PARENT', whomToMeet: 'Class teacher 3-B', personCount: 2, idProof: 'DL 7781' },
    { name: 'Rakesh (electrician)', phone: '9934012345', purpose: 'VENDOR', whomToMeet: 'Estate manager', vehicleNo: 'JH01CK4521' },
  ]) {
    if (today.some((x) => x.name === v.name)) continue;
    const { out, ...body } = v;
    const row = must(await reception.post('/api/gate/visitors', body), 'visitor') as { id: string };
    if (out) await staff.patch(`/api/gate/visitors/${row.id}`, {});
    done.push(`visitor ${v.name}`);
  }
  const passes = (await reception.get('/api/gate/passes')).data as Array<{ studentName: string }>;
  if (!passes.length) {
    const p = must(await reception.post('/api/gate/passes', { studentId: kabir.id, reason: 'Fever — going home early', pickedUpBy: 'Mother', relation: 'Mother', pickerPhone: '9709012345' }), 'gate pass') as { id: string };
    await staff.patch(`/api/gate/passes/${p.id}`, { action: 'left' });
    must(await reception.post('/api/gate/passes', { studentId: khushi.id, reason: 'Dentist appointment at 1 pm', pickedUpBy: 'Father', relation: 'Father' }), 'gate pass 2');
    done.push('2 gate passes');
  }

  // ---------------- Discipline ----------------
  const cats = (await admin.get('/api/settings')).data.settings.disciplineCategories as string[];
  const inc = (await admin.get('/api/discipline')).data as Array<{ title: string }>;
  for (const i of [
    { studentId: kabir.id, category: cats.find((c) => /homework/i.test(c)) ?? cats[0], severity: 'LOW', title: 'Homework not submitted three times this week', description: 'Maths and English homework missing on Monday, Wednesday and Friday.', actionTaken: 'Spoke to Kabir; diary note sent home.', notifyParent: false },
    { studentId: khushi.id, category: cats.find((c) => /mobile/i.test(c)) ?? cats[0], severity: 'MEDIUM', title: 'Mobile phone used during class', description: 'Phone found in use during the 3rd period.', notifyParent: false },
  ]) {
    if (inc.some((x) => x.title === i.title)) continue;
    must(await teacher.post('/api/discipline', { ...i, incidentDate: day(-2) }).then((r) => (r.ok ? r : admin.post('/api/discipline', { ...i, incidentDate: day(-2) }))), 'incident');
    done.push(`incident "${i.title}"`);
  }

  // ---------------- Online exam ----------------
  const exams = (await admin.get('/api/online-exams')).data as Array<{ title: string }>;
  const qTitle = 'Weekly online quiz — Mathematics';
  if (!exams.some((e) => e.title === qTitle)) {
    const cs = await db.classSubject.findMany({ where: { schoolId: school.id, classId: khushi.classId }, include: { subject: true } });
    const maths = cs.find((c) => /math/i.test(c.subject.name)) ?? cs[0];
    let qs = await db.question.findMany({ where: { schoolId: school.id, classId: khushi.classId, subjectId: maths.subjectId, type: { in: ['MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'SHORT'] } }, take: 8 });
    if (qs.length < 4) {
      for (const [type, text, options, answer, marks] of [
        ['MCQ', 'What is 15% of 200?', ['15', '30', '45', '20'], '30', 1],
        ['MCQ', 'The HCF of 12 and 18 is:', ['2', '3', '6', '9'], '6', 1],
        ['TRUE_FALSE', 'Every square is a rectangle.', null, 'True', 1],
        ['FILL_BLANK', 'The sum of angles of a triangle is ___ degrees.', null, '180', 1],
        ['SHORT', 'Explain why 1 is neither prime nor composite.', null, 'It has exactly one factor.', 3],
      ] as const) {
        const r = await admin.post('/api/questions', { classId: khushi.classId, subjectId: maths.subjectId, type, text, options, answer, marks });
        if (r.ok) qs.push(r.data);
      }
      qs = await db.question.findMany({ where: { schoolId: school.id, classId: khushi.classId, subjectId: maths.subjectId, type: { in: ['MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'SHORT'] } }, take: 8 });
    }
    const e = must(await admin.post('/api/online-exams', { title: qTitle, instructions: 'Answer all questions. Your answers save automatically and the test submits itself when time is up.', classId: khushi.classId, subjectId: maths.subjectId, startsAt: new Date(Date.now() - 3600_000).toISOString(), endsAt: new Date(Date.now() + 10 * 86_400_000).toISOString(), durationMins: 20, questionIds: qs.map((q) => q.id), negativeMarks: 0.25 }), 'online exam') as { id: string };
    must(await admin.put(`/api/online-exams/${e.id}`, { status: 'PUBLISHED' }), 'publish exam');
    const later = must(await admin.post('/api/online-exams', { title: 'Science chapter test (Unit 5)', classId: khushi.classId, subjectId: (cs.find((c) => /science/i.test(c.subject.name)) ?? maths).subjectId, startsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(), endsAt: new Date(Date.now() + 3 * 86_400_000 + 3 * 3600_000).toISOString(), durationMins: 40, questionIds: qs.slice(0, 3).map((q) => q.id) }), 'second exam') as { id: string };
    await admin.put(`/api/online-exams/${later.id}`, { status: 'PUBLISHED' });
    done.push('2 online exams');
  }

  // ---------------- Polls & forms ----------------
  const forms = (await admin.get('/api/forms')).data as Array<{ id: string; title: string }>;
  if (!forms.some((f) => f.title === 'Which Saturday suits you for the PTM?')) {
    const p = must(await admin.post('/api/forms', { kind: 'POLL', title: 'Which Saturday suits you for the PTM?', description: 'We will hold the term-1 parent–teacher meeting on the most popular date.', fields: [{ id: 'date', label: 'Preferred date', type: 'SINGLE', required: true, options: ['Sat 1 Nov, 9–12', 'Sat 8 Nov, 9–12', 'Sat 15 Nov, 9–12'] }], audience: { roles: ['PARENT'], classIds: [] }, closesAt: new Date(Date.now() + 9 * 86_400_000).toISOString(), notify: false }), 'poll') as { id: string };
    await parent.post(`/api/forms/${p.id}/respond`, { answers: { date: 'Sat 8 Nov, 9–12' } });
    must(await admin.post('/api/forms', { kind: 'FORM', title: 'Educational trip consent — Science City, Kolkata', description: 'Trip on 22 Nov for Classes 6–8. Please confirm by 10 Nov.', fields: [{ id: 'consent', label: 'I allow my ward to join the trip', type: 'SINGLE', required: true, options: ['Yes', 'No'] }, { id: 'food', label: 'Food preference', type: 'SINGLE', required: true, options: ['Vegetarian', 'Non-vegetarian', 'Jain'] }, { id: 'medical', label: 'Any medical condition we should know about?', type: 'PARAGRAPH', required: false, options: [] }, { id: 'phone', label: 'Emergency contact number', type: 'TEXT', required: true, options: [] }], audience: { roles: ['PARENT'], classIds: [] }, notify: false }), 'consent form');
    must(await admin.post('/api/forms', { kind: 'FORM', title: 'Staff wellbeing survey (anonymous)', anonymous: true, fields: [{ id: 'load', label: 'How manageable is your workload?', type: 'RATING', required: true, options: [] }, { id: 'idea', label: 'One thing we should change', type: 'PARAGRAPH', required: false, options: [] }], audience: { roles: ['TEACHER', 'ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN', 'STAFF'], classIds: [] }, notify: false }), 'survey');
    done.push('poll, consent form and staff survey');
  }

  // ---------------- Discussions ----------------
  const topics = (await admin.get('/api/discussions')).data as Array<{ title: string }>;
  if (!topics.some((t) => t.title === 'Class 3-B: carpool for the winter timings')) {
    const t = must(await parent.post('/api/discussions', { title: 'Class 3-B: carpool for the winter timings', body: 'With school starting at 8:30 from November, would any parents near Boring Road like to share a carpool?', audience: { roles: ['PARENT'], classIds: [] } }), 'topic') as { id: string };
    await teacher.post(`/api/discussions/${t.id}/posts`, { body: 'Good idea! Please keep the school informed of who picks up each child — the gate team will check.' });
    const s = must(await admin.post('/api/discussions', { title: 'Staff room: ideas for Annual Day 2026', body: 'Share theme ideas and which class can lead which item. Final list by 30 Oct.', audience: { roles: ['TEACHER', 'STAFF', 'LIBRARIAN', 'ACCOUNTANT', 'RECEPTIONIST'], classIds: [] } }), 'staff topic') as { id: string };
    await admin.patch(`/api/discussions/${s.id}`, { pinned: true });
    await teacher.post(`/api/discussions/${s.id}/posts`, { body: 'Theme suggestion: “Incredible India — 75 years of science”. Class 8 can do the drama.' });
    done.push('2 discussions');
  }

  // ---------------- Gallery & blog ----------------
  const albums = (await admin.get('/api/gallery')).data as Array<{ title: string }>;
  const posts = (await admin.get('/api/blog?status=ALL')).data as Array<{ title: string }>;
  const needAlbums = !albums.some((a) => a.title === 'Sports Day 2026');
  const needPosts = !posts.some((p) => p.title === 'Our students win the district science fair');
  if (needAlbums || needPosts) {
    const imgs = await renderImages([
      { title: 'Sports Day · 100 m sprint', emoji: '🏃', from: '#f97316', to: '#db2777' },
      { title: 'Sports Day · Relay', emoji: '🏅', from: '#0ea5e9', to: '#6366f1' },
      { title: 'Sports Day · Tug of war', emoji: '💪', from: '#22c55e', to: '#0d9488' },
      { title: 'Sports Day · Prize giving', emoji: '🏆', from: '#eab308', to: '#f97316' },
      { title: 'Independence Day · Flag hoisting', emoji: '🎉', from: '#f59e0b', to: '#16a34a' },
      { title: 'Independence Day · Cultural show', emoji: '🎭', from: '#8b5cf6', to: '#ec4899' },
      { title: 'District Science Fair', emoji: '🔬', from: '#2563eb', to: '#0891b2' },
      { title: 'New library corner', emoji: '📚', from: '#7c3aed', to: '#2563eb' },
    ]);
    if (needAlbums) {
      for (const [title, eventDate, slice] of [
        ['Sports Day 2026', day(-12), imgs.slice(0, 4)],
        ['Independence Day celebrations', '2026-08-15', imgs.slice(4, 6)],
      ] as const) {
        const a = must(await teacher.post('/api/gallery', { title, eventDate, visibility: 'ALL', description: title === 'Sports Day 2026' ? 'Races, relays and the prize ceremony on the school ground.' : 'Flag hoisting, parade and cultural programme.' }), 'album') as { id: string };
        const ids = [];
        for (const [i, b] of slice.entries()) ids.push({ fileId: await upload(teacher, 'GALLERY', b, `${title}-${i + 1}.png`, 'image/png') });
        must(await teacher.post(`/api/gallery/${a.id}`, { photos: ids, notify: false }), 'photos');
      }
      done.push('2 gallery albums');
    }
    if (needPosts) {
      const c1 = await upload(admin, 'BLOG', imgs[6], 'science-fair.png', 'image/png');
      const p1 = must(await admin.post('/api/blog', { title: 'Our students win the district science fair', excerpt: 'Class 8 team takes first prize for a low-cost water purifier.', body: '# First prize at the district science fair\n\nOur Class 8 team — **Aditi, Rohan and Sameer** — won first prize at the Patna district science fair on Saturday.\n\nTheir project, a *low-cost water purifier* built from clay pots, sand and charcoal, cleans 20 litres a day and costs under ₹300.\n\n## What the judges said\n\n- Practical and affordable for rural homes\n- Clear explanation of the science\n- Excellent teamwork\n\nThe team will now represent the district at the state fair in December. Congratulations!', coverFileId: c1, action: 'publish', isPublic: true }), 'post 1') as { id: string };
      void p1;
      const c2 = await upload(admin, 'BLOG', imgs[7], 'library.png', 'image/png');
      must(await admin.post('/api/blog', { title: 'A new reading corner in the library', excerpt: '600 new books in Hindi and English for the junior classes.', body: 'Thanks to our parents’ association, the library now has a **reading corner** for Classes 1–5 with 600 new books in Hindi and English.\n\nStudents can borrow two books a week. Parents are welcome to visit on Saturdays between 10 and 12.', coverFileId: c2, action: 'publish', isPublic: true }), 'post 2');
      must(await teacher.post('/api/blog', { title: 'Class 3-B visits the post office', body: 'Our class learnt how letters travel across India. Students posted letters to their grandparents and saw the sorting room.', action: 'submit' }), 'pending post');
      done.push('3 blog posts');
    }
  }

  // ---------------- Tasks ----------------
  const tasks = (await admin.get('/api/tasks?scope=all&status=ALL')).data as Array<{ title: string }>;
  if (!tasks.some((t) => t.title === 'Submit Class 10 board registration list')) {
    const users = await db.user.findMany({ where: { schoolId: school.id, username: { in: ['teacher', 'accountant', 'reception', 'librarian'] } }, select: { id: true, username: true } });
    const id = (u: string) => users.find((x) => x.username === u)?.id;
    must(await admin.post('/api/tasks', { title: 'Submit Class 10 board registration list', description: 'Verify names and dates of birth against admission records, then upload to the CBSE portal.', priority: 'URGENT', dueDate: day(3), assigneeIds: [id('reception'), id('teacher')].filter(Boolean) }), 'task 1');
    const t2 = must(await admin.post('/api/tasks', { title: 'Reconcile October fee collection with bank statement', priority: 'HIGH', dueDate: day(5), assigneeIds: [id('accountant')].filter(Boolean) }), 'task 2') as { id: string };
    await accountant.patch(`/api/tasks/${t2.id}`, { myStatus: 'IN_PROGRESS' });
    await accountant.post(`/api/tasks/${t2.id}`, { body: 'UPI receipts matched; 3 cheques still to clear.' });
    must(await admin.post('/api/tasks', { title: 'Library stock verification (junior section)', priority: 'MEDIUM', dueDate: day(-1), assigneeIds: [id('librarian')].filter(Boolean) }), 'task 3');
    done.push('3 tasks');
  }

  // ---------------- Documents ----------------
  const docs = (await admin.get('/api/documents')).data as { folders: Array<{ id: string; name: string }>; documents: Array<{ title: string }> };
  if (!docs.documents.some((d) => d.title === 'Fire safety NOC')) {
    const folder = async (name: string) => docs.folders.find((f) => f.name === name)?.id ?? (must(await admin.post('/api/doc-folders', { name }), 'folder') as { id: string }).id;
    const compliance = await folder('Compliance & licences');
    const policies = await folder('Policies');
    const pdf = (t: string) => Buffer.from(`%PDF-1.4\n% ${t}\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n`);
    for (const d of [
      { title: 'Fire safety NOC', folderId: compliance, roles: ['ADMIN', 'TEACHER', 'STAFF'], expiresOn: day(20), tags: 'compliance, safety' },
      { title: 'CBSE affiliation letter', folderId: compliance, roles: ['ADMIN', 'TEACHER'], expiresOn: '2029-03-31', tags: 'CBSE' },
      { title: 'Child protection policy', folderId: policies, roles: ['ADMIN', 'TEACHER', 'STAFF', 'PARENT', 'STUDENT'], tags: 'POCSO, safeguarding' },
      { title: 'Staff leave policy 2026-27', folderId: policies, roles: ['ADMIN', 'TEACHER', 'ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN', 'STAFF'], tags: 'HR' },
    ]) {
      const fileId = await upload(admin, 'DOCS', pdf(d.title), `${d.title}.pdf`, 'application/pdf');
      must(await admin.post('/api/documents', { ...d, fileId }), `document ${d.title}`);
    }
    done.push('4 documents in 2 folders');
  }

  // ---------------- Reminders ----------------
  const rems = (await admin.get('/api/reminders?scope=all')).data as Array<{ title: string }>;
  if (!rems.some((r) => r.title === 'Science City trip tomorrow')) {
    must(await admin.post('/api/reminders', { title: 'Science City trip tomorrow', message: 'Reach school by 6:45 am in uniform with a packed lunch and water bottle.', remindAt: new Date(Date.now() + 5 * 86_400_000).toISOString(), forSelf: false, audience: { roles: ['PARENT', 'STUDENT'], classIds: [khushi.classId] }, channels: ['APP', 'SMS'] }), 'reminder 1');
    must(await admin.post('/api/reminders', { title: 'Monthly fee due on the 10th', message: 'Please clear this month’s fee by the 10th to avoid late fees. Pay online from the Fees screen.', remindAt: new Date(Date.now() + 2 * 86_400_000).toISOString(), repeat: 'MONTHLY', forSelf: false, audience: { roles: ['PARENT'], classIds: [] }, channels: ['APP'] }), 'reminder 2');
    must(await teacher.post('/api/reminders', { title: 'Enter unit-test marks', message: 'Class 3-B English marks due Friday.', remindAt: new Date(Date.now() + 86_400_000).toISOString(), repeat: 'WEEKLY' }), 'reminder 3');
    done.push('3 reminders');
  }

  // ---------------- Alumni ----------------
  const alumni = (await admin.get('/api/alumni')).data as Array<{ name: string }>;
  if (!alumni.some((a) => a.name === 'Dr. Ananya Mishra')) {
    for (const a of [
      { name: 'Dr. Ananya Mishra', passingYear: 2008, lastClass: 'Class 12 Science', currentStatus: 'EMPLOYED', organisation: 'AIIMS Patna', designation: 'Associate Professor', higherEducation: 'MBBS, MD (AIIMS Delhi)', city: 'Patna', isMentor: true, email: 'ananya.m@example.com' },
      { name: 'Rohit Kumar', passingYear: 2014, lastClass: 'Class 12 Commerce', currentStatus: 'SELF_EMPLOYED', organisation: 'Bihar Agro Foods', designation: 'Founder', higherEducation: 'BBA, IIM Bodh Gaya', city: 'Patna', phone: '9431098765' },
      { name: 'Sneha Prakash', passingYear: 2019, lastClass: 'Class 12 Science', currentStatus: 'EMPLOYED', organisation: 'Infosys', designation: 'Software Engineer', higherEducation: 'B.Tech, NIT Patna', city: 'Bengaluru', isMentor: true },
      { name: 'Aman Raj', passingYear: 2023, lastClass: 'Class 12 Science', currentStatus: 'STUDYING', organisation: 'IIT Kharagpur', designation: 'B.Tech Civil, 3rd year', city: 'Kharagpur' },
    ]) must(await admin.post('/api/alumni', a), `alumnus ${a.name}`);
    await db.alumnus.create({ data: { schoolId: school.id, name: 'Priyanka Verma', passingYear: 2016, lastClass: 'Class 12 Arts', email: 'priyanka.v@example.com', currentStatus: 'EMPLOYED', organisation: 'Doordarshan Bihar', designation: 'News presenter', status: 'PENDING' } });
    done.push('5 alumni (1 waiting approval)');
  }

  // ---------------- Placements ----------------
  const drives = (await admin.get('/api/placements')).data as Array<{ company: string; id: string }>;
  if (!drives.some((d) => d.company === 'Tata Consultancy Services')) {
    const d = must(await admin.post('/api/placements', { company: 'Tata Consultancy Services', role: 'Summer internship — digital literacy volunteers', description: '4-week paid internship teaching basic computer skills in community centres. Certificate from TCS.', location: 'Patna', packageInfo: '₹6,000 stipend', driveDate: day(14), applyBy: day(7), eligibleClassIds: [khushi.classId], notify: false }), 'drive') as { id: string };
    const app = await student.post(`/api/placements/${d.id}`, { note: 'I teach my grandparents to use UPI!' });
    if (app.ok) await admin.patch(`/api/placements/${d.id}`, { applicationId: app.data.id, status: 'SHORTLISTED' });
    must(await admin.post('/api/placements', { company: 'Bihar Tourism', role: 'Heritage guide trainee (weekends)', location: 'Nalanda', packageInfo: '₹500 per day', driveDate: day(21), applyBy: day(12), eligibleClassIds: [khushi.classId], notify: false }), 'drive 2');
    done.push('2 placement drives');
  }

  // ---------------- Apps ----------------
  const settings = (await admin.get('/api/settings')).data.settings;
  if (!settings.apps.length) {
    must(await admin.put('/api/settings', { settings: { apps: [
      { id: 'diksha', title: 'DIKSHA', url: 'https://diksha.gov.in', roles: ['TEACHER', 'STUDENT', 'PARENT'], newTab: true },
      { id: 'classroom', title: 'Google Classroom', url: 'https://classroom.google.com', roles: ['TEACHER', 'STUDENT'], newTab: true },
      { id: 'udise', title: 'UDISE+ portal', url: 'https://udiseplus.gov.in', roles: ['ADMIN'], newTab: true },
    ] } }), 'apps');
    done.push('3 apps');
  }

  await db.$disconnect();
  console.log(done.length ? `Added: ${done.join('; ')}` : 'Nothing to add — demo content already present.');
})().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
