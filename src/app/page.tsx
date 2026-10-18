import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; mustChangePassword?: boolean } | undefined;
  if (!user) redirect('/login');
  if (user.mustChangePassword) redirect('/change-password');
  redirect(user.role === 'PLATFORM_ADMIN' ? '/platform' : '/dashboard');
}
