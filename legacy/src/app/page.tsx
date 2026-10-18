import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  try {
    const session = await getServerSession(authOptions);
    if (session) {
      const role = (session.user as any).role;
      const dashMap: Record<string, string> = {
        SUPER_ADMIN: '/dashboard/admin',
        ADMIN: '/dashboard/admin',
        TEACHER: '/dashboard/teacher',
        PARENT: '/dashboard/parent',
        STUDENT: '/dashboard/student',
        ACCOUNTANT: '/fees/collect',
      };
      redirect(dashMap[role] || '/dashboard/admin');
    }
  } catch (error) {
    if ((error as any)?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    if ((error as any)?.digest !== 'DYNAMIC_SERVER_USAGE') {
      console.error('Session retrieval error on HomePage:', error);
    }
  }
  redirect('/login');
}
