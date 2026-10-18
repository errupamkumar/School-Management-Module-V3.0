import { route } from '@/server/api';

/** App Frame: the school's other web tools that this user's role may open. Owners/admins see all. */
export const GET = route({ module: 'apps' }, async (ctx) => {
  const all = ctx.user.role === 'SUPER_ADMIN' || ctx.user.role === 'ADMIN';
  return ctx.school.settings.apps.filter((a) => all || (a.roles as string[]).includes(ctx.user.role)).map((a) => ({ id: a.id, title: a.title, url: a.url, newTab: a.newTab }));
});
