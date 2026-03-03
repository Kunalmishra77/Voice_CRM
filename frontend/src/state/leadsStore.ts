import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LocalOutcome {
  lead_id: string;
  phone: string;
  outcome: 'Converted' | 'Unconverted' | 'Pending';
  reason?: string;
  note?: string;
  updated_at: string;
}

export interface LeadComment {
  id: string;
  lead_id: string;
  text: string;
  created_at: string;
  author: string;
}

export interface LeadMetadata {
  lead_id: string;
  owner?: string;
  is_worked?: boolean;
}

interface LeadsStore {
  outcomes: Record<string, LocalOutcome>;
  comments: Record<string, LeadComment[]>;
  metadata: Record<string, LeadMetadata>;
  
  setOutcome: (outcome: LocalOutcome) => void;
  addComment: (lead_id: string, text: string) => void;
  setMetadata: (lead_id: string, meta: Partial<LeadMetadata>) => void;
  
  getOutcome: (lead_id: string) => LocalOutcome | undefined;
  getComments: (lead_id: string) => LeadComment[];
  getMetadata: (lead_id: string) => LeadMetadata;
}

export const useLeadsStore = create<LeadsStore>()(
  persist(
    (set, get) => ({
      outcomes: {},
      comments: {},
      metadata: {},
      
      setOutcome: (outcome) => set((state) => ({
        outcomes: { ...state.outcomes, [outcome.lead_id]: outcome }
      })),
      
      addComment: (lead_id, text) => set((state) => {
        const newComment: LeadComment = {
          id: `comm_${Date.now()}`,
          lead_id,
          text,
          created_at: new Date().toISOString(),
          author: 'Agent'
        };
        return {
          comments: {
            ...state.comments,
            [lead_id]: [...(state.comments[lead_id] || []), newComment]
          }
        };
      }),
      
      setMetadata: (lead_id, meta) => set((state) => ({
        metadata: {
          ...state.metadata,
          [lead_id]: { ...(state.metadata[lead_id] || { lead_id }), ...meta }
        }
      })),
      
      getOutcome: (lead_id) => get().outcomes[lead_id],
      getComments: (lead_id) => get().comments[lead_id] || [],
      getMetadata: (lead_id) => get().metadata[lead_id] || { lead_id },
    }),
    {
      name: 'voice_crm_leads_persistence',
    }
  )
);
