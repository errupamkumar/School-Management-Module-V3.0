'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export interface CampusItem {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
}

interface CampusContextType {
  campuses: CampusItem[];
  selectedCampusId: string;
  selectedCampus: CampusItem | null;
  setSelectedCampusId: (id: string) => void;
  isAllCampuses: boolean;
  loading: boolean;
  refreshCampuses: () => Promise<void>;
}

const CampusContext = createContext<CampusContextType | undefined>(undefined);

export function CampusProvider({ children }: { children: React.ReactNode }) {
  const [campuses, setCampuses] = useState<CampusItem[]>([]);
  const [selectedCampusId, setSelectedCampusIdState] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // Load available campuses from API
  const fetchCampuses = useCallback(async () => {
    try {
      const res = await fetch('/api/campus');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCampuses(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch campuses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampuses();
  }, [fetchCampuses]);

  // Initialize selected campus from localStorage or URL parameter
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlCampus = urlParams.get('campusId');
        if (urlCampus) {
          setSelectedCampusIdState(urlCampus);
          localStorage.setItem('vidyalaya-selected-campus-id', urlCampus);
          return;
        }

        const savedCampus = localStorage.getItem('vidyalaya-selected-campus-id');
        if (savedCampus) {
          setSelectedCampusIdState(savedCampus);
        }
      }
    } catch (e) {
      // Ignore storage access errors
    }
  }, []);

  const setSelectedCampusId = useCallback((id: string) => {
    setSelectedCampusIdState(id);
    try {
      localStorage.setItem('vidyalaya-selected-campus-id', id);
      // Synchronize URL search params if relevant
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (id && id !== 'ALL') {
          url.searchParams.set('campusId', id);
        } else {
          url.searchParams.delete('campusId');
        }
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  const selectedCampus = campuses.find((c) => c.id === selectedCampusId) || null;
  const isAllCampuses = selectedCampusId === 'ALL' || !selectedCampusId;

  return (
    <CampusContext.Provider
      value={{
        campuses,
        selectedCampusId,
        selectedCampus,
        setSelectedCampusId,
        isAllCampuses,
        loading,
        refreshCampuses: fetchCampuses,
      }}
    >
      {children}
    </CampusContext.Provider>
  );
}

export function useCampus() {
  const context = useContext(CampusContext);
  if (!context) {
    throw new Error('useCampus must be used within a CampusProvider');
  }
  return context;
}
