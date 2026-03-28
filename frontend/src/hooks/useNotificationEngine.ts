import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dataProvider } from '../data/dataProvider';
import { useGlobalFilters } from '../state/globalFiltersStore';
import { useNotificationStore } from '../state/notificationStore';
import type { LiveCallRecord } from '../data/types';

/**
 * Notification engine — runs in background, generates real notifications
 * from CRM data: live calls, hot leads, tasks due.
 *
 * Mount this ONCE at the app root level.
 */
export function useNotificationEngine() {
  const { dateRange } = useGlobalFilters();
  const { prefs, addNotifications, setLastCheckedAt, lastCheckedAt, removeOld } = useNotificationStore();

  // Track what we've already notified about to avoid duplicates
  const seenCallIds = useRef<Set<string>>(new Set());
  const seenLeadIds = useRef<Set<string>>(new Set());
  const seenTaskIds = useRef<Set<string>>(new Set());

  // ── Live call activity (polls at configured interval) ──
  const { data: liveData } = useQuery({
    queryKey: ['notif-live-calls'],
    queryFn: () => dataProvider.getLiveCallActivity(),
    refetchInterval: prefs.livePollInterval * 1000,
    staleTime: (prefs.livePollInterval - 2) * 1000,
  });

  // ── Tasks (polls every 60s for due/overdue) ──
  const { data: tasks } = useQuery({
    queryKey: ['notif-tasks', dateRange],
    queryFn: () => dataProvider.getTasks(dateRange),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // ── Dashboard KPIs (for hot lead detection) ──
  const { data: kpis } = useQuery({
    queryKey: ['notif-kpis', dateRange],
    queryFn: () => dataProvider.getDashboardKPIs(dateRange),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  // Clean up old notifications on mount
  useEffect(() => {
    removeOld();
  }, []);

  // ── Generate call notifications ──
  useEffect(() => {
    if (!liveData || !prefs.callCompletedAlerts) return;

    const newNotifs: Parameters<typeof addNotifications>[0] = [];

    // Notify about newly completed calls
    for (const call of liveData.recent_completed.slice(0, 10)) {
      if (!call.id || seenCallIds.current.has(call.id)) continue;
      seenCallIds.current.add(call.id);

      // Only notify for calls completed after our last check
      if (call.created_at && call.created_at < lastCheckedAt) continue;

      newNotifs.push({
        type: 'call_completed',
        title: `Call completed — ${call.name || 'Unknown'}`,
        description: `${call.phone} • ${call.sentiment} • ${formatDuration(call.duration)}`,
        route: '/leads',
      });
    }

    // Notify about active calls (first time we see them calling)
    for (const call of liveData.active_calls) {
      if (!call.id || seenCallIds.current.has(`active_${call.id}`)) continue;
      if (call.call_status !== 'calling') continue;
      seenCallIds.current.add(`active_${call.id}`);

      newNotifs.push({
        type: 'call_active',
        title: `Live call — ${call.name || 'Unknown'}`,
        description: `${call.phone} is on an active call now`,
        route: '/live-calls',
      });
    }

    if (newNotifs.length > 0) {
      addNotifications(newNotifs.slice(0, 5)); // cap per cycle
    }
  }, [liveData, prefs.callCompletedAlerts]);

  // ── Generate task notifications ──
  useEffect(() => {
    if (!tasks || !prefs.taskDueAlerts) return;

    const now = new Date();
    const newNotifs: Parameters<typeof addNotifications>[0] = [];

    for (const task of tasks) {
      if (task.done || !task.id || seenTaskIds.current.has(task.id)) continue;
      seenTaskIds.current.add(task.id);

      const dueDate = new Date(task.due_at);
      const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilDue < 0) {
        // Overdue
        newNotifs.push({
          type: 'task_overdue',
          title: `Overdue task — ${task.lead_name || task.phone_number}`,
          description: `${task.task_type} was due ${formatTimeAgo(dueDate)}`,
          route: '/tasks',
        });
      } else if (hoursUntilDue <= 4) {
        // Due soon (within 4 hours)
        newNotifs.push({
          type: 'task_due',
          title: `Task due soon — ${task.lead_name || task.phone_number}`,
          description: `${task.task_type} due in ${Math.round(hoursUntilDue * 60)}min`,
          route: '/tasks',
        });
      }
    }

    if (newNotifs.length > 0) {
      addNotifications(newNotifs.slice(0, 5));
    }
  }, [tasks, prefs.taskDueAlerts]);

  // ── Hot lead surge notification ──
  const prevHotRef = useRef<number | null>(null);
  useEffect(() => {
    if (!kpis || !prefs.hotLeadAlerts) return;

    const currentHot = kpis.hotLeads;
    if (prevHotRef.current !== null && currentHot > prevHotRef.current) {
      const diff = currentHot - prevHotRef.current;
      addNotifications([{
        type: 'hot_lead',
        title: `${diff} new hot lead${diff > 1 ? 's' : ''} detected`,
        description: `Total hot leads now: ${currentHot}`,
        route: '/leads',
      }]);
    }
    prevHotRef.current = currentHot;
  }, [kpis, prefs.hotLeadAlerts]);

  // ── Update last checked timestamp periodically ──
  useEffect(() => {
    const timer = setInterval(() => {
      setLastCheckedAt(new Date().toISOString());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);
}

function formatDuration(dur: number | string): string {
  const secs = typeof dur === 'string' ? parseInt(dur, 10) : dur;
  if (!secs || isNaN(secs)) return '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
