import React, { createContext, useContext, useState, useMemo } from 'react';
import type { CutoffHours, GlobalFilterState } from '../types/api';

interface FilterContextType extends GlobalFilterState {
  setCutoffHours: (hours: CutoffHours) => void;
  setDateRange: (start: string, end: string) => void;
  resetFilters: () => void;
}

const defaultState: GlobalFilterState = {
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  cutoffHours: 24,
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<GlobalFilterState>(defaultState);

  const setCutoffHours = (hours: CutoffHours) => {
    setFilters((prev) => ({ ...prev, cutoffHours: hours }));
  };

  const setDateRange = (start: string, end: string) => {
    setFilters((prev) => ({ ...prev, startDate: start, endDate: end }));
  };

  const resetFilters = () => {
    setFilters(defaultState);
  };

  const value = useMemo(
    () => ({
      ...filters,
      setCutoffHours,
      setDateRange,
      resetFilters,
    }),
    [filters]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

export function useGlobalFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useGlobalFilters must be used within a FilterProvider');
  }
  return context;
}
