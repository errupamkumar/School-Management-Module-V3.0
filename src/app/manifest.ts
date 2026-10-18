import type { MetadataRoute } from 'next';

/** Installable app (Android, iOS, desktop). Opens straight to the user's dashboard. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/dashboard',
    name: 'Vidyalaya — School ERP',
    short_name: 'Vidyalaya',
    description: 'Attendance, homework, fees, results and school messages for staff, parents and students.',
    start_url: '/dashboard?source=app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8fafc',
    theme_color: '#4f46e5',
    categories: ['education', 'productivity'],
    lang: 'en-IN',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Attendance', url: '/attendance', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Fees', url: '/fees', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Notifications', url: '/notifications', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
