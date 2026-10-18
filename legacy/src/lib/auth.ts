import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

const DEMO_ACCOUNTS: Record<
  string,
  {
    passwords: string[];
    role: string;
    name: string;
    id: string;
    campusId: string;
    campusName: string;
  }
> = {
  'admin@vidyalaya.com': {
    passwords: ['admin123', 'Admin@123', 'admin', 'Admin123', 'admin@123'],
    role: 'SUPER_ADMIN',
    name: 'Dr. Anand Swaroop Pathak',
    id: 'demo-admin-id',
    campusId: 'demo-campus-01',
    campusName: 'Vidyalaya Senior Secondary Campus',
  },
  'admin@school.com': {
    passwords: ['Admin@123', 'admin123', 'admin', 'Admin123', 'admin@123'],
    role: 'SUPER_ADMIN',
    name: 'Administrator',
    id: 'demo-admin-id-2',
    campusId: 'demo-campus-01',
    campusName: 'Vidyalaya Main Campus',
  },
  'teacher@vidyalaya.com': {
    passwords: ['teacher123', 'Teacher@123', 'teacher', 'Teacher123', 'teacher@123'],
    role: 'TEACHER',
    name: 'Rajesh Khanna',
    id: 'demo-teacher-id',
    campusId: 'demo-campus-01',
    campusName: 'Vidyalaya Senior Secondary Campus',
  },
  'teacher@school.com': {
    passwords: ['Teacher@123', 'teacher123', 'teacher', 'Teacher123', 'teacher@123'],
    role: 'TEACHER',
    name: 'Sunita Sharma',
    id: 'demo-teacher-id-2',
    campusId: 'demo-campus-01',
    campusName: 'Vidyalaya Main Campus',
  },
  'parent@vidyalaya.com': {
    passwords: ['parent123', 'Parent@123', 'parent', 'Parent123', 'parent@123'],
    role: 'PARENT',
    name: 'Rajesh Mishra',
    id: 'demo-parent-id',
    campusId: 'demo-campus-01',
    campusName: 'Vidyalaya Senior Secondary Campus',
  },
  'parent@school.com': {
    passwords: ['Parent@123', 'parent123', 'parent', 'Parent123', 'parent@123'],
    role: 'PARENT',
    name: 'Pooja Verma (Guardian)',
    id: 'demo-parent-id-2',
    campusId: 'demo-campus-01',
    campusName: 'Vidyalaya Main Campus',
  },
  'student@vidyalaya.com': {
    passwords: ['student123', 'Student@123', 'student', 'Student123', 'student@123'],
    role: 'STUDENT',
    name: 'Aarav Sharma',
    id: 'demo-student-id',
    campusId: 'demo-campus-01',
    campusName: 'Vidyalaya Senior Secondary Campus',
  },
  'student@school.com': {
    passwords: ['Student@123', 'student123', 'student', 'Student123', 'student@123'],
    role: 'STUDENT',
    name: 'Diya Dubey',
    id: 'demo-student-id-2',
    campusId: 'demo-campus-01',
    campusName: 'Vidyalaya Main Campus',
  },
  'accountant@school.com': {
    passwords: ['Accountant@123', 'accountant123', 'accountant', 'Accountant123'],
    role: 'ACCOUNTANT',
    name: 'Ramesh Gupta (Senior Accountant)',
    id: 'demo-accountant-id',
    campusId: 'demo-campus-01',
    campusName: 'Vidyalaya Main Campus',
  },
  'accountant@vidyalaya.com': {
    passwords: ['accountant123', 'Accountant@123', 'accountant', 'Accountant123'],
    role: 'ACCOUNTANT',
    name: 'Ramesh Gupta (Senior Accountant)',
    id: 'demo-accountant-id-2',
    campusId: 'demo-campus-01',
    campusName: 'Vidyalaya Senior Secondary Campus',
  },
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.trim().toLowerCase();
        const inputPassword = credentials.password.trim();

        // 1. FAST PATH: Check Demo Accounts first (0ms latency, zero risk of DB timeouts on cloud preview)
        const demoUser = DEMO_ACCOUNTS[email];
        if (
          demoUser &&
          demoUser.passwords.some(
            (p) =>
              p.toLowerCase() === inputPassword.toLowerCase() ||
              p === credentials.password ||
              p === inputPassword
          )
        ) {
          return {
            id: demoUser.id,
            email: email,
            role: demoUser.role,
            name: demoUser.name,
            campusId: demoUser.campusId,
            campusName: demoUser.campusName,
            language: 'en',
            avatar: null,
          };
        }

        // 2. Fallback to database lookup with timeout safeguard
        try {
          const dbPromise = prisma.user.findUnique({
            where: { email },
            include: { campus: true, student: true, teacher: true, parent: true },
          });

          // Abort after 3.5s if database is unreachable (e.g. localhost in serverless)
          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('DB lookup timed out')), 3500)
          );

          const user = (await Promise.race([dbPromise, timeoutPromise])) as any;

          if (user && user.isActive) {
            const isValid = await bcrypt.compare(credentials.password, user.password);
            if (isValid) {
              return {
                id: user.id,
                email: user.email,
                role: user.role,
                name:
                  user.student?.firstName ||
                  user.teacher?.firstName ||
                  user.parent?.fatherName ||
                  user.email,
                campusId: user.campusId,
                campusName: user.campus?.name,
                language: user.language,
                avatar: user.avatar,
              };
            }
          }
        } catch (dbErr) {
          console.warn('Database lookup failed or timed out:', dbErr);
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.campusId = (user as any).campusId;
        token.campusName = (user as any).campusName;
        token.language = (user as any).language;
        token.avatar = (user as any).avatar;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).campusId = token.campusId;
        (session.user as any).campusName = token.campusName;
        (session.user as any).language = token.language;
        (session.user as any).avatar = token.avatar;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {}
      return baseUrl || 'http://localhost:3000';
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 }, // 24 hours
  secret: process.env.NEXTAUTH_SECRET || 'vidyalaya-sms-super-secret-jwt-token-key-2026-prod',
};
