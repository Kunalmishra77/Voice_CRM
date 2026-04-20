import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, PhoneCall, PhoneOff, PhoneIncoming, Clock, CheckCircle2,
  XCircle, Activity, RefreshCw, Users, TrendingUp, Zap, Search,
  ChevronRight, Volume2, Timer, ArrowUpRight, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Badge } from '../../ui/Badge';
import { Skeleton } from '../../ui/Skeleton';
import { EmptyState } from '../../ui/EmptyState';
import { cn } from '../../lib/utils';
import { PageShell } from '../../ui/PageShell';
import { dataProvider } from '../../data/dataProvider';
import { useNotificationStore } from '../../state/notificationStore';
import type { LiveCallRecord } from '../../data/types';

/* ────────────────────────────────────────────────────────────── */

const STATUS_CONFIG = {
  queued:      { label: 'To Call',      icon: PhoneIncoming, color: 'text-amber-500',   bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500' },
  calling:     { label: 'Calling',      icon: PhoneCall,     color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
  completed:   { label: 'Done',         icon: CheckCircle2,  color: 'text-blue-500',    bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-500' },
  failed:      { label: 'Missed',       icon: XCircle,       color: 'text-rose-500',    bg: 'bg-rose-500/10', border: 'border-rose-500/20', dot: 'bg-rose-500' },
  demo_booked: { label: 'Demo Booked',  icon: PhoneCall,     color: 'text-violet-500',  bg: 'bg-violet-500/10', border: 'border-violet-500/20', dot: 'bg-violet-500' },
  callback:    { label: 'Callback',     icon: PhoneOff,      color: 'text-orange-500',  bg: 'bg-orange-500/10', border: 'border-orange-500/20', dot: 'bg-orange-500' },
};

const SENTIMENT_COLORS: Record<string, string> = {
  Hot: 'text-rose-500 bg-rose-500/10',
  Warm: 'text-amber-500 bg-amber-500/10',
  Cold: 'text-blue-500 bg-blue-500/10',
};

function formatDuration(dur: number | string): string {
  const secs = typeof dur === 'string' ? parseInt(dur, 10) : dur;
  if (!secs || isNaN(secs)) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTime(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'hh:mm a');
  } catch {
    return '—';
  }
}

/* ────────────────────────────────────────────────────────────── */

const LiveCallsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'failed'>('active');
  const { prefs } = useNotificationStore();
  const pollMs = prefs.livePollInterval * 1000;

  // Auto-polling at user-configured interval (Settings → Live Monitor)
  const { data: liveData, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['live-call-activity'],
    queryFn: () => dataProvider.getLiveCallActivity(),
    refetchInterval: pollMs,
    staleTime: pollMs - 2000,
  });

  const summary = liveData?.summary ?? { total_today: 0, queued: 0, calling: 0, completed: 0, failed: 0, demo_booked: 0, callback: 0 };

  // Filter active calls by search
  const filteredActive = useMemo(() => {
    const list = liveData?.active_calls ?? [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [liveData?.active_calls, search]);

  const filteredCompleted = useMemo(() => {
    const list = liveData?.recent_completed ?? [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [liveData?.recent_completed, search]);

  const filteredFailed = useMemo(() => {
    const list = liveData?.recent_failed ?? [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [liveData?.recent_failed, search]);

  const currentList = activeTab === 'active' ? filteredActive : activeTab === 'completed' ? filteredCompleted : filteredFailed;

  const statCards = [
    { label: 'Total Today', value: summary.total_today, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'To Call', value: summary.queued, icon: PhoneIncoming, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Calling Now', value: summary.calling, icon: PhoneCall, color: 'text-emerald-500', bg: 'bg-emerald-500/10', pulse: summary.calling > 0 },
    { label: 'Done', value: summary.completed, icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Missed', value: summary.failed, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { label: 'Demo Booked', value: summary.demo_booked, icon: PhoneCall, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { label: 'Callbacks', value: summary.callback, icon: PhoneOff, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  const completionRate = summary.total_today > 0
    ? Math.round(((summary.completed + summary.demo_booked + summary.callback) / summary.total_today) * 100)
    : 0;

  return (
    <PageShell className="p-0 overflow-hidden h-[calc(100vh-80px)]">
      <div className="flex flex-col h-full bg-background">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Activity size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">Live Call Monitor</h1>
              <p className="text-[10px] font-medium text-muted-foreground">
                Real-time call center activity
                {liveData?.last_updated && (
                  <span className="ml-2 opacity-60">
                    Updated {formatTime(liveData.last_updated)}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isRefetching && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
            <button
              onClick={() => { refetch(); toast.success('Refreshed'); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/20 transition-all"
            >
              <RefreshCw size={12} /> Refresh
            </button>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Auto-polling {prefs.livePollInterval}s</span>
            </div>
          </div>
        </div>

        {/* ── Stats Cards ────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-border flex-shrink-0">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
              {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
              {statCards.map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "relative p-4 rounded-2xl border border-border bg-card hover:shadow-md transition-all",
                    card.pulse && "ring-1 ring-emerald-500/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", card.bg)}>
                      <card.icon size={16} className={card.color} />
                    </div>
                    {card.pulse && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                  </div>
                  <p className="text-2xl font-bold text-foreground tracking-tight">{card.value}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">{card.label}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Completion rate bar */}
          {!isLoading && summary.total_today > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-accent overflow-hidden">
                <div
                  style={{ width: `${completionRate}%`, transition: 'width 0.8s ease-out' }}
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
                />
              </div>
              <span className="text-xs font-bold text-foreground">{completionRate}% done</span>
            </div>
          )}
        </div>

        {/* ── Tabs + Search ──────────────────────────────── */}
        <div className="px-6 py-3 border-b border-border flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-1 bg-accent rounded-xl p-1">
            {([
              { key: 'active' as const, label: 'Active', count: (summary.queued + summary.calling) },
              { key: 'completed' as const, label: 'Completed', count: summary.completed },
              { key: 'failed' as const, label: 'Failed', count: summary.failed },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                  activeTab === tab.key
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                <span className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                  activeTab === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or phone..."
              className="pl-9 pr-4 py-2 bg-accent border border-border rounded-xl text-xs font-medium w-64 focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* ── Call List ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
            </div>
          ) : currentList.length === 0 ? (
            <EmptyState
              icon={activeTab === 'active' ? Phone : activeTab === 'completed' ? CheckCircle2 : XCircle}
              title={activeTab === 'active' ? 'No active calls' : activeTab === 'completed' ? 'No completed calls yet' : 'No failed calls'}
              description={search ? 'No matches found.' : activeTab === 'active' ? 'All queued calls are completed or no calls scheduled yet today.' : 'Data will appear as calls are processed.'}
            />
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {currentList.map((call, idx) => (
                  <CallRow key={call.id || idx} call={call} index={idx} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
};

/* ────────────────────────────────────────────────────────────── */

const CallRow: React.FC<{ call: LiveCallRecord; index: number }> = ({ call, index }) => {
  const cfg = STATUS_CONFIG[call.call_status] || STATUS_CONFIG.completed;
  const sentimentClass = SENTIMENT_COLORS[call.sentiment] || 'text-muted-foreground bg-muted';
  const StatusIcon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ delay: index * 0.02 }}
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl border bg-card hover:shadow-sm transition-all group",
        call.call_status === 'calling' && "border-emerald-500/20 bg-emerald-500/[0.02]",
        call.call_status === 'queued' && "border-amber-500/20",
        call.call_status === 'failed' && "border-rose-500/20",
        call.call_status === 'completed' && "border-border",
        call.call_status === 'demo_booked' && "border-violet-500/20 bg-violet-500/[0.02]",
        call.call_status === 'callback' && "border-orange-500/20 bg-orange-500/[0.02]"
      )}
    >
      {/* Status indicator */}
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", cfg.bg)}>
        <StatusIcon size={18} className={cn(cfg.color, call.call_status === 'calling' && "animate-pulse")} />
      </div>

      {/* Name & phone */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-foreground truncate">{call.name || 'Unknown'}</h4>
          {/* Only show sentiment after call ends — not while queued or calling */}
          {['completed', 'demo_booked', 'callback'].includes(call.call_status) && call.sentiment && (
            <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase", sentimentClass)}>
              {call.sentiment}
            </span>
          )}
        </div>
        <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{call.phone}</p>
      </div>

      {/* Status badge */}
      <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border", cfg.bg, cfg.border)}>
        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot, call.call_status === 'calling' && "animate-pulse")} />
        <span className={cn("text-[10px] font-bold uppercase", cfg.color)}>{cfg.label}</span>
      </div>

      {/* Duration */}
      <div className="flex items-center gap-1.5 text-muted-foreground min-w-[60px] justify-end">
        <Timer size={12} />
        <span className="text-[11px] font-semibold">{formatDuration(call.duration)}</span>
      </div>

      {/* Time */}
      <div className="text-[11px] font-medium text-muted-foreground min-w-[70px] text-right">
        {formatTime(call.created_at)}
      </div>
    </motion.div>
  );
};

export default LiveCallsPage;
