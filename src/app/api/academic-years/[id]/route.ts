import { crudItem } from '@/server/crud';
import { route } from '@/server/api';
import { academicYearConfig } from '@/server/resources/academics';

export const { GET, PUT, DELETE } = crudItem(academicYearConfig);

/** Make this the current academic year. */
export const PATCH = route({ module: 'academics', action: 'edit' }, async (ctx, _req, { id }) => {
  await ctx.db.academicYear.findUniqueOrThrow({ where: { id } });
  await ctx.db.$transaction([ctx.db.academicYear.updateMany({ where: {}, data: { isCurrent: false } }), ctx.db.academicYear.update({ where: { id }, data: { isCurrent: true } })]);
  await ctx.audit('UPDATE', 'AcademicYear', id, 'set as current');
  return { current: id };
});
