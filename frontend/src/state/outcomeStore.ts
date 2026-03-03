import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LocalOutcome {
  call_id: string;
  phone: string;
  outcome: 'Converted' | 'Unconverted' | 'Pending';
  reason?: string;
  note?: string;
  updated_at: string;
}

interface OutcomeStore {
  outcomes: Record<string, LocalOutcome>;
  setOutcome: (outcome: LocalOutcome) => void;
  getOutcome: (call_id: string) => LocalOutcome | undefined;
}

export const useOutcomeStore = create<OutcomeStore>()(
  persist(
    (set, get) => ({
      outcomes: {},
      setOutcome: (outcome) => set((state) => ({
        outcomes: { ...state.outcomes, [outcome.call_id]: outcome }
      })),
      getOutcome: (call_id) => get().outcomes[call_id],
    }),
    {
      name: 'voice_crm_local_outcomes',
    }
  )
);
