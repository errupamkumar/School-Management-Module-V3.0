import { z } from 'zod';
import { body, owned, route } from '@/server/api';
import { classLabel, displayName } from '@/server/common';
import { fromPaise } from '@/server/services/money';
import { money } from '@/lib/validators';

const classSchema = z.object({
  name: z.string().trim().min(1, 'Class name is required').max(30),
  numericOrder: z.coerce.number().int().min(0).max(100),
  campusId: z.string().min(1).optional(),
  monthlyFee: money.default(0),
  sections: z.array(z.string().trim().toUpperCase().min(1).max(10)).max(20).optional(),
});

export const GET = route({ module: 'academics' }, async (ctx) => {
  const classes = await ctx.db.class.findMany({
    orderBy: { numericOrder: 'asc' },
    include: {
      campus: { select: { name: true } },
      sections: {
        orderBy: { name: 'asc' },
        include: {
          classTeacher: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { students: { where: { status: 'ACTIVE' } } } },
        },
      },
      subjects: { include: { subject: { select: { id: true, name: true, code: true } } } },
    },
  });
  return classes.map((c) => ({
    ...c,
    label: classLabel(c),
    students: c.sections.reduce((a, s) => a + s._count.students, 0),
    sections: c.sections.map((s) => ({ ...s, students: s._count.students, classTeacherName: s.classTeacher ? displayName(s.classTeacher) : null })),
  }));
});

export const POST = route({ module: 'academics', action: 'create' }, async (ctx, req) => {
  const input = await body(req, classSchema);
  const campusId = input.campusId ?? (await ctx.db.campus.findFirstOrThrow({ where: { isMain: true } })).id;
  await owned(ctx.db.campus, campusId, 'Campus');
  const sections = input.sections?.length ? [...new Set(input.sections)] : ['A'];
  const cls = await ctx.db.class.create({
    data: {
      schoolId: ctx.user.schoolId,
      campusId,
      name: input.name,
      numericOrder: input.numericOrder,
      monthlyFee: fromPaise(Math.round(input.monthlyFee * 100)),
      sections: { create: sections.map((name) => ({ schoolId: ctx.user.schoolId, name })) },
    },
  });
  await ctx.audit('CREATE', 'Class', cls.id, `${input.name} with sections ${sections.join(', ')}`);
  return cls;
});
