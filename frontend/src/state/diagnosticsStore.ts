import { create } from 'zustand';

interface DiagnosticError {
  id: string;
  type: 'env' | 'auth' | 'db' | 'network';
  table?: string;
  action?: string;
  status?: number;
  message: string;
  hint?: string;
  details?: any;
  recommendedFix?: string;
  timestamp: number;
}

interface DiagnosticsState {
  errors: DiagnosticError[];
  addError: (error: Omit<DiagnosticError, 'id' | 'timestamp'>) => void;
  clearErrors: () => void;
  removeError: (id: string) => void;
}

export const useDiagnosticsStore = create<DiagnosticsState>((set) => ({
  errors: [],
  addError: (error) => set((state) => ({
    errors: [{ ...error, id: Math.random().toString(36).substring(7), timestamp: Date.now() }, ...state.errors]
  })),
  clearErrors: () => set({ errors: [] }),
  removeError: (id) => set((state) => ({ errors: state.errors.filter((e) => e.id !== id) }))
}));
