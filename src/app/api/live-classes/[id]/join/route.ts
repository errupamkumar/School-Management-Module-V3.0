import { badRequest, notFound, route } from '@/server/api';
import { ownClassSectionPairs } from '@/server/scope';
import { bbbConfigured, bbbJoinUrl, ensureBbbMeeting } from '@/server/services/bbb';

/**
 * The link to join a live class. BigBlueButton gets a personal, signed link
 * (the host and anyone who can edit live classes join as moderators); other
 * platforms return the stored meeting link. Families must be in the audience.
 */
export const GET = route({ module: 'live_classes' }, async (ctx, _req, { id }) => {
  const l = await ctx.db.liveClass.findUnique({ where: { id } });
  if (!l) throw notFound('Live class');
  if (ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT') {
    const pairs = await ownClassSectionPairs(ctx);
    const ok = l.audience === 'ALL_STUDENTS' || (l.audience === 'CLASS' && pairs.some((p) => p.classId === l.classId)) || (l.audience === 'SECTION' && pairs.some((p) => p.sectionId === l.sectionId));
    if (!ok) throw notFound('Live class');
  }
  if (l.platform !== 'BIGBLUEBUTTON') return { url: l.meetingUrl };
  const opens = l.startsAt.getTime() - 15 * 60_000;
  const closes = l.startsAt.getTime() + (l.durationMins + 30) * 60_000;
  if (Date.now() < opens) throw badRequest('You can join from 15 minutes before the start.');
  if (Date.now() > closes) throw badRequest('This class has ended.');
  if (!bbbConfigured(ctx.school.settings)) throw badRequest('BigBlueButton is not set up for this school.');
  const meetingID = `vid-${l.id}`;
  const moderator = l.hostId === ctx.user.id || ctx.can('live_classes', 'edit');
  try {
    await ensureBbbMeeting(ctx.school.settings, meetingID, l.title, l.durationMins);
  } catch (e) {
    throw badRequest((e as Error).message);
  }
  return { url: bbbJoinUrl(ctx.school.settings, meetingID, ctx.user.name, ctx.user.id, moderator), moderator };
});
