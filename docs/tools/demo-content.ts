/**
 * Adds a little realistic content the demo seed does not create, so product
 * screenshots show real use instead of empty states. Uses only the public API
 * as the real roles, and skips anything that already exists (safe to re-run).
 *
 *   npx tsx docs/tools/demo-content.ts
 */
import { as } from '../../tests/api/client';

const SCHOOL = process.env.TEST_SCHOOL || 'DEMO';

(async () => {
  const teacher = await as(SCHOOL, 'teacher');
  const parent = await as(SCHOOL, 'parent');
  const tMe = (await teacher.get('/api/me')).data;
  const pMe = (await parent.get('/api/me')).data;
  const kabir = pMe.children.find((c: { classLabel: string }) => c.classLabel === 'Class 3-B');
  const alloc = (await teacher.get(`/api/sections/${kabir.sectionId}/teachers`)).data as Array<{ subjectId: string; subjectName: string; employeeId: string }>;
  const mine = alloc.find((a) => a.employeeId === tMe.user.employeeId)!;
  const done: string[] = [];

  // Study material for the teacher's subject in Kabir's class.
  const materials = (await teacher.get('/api/materials')).data as Array<{ title: string }>;
  for (const m of [
    { title: `${mine.subjectName}: NCERT textbook (official)`, kind: 'LINK', url: 'https://ncert.nic.in/textbook.php', description: 'Read the chapter before Monday’s class.' },
    { title: `${mine.subjectName}: chapter revision video`, kind: 'VIDEO', url: 'https://www.youtube.com/@NCERTOFFICIAL', description: 'Short revision video from NCERT’s official channel.' },
  ]) {
    if (materials.some((x) => x.title === m.title)) continue;
    const r = await teacher.post('/api/materials', { classId: kabir.classId, subjectId: mine.subjectId, ...m });
    if (!r.ok) throw new Error(`material: ${r.error}`);
    done.push(`study material "${m.title}"`);
  }

  // A class test with marks.
  const testTitle = `Weekly test: ${mine.subjectName} (Chapter 4)`;
  const tests = (await teacher.get('/api/class-tests')).data;
  const testList = (Array.isArray(tests) ? tests : tests?.tests ?? []) as Array<{ id: string; title: string }>;
  let testId = testList.find((t) => t.title === testTitle)?.id;
  if (!testId) {
    const t = await teacher.post('/api/class-tests', { classId: kabir.classId, sectionId: kabir.sectionId, subjectId: mine.subjectId, title: testTitle, testDate: '2026-10-16', maxMarks: 20 });
    if (!t.ok) throw new Error(`class test: ${t.error}`);
    testId = t.data.id as string;
  }
  const sheet = (await teacher.get(`/api/class-tests/${testId}/marks`)).data;
  if (!(sheet.rows as Array<{ marks: number | null }>).some((r) => r.marks !== null)) {
    const rows = (sheet.rows ?? sheet.students ?? []) as Array<{ studentId: string }>;
    const scores = [18, 15, 12, 19, 9, 16, 14, 20, 11, 17, 13, 15];
    const m = await teacher.put(`/api/class-tests/${testId}/marks`, { entries: rows.map((r, i) => ({ studentId: r.studentId, marks: i === 4 ? null : scores[i % scores.length], isAbsent: i === 4 })) });
    if (!m.ok) throw new Error(`class test marks: ${m.error}`);
    done.push(`class test "${testTitle}" with ${rows.length} marks`);
  }

  // A question paper generated from the bank for the best-stocked class and subject.
  const papers = (await teacher.get('/api/question-papers')).data as Array<{ title: string }>;
  if (!papers.some((p) => p.title.startsWith('Periodic Test 2'))) {
    const qs = (await teacher.get('/api/questions')).data as Array<{ classId: string; subjectId: string; type: string }>;
    const groups = new Map<string, number>();
    for (const q of qs) groups.set(`${q.classId}|${q.subjectId}`, (groups.get(`${q.classId}|${q.subjectId}`) ?? 0) + 1);
    const best = [...groups.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) {
      const [classId, subjectId] = best[0].split('|');
      const types = [...new Set(qs.filter((q) => q.classId === classId && q.subjectId === subjectId).map((q) => q.type))];
      const blueprint = types.slice(0, 3).map((type) => ({ type, count: 3 }));
      const gen = await teacher.post('/api/question-papers/generate', { classId, subjectId, difficulty: 'MIXED', blueprint });
      if (!gen.ok) throw new Error(`generate paper: ${gen.error}`);
      const subjectName = ((await teacher.get('/api/lookups?include=subjects')).data.subjects as Array<{ id: string; name: string }>).find((s) => s.id === subjectId)?.name ?? '';
      const save = await teacher.post('/api/question-papers', { title: `Periodic Test 2: ${subjectName}`, classId, subjectId, durationMins: 90, instructions: 'All questions are compulsory. Write neatly.', sections: gen.data.sections.map((s: { title: string; questionIds: string[] }) => ({ title: s.title, questionIds: s.questionIds })) });
      if (!save.ok) throw new Error(`save paper: ${save.error}`);
      done.push(`question paper "Periodic Test 2: ${subjectName}" (${gen.data.totalMarks} marks)`);
    }
  }

  // A parent–teacher conversation.
  const convs = (await parent.get('/api/messages')).data as Array<{ other: { id: string } | null }>;
  if (!convs.some((c) => c.other?.id === tMe.user.id)) {
    const m = await parent.post('/api/messages', { toUserId: tMe.user.id, body: 'Namaste Sir, Kabir was unwell yesterday. Could you share what was covered in class?' });
    if (!m.ok) throw new Error(`message: ${m.error}`);
    await teacher.post(`/api/messages/${m.data.conversationId}`, { body: 'Namaste ji. Hope Kabir feels better. We covered Chapter 4; the worksheet is under Homework and the revision video is in Study Material.' });
    done.push('parent–teacher conversation');
  }

  // ---- Newer capabilities: live tracking, languages, hostel ----
  const admin = await as(SCHOOL, 'admin');
  const transport = await as(SCHOOL, 'transport');
  const settings = (await admin.get('/api/settings')).data.settings;
  if (!settings.liveTracking.enabled || settings.languages.enabled.length < 6) {
    const r = await admin.put('/api/settings', {
      settings: {
        liveTracking: { ...settings.liveTracking, enabled: true, shareWithParents: true },
        languages: { enabled: ['en', 'hi', 'bn', 'mr', 'ta', 'te'], default: 'en' },
      },
    });
    if (!r.ok) throw new Error(`settings: ${r.error}`);
    done.push('live tracking on; 6 languages offered');
  }

  // Stop coordinates around the school (Patna), one direction per route.
  const routes = (await transport.get('/api/transport/routes')).data as Array<{ id: string; name: string; vehicleId: string | null; stops: Array<{ id: string; name: string; pickupTime: string | null; dropTime: string | null; monthlyFee: number; lat: number | null }> }>;
  const school = { lat: 25.6127, lng: 85.1188 };
  for (const [i, r] of routes.entries()) {
    if (!r.stops.length || r.stops.every((s) => s.lat != null)) continue;
    const angle = (i * 72 + 20) * (Math.PI / 180);
    const n = r.stops.length;
    const stops = r.stops.map((s, j) => {
      const k = (n - j) * 0.011; // first stop farthest; the bus ends at school
      const wobble = (j % 2 ? 0.0018 : -0.0014) * (i + 1);
      return { id: s.id, name: s.name, pickupTime: s.pickupTime, dropTime: s.dropTime, monthlyFee: Number(s.monthlyFee), lat: +(school.lat + Math.sin(angle) * k + wobble).toFixed(6), lng: +(school.lng + Math.cos(angle) * k * 1.1 - wobble).toFixed(6) };
    });
    const put = await transport.put(`/api/transport/routes/${r.id}/stops`, { stops });
    if (!put.ok) throw new Error(`stops: ${put.error}`);
    done.push(`coordinates for ${r.name}`);
  }

  // The demo driver login drives Route 1's bus.
  const staff = await as(SCHOOL, 'staff').catch(() => null);
  const staffEmp = staff ? (await staff.get('/api/me')).data.user.employeeId : null;
  const firstVehicle = routes.find((r) => r.vehicleId)?.vehicleId;
  if (staffEmp && firstVehicle) {
    const v = (await transport.get(`/api/transport/vehicles/${firstVehicle}`)).data;
    if (v.driverEmployeeId !== staffEmp) {
      const r = await transport.put(`/api/transport/vehicles/${firstVehicle}`, { driverEmployeeId: staffEmp });
      if (!r.ok) throw new Error(`driver link: ${r.error}`);
      done.push(`driver login linked to ${v.registrationNo}`);
    }
  }

  // Two hostels with residents.
  const hostels = (await admin.get('/api/hostels')).data as Array<{ id: string; name: string; rooms: Array<{ id: string; capacity: number; _count: { allocations: number } }> }>;
  const want = [
    { name: 'Tagore Boys Hostel', kind: 'BOYS', address: 'Block A, behind the playground', rooms: [['101', 'Ground', '3-seater', 3, 3500], ['102', 'Ground', '3-seater', 3, 3500], ['103', 'Ground', '2-seater, attached bath', 2, 4500], ['201', 'First', '4-seater', 4, 3000], ['202', 'First', '4-seater', 4, 3000], ['203', 'First', 'Single (senior)', 1, 6000]] },
    { name: 'Sarojini Girls Hostel', kind: 'GIRLS', address: 'Block C, near the library', rooms: [['G1', 'Ground', '3-seater', 3, 3500], ['G2', 'Ground', '3-seater', 3, 3500], ['F1', 'First', '2-seater, attached bath', 2, 4500], ['F2', 'First', '4-seater', 4, 3000], ['F3', 'First', 'Single (senior)', 1, 6000]] },
  ] as const;
  for (const w of want) {
    if (hostels.some((h) => h.name === w.name)) continue;
    const h = await admin.post('/api/hostels', { name: w.name, kind: w.kind, address: w.address, phone: '0612-2234567' });
    if (!h.ok) throw new Error(`hostel: ${h.error}`);
    const roomIds: Array<{ id: string; capacity: number }> = [];
    for (const [roomNo, floor, roomType, capacity, monthlyFee] of w.rooms) {
      const r = await admin.post('/api/hostel-rooms', { hostelId: h.data.id, roomNo, floor, roomType, capacity, monthlyFee });
      if (!r.ok) throw new Error(`room: ${r.error}`);
      roomIds.push({ id: r.data.id, capacity });
    }
    // Residents: senior students of the right gender, filling about two-thirds of the beds.
    const pool = ((await admin.get('/api/students?pageSize=200')).data as Array<{ id: string; gender: string; classLabel?: string }>).filter((s) => s.gender === (w.kind === 'BOYS' ? 'MALE' : 'FEMALE'));
    const takenNow = new Set((await admin.get('/api/hostel/allocations')).data.map((a: { studentId: string }) => a.studentId));
    let placed = 0;
    let p = 0;
    for (const room of roomIds) {
      const fill = Math.max(1, Math.round(room.capacity * 0.7));
      for (let b = 0; b < fill && p < pool.length; p++) {
        if (takenNow.has(pool[p].id)) continue;
        const a = await admin.post('/api/hostel/allocations', { studentId: pool[p].id, roomId: room.id, bedNo: String.fromCharCode(65 + b), fromDate: '2026-04-01' });
        if (a.ok) {
          b++;
          placed++;
        }
      }
    }
    done.push(`${w.name} with ${roomIds.length} rooms and ${placed} residents`);
  }

  // Wardens: a non-teaching employee of the matching gender for each hostel.
  const emps = ((await admin.get('/api/employees?pageSize=100&teaching=no')).data ?? []) as Array<{ id: string; gender: string; name: string }>;
  for (const h of (await admin.get('/api/hostels')).data as Array<{ id: string; name: string; kind: string; wardenId: string | null }>) {
    if (h.wardenId) continue;
    const w = emps.find((e) => e.gender === (h.kind === 'GIRLS' ? 'FEMALE' : 'MALE'));
    if (!w) continue;
    const r = await admin.put(`/api/hostels/${h.id}`, { wardenId: w.id });
    if (r.ok) done.push(`${w.name} is warden of ${h.name}`);
  }

  console.log(done.length ? `Added: ${done.join('; ')}` : 'Demo content already present.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
