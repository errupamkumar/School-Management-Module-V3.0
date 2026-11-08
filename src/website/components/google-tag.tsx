'use client';

import * as React from 'react';
import Script from 'next/script';
import { ADS_ID, CONSENT_KEY, GA_ID, TRACKING_ENABLED, captureAttribution, track } from '../analytics';

const PRIMARY_ID = GA_ID || ADS_ID;

// Consent Mode v2: everything denied until the visitor accepts in the cookie banner.
const BOOTSTRAP = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
try{if(localStorage.getItem('${CONSENT_KEY}')==='granted'){gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'})}}catch(e){}
gtag('js',new Date());${GA_ID ? `gtag('config','${GA_ID}');` : ''}${ADS_ID ? `gtag('config','${ADS_ID}');` : ''}`;

/** Where a click goes, for CTA and contact events. */
function describe(el: HTMLAnchorElement | HTMLButtonElement) {
  const label = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const href = el instanceof HTMLAnchorElement ? el.getAttribute('href') || '' : '';
  return { label, href };
}

/**
 * Google tag (GA4 + Google Ads) for the website and sign-up pages, plus first-party
 * attribution capture (which works even when no tag is configured).
 */
export function GoogleTag() {
  React.useEffect(() => {
    captureAttribution();
    if (!TRACKING_ENABLED) return;
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest('a, button') as HTMLAnchorElement | HTMLButtonElement | null;
      if (!el) return;
      const { label, href } = describe(el);
      if (href.startsWith('tel:')) track('contact_click', { method: 'phone', label });
      else if (href.startsWith('mailto:')) track('contact_click', { method: 'email', label });
      else if (href.includes('/get-started')) track('cta_click', { cta: label, destination: href, page: location.pathname });
      else if (href === '/login') track('login_click', { label, page: location.pathname });
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  if (!PRIMARY_ID) return null;
  return (
    <>
      <Script id="google-tag-bootstrap" strategy="afterInteractive">
        {BOOTSTRAP}
      </Script>
      <Script id="google-tag" src={`https://www.googletagmanager.com/gtag/js?id=${PRIMARY_ID}`} strategy="afterInteractive" />
    </>
  );
}
