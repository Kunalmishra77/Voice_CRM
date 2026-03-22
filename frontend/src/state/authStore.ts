import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      login: async (email, password) => {
        // Simulate real API authentication with 1.5s delay
        try {
          return await new Promise((resolve) => {
            setTimeout(() => {
              if (email === 'admin@voicecrm.app' && (password === 'password123' || !password)) {
                const mockUser: User = {
                  name: 'Kunal',
                  email: 'admin@voicecrm.app',
                  role: 'Manager',
                };
                set({ isAuthenticated: true, user: mockUser });
                resolve(true);
              } else {
                resolve(false);
              }
            }, 1500);
          });
        } catch (e) {
          console.error("Auth error:", e);
          return false;
        }
      },
      logout: () => {
        set({ isAuthenticated: false, user: null });
      },
    }),
    { 
      name: 'voicecrm-auth-session',
      // Ensure we don't persist complex objects if they were there
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          try {
            return JSON.parse(str);
          } catch (e) {
            return null;
          }
        },
        setItem: (name, value) => localStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => localStorage.removeItem(name),
      }
    }
  )
);
