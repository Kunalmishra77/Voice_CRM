import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Users, Flame, Zap, CheckCircle2, XCircle, TrendingUp,
  Activity, FileSearch, Clock, Target, Radio, PieChart as PieIcon, BarChart4, Loader2, ArrowRight, Calendar, ChevronDown
} from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { toast } from 'sonner';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { cn } from '../../lib/utils';
import { useQuery } from '@tanstack/react-query';
import { dataProvider } from '../../data/dataProvider';
import type { KPIStats, TrendPoint, StagePoint, VoiceTrendPoint, LeadInsightRow } from '../../data/api';
import { useNavigate } from 'react-router-dom';
import { useGlobalFilters } from '../../state/globalFiltersStore';
import { PageShell } from '../../ui/PageShell';
import { StatCard } from '../../ui/StatCard';
import { SectionCard } from '../../ui/SectionCard';
import { EmptyState } from '../../ui/EmptyState';
import { Modal } from '../../ui/Modal';
import { format, parseISO, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Constants ─── */
const COLORS: Record<string, string> = {
  Hot: '#ef4444', Warm: '#f59e0b', Cold: '#3b82f6',
  Converted: '#06b6d4', Lost: '#64748b', Pending: '#a855f7'
};

const GLOW: Record<string, string> = {
  Hot: 'rgba(239,68,68,0.4)', Warm: 'rgba(245,158,11,0.4)', Cold: 'rgba(59,130,246,0.4)',
  Converted: 'rgba(6,182,212,0.4)', Lost: 'rgba(100,116,139,0.3)', Pending: 'rgba(168,85,247,0.3)'
};

/* ─── Timeframe Filter Options ─── */
const TIMEFRAME_OPTIONS = [
  { value: 'global', label: 'Global Range' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'all', label: 'All Time' },
];

function getTimeframeRange(tf: string, globalRange: { from: string; to: string }): { from: string; to: string } {
  const now = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (tf) {
    case 'today': return { from: fmt(now), to: fmt(now) };
    case 'week': return { from: fmt(subDays(now, 6)), to: fmt(now) };
    case 'month': return { from: fmt(startOfMonth(now)), to: fmt(endOfMonth(now)) };
    case 'quarter': return { from: fmt(startOfQuarter(now)), to: fmt(endOfQuarter(now)) };
    case 'all': return { from: '2000-01-01', to: '2100-12-31' };
    default: return globalRange;
  }
}

/* ─── Timeframe Dropdown ─── */
const TimeframeDropdown: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const current = TIMEFRAME_OPTIONS.find(o => o.value === value);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer",
          "backdrop-blur-sm",
          value !== 'global'
            ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary border-primary/25 shadow-[0_0_12px_rgba(var(--brand-rgb),0.15)]"
            : "bg-white/5 text-muted-foreground border-white/10 hover:text-foreground hover:border-white/20"
        )}>
        <Calendar size={12} />
        {current?.label || 'Global Range'}
        <ChevronDown size={12} className={cn("transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-44 bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] z-[100] overflow-hidden p-1.5 space-y-0.5"
          >
            {TIMEFRAME_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2.5 cursor-pointer",
                  value === opt.value
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}>
                <Calendar size={11} className="opacity-60" />
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Premium Tooltips ─── */
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const nonZero = payload.filter((e: any) => e.value > 0);
  if (!nonZero.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur-xl border border-white/10 p-3.5 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] text-foreground">
      <p className="text-[10px] font-bold text-muted-foreground mb-2.5 uppercase tracking-wider">{label}</p>
      <div className="space-y-2">
        {nonZero.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-5">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color || entry.fill, boxShadow: `0 0 8px ${entry.color || entry.fill}40` }} />
              <span className="text-xs font-semibold capitalize">{entry.name}</span>
            </div>
            <span className="text-sm font-bold tabular-nums">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-card/95 backdrop-blur-xl border border-white/10 p-3 px-4 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.payload.color || item.fill, boxShadow: `0 0 10px ${item.payload.color}50` }} />
        <span className="text-xs font-bold text-foreground capitalize">{item.name}</span>
        <span className="text-sm font-extrabold text-foreground ml-1">{item.value}%</span>
      </div>
    </div>
  );
};

/* ─── Empty State ─── */
const ChartEmptyState = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-40 w-full h-full">
    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
      <FileSearch size={24} className="text-muted-foreground" />
    </div>
    <p className="text-xs text-muted-foreground font-semibold">No data for this range</p>
  </div>
);

/* ─── KPI Cards ─── */
const KPICards = React.memo(({ kpis, handleStatClick }: { kpis: KPIStats | undefined, handleStatClick: (b?: string) => void }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
      <StatCard label="Total Leads" value={kpis?.totalLeads ?? 0} icon={Users} variant="teal" onClick={() => handleStatClick('all')} />
      <StatCard label="Hot" value={kpis?.hotLeads ?? 0} icon={Flame} variant="orange" onClick={() => handleStatClick('Hot')} />
      <StatCard label="Warm" value={kpis?.warmLeads ?? 0} icon={Zap} variant="purple" onClick={() => handleStatClick('Warm')} />
      <StatCard label="Cold" value={kpis?.coldLeads ?? 0} icon={Activity} variant="blue" onClick={() => handleStatClick('Cold')} />
      <StatCard label="Converted" value={kpis?.converted ?? 0} icon={CheckCircle2} variant="teal" onClick={() => handleStatClick('Converted')} />
      <StatCard label="Lost" value={kpis?.unconverted ?? 0} icon={XCircle} variant="danger" onClick={() => handleStatClick('Lost')} />
      <StatCard label="Pending" value={kpis?.pendingDecisions ?? 0} icon={Clock} variant="orange" onClick={() => handleStatClick('Pending')} />
      <StatCard label="Avg Score" value={kpis?.avgScore ?? 0} icon={Target} variant="blue" onClick={() => handleStatClick('Hot')} />
    </div>
    {((kpis?.demoBooked ?? 0) > 0 || (kpis?.callbacks ?? 0) > 0) && (
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Demo Booked" value={kpis?.demoBooked ?? 0} icon={Radio} variant="purple" onClick={() => handleStatClick('DemoBooked')} />
        <StatCard label="Callbacks" value={kpis?.callbacks ?? 0} icon={Clock} variant="orange" onClick={() => handleStatClick('Callback')} />
      </div>
    )}
  </div>
));

/* ─── Recent Activity ─── */
const RecentActivityTable = React.memo(({ recentLeads, navigate }: { recentLeads: any[] | undefined, navigate: any }) => (
  <SectionCard title="Recent Activity" subtitle="Latest leads" icon={<Activity size={16} />}>
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-white/5 text-xs font-medium text-muted-foreground">
            <th className="px-4 py-3 font-medium">Lead</th>
            <th className="px-4 py-3 font-medium">Sentiment</th>
            <th className="px-4 py-3 font-medium text-center">Duration</th>
            <th className="px-4 py-3 font-medium text-right">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {(recentLeads || []).slice(0, 5).map((lead: any) => (
            <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} className="group hover:bg-white/[0.02] transition-colors cursor-pointer">
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-primary to-primary/70 shadow-[0_4px_12px_rgba(var(--brand-rgb),0.3)]">{lead['User Name']?.[0]}</div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{lead['User Name']}</span>
                    <span className="text-xs text-muted-foreground">{lead['Phone Number']}</span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <Badge variant={lead.sentiment === 'Hot' ? 'danger' : lead.sentiment === 'Warm' ? 'warning' : 'info'} className="font-medium text-xs">
                  {lead.sentiment}
                </Badge>
              </td>
              <td className="px-4 py-3.5 text-center text-sm font-medium text-foreground tabular-nums">{lead.duration}s</td>
              <td className="px-4 py-3.5 text-right text-sm text-muted-foreground">
                {(() => {
                  try {
                    if (!lead.created_at) return 'N/A';
                    const date = parseISO(lead.created_at);
                    return isNaN(date.getTime()) ? 'N/A' : format(date, 'MMM dd, HH:mm');
                  } catch { return 'N/A'; }
                })()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </SectionCard>
));

/* ─── Main Dashboard ─── */
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const { dateRange, datePreset, lastUpdated, leadType } = useGlobalFilters();

  // Per-graph timeframe filters
  const [trendTimeframe, setTrendTimeframe] = useState('global');
  const [volumeTimeframe, setVolumeTimeframe] = useState('global');
  const [pieTimeframe, setPieTimeframe] = useState('global');

  const [drilldown, setDrilldown] = useState<{ isOpen: boolean; title: string; date: string; data: LeadInsightRow[] }>({
    isOpen: false, title: '', date: '', data: []
  });

  useEffect(() => { const t = setTimeout(() => setIsMounted(true), 100); return () => clearTimeout(t); }, []);

  // Compute effective ranges for each graph
  const trendRange = useMemo(() => getTimeframeRange(trendTimeframe, dateRange), [trendTimeframe, dateRange]);
  const volumeRange = useMemo(() => getTimeframeRange(volumeTimeframe, dateRange), [volumeTimeframe, dateRange]);
  const pieRange = useMemo(() => getTimeframeRange(pieTimeframe, dateRange), [pieTimeframe, dateRange]);

  /* ─── Data Queries ─── */
  const { data: kpis, isLoading: kpisLoading } = useQuery<KPIStats>({
    queryKey: ['dashboard-kpis', dateRange, lastUpdated, leadType],
    queryFn: () => dataProvider.getDashboardKPIs(dateRange, leadType),
    staleTime: 30000
  });

  const { data: trendData } = useQuery<TrendPoint[]>({
    queryKey: ['dashboard-trend', trendRange, lastUpdated, leadType],
    queryFn: () => dataProvider.getLeadsTrend(trendRange, datePreset, undefined, leadType),
    staleTime: 30000
  });

  const { data: stageDistro } = useQuery<StagePoint[]>({
    queryKey: ['dashboard-stage', pieRange, lastUpdated, leadType],
    queryFn: () => dataProvider.getStageDistribution(pieRange, undefined, leadType),
    staleTime: 30000
  });

  const { data: pieKpis } = useQuery<KPIStats>({
    queryKey: ['dashboard-pie-kpis', pieRange, lastUpdated, leadType],
    queryFn: () => dataProvider.getDashboardKPIs(pieRange, leadType),
    staleTime: 30000
  });

  const { data: callTrend } = useQuery<VoiceTrendPoint[]>({
    queryKey: ['dashboard-call-trend', volumeRange, lastUpdated, leadType],
    queryFn: () => dataProvider.getVoiceTrend(volumeRange, datePreset, leadType),
    staleTime: 30000
  });

  const { data: recentLeads } = useQuery({
    queryKey: ['recent-leads', lastUpdated, leadType],
    queryFn: () => dataProvider.getLeads({ range: dateRange, limit: 5, leadType }),
    staleTime: 30000
  });

  const { data: allLeads } = useQuery({
    queryKey: ['all-leads-dashboard', dateRange, lastUpdated, leadType],
    queryFn: () => dataProvider.getLeads({ range: dateRange, bucket: 'all', leadType }),
    staleTime: 30000
  });

  const trendHasData = useMemo(() => {
    if (!trendData) return false;
    return trendData.some(p => p.hot + p.warm + p.cold + p.converted + p.lost > 0);
  }, [trendData]);

  const volumeHasData = useMemo(() => {
    if (!callTrend) return false;
    return callTrend.some(p => p.messages > 0);
  }, [callTrend]);

  const filteredPieData = useMemo(() => {
    if (!stageDistro) return [];
    return stageDistro.filter(i => i.value > 0);
  }, [stageDistro]);

  /* ─── Helpers ─── */
  const handleStatClick = (bucket?: string) => {
    const params = new URLSearchParams();
    if (bucket) params.set('bucket', bucket);
    navigate(`/leads?${params.toString()}`);
  };

  const getLeadsByCategory = (category: string): LeadInsightRow[] => {
    if (!allLeads) return [];
    const LOST_STATUSES = ['crm_lost', 'not interested', 'wrong number', 'busy', 'voicemail'];
    if (['Hot', 'Warm', 'Cold'].includes(category)) return allLeads.filter(l => l.sentiment === category);
    if (category === 'Converted') return allLeads.filter(l => (l.status as any) === 'crm_converted');
    if (category === 'Lost') return allLeads.filter(l => LOST_STATUSES.includes((l.status as any)));
    return allLeads;
  };

  const handleChartPointClick = async (point: any) => {
    if (!point || !point.activePayload || point.activePayload.length === 0) return;
    const label = point.activeLabel;
    const item = point.activePayload[0].payload;
    if (!item) return;
    toast.loading(`Loading details...`);
    const leads = await dataProvider.getLeads({ range: { from: item.from || item.name, to: item.to || item.name } });
    toast.dismiss();
    setDrilldown({ isOpen: true, title: `Activity Drilldown`, date: label, data: leads.slice(0, 15) });
  };

  const handleBarClick = (data: any, barKey: string) => {
    if (!data || !allLeads) return;
    const day = data;
    const dayLeads = allLeads.filter(l => {
      const ct = l.CallTimestamp || l.created_at || '';
      const d = ct.substring(0, 10);
      return d >= day.from && d <= day.to;
    });
    const capitalize = barKey.charAt(0).toUpperCase() + barKey.slice(1);
    let filtered: LeadInsightRow[] = [];
    const LOST_STATUSES = ['crm_lost', 'not interested', 'wrong number', 'busy', 'voicemail'];
    if (['hot', 'warm', 'cold'].includes(barKey)) {
      filtered = dayLeads.filter(l => l.sentiment === capitalize);
    } else if (barKey === 'converted') {
      filtered = dayLeads.filter(l => (l.status as any) === 'crm_converted');
    } else if (barKey === 'lost') {
      filtered = dayLeads.filter(l => LOST_STATUSES.includes((l.status as any)));
    }
    setDrilldown({ isOpen: true, title: `${capitalize} Leads — ${day.name}`, date: day.name, data: filtered });
  };

  const handlePieClick = (_: any, index: number) => {
    const item = filteredPieData?.[index];
    if (!item) return;
    const categoryLeads = getLeadsByCategory(item.name);
    setDrilldown({ isOpen: true, title: `${item.name} Leads`, date: '', data: categoryLeads });
  };

  const isDataEmpty = useMemo(() => {
    if (kpisLoading) return false;
    return !kpis || kpis.totalLeads === 0;
  }, [kpis, kpisLoading]);

  const ROW_HEIGHT = "h-[300px]";
  const effectivePieKpis = pieTimeframe === 'global' ? kpis : pieKpis;

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor leads, calls and performance metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/leads')} className="rounded-xl h-9 bg-card cursor-pointer">View Leads</Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/live-calls')} className="rounded-xl h-9 shadow-sm cursor-pointer"><Radio size={14} className="mr-2" /> Live Feed</Button>
        </div>
      </div>

      {isDataEmpty ? (
        <div className="py-20 flex-1"><EmptyState icon={FileSearch} title="No data found" description="Adjust your filters to see metrics." onAction={() => {}} /></div>
      ) : (
        <div className="space-y-6">
          <KPICards kpis={kpis} handleStatClick={handleStatClick} />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            <div className="xl:col-span-2 flex flex-col gap-6">
              {/* ── Lead Acquisition Trend ── */}
              <SectionCard
                title="Lead Acquisition Trend"
                subtitle={trendTimeframe !== 'global' ? TIMEFRAME_OPTIONS.find(o => o.value === trendTimeframe)?.label : 'Volume over time'}
                icon={<TrendingUp size={16} />}
                className={ROW_HEIGHT}
                headerActions={<TimeframeDropdown value={trendTimeframe} onChange={setTrendTimeframe} />}
              >
                {!trendHasData ? (
                  <ChartEmptyState />
                ) : (
                  <div className="w-full h-full pb-2">
                    {isMounted ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="barHot" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6}/>
                            </linearGradient>
                            <linearGradient id="barWarm" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.6}/>
                            </linearGradient>
                            <linearGradient id="barCold" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6}/>
                            </linearGradient>
                            <linearGradient id="barConverted" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#06b6d4" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.6}/>
                            </linearGradient>
                            <linearGradient id="barLost" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#64748b" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#64748b" stopOpacity={0.6}/>
                            </linearGradient>
                            <filter id="barGlow">
                              <feGaussianBlur stdDeviation="3" result="blur"/>
                              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<CustomChartTooltip />} />
                          <Bar dataKey="hot" name="Hot" fill="url(#barHot)" barSize={18} stackId="a" radius={[0,0,0,0]}
                            className="cursor-pointer" onClick={(data: any) => handleBarClick(data, 'hot')} />
                          <Bar dataKey="warm" name="Warm" fill="url(#barWarm)" barSize={18} stackId="a"
                            className="cursor-pointer" onClick={(data: any) => handleBarClick(data, 'warm')} />
                          <Bar dataKey="cold" name="Cold" fill="url(#barCold)" barSize={18} stackId="a"
                            className="cursor-pointer" onClick={(data: any) => handleBarClick(data, 'cold')} />
                          <Bar dataKey="converted" name="Converted" fill="url(#barConverted)" barSize={18} stackId="a"
                            className="cursor-pointer" onClick={(data: any) => handleBarClick(data, 'converted')} />
                          <Bar dataKey="lost" name="Lost" fill="url(#barLost)" radius={[4, 4, 0, 0]} barSize={18} stackId="a"
                            className="cursor-pointer" onClick={(data: any) => handleBarClick(data, 'lost')} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
                    )}
                  </div>
                )}
              </SectionCard>

              {/* ── Interaction Volume ── */}
              <SectionCard
                title="Interaction Volume"
                subtitle={volumeTimeframe !== 'global' ? TIMEFRAME_OPTIONS.find(o => o.value === volumeTimeframe)?.label : 'Signal flow'}
                icon={<BarChart4 size={16} />}
                className={ROW_HEIGHT}
                headerActions={<TimeframeDropdown value={volumeTimeframe} onChange={setVolumeTimeframe} />}
              >
                {!volumeHasData ? (
                  <ChartEmptyState />
                ) : (
                  <div className="w-full h-full pb-2">
                    {isMounted ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <AreaChart data={callTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onClick={handleChartPointClick}>
                          <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--brand-500)" stopOpacity={0.35}/>
                              <stop offset="50%" stopColor="var(--brand-500)" stopOpacity={0.12}/>
                              <stop offset="100%" stopColor="var(--brand-500)" stopOpacity={0}/>
                            </linearGradient>
                            <filter id="lineGlow">
                              <feGaussianBlur stdDeviation="4" result="blur"/>
                              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                          <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} content={<CustomChartTooltip />} />
                          <Area type="monotone" dataKey="messages" name="Calls" stroke="var(--brand-500)" strokeWidth={2.5} fill="url(#areaGrad)" className="cursor-pointer"
                            filter="url(#lineGlow)" dot={false} activeDot={{ r: 5, fill: 'var(--brand-500)', stroke: 'var(--brand-400)', strokeWidth: 2, filter: 'url(#lineGlow)' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
                    )}
                  </div>
                )}
              </SectionCard>
            </div>

            {/* ── Lead Distribution ── */}
            <div className="xl:col-span-1">
              <SectionCard
                title="Lead Distribution"
                subtitle={pieTimeframe !== 'global' ? TIMEFRAME_OPTIONS.find(o => o.value === pieTimeframe)?.label : undefined}
                icon={<PieIcon size={16} />}
                className="h-[624px]"
                headerActions={<TimeframeDropdown value={pieTimeframe} onChange={setPieTimeframe} />}
              >
                <div className="flex flex-col items-center justify-center h-full gap-4 py-4">
                  {filteredPieData.length === 0 ? (
                    <ChartEmptyState />
                  ) : (
                    <>
                      {/* Legend */}
                      <div className="w-full grid grid-cols-2 gap-2.5 px-2">
                        {filteredPieData.map((item) => {
                          const count = effectivePieKpis?.bucketCounts?.[item.name] || 0;
                          return (
                            <motion.div key={item.name}
                              whileHover={{ scale: 1.02, y: -1 }}
                              transition={{ duration: 0.15 }}
                              onClick={() => {
                                const categoryLeads = getLeadsByCategory(item.name);
                                setDrilldown({ isOpen: true, title: `${item.name} Leads`, date: '', data: categoryLeads });
                              }}
                              className="flex items-center justify-between p-3 rounded-2xl border border-white/[0.06] cursor-pointer transition-all group"
                              style={{
                                background: `linear-gradient(135deg, ${COLORS[item.name]}08 0%, transparent 100%)`,
                                boxShadow: `0 0 0 0px ${COLORS[item.name]}00`
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${COLORS[item.name]}40`; e.currentTarget.style.boxShadow = `0 4px 20px ${COLORS[item.name]}15`; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}40` }} />
                                <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-foreground tabular-nums">{count}</span>
                                <span className="text-[10px] text-muted-foreground">({item.value}%)</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      <motion.div whileHover={{ scale: 1.02 }} onClick={() => handleStatClick('all')} className="w-full max-w-[200px] flex items-center justify-between p-2.5 px-5 rounded-xl border cursor-pointer transition-all group mx-4 bg-gradient-to-r from-primary/10 to-transparent border-primary/15 hover:border-primary/30">
                        <span className="text-xs font-bold tracking-wide text-primary">All Leads</span>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform text-primary" />
                      </motion.div>

                      {/* Pie Chart with Glow */}
                      <div className="flex-1 flex items-center justify-center w-full">
                        {isMounted ? (
                          <div className="relative flex items-center justify-center">
                            {/* Glow ring behind the pie */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-[180px] h-[180px] rounded-full opacity-20 blur-xl"
                                style={{ background: `conic-gradient(${filteredPieData.map((d, i) => `${d.color} ${(i/filteredPieData.length)*100}%`).join(', ')})` }} />
                            </div>
                            <PieChart width={210} height={210}>
                              <defs>
                                {filteredPieData.map((d, i) => (
                                  <filter key={i} id={`pieGlow${i}`}>
                                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={d.color} floodOpacity="0.4"/>
                                  </filter>
                                ))}
                              </defs>
                              <Pie data={filteredPieData} innerRadius={68} outerRadius={95} paddingAngle={filteredPieData.length > 1 ? 4 : 0} dataKey="value" stroke="none" cx="50%" cy="50%"
                                className="cursor-pointer" onClick={handlePieClick}
                                animationBegin={0} animationDuration={800} animationEasing="ease-out">
                                {filteredPieData.map((e, i) => (
                                  <Cell key={i} fill={e.color} className="outline-none transition-opacity cursor-pointer"
                                    style={{ filter: `drop-shadow(0 0 6px ${e.color}50)` }} />
                                ))}
                              </Pie>
                              <Tooltip content={<PieTooltip />} />
                            </PieChart>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-3xl font-extrabold text-foreground tracking-tight tabular-nums">{effectivePieKpis?.totalLeads ?? kpis?.totalLeads ?? 0}</span>
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-1">Total</span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-[210px] h-[210px] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-500)' }} /></div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </SectionCard>
            </div>
          </div>

          <RecentActivityTable recentLeads={recentLeads} navigate={navigate} />
        </div>
      )}

      {/* Drilldown Modal */}
      <Modal isOpen={drilldown.isOpen} onClose={() => setDrilldown(p => ({ ...p, isOpen: false }))} title={drilldown.title || `Activity Drilldown — ${drilldown.date}`} className="max-w-2xl">
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar pb-2">
          {drilldown.data.length > 0 ? (
            <>
              <div className="text-xs text-muted-foreground px-2 mb-3">{drilldown.data.length} lead{drilldown.data.length !== 1 ? 's' : ''}</div>
              {drilldown.data.map((l) => (
                <motion.div key={l.id}
                  whileHover={{ scale: 1.01, x: 2 }}
                  onClick={() => { setDrilldown(p => ({ ...p, isOpen: false })); navigate(`/leads/${l.id}`); }}
                  className="p-3.5 rounded-xl border border-white/[0.06] hover:bg-white/[0.02] cursor-pointer flex items-center justify-between transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-semibold text-xs shadow-sm"
                      style={{ backgroundColor: COLORS[l.sentiment] || COLORS[l.scoring?.bucket] || '#6366f1', boxShadow: `0 4px 12px ${COLORS[l.sentiment] || '#6366f1'}30` }}>
                      {l['User Name']?.[0] || 'U'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">{l['User Name']}</span>
                      <span className="text-xs text-muted-foreground">{l['Phone Number']}</span>
                    </div>
                  </div>
                  <Badge variant={l.scoring?.bucket === 'Hot' ? 'danger' : l.scoring?.bucket === 'Warm' ? 'warning' : l.scoring?.bucket === 'Cold' ? 'info' : 'teal'} className="font-medium">{l.scoring?.bucket || l.sentiment}</Badge>
                </motion.div>
              ))}
            </>
          ) : <div className="text-center py-8 text-muted-foreground text-sm font-medium">No records found.</div>}
        </div>
      </Modal>
    </PageShell>
  );
};

export default DashboardPage;
