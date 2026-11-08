import '@/website/website.css';
import { displayFont } from '@/website/fonts';
import { WebsiteMotion } from '@/website/components/motion';
import { AuthShell } from '@/website/components/auth-shell';

/** Sign-in (/login) and sign-up (/get-started), styled like the public website. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${displayFont.variable} antialiased`}>
      <WebsiteMotion>
        <AuthShell>{children}</AuthShell>
      </WebsiteMotion>
    </div>
  );
}
