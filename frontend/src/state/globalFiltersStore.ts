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

      setDatePreset: (preset) => {
        if (preset === 'custom') {
          set({ datePreset: 'custom' });
        } else {
          const range = getRangeFromPreset(preset);
          set({ datePreset: preset, dateRange: range });
        }
      },

      setDateRange: (range) => set({ dateRange: range, datePreset: 'custom' }),
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      setSelectedAgent: (agent) => set({ selectedAgent: agent }),
      
      setSelectedStage: (stage) => set({ selectedStage: stage }),

      resetFilters: () => set({
        datePreset: defaultPreset,
        dateRange: defaultRange,
        searchQuery: '',
        selectedAgent: null,
        selectedStage: null,
      }),
    }),
    {
      name: 'voice_crm_global_filters',
    }
  )
);
