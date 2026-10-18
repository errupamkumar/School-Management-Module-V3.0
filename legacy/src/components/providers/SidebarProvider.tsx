'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface SidebarContextType {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  openMenus: string[];
  setOpenMenus: React.Dispatch<React.SetStateAction<string[]>>;
  toggleMenu: (title: string) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const pathname = usePathname();

  // Load persisted desktop collapsed state and open menus if available
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem('vidyalaya-sidebar-collapsed');
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === 'true');
      }

      const savedOpenMenus = localStorage.getItem('vidyalaya-sidebar-open-menus');
      if (savedOpenMenus) {
        const parsed = JSON.parse(savedOpenMenus);
        if (Array.isArray(parsed)) {
          setOpenMenus(parsed);
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => {
      const next = prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title];
      try {
        localStorage.setItem('vidyalaya-sidebar-open-menus', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Close mobile drawer automatically when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Handle ESC key to dismiss mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen]);

  // Lock background scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const toggleMobile = () => setIsMobileOpen((prev) => !prev);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vidyalaya-sidebar-collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  return (
    <SidebarContext.Provider
      value={{
        isMobileOpen,
        setIsMobileOpen,
        toggleMobile,
        isCollapsed,
        setIsCollapsed,
        toggleCollapsed,
        openMenus,
        setOpenMenus,
        toggleMenu,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
