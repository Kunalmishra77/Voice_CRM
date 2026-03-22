import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DatePreset, DateRange } from '../utils/dateRange';
import { getRangeFromPreset } from '../utils/dateRange';

interface GlobalFiltersState {
  datePreset: DatePreset;
  dateRange: DateRange;
  searchQuery: string;
  selectedAgent: string | null;
  selectedStage: string | null;
  lastUpdated: number; // Added to force refresh
  
  // Actions
  setDatePreset: (preset: DatePreset) => void;
  setDateRange: (range: DateRange) => void;
  setSearchQuery: (query: string) => void;
  setSelectedAgent: (agent: string | null) => void;
  setSelectedStage: (stage: string | null) => void;
  resetFilters: () => void;
}

const defaultPreset: DatePreset = 'weekly';
const defaultRange = getRangeFromPreset(defaultPreset);

export const useGlobalFilters = create<GlobalFiltersState>()(
  persist(
    (set) => ({
      datePreset: defaultPreset,
      dateRange: defaultRange,
      searchQuery: '',
      selectedAgent: null,
      selectedStage: null,
      lastUpdated: Date.now(),

      setDatePreset: (preset) => {
        if (preset === 'custom') {
          set({ datePreset: 'custom', lastUpdated: Date.now() });
        } else {
          const range = getRangeFromPreset(preset);
          set({ datePreset: preset, dateRange: range, lastUpdated: Date.now() });
        }
      },

      setDateRange: (range) => set({ dateRange: range, datePreset: 'custom', lastUpdated: Date.now() }),
      
      setSearchQuery: (query) => set({ searchQuery: query, lastUpdated: Date.now() }),
      
      setSelectedAgent: (agent) => set({ selectedAgent: agent, lastUpdated: Date.now() }),
      
      setSelectedStage: (stage) => set({ selectedStage: stage, lastUpdated: Date.now() }),

      resetFilters: () => set({
        datePreset: defaultPreset,
        dateRange: defaultRange,
        searchQuery: '',
        selectedAgent: null,
        selectedStage: null,
        lastUpdated: Date.now(),
      }),
    }),
    {
      name: 'voice_crm_global_filters',
    }
  )
);
