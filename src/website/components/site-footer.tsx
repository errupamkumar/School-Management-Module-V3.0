import Link from 'next/link';
import { Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { CATEGORIES, FACTS, FOOTER, SITE } from '../content/site';
import { featuresIn } from '../content/features';
import { COMPANY, telHref } from '../content/company';
import { Logo } from './logo';
import { PoweredBy } from './powered-by';
import { CookieSettingsButton } from './consent-banner';

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-slate-950 text-slate-300 dark:border-t dark:border-white/10">
      <div className="web-grid-bg-dark web-mask-fade pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" aria-hidden="true" />
      <div className="web-container relative py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Logo dark />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-400">{SITE.description}</p>
            <address className="mt-6 space-y-3 text-sm not-italic">
              <p className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-indigo-300" />
                <span>
                  <span className="block font-semibold text-white">{COMPANY.legalName}</span>
                  {COMPANY.address.map((line) => (
                    <span key={line} className="block text-slate-400">
                      {line}
                    </span>
                  ))}
                </span>
              </p>
              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <Phone className="size-4 shrink-0 text-indigo-300" />
                {COMPANY.phones.map((phone, i) => (
                  <span key={phone} className="flex items-center gap-2.5">
                    {i > 0 && <span className="text-slate-600">·</span>}
                    <a href={telHref(phone)} className="transition hover:text-white">
                      {phone}
                    </a>
                  </span>
                ))}
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0 text-indigo-300" />
                <a href={`mailto:${COMPANY.email}`} className="transition hover:text-white">
                  {COMPANY.email}
                </a>
              </p>
            </address>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {FOOTER.map((group) => (
              <div key={group.title}>
                <p className="text-sm font-semibold text-white">{group.title}</p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {group.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-slate-400 transition hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 grid gap-6 border-t border-white/10 pt-10 sm:grid-cols-2 lg:grid-cols-6">
          {CATEGORIES.map((c) => (
            <div key={c.key}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{c.label}</p>
              <ul className="mt-3 space-y-1.5 text-[13px]">
                {featuresIn(c.key).map((f) => (
                  <li key={f.slug}>
                    <Link href={`/features/${f.slug}`} className="text-slate-400 transition hover:text-indigo-200">
                      {f.short}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 text-xs text-slate-500 dark:text-slate-400 lg:flex-row lg:items-center lg:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.product}. {FACTS.modules} modules · {FACTS.languages} languages · Made in India for Indian schools.
          </p>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Legal">
            <Link href="/privacy" className="transition hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms of Use
            </Link>
            <CookieSettingsButton className="transition hover:text-white" />
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-400" /> Data hosted in India · DPDP Act 2023 ready
            </span>
          </nav>
          <PoweredBy />
        </div>
      </div>
    </footer>
  );
}
