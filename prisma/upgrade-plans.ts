/**
 * Adds modules introduced after a plan was created to the plans that should
 * include them. Safe to re-run; plans without a module list (all modules) are
 * left alone.
 *
 *   npx tsx prisma/upgrade-plans.ts
 */
import { PrismaClient } from '@prisma/client';

/** module key -> plan codes that include it */
const ALL = ['STARTER', 'GROWTH', 'ENTERPRISE'];
const GROWTH_UP = ['GROWTH', 'ENTERPRISE'];
const ADDED_MODULES: Record<string, string[]> = {
  hostel: GROWTH_UP,
  // 2026-10: gap-closing modules
  gate: ALL,
  discipline: ALL,
  polls: ALL,
  gallery: ALL,
  tasks: ALL,
  documents: ALL,
  reminders: ALL,
  apps: ALL,
  online_exams: GROWTH_UP,
  discussion: GROWTH_UP,
  blog: GROWTH_UP,
  alumni: GROWTH_UP,
  placements: GROWTH_UP,
};

const prisma = new PrismaClient();

(async () => {
  const plans = await prisma.subscriptionPlan.findMany();
  for (const p of plans) {
    if (!Array.isArray(p.modules)) continue;
    const mods = p.modules as string[];
    const add = Object.entries(ADDED_MODULES)
      .filter(([key, codes]) => codes.includes(p.code) && !mods.includes(key))
      .map(([key]) => key);
    if (!add.length) continue;
    await prisma.subscriptionPlan.update({ where: { id: p.id }, data: { modules: [...mods, ...add] } });
    console.log(`${p.code}: added ${add.join(', ')}`);
  }
  console.log('Plans are up to date.');
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
