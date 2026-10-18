import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { badRequest, body, forbidden, owned, route } from '@/server/api';
import { classLabel } from '@/server/common';
import { ownClassSectionPairs, teacherSectionIds } from '@/server/scope';
import { notifyUsers } from '@/server/services/notify';
import { bbbConfigured } from '@/server/services/bbb';

const ALLOWED_HOSTS = ['meet.google.com', 'zoom.us', 'us02web.zoom.us', 'us04web.zoom.us', 'us05web.zoom.us', 'us06web.zoom.us', 'teams.microsoft.com', 'teams.live.com', 'meet.jit.si'];

export const GET = route({ module: 'live_classes' }, async (ctx, req) => {
  const past = req.nextUrl.searchParams.get('past') === '1';
  const timeFilter: Prisma.LiveClassWhereInput = past ? { startsAt: { lt: new Date() } } : { startsAt: { gte: new Date(Date.now() - 3 * 3600_000) } };
  const and: Prisma.LiveClassWhereInput[] = [timeFilter];
  if (ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT') {
    const pairs = await ownClassSectionPairs(ctx);
    and.push({ OR: [{ audience: 'ALL_STUDENTS' }, { audience: 'CLASS', classId: { in: pairs.map((p) => p.classId) } }, { audience: 'SECTION', sectionId: { in: pairs.map((p) => p.sectionId) } }] });
  }
  const rows = await ctx.db.liveClass.findMany({ where: { AND: and }, orderBy: { startsAt: past ? 'desc' : 'asc' }, take: 100 });
  const classes = await ctx.db.class.findMany({ select: { id: true, name: true, sections: { select: { id: true, name: true } } } });
  return rows.map((r) => {
    const c = classes.find((x) => x.id === r.classId);
    const s = c?.sections.find((x) => x.id === r.sectionId);
    // BigBlueButton links are personal and signed; they come from /join, never the list.
    return { ...r, meetingUrl: r.platform === 'BIGBLUEBUTTON' ? '' : r.meetingUrl, target: r.audience === 'ALL_STUDENTS' ? 'All students' : r.audience === 'ALL_STAFF' ? 'All staff' : c ? classLabel(c, s) : '' };
  });
});

export const POST = route({ module: 'live_classes', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      title: z.string().trim().min(2).max(150),
      platform: z.enum(['GOOGLE_MEET', 'ZOOM', 'TEAMS', 'JITSI', 'BIGBLUEBUTTON', 'OTHER']),
      meetingUrl: z.union([z.url('Enter the meeting link'), z.literal('')]).optional().nullable(),
      audience: z.enum(['ALL_STUDENTS', 'ALL_STAFF', 'CLASS', 'SECTION']),
      classId: z.string().optional().nullable(),
      sectionId: z.string().optional().nullable(),
      startsAt: z.string().min(10),
      durationMins: z.coerce.number().int().min(10).max(480),
      message: z.string().trim().max(1000).optional().nullable(),
    })
  );
  if (input.platform === 'BIGBLUEBUTTON') {
    if (!bbbConfigured(ctx.school.settings)) throw badRequest('Add your BigBlueButton server in School Settings → Integrations & data first.');
  } else {
    if (!input.meetingUrl) throw badRequest('Enter the meeting link');
    const url = new URL(input.meetingUrl);
    if (url.protocol !== 'https:') throw badRequest('Meeting links must use https.');
    if (input.platform !== 'OTHER' && !ALLOWED_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))) throw badRequest('That does not look like a Google Meet, Zoom, Teams or Jitsi link.');
  }
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw badRequest('Invalid start time.');
  if (input.audience === 'CLASS' && !input.classId) throw badRequest('Choose a class.');
  if (input.audience === 'SECTION' && !input.sectionId) throw badRequest('Choose a section.');
  let classId = input.classId ?? null;
  if (input.sectionId) {
    const s = await ctx.db.section.findUnique({ where: { id: input.sectionId } });
    if (!s) throw badRequest('Unknown section.');
    classId = s.classId;
    if (ctx.user.role === 'TEACHER' && !(await teacherSectionIds(ctx)).includes(s.id)) throw forbidden('Choose one of your sections.');
  } else await owned(ctx.db.class, classId, 'Class');
  if (ctx.user.role === 'TEACHER' && (input.audience === 'ALL_STUDENTS' || input.audience === 'ALL_STAFF')) throw forbidden('Teachers can schedule classes for their own sections only.');

  const row = await ctx.db.liveClass.create({ data: { schoolId: ctx.user.schoolId, title: input.title, platform: input.platform, meetingUrl: input.platform === 'BIGBLUEBUTTON' ? '' : input.meetingUrl!, audience: input.audience, classId, sectionId: input.sectionId ?? null, startsAt, durationMins: input.durationMins, message: input.message ?? null, hostId: ctx.user.id, hostName: ctx.user.name } });

  const recipients =
    input.audience === 'ALL_STAFF'
      ? (await ctx.db.user.findMany({ where: { role: { notIn: ['PARENT', 'STUDENT'] }, isActive: true }, select: { id: true } })).map((u) => u.id)
      : (await ctx.db.student.findMany({ where: { status: 'ACTIVE', ...(input.audience === 'CLASS' ? { classId: classId! } : input.audience === 'SECTION' ? { sectionId: input.sectionId! } : {}) }, select: { userId: true } })).map((s) => s.userId);
  await notifyUsers(ctx.db, ctx.user.schoolId, recipients, { title: `Live class: ${input.title}`, body: `Starts ${startsAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}`, link: '/live-classes' });
  await ctx.audit('CREATE', 'LiveClass', row.id, input.title);
  return row;
});
