import { route } from '@/server/api';

/** School rules for the viewer: families see the student rules, staff see both. Plain text. */
export const GET = route({ authenticated: true }, async (ctx) => {
  const { students, employees } = ctx.school.settings.rules;
  const family = ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT';
  return { students: students || null, employees: family ? null : employees || null };
});
