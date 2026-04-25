import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  avatar?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const BASE = (import.meta.env.VITE_API_BASE_URL as string) || (import.meta.env.VITE_API_URL as string) || 'http://localhost:3010/api';
const API_KEY = (import.meta.env.VITE_API_KEY as string) || 'dev_key_2026';

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      login: async (email, password) => {
        try {
          const res = await fetch(`${BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
            body: JSON.stringify({ email, password }),
          });
          if (!res.ok) return false;
          const data = await res.json();
          if (data.success && data.token) {
            set({
              isAuthenticated: true,
              token: data.token,
              user: {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                role: data.user.role,
              },
            });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
      logout: () => {
        set({ isAuthenticated: false, user: null, token: null });
      },
    }),
    {
      name: 'voicecrm-auth-session',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          try { return JSON.parse(str); } catch { return null; }
        },
        setItem: (name, value) => localStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
