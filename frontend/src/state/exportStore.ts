import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ExportJob {
  id: string;
  timestamp: string;
  format: 'CSV' | 'XLSX' | 'PDF';
  count: number;
  status: 'COMPLETED' | 'FAILED';
  filename: string;
}

interface ExportStore {
  history: ExportJob[];
  addJob: (job: Omit<ExportJob, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
}

export const useExportStore = create<ExportStore>()(
  persist(
    (set) => ({
      history: [],
      addJob: (job) => set((state) => ({
        history: [
          {
            ...job,
            id: `job_${Date.now()}`,
            timestamp: new Date().toISOString()
          },
          ...state.history
        ].slice(0, 10) // Keep last 10
      })),
      clearHistory: () => set({ history: [] })
    }),
    {
      name: 'voice_crm_export_history',
    }
  )
);
