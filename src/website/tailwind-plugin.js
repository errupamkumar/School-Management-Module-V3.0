/**
 * Component classes of the marketing website (src/website). Registered as a
 * Tailwind plugin so they sit in the components layer, *before* utilities —
 * `className="web-h2 text-white"` or `"web-btn px-7"` then behaves as expected.
 * Dark styles use `:where(.dark) &` so they keep the specificity of a single
 * class and utilities can still override them in dark mode.
 * Buttons combine the base with one variant: `web-btn web-btn-primary`.
 */
const dark = (apply) => ({ ':where(.dark) &': { [`@apply ${apply}`]: {} } });

module.exports = function websiteComponents({ addComponents }) {
  addComponents({
    '.web-container': { '@apply mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8': {} },
    '.web-text-gradient': {
      '@apply bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent': {},
      ...dark('from-indigo-400 via-violet-400 to-fuchsia-400'),
    },
    '.web-eyebrow': {
      '@apply inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700 ring-1 ring-inset ring-indigo-600/15': {},
      ...dark('bg-indigo-500/10 text-indigo-300 ring-indigo-400/20'),
    },
    '.web-h2': {
      '@apply font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]': {},
      ...dark('text-white'),
    },
    '.web-lead': { '@apply text-base leading-relaxed text-slate-600 sm:text-lg': {}, ...dark('text-slate-300') },
    '.web-card': {
      '@apply rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04),0_8px_24px_-12px_rgb(15_23_42/0.12)]': {},
      ...dark('border-white/10 bg-slate-900/70 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.6)]'),
    },
    '.web-input': {
      '@apply h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15': {},
      ...dark('border-white/10 bg-slate-950/60 text-white placeholder:text-slate-500 focus:border-indigo-400'),
    },
    '.web-btn': {
      '@apply inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-4': {},
    },
    '.web-btn-primary': {
      '@apply bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 hover:shadow-xl hover:shadow-indigo-600/30 hover:brightness-110 focus-visible:ring-indigo-500/30': {},
    },
    '.web-btn-secondary': {
      '@apply bg-white text-slate-900 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 focus-visible:ring-indigo-500/30': {},
      ...dark('bg-white/5 text-white ring-white/15 hover:bg-white/10 hover:ring-white/25'),
    },
    '.web-btn-ghost-dark': { '@apply bg-white/10 text-white ring-1 ring-inset ring-white/20 backdrop-blur hover:bg-white/15 focus-visible:ring-white/30': {} },
    '.web-btn-light': { '@apply bg-white text-indigo-700 shadow-lg shadow-black/10 hover:bg-indigo-50 focus-visible:ring-white/40': {} },
  });
};
