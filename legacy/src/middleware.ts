import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const ROLE_LANDING_PAGES: Record<string, string> = {
  SUPER_ADMIN: '/dashboard/admin',
  ADMIN: '/dashboard/admin',
  TEACHER: '/dashboard/teacher',
  ACCOUNTANT: '/fees/collect',
  PARENT: '/dashboard/parent',
  STUDENT: '/dashboard/student',
};

const ROUTE_PERMISSIONS: Array<{ prefix: string; roles: string[] }> = [
  { prefix: '/dashboard/admin', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { prefix: '/dashboard/teacher', roles: ['TEACHER'] },
  { prefix: '/dashboard/parent', roles: ['PARENT'] },
  { prefix: '/dashboard/student', roles: ['STUDENT'] },
  { prefix: '/fees/collect', roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'] },
  { prefix: '/fees/structure', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { prefix: '/fees/report', roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'] },
  { prefix: '/fees/dues', roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'] },
  { prefix: '/fees/my-dues', roles: ['STUDENT', 'PARENT', 'SUPER_ADMIN', 'ADMIN'] },
  { prefix: '/fees', roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'STUDENT', 'PARENT'] },
  { prefix: '/accounting', roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'] },
  { prefix: '/salary', roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'] },
  { prefix: '/attendance', roles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER'] },
  { prefix: '/exams', roles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER'] },
  { prefix: '/students', roles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER'] },
  { prefix: '/staff', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { prefix: '/admission', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { prefix: '/classes', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { prefix: '/subjects', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { prefix: '/campus', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { prefix: '/settings', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { prefix: '/inventory', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { prefix: '/idcard', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { prefix: '/biometric', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { prefix: '/certification', roles: ['SUPER_ADMIN', 'ADMIN'] },
];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const role = (token?.role as string) || '';

    // 1. API Route Protection (exclude auth callbacks, csrf & public admission portal)
    if (path.startsWith('/api/') && !path.startsWith('/api/auth') && !path.startsWith('/api/admission/public')) {
      if (!token) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Authentication required' },
          { status: 401 }
        );
      }
      return NextResponse.next();
    }

    // 2. Strict Role-Based Access Control for Pages
    for (const rule of ROUTE_PERMISSIONS) {
      if (path.startsWith(rule.prefix)) {
        if (!rule.roles.includes(role)) {
          const userHome = ROLE_LANDING_PAGES[role] || '/login';
          return NextResponse.redirect(new URL(userHome, req.url));
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow API routes to reach middleware function so unauthenticated calls return JSON 401
        if (req.nextUrl.pathname.startsWith('/api/')) {
          return true;
        }
        return !!token;
      },
    },
    secret: process.env.NEXTAUTH_SECRET || 'vidyalaya-sms-super-secret-jwt-token-key-2026-prod',
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admission/:path*',
    '/students/:path*',
    '/staff/:path*',
    '/attendance/:path*',
    '/fees/:path*',
    '/exams/:path*',
    '/timetable/:path*',
    '/accounting/:path*',
    '/salary/:path*',
    '/notices/:path*',
    '/classes/:path*',
    '/subjects/:path*',
    '/homework/:path*',
    '/online-class/:path*',
    '/transport/:path*',
    '/leave/:path*',
    '/inventory/:path*',
    '/idcard/:path*',
    '/reports/:path*',
    '/campus/:path*',
    '/settings/:path*',
    '/biometric/:path*',
    '/certification/:path*',
    '/api/:path*',
  ],
};
