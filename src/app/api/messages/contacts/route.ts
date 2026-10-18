import { route } from '@/server/api';
import { classLabel } from '@/server/common';
import { contactWhere } from '@/server/services/contacts';
import { ROLE_LABELS } from '@/lib/modules';

export const GET = route({ module: 'messaging' }, async (ctx, req) => {
  const search = req.nextUrl.searchParams.get('search')?.trim().slice(0, 60);
  const users = await ctx.db.user.findMany({
    where: { AND: [await contactWhere(ctx), ...(search ? [{ OR: [{ name: { contains: search } }, { username: { contains: search } }] }] : [])] },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    take: 30,
    select: {
      id: true,
      name: true,
      role: true,
      avatarUrl: true,
      employee: { select: { designation: true } },
      student: { select: { class: { select: { name: true } }, section: { select: { name: true } } } },
      guardian: { select: { students: { select: { firstName: true, class: { select: { name: true } }, section: { select: { name: true } } }, take: 3 } } },
    },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    avatarUrl: u.avatarUrl,
    detail: u.employee?.designation ?? (u.student ? classLabel(u.student.class, u.student.section) : u.guardian ? `Parent of ${u.guardian.students.map((s) => `${s.firstName} (${classLabel(s.class, s.section)})`).join(', ')}` : ROLE_LABELS[u.role]),
  }));
});
