'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { getMenuForRole } from '@/lib/navigation';
import { cn } from '@/utils/helpers';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useSidebar } from '@/components/providers/SidebarProvider';
import * as Icons from 'lucide-react';

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { isMobileOpen, setIsMobileOpen, isCollapsed, toggleCollapsed, openMenus, setOpenMenus, toggleMenu } = useSidebar();
  const { lang } = useLanguage();

  const role = (session?.user as any)?.role || 'ADMIN';
  const menuItems = getMenuForRole(role);

  // Automatically keep parent menus expanded when active route is within them
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.children && item.children.length > 0) {
        const matchesChild = item.children.some(
          (child) => pathname === child.href || pathname.startsWith(child.href + '/')
        );
        if (matchesChild && !openMenus.includes(item.title)) {
          setOpenMenus((prev) => (prev.includes(item.title) ? prev : [...prev, item.title]));
        }
      }
    });
  }, [pathname, menuItems, openMenus, setOpenMenus]);

  const getIcon = (iconName: string) => {
    const Icon = (Icons as any)[iconName];
    return Icon ? <Icon size={20} /> : <Icons.Circle size={20} />;
  };

  const handleLinkClick = () => {
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <aside
      aria-label="Main sidebar navigation"
      className={cn(
        'fixed left-0 top-0 h-screen h-[100dvh] bg-sidebar-bg text-white z-50 flex flex-col transition-all duration-300 ease-in-out',
        // Mobile drawer positioning & transitions: strictly invisible and pointer-events-none when closed
        isMobileOpen
          ? 'translate-x-0 shadow-2xl pointer-events-auto visible'
          : '-translate-x-full lg:translate-x-0 pointer-events-none lg:pointer-events-auto invisible lg:visible',
        // Desktop widths vs Mobile widths
        'w-72 sm:w-80',
        isCollapsed ? 'lg:w-[68px]' : 'lg:w-64'
      )}
    >
      {/* Sidebar Header / Logo */}
      <div className="flex items-center gap-3 px-4 py-4 sm:py-5 border-b border-white/10 flex-shrink-0">
        <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
          <Icons.GraduationCap size={20} className="text-white" />
        </div>

        {/* Text Title (Shown on mobile or when desktop is expanded) */}
        <div className={cn('overflow-hidden flex-1', isCollapsed && 'lg:hidden')}>
          <h1 className="text-lg font-bold tracking-tight text-white leading-tight">विद्यालय</h1>
          <p className="text-[10px] text-sidebar-text -mt-0.5">School Management</p>
        </div>

        {/* Desktop Collapse / Expand Toggle */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden lg:flex p-1.5 hover:bg-sidebar-hover rounded-lg transition-colors text-sidebar-text hover:text-white ml-auto"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <Icons.ChevronRight size={16} /> : <Icons.ChevronLeft size={16} />}
        </button>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-1.5 hover:bg-sidebar-hover rounded-lg transition-colors text-sidebar-text hover:text-white ml-auto focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label="Close navigation menu"
        >
          <Icons.X size={20} />
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 touch-scroll">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const isOpen = openMenus.includes(item.title);
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.title + item.href}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleMenu(item.title)}
                  className={cn(
                    'sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-sidebar-active text-white'
                      : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
                  )}
                  aria-expanded={isOpen}
                >
                  <span className="flex-shrink-0">{getIcon(item.icon)}</span>
                  <div className={cn('flex items-center justify-between flex-1 min-w-0', isCollapsed && 'lg:hidden')}>
                    <span className="text-left truncate">{lang === 'hi' ? item.titleHi : item.title}</span>
                    <Icons.ChevronDown
                      size={14}
                      className={cn('transition-transform flex-shrink-0 ml-1', isOpen && 'rotate-180')}
                    />
                  </div>
                </button>
              ) : (
                <Link
                  href={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    'sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-primary-600/90 text-white shadow-lg shadow-primary-600/20 font-semibold'
                      : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
                  )}
                >
                  <span className="flex-shrink-0">{getIcon(item.icon)}</span>
                  <span className={cn('truncate', isCollapsed && 'lg:hidden')}>
                    {lang === 'hi' ? item.titleHi : item.title}
                  </span>
                </Link>
              )}

              {/* Submenu */}
              {hasChildren && isOpen && (
                <div
                  className={cn(
                    'mt-0.5 space-y-0.5 border-l border-white/10 pl-3',
                    isCollapsed ? 'ml-2 lg:hidden' : 'ml-4'
                  )}
                >
                  {item.children!.map((child) => {
                    const childActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={handleLinkClick}
                        className={cn(
                          'sidebar-item flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors',
                          childActive
                            ? 'bg-sidebar-active text-white font-semibold'
                            : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
                        )}
                      >
                        <span className="flex-shrink-0">{getIcon(child.icon)}</span>
                        <span className="truncate">{lang === 'hi' ? child.titleHi : child.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User / Logout & Powered By */}
      <div className="border-t border-white/10 p-3 flex-shrink-0 bg-sidebar-bg space-y-2">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400/20"
        >
          <span className="flex-shrink-0"><Icons.LogOut size={18} /></span>
          <span className={cn('truncate', isCollapsed && 'lg:hidden')}>
            {lang === 'hi' ? 'लॉग आउट' : 'Logout'}
          </span>
        </button>

        {/* Powered By SRM ECO TECH */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-center">
          {!isCollapsed ? (
            <div className="flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Powered by</span>
              <img src="/srm-eco-tech.png" alt="SRM ECO TECH" className="h-4 sm:h-5 w-auto object-contain bg-white/95 rounded px-1 py-0.5 shadow-sm" />
            </div>
          ) : (
            <div className="hidden lg:flex items-center justify-center" title="Powered by SRM ECO TECH">
              <img src="/srm-eco-tech.png" alt="SRM ECO TECH" className="h-3.5 w-auto object-contain bg-white/95 rounded px-0.5" />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
