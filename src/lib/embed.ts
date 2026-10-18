/**
 * In-app previews for shared links: Google Docs / Sheets / Slides / Forms /
 * Drive files and YouTube. Returns an embeddable https URL, or null when the
 * link is not one we know how to preview (it then opens in a new tab).
 */
export function embedUrl(raw: string | null | undefined): { src: string; kind: 'google' | 'youtube' } | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'docs.google.com') {
    const m = /^\/(document|spreadsheets|presentation)\/d\/([\w-]+)/.exec(u.pathname);
    if (m) return { src: `https://docs.google.com/${m[1]}/d/${m[2]}/${m[1] === 'presentation' ? 'embed' : 'preview'}`, kind: 'google' };
    const f = /^\/forms\/d\/e\/([\w-]+)/.exec(u.pathname);
    if (f) return { src: `https://docs.google.com/forms/d/e/${f[1]}/viewform?embedded=true`, kind: 'google' };
    return null;
  }
  if (host === 'drive.google.com') {
    const m = /^\/file\/d\/([\w-]+)/.exec(u.pathname) ?? (u.pathname === '/open' ? [null, u.searchParams.get('id')] : null);
    return m?.[1] && /^[\w-]+$/.test(m[1]) ? { src: `https://drive.google.com/file/d/${m[1]}/preview`, kind: 'google' } : null;
  }
  const yt = host === 'youtu.be' ? u.pathname.slice(1) : host === 'youtube.com' || host === 'm.youtube.com' ? (u.pathname.startsWith('/shorts/') ? u.pathname.split('/')[2] : u.searchParams.get('v')) : null;
  if (yt && /^[\w-]{6,20}$/.test(yt)) return { src: `https://www.youtube-nocookie.com/embed/${yt}`, kind: 'youtube' };
  return null;
}

/** "Google Docs", "Google Sheets"… for badges; null for other links. */
export function googleAppName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.hostname === 'docs.google.com') {
      if (u.pathname.startsWith('/document')) return 'Google Docs';
      if (u.pathname.startsWith('/spreadsheets')) return 'Google Sheets';
      if (u.pathname.startsWith('/presentation')) return 'Google Slides';
      if (u.pathname.startsWith('/forms')) return 'Google Forms';
    }
    if (u.hostname === 'drive.google.com') return 'Google Drive';
  } catch {
    // not a URL
  }
  return null;
}
