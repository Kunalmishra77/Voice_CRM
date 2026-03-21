import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  timezone: string;
  avatar: string; // initials-based, stores color seed
  language: string;
  bio: string;
}

interface ProfileState {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  resetProfile: () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Admin',
  email: 'admin@voicecrm.app',
  phone: '+1 (555) 000-0000',
  role: 'Manager',
  department: 'Sales',
  timezone: 'America/New_York',
  avatar: 'A',
  language: 'English',
  bio: '',
};

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      updateProfile: (updates) =>
        set((state) => ({
          profile: { ...state.profile, ...updates },
        })),
      resetProfile: () => set({ profile: DEFAULT_PROFILE }),
    }),
    { name: 'voicecrm-profile' }
  )
);
