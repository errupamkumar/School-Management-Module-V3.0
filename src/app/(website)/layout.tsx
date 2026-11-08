import '@/website/website.css';
import { displayFont } from '@/website/fonts';
import { WebsiteMotion } from '@/website/components/motion';
import { SiteHeader } from '@/website/components/site-header';
import { SiteFooter } from '@/website/components/site-footer';
import { GoogleTag } from '@/website/components/google-tag';
import { ConsentBanner } from '@/website/components/consent-banner';

/** Public marketing website. Light or dark, following the device's theme setting (toggle in the header). */
export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${displayFont.variable} min-h-dvh bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-white`}>
      <WebsiteMotion>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <ConsentBanner />
      </WebsiteMotion>
      <GoogleTag />
    </div>
  );
}
