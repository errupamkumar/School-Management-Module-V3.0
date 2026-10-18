'use client';

import Sidebar from '@/components/layouts/Sidebar';
import Header from '@/components/layouts/Header';
import { SidebarProvider, useSidebar } from '@/components/providers/SidebarProvider';
import { cn } from '@/utils/helpers';

function DashboardInnerLayout({ children }: { children: React.ReactNode }) {
  const { isMobileOpen, setIsMobileOpen, isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200 relative overflow-x-hidden">
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Responsive Sidebar (Mobile Drawer + Desktop Fixed) */}
      <Sidebar />

      {/* Main Content Area: Responsive margins for mobile (0) vs desktop (64 or 68px) */}
      <div
        className={cn(
          'flex flex-col min-h-screen w-full min-w-0 transition-all duration-300 ease-in-out',
          isCollapsed ? 'lg:pl-[68px]' : 'lg:pl-64',
          'pl-0'
        )}
      >
        <Header />
        <main className="flex-1 p-3 sm:p-5 md:p-6 w-full min-w-0 max-w-full overflow-x-hidden transition-all duration-200">
          {children}
        </main>
        <footer className="px-4 py-3 sm:py-4 border-t border-gray-100 dark:border-slate-800 text-center flex flex-wrap items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>© 2026 Vidyalaya School Management System</span>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Powered by</span>
            <img src="/srm-eco-tech.png" alt="SRM ECO TECH" className="h-4 sm:h-5 w-auto object-contain bg-white/95 rounded px-1 py-0.5 shadow-sm" />
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardInnerLayout>{children}</DashboardInnerLayout>
    </SidebarProvider>
  );
}
