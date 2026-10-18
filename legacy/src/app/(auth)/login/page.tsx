'use client';
import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// Login page for Vidyalaya
export default function LoginPage() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const getRedirectUrl = (roleName?: string) => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const callback = params.get('callbackUrl');
      if (callback && !callback.includes('/login')) {
        return callback;
      }
    }
    const roleRoutes: Record<string, string> = {
      admin: '/dashboard/admin',
      SUPER_ADMIN: '/dashboard/admin',
      ADMIN: '/dashboard/admin',
      teacher: '/dashboard/teacher',
      TEACHER: '/dashboard/teacher',
      parent: '/dashboard/parent',
      PARENT: '/dashboard/parent',
      student: '/dashboard/student',
      STUDENT: '/dashboard/student',
      accountant: '/fees/collect',
      ACCOUNTANT: '/fees/collect',
    };
    if (roleName && roleRoutes[roleName]) {
      return roleRoutes[roleName];
    }
    return '/';
  };

  // If already logged in, redirect directly to callbackUrl or role dashboard
  useEffect(() => {
    if (status === 'authenticated') {
      const target = getRedirectUrl((session?.user as any)?.role);
      window.location.href = target;
    }
  }, [status, session]);

  const executeSignIn = async (userEmail: string, userPass: string, roleName?: string) => {
    const cleanEmail = userEmail.trim();
    const cleanPassword = userPass.trim();

    if (!cleanEmail || !cleanPassword) {
      toast.error('Please enter both email and password.');
      return;
    }

    setLoading(true);
    if (roleName) setLoadingRole(roleName);

    try {
      const targetUrl = getRedirectUrl(roleName);
      const fullCallbackUrl = typeof window !== 'undefined'
        ? (targetUrl.startsWith('http') ? targetUrl : `${window.location.origin}${targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`}`)
        : targetUrl;

      const result = await signIn('credentials', {
        email: cleanEmail,
        password: cleanPassword,
        redirect: false,
        callbackUrl: fullCallbackUrl,
      });

      if (result?.error) {
        console.error('Sign-in failed:', result.error);
        toast.error('Invalid email or password');
      } else {
        toast.success('Login successful! Redirecting...');
        // Full page navigation ensures session cookies are recognized and cache is refreshed
        window.location.href = targetUrl;
      }
    } catch (err: any) {
      console.error('Sign-in exception:', err);
      toast.error(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setLoadingRole(null);
    }
  };

  const handleDemoLogin = (demoEmail: string, demoPass: string, roleName: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    executeSignIn(demoEmail, demoPass, roleName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSignIn(email, password);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-accent-500/20 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-3">विद्यालय</h1>
            <h2 className="text-2xl font-light opacity-90">Vidyalaya</h2>
          </div>
          <p className="text-lg opacity-80 leading-relaxed max-w-md">
            Complete School Management System designed for Indian schools. Manage admissions, fees, attendance, exams, and more — all in one place.
          </p>
          <div className="mt-12 flex gap-8">
            <div><div className="text-3xl font-bold">30+</div><div className="text-sm opacity-70">Modules</div></div>
            <div><div className="text-3xl font-bold">Hindi</div><div className="text-sm opacity-70">& English</div></div>
            <div><div className="text-3xl font-bold">100%</div><div className="text-sm opacity-70">Secure</div></div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-3.5 py-6 sm:px-6 sm:py-12 bg-gray-50 dark:bg-slate-950">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-6 sm:mb-8">
            <h1 className="text-3xl font-bold text-primary-700">विद्यालय</h1>
            <p className="text-gray-500 mt-1 text-sm">School Management System</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-slate-800 p-5 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Welcome Back</h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-6 sm:mb-8">Sign in to your account to continue</p>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label className="form-label text-xs sm:text-sm">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input py-2.5 text-sm"
                  placeholder="admin@vidyalaya.com"
                  required
                />
              </div>

              <div>
                <label className="form-label text-xs sm:text-sm">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input py-2.5 pr-10 text-sm"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <span className="text-gray-600 dark:text-gray-300">Remember me</span>
                </label>
                <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">Forgot password?</a>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-sm font-semibold">
                {loading && !loadingRole ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* 1-Click Instant Login Grid */}
            <div className="mt-6 p-3.5 sm:p-4 bg-blue-50/80 dark:bg-slate-800/60 border border-blue-200/80 dark:border-slate-700 rounded-xl">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-bold text-blue-950 dark:text-blue-200 uppercase tracking-wide">
                  ⚡ 1-Click Instant Demo Login:
                </p>
                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">
                  Instant
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin('admin@vidyalaya.com', 'admin123', 'admin')}
                  className="text-left p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/80 dark:hover:bg-slate-700/80 transition-all text-xs shadow-sm hover:shadow disabled:opacity-50 group"
                >
                  <div className="font-semibold text-gray-900 group-hover:text-blue-700 flex items-center justify-between">
                    <span>👑 Admin</span>
                    {loadingRole === 'admin' ? (
                      <span className="text-[10px] text-blue-600 animate-pulse">Signing in...</span>
                    ) : (
                      <span className="text-[10px] text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Login →</span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">admin@vidyalaya.com</div>
                  <div className="text-[10px] text-gray-400">Pass: admin123</div>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin('teacher@vidyalaya.com', 'teacher123', 'teacher')}
                  className="text-left p-2.5 rounded-lg bg-white border border-blue-200 hover:border-blue-500 hover:bg-blue-50/80 transition-all text-xs shadow-sm hover:shadow disabled:opacity-50 group"
                >
                  <div className="font-semibold text-gray-900 group-hover:text-blue-700 flex items-center justify-between">
                    <span>👨‍🏫 Teacher</span>
                    {loadingRole === 'teacher' ? (
                      <span className="text-[10px] text-blue-600 animate-pulse">Signing in...</span>
                    ) : (
                      <span className="text-[10px] text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Login →</span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">teacher@vidyalaya.com</div>
                  <div className="text-[10px] text-gray-400">Pass: teacher123</div>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin('parent@vidyalaya.com', 'parent123', 'parent')}
                  className="text-left p-2.5 rounded-lg bg-white border border-blue-200 hover:border-blue-500 hover:bg-blue-50/80 transition-all text-xs shadow-sm hover:shadow disabled:opacity-50 group"
                >
                  <div className="font-semibold text-gray-900 group-hover:text-blue-700 flex items-center justify-between">
                    <span>👨‍👩‍👦 Parent</span>
                    {loadingRole === 'parent' ? (
                      <span className="text-[10px] text-blue-600 animate-pulse">Signing in...</span>
                    ) : (
                      <span className="text-[10px] text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Login →</span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">parent@vidyalaya.com</div>
                  <div className="text-[10px] text-gray-400">Pass: parent123</div>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin('student@school.com', 'Student@123', 'student')}
                  className="text-left p-2.5 rounded-lg bg-white border border-blue-200 hover:border-blue-500 hover:bg-blue-50/80 transition-all text-xs shadow-sm hover:shadow disabled:opacity-50 group"
                >
                  <div className="font-semibold text-gray-900 group-hover:text-blue-700 flex items-center justify-between">
                    <span>🎓 Student</span>
                    {loadingRole === 'student' ? (
                      <span className="text-[10px] text-blue-600 animate-pulse">Signing in...</span>
                    ) : (
                      <span className="text-[10px] text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Login →</span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">student@school.com</div>
                  <div className="text-[10px] text-gray-400">Pass: Student@123</div>
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">© 2026 Vidyalaya School Management System. All rights reserved.</p>

          <div className="flex items-center justify-center gap-2 mt-3 pb-4">
            <span className="text-xs text-gray-400 font-medium">Powered by</span>
            <img src="/srm-eco-tech.png" alt="SRM ECO TECH" className="h-5 w-auto object-contain bg-white/90 rounded px-1.5 py-0.5 shadow-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
