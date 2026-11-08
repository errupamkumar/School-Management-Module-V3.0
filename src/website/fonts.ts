import { Plus_Jakarta_Sans } from 'next/font/google';

/** Headline face of the website and the sign-in / sign-up pages (Tailwind `font-display`). */
export const displayFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-display', display: 'swap' });
