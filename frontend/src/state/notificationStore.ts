import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CRMNotification {
  id: string;
  type: 'hot_lead' | 'call_completed' | 'call_active' | 'task_due' | 'task_overdue' | 'bulk_complete' | 'system';
  title: string;
  description: string;
  time: string; // ISO timestamp
  read: boolean;
  route?: string; // navigation target
}

export interface NotificationPrefs {
  hotLeadAlerts: boolean;
  callCompletedAlerts: boolean;
  taskDueAlerts: boolean;
  livePollInterval: number; // seconds
  maxNotifications: number;
  crmRefreshInterval: number; // seconds; 0 = disabled
}

interface NotificationState {
  notifications: CRMNotification[];
  prefs: NotificationPrefs;
  lastCheckedAt: string; // ISO — tracks when notifications were last generated

  // Actions
  addNotification: (n: Omit<CRMNotification, 'id' | 'time' | 'read'>) => void;
  addNotifications: (items: Omit<CRMNotification, 'id' | 'time' | 'read'>[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  removeOld: () => void;
  updatePrefs: (p: Partial<NotificationPrefs>) => void;
  setLastCheckedAt: (iso: string) => void;
}

const DEFAULT_PREFS: NotificationPrefs = {
  hotLeadAlerts: true,
  callCompletedAlerts: true,
  taskDueAlerts: true,
  livePollInterval: 10,
  maxNotifications: 50,
  crmRefreshInterval: 0,
};

let _counter = 0;
function genId() {
  return `notif_${Date.now()}_${++_counter}`;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      prefs: DEFAULT_PREFS,
      lastCheckedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago default

      addNotification: (n) => {
        const state = get();
        set({
          notifications: [
            { ...n, id: genId(), time: new Date().toISOString(), read: false },
            ...state.notifications,
          ].slice(0, state.prefs.maxNotifications),
        });
      },

      addNotifications: (items) => {
        if (items.length === 0) return;
        const state = get();
        const now = new Date().toISOString();
        const newNotifs = items.map(n => ({
          ...n,
          id: genId(),
          time: now,
          read: false,
        }));
        set({
          notifications: [
            ...newNotifs,
            ...state.notifications,
          ].slice(0, state.prefs.maxNotifications),
        });
      },

      markRead: (id) =>
        set(s => ({
          notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
        })),

      markAllRead: () =>
        set(s => ({
          notifications: s.notifications.map(n => ({ ...n, read: true })),
        })),

      clearAll: () => set({ notifications: [] }),

      removeOld: () => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000; // keep last 24h
        set(s => ({
          notifications: s.notifications.filter(n => new Date(n.time).getTime() > cutoff),
        }));
      },

      updatePrefs: (p) =>
        set(s => ({ prefs: { ...s.prefs, ...p } })),

      setLastCheckedAt: (iso) => set({ lastCheckedAt: iso }),
    }),
    {
      name: 'voice_crm_notifications',
    }
  )
);
