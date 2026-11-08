import { CLIENT_SCHOOLS } from '../../content/placeholder';

const TONES = ['from-indigo-500 to-violet-500', 'from-emerald-500 to-teal-500', 'from-amber-400 to-orange-500', 'from-rose-500 to-pink-500', 'from-sky-500 to-blue-600'];
const BOARDS = ['CBSE', 'ICSE', 'State Boards', 'IB', 'Cambridge', 'NIOS'];

export function TrustBar() {
  const row = [...CLIENT_SCHOOLS, ...CLIENT_SCHOOLS];
  return (
    <section className="border-y border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900 py-10" aria-label="Schools using Vidyalaya">
      <div className="web-container flex flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Trusted by progressive schools across India, for every board</p>
        <div className="flex flex-wrap justify-center gap-2">
          {BOARDS.map((b) => (
            <span key={b} className="rounded-full bg-slate-50 dark:bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-white/10">
              {b}
            </span>
          ))}
        </div>
      </div>
      <div className="web-mask-x mt-8 overflow-hidden">
        <ul className="web-marquee flex w-max gap-4">
          {row.map((s, i) => (
            <li key={`${s.mark}-${i}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.04] py-2.5 pl-2.5 pr-5" aria-hidden={i >= CLIENT_SCHOOLS.length}>
              <span className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br font-display text-sm font-extrabold text-white ${TONES[i % TONES.length]}`}>{s.mark}</span>
              <span className="text-left">
                <span className="block whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-100">{s.name}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{s.city}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
