import { route } from '@/server/api';

/** School letterhead details for printed documents (any signed-in user of the school). */
export const GET = route({ authenticated: true }, async (ctx) =>
  ctx.db.school.findUniqueOrThrow({
    where: { id: ctx.user.schoolId },
    select: { name: true, logoUrl: true, tagline: true, address: true, city: true, district: true, state: true, pincode: true, phone: true, email: true, website: true, affiliationNo: true, board: true, udiseCode: true, establishedYear: true },
  })
);
