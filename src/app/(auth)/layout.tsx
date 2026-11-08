import '@/website/website.css';
import { displayFont } from '@/website/fonts';
import { WebsiteMotion } from '@/website/components/motion';
import { AuthShell } from '@/website/components/auth-shell';
import { GoogleTag } from '@/website/components/google-tag';
import { ConsentBanner } from '@/website/components/consent-banner';

/** Sign-in (/login) and sign-up (/get-started), styled like the public website. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${displayFont.variable} antialiased`}>
      <WebsiteMotion>
        <AuthShell>{children}</AuthShell>
        <ConsentBanner />
      </WebsiteMotion>
      <GoogleTag />
    </div>
  );
}
