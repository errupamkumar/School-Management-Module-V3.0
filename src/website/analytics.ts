/**
 * Marketing measurement for the public website and sign-up pages only — never
 * loaded inside the school app. Everything is off until the IDs are set:
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID      GA4 web stream, e.g. G-XXXXXXXXXX
 *   NEXT_PUBLIC_GOOGLE_ADS_ID          Google Ads tag, e.g. AW-123456789
 *   NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL  label of the "Website lead" conversion action
 * Google tags respect Consent Mode v2: storage is denied until the visitor accepts.
 */

// IDs are written into an inline script, so anything that is not a plain tag ID is ignored.
const tagId = (v: string | undefined, prefix: RegExp) => (v && prefix.test(v.trim()) ? v.trim() : '');
export const GA_ID = tagId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, /^G-[A-Z0-9]{4,20}$/i);
export const ADS_ID = tagId(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID, /^AW-\d{6,15}$/i);
export const ADS_LEAD_LABEL = tagId(process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL, /^[A-Za-z0-9_-]{4,40}$/);
export const TRACKING_ENABLED = Boolean(GA_ID || ADS_ID);

export const CONSENT_KEY = 'vidyalaya-consent';
export const CONSENT_EVENT = 'vidyalaya:open-consent';
const ATTRIBUTION_KEY = 'vidyalaya-attribution';
const ATTRIBUTION_DAYS = 90;

type Gtag = (...args: unknown[]) => void;
const gtag = (): Gtag | undefined => (typeof window === 'undefined' ? undefined : (window as unknown as { gtag?: Gtag }).gtag);

export function track(event: string, params: Record<string, unknown> = {}) {
  gtag()?.('event', event, params);
}

export function setConsent(granted: boolean) {
  const v = granted ? 'granted' : 'denied';
  gtag()?.('consent', 'update', { ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v });
  try {
    localStorage.setItem(CONSENT_KEY, v);
  } catch {
    // storage unavailable
  }
}

/** Fired once a sign-up request has been saved: GA4 key event + Google Ads conversion. */
export function trackLead(interest: 'trial' | 'demo') {
  track('generate_lead', { lead_type: interest });
  if (ADS_ID && ADS_LEAD_LABEL) track('conversion', { send_to: `${ADS_ID}/${ADS_LEAD_LABEL}` });
}

// --------------------------------------------------------------------------
// First-party attribution: which ad, campaign or page brought this visitor.
// Kept in the visitor's browser and sent only with the sign-up form.
// --------------------------------------------------------------------------

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  landing?: string;
  referrer?: string;
  first_seen?: string;
}

const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid'] as const;

export function readAttribution(): Attribution | undefined {
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return undefined;
    const a = JSON.parse(raw) as Attribution;
    if (a.first_seen && Date.now() - Date.parse(a.first_seen) > ATTRIBUTION_DAYS * 86400_000) return undefined;
    return a;
  } catch {
    return undefined;
  }
}

/** Records the landing page; a new ad click or campaign link replaces older attribution. */
export function captureAttribution() {
  try {
    const url = new URL(window.location.href);
    const tagged = PARAMS.some((p) => url.searchParams.get(p));
    if (!tagged && readAttribution()) return;
    const a: Attribution = { landing: `${url.pathname}${url.search}`.slice(0, 300), first_seen: new Date().toISOString() };
    for (const p of PARAMS) {
      const v = url.searchParams.get(p);
      if (v) a[p] = v.slice(0, 200);
    }
    if (document.referrer) {
      const ref = new URL(document.referrer);
      if (ref.host !== url.host) a.referrer = `${ref.origin}${ref.pathname}`.slice(0, 300);
    }
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(a));
  } catch {
    // storage unavailable or malformed URL
  }
}
