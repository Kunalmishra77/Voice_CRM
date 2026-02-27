import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DatePreset, DateRange, DashboardFilters } from '../types/filters';
import { getRangeFromPreset } from '../utils/dateRange';

interface DashboardFilterContextType {
  filters: DashboardFilters;
  setPreset: (preset: DatePreset) => void;
  setCustomRange: (range: DateRange) => void;
  refresh: () => void;
}

const STORAGE_KEY = 'dashboard_filters_preset';
const DEFAULT_PRESET: DatePreset = 'weekly';

const DashboardFilterContext = createContext<DashboardFilterContextType | undefined>(undefined);

export const DashboardFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<DashboardFilters>(() => {
    const savedPreset = localStorage.getItem(STORAGE_KEY) as DatePreset;
    const preset = savedPreset || DEFAULT_PRESET;
    return {
      preset,
      range: getRangeFromPreset(preset)
    };
  });

  const setPreset = useCallback((preset: DatePreset) => {
    localStorage.setItem(STORAGE_KEY, preset);
    setFilters({
      preset,
      range: getRangeFromPreset(preset)
    });
  }, []);

  const setCustomRange = useCallback((range: DateRange) => {
    setFilters({
      preset: 'custom',
      range
    });
  }, []);

  const refresh = useCallback(() => {
    if (filters.preset !== 'custom') {
      setFilters(prev => ({
        ...prev,
        range: getRangeFromPreset(prev.preset)
      }));
    }
  }, [filters.preset]);

  return (
    <DashboardFilterContext.Provider value={{ filters, setPreset, setCustomRange, refresh }}>
      {children}
    </DashboardFilterContext.Provider>
  );
};

export const useDashboardFilters = () => {
  const context = useContext(DashboardFilterContext);
  if (!context) {
    throw new Error('useDashboardFilters must be used within a DashboardFilterProvider');
  }
  return context;
};
