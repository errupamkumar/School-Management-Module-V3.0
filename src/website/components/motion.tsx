'use client';

import * as React from 'react';
import { animate, motion, MotionConfig, useInView, useReducedMotion, type Variants } from 'motion/react';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Honours the visitor's "reduce motion" setting for every animation on the website. */
export function WebsiteMotion({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Fades and lifts its children into place the first time they scroll into view. */
export function Reveal({ children, className, delay = 0, y = 24, x = 0 }: { children: React.ReactNode; className?: string; delay?: number; y?: number; x?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

const container: Variants = {
  hidden: {},
  show: (gap: number) => ({ transition: { staggerChildren: gap } }),
};
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export function Stagger({ children, className, gap = 0.07 }: { children: React.ReactNode; className?: string; gap?: number }) {
  return (
    <motion.div className={className} variants={container} custom={gap} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}

/** Counts from 0 to `to` once visible. */
export function CountUp({ to, decimals = 0, prefix = '', suffix = '', duration = 1.8 }: { to: number; decimals?: number; prefix?: string; suffix?: string; duration?: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const format = React.useCallback((v: number) => `${prefix}${v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`, [prefix, suffix, decimals]);

  React.useEffect(() => {
    const el = ref.current;
    if (!inView || !el) return;
    if (reduce) {
      el.textContent = format(to);
      return;
    }
    const controls = animate(0, to, { duration, ease: 'easeOut', onUpdate: (v) => (el.textContent = format(v)) });
    return () => controls.stop();
  }, [inView, reduce, to, duration, format]);

  return (
    <span ref={ref} className="tabular-nums">
      {format(0)}
    </span>
  );
}
