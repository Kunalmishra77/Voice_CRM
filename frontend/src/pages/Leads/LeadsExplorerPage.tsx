import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, LayoutDashboard, Table as TableIcon, Download, ChevronRight, Loader2, TrendingUp, Target, CheckCircle2, Circle, X, ChevronDown, Calendar, Eye, FileSearch, ListChecks, Pencil, Trash2, CheckCircle, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';

import { dataProvider } from '../../data/dataProvider';
import { type LeadInsightRow } from '../../data/api';
import { type LeadOutcome } from '../../data/types';
import { useGlobalFilters } from '../../state/globalFiltersStore';
import { cn } from '../../lib/utils';

import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { PageShell } from '../../ui/PageShell';
import { SectionCard } from '../../ui/SectionCard';
import { Skeleton } from '../../ui/Skeleton';
import { Modal } from '../../ui/Modal';
import { LeadWorkflowModals } from '../../components/Lead/LeadWorkflowModals';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

/* ─── Constants ─── */
const COLORS: Record<string, string> = {
  Hot: '#ef4444', Warm: '#f59e0b', Cold: '#3b82f6',
  Converted: '#06b6d4', Lost: '#64748b', Pending: '#a855f7',
  DemoBooked: '#8b5cf6', Callback: '#f97316', Failed: '#ef4444',
  'Non-Eligible': '#f97316', 'Not Interested': '#94a3b8', Eligible: '#14b8a6', Total: '#8b5cf6'
};

const LOST_STATUSES = ['crm_lost', 'not interested', 'wrong number', 'busy', 'voicemail'];

const BUCKET_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Hot', label: 'Hot' },
  { value: 'Warm', label: 'Warm' },
  { value: 'Cold', label: 'Cold' },
  { value: 'DemoBooked', label: 'Demo Booked' },
  { value: 'Callback', label: 'Callback' },
  { value: 'Failed', label: 'Failed / Missed' },
  { value: 'Converted', label: 'Converted' },
  { value: 'Lost', label: 'Lost' },
  { value: 'Pending', label: 'Pending' },
];

/* ─── Timeframe Filter ─── */
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
    case 'week': return { from: fmt(startOfWeek(now, { weekStartsOn: 1 })), to: fmt(endOfWeek(now, { weekStartsOn: 1 })) };
    case 'month': return { from: fmt(startOfMonth(now)), to: fmt(endOfMonth(now)) };
    case 'quarter': return { from: fmt(startOfQuarter(now)), to: fmt(endOfQuarter(now)) };
    case 'all': return { from: '1970-01-01', to: '2100-12-31' };
    default: return globalRange;
  }
}

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
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer backdrop-blur-sm",
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
          <motion.div initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.95 }} transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-44 bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] z-[100] overflow-hidden p-1.5 space-y-0.5">
            {TIMEFRAME_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2.5 cursor-pointer",
                  value === opt.value ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:bg-white/5 hover:text-foreground")}>
                <Calendar size={11} className="opacity-60" /> {opt.label}
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
    <div className="bg-card/95 backdrop-blur-xl border border-white/10 p-3.5 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
      <p className="text-[10px] font-bold text-muted-foreground mb-2.5 uppercase tracking-wider">{label}</p>
      <div className="space-y-2">
        {nonZero.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-5">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill, boxShadow: `0 0 8px ${entry.color || entry.fill}40` }} />
              <span className="text-xs font-semibold text-foreground capitalize">{entry.name}</span>
            </div>
            <span className="text-sm font-bold text-foreground tabular-nums">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur-xl border border-white/10 p-3 px-4 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].payload.color || payload[0].fill, boxShadow: `0 0 10px ${payload[0].payload.color}50` }} />
        <span className="text-xs font-bold text-foreground capitalize">{payload[0].name}</span>
        <span className="text-sm font-extrabold text-foreground ml-1">{payload[0].value}%</span>
      </div>
    </div>
  );
};

/* ─── Drilldown Table ─── */
const DrilldownTable: React.FC<{ leads: LeadInsightRow[]; title: string; onClose: () => void; navigate: any }> = ({ leads, title, onClose, navigate }) => (
  <Modal isOpen={true} onClose={onClose} title={title} className="max-w-2xl">
    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar pb-2">
      {leads.length > 0 ? (
        <>
          <div className="text-xs text-muted-foreground px-2 mb-3">{leads.length} lead{leads.length !== 1 ? 's' : ''}</div>
          {leads.map((l) => (
            <motion.div key={l.id} whileHover={{ scale: 1.01, x: 2 }}
              onClick={() => { onClose(); navigate(`/leads/${l.id}`); }}
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
              <div className="flex items-center gap-2">
                {l.sentiment ? (
                  <Badge variant={l.sentiment === 'Hot' ? 'danger' : l.sentiment === 'Warm' ? 'warning' : l.sentiment === 'Cold' ? 'info' : 'default'}
                    className="font-medium text-xs">{l.sentiment}</Badge>
                ) : ['failed', 'error', 'no answer', 'no_answer'].includes(((l as any).status || (l as any)['lead stage'] || '').toLowerCase()) ? (
                  <Badge variant="default" className="font-medium text-xs bg-red-500/15 text-red-400 border-red-500/20">Failed</Badge>
                ) : null}
                <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.div>
          ))}
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm font-medium">No leads found.</div>
      )}
    </div>
  </Modal>
);

/* ─── Empty State ─── */
const ChartEmptyState = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-40">
    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
      <FileSearch size={24} className="text-muted-foreground" />
    </div>
    <p className="text-xs text-muted-foreground font-semibold">No data for this range</p>
  </div>
);

/* ─── Main Page ─── */
const LeadsExplorerPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { dateRange, searchQuery, selectedAgent, selectedStage, lastUpdated, leadType } = useGlobalFilters();
  const range = dateRange;
  const queryParams = new URLSearchParams(location.search);

  const activeTab = (queryParams.get('tab') as 'overview' | 'table' | 'outcomes') || 'overview';
  const bucket = queryParams.get('bucket') || 'all';
  const [localSearch, setLocalSearch] = useState(searchQuery);
  // selectedIds persists across bucket changes — cross-category multi-select
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Cache of all loaded leads for cross-bucket export
  const [selectedLeadsCache, setSelectedLeadsCache] = useState<Record<string, LeadInsightRow>>({});
  const [isMounted, setIsMounted] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [trendTimeframe, setTrendTimeframe] = useState('global');
  const [pieTimeframe, setPieTimeframe] = useState('global');
  const [drilldown, setDrilldown] = useState<{ isOpen: boolean; title: string; leads: LeadInsightRow[] }>({
    isOpen: false, title: '', leads: []
  });

  useEffect(() => { const t = setTimeout(() => setIsMounted(true), 100); return () => clearTimeout(t); }, []);
  useEffect(() => { setLocalSearch(searchQuery); }, [searchQuery]);

  const [workflowModal, setWorkflowModal] = useState<{ isOpen: boolean; lead: LeadInsightRow | null; type: 'Converted' | 'NotInterested' | 'Closed' | null }>({
    isOpen: false, lead: null, type: null
  });

  // Outcomes state
  const queryClient = useQueryClient();
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'Converted' | 'Lost'>('all');
  const [outcomeSearch, setOutcomeSearch] = useState('');
  const [editingOutcome, setEditingOutcome] = useState<LeadOutcome | null>(null);
  const [editForm, setEditForm] = useState({ reason: '', note: '' });

  const { data: outcomes, isLoading: outcomesLoading } = useQuery({
    queryKey: ['outcomes', outcomeFilter, lastUpdated],
    queryFn: () => dataProvider.getOutcomes({ outcome: outcomeFilter === 'all' ? undefined : outcomeFilter }),
    staleTime: 0,
  });

  const filteredOutcomes = useMemo(() => {
    if (!outcomes) return [];
    if (!outcomeSearch) return outcomes;
    const q = outcomeSearch.toLowerCase();
    return outcomes.filter((o: LeadOutcome) =>
      o.lead_name?.toLowerCase().includes(q) ||
      o.phone_number?.includes(q) ||
      o.reason?.toLowerCase().includes(q)
    );
  }, [outcomes, outcomeSearch]);

  const updateOutcomeMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { reason?: string; note?: string } }) =>
      dataProvider.updateOutcome(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outcomes'] });
      toast.success('Outcome updated');
      setEditingOutcome(null);
    },
    onError: () => toast.error('Failed to update'),
  });

  const deleteOutcomeMutation = useMutation({
    mutationFn: (id: string) => dataProvider.deleteOutcome(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outcomes'] });
      queryClient.invalidateQueries({ queryKey: ['leads-table'] });
      queryClient.invalidateQueries({ queryKey: ['leads-trend'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      toast.success('Outcome deleted — lead status reverted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  // Effective ranges for each graph
  const trendRange = useMemo(() => getTimeframeRange(trendTimeframe, range), [trendTimeframe, range]);
  const pieRange = useMemo(() => getTimeframeRange(pieTimeframe, range), [pieTimeframe, range]);

  /* ─── Data Queries ─── */
  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads-table', dateRange, bucket, localSearch, selectedAgent, selectedStage, lastUpdated, leadType],
    queryFn: () => dataProvider.getLeads({ range, bucket, search: localSearch, agent: selectedAgent, stage: selectedStage, leadType }),
    staleTime: 30000
  });

  const { data: kpis } = useQuery({
    queryKey: ['dashboard-kpis', range, lastUpdated, leadType],
    queryFn: () => dataProvider.getDashboardKPIs(range, leadType),
    staleTime: 30000
  });

  const { data: trendData } = useQuery({
    queryKey: ['leads-trend', trendRange, bucket, lastUpdated, leadType],
    queryFn: () => dataProvider.getLeadsTrend(trendRange, 'weekly', bucket, leadType),
    staleTime: 30000
  });

  const { data: stageDistro } = useQuery({
    queryKey: ['leads-stage', pieRange, lastUpdated, leadType],
    queryFn: () => dataProvider.getStageDistribution(pieRange, undefined, leadType),
    staleTime: 30000
  });

  // Get leads for the pie range when it differs from global
  const { data: pieLeads } = useQuery({
    queryKey: ['leads-pie', pieRange, bucket, lastUpdated],
    queryFn: () => dataProvider.getLeads({ range: pieRange, bucket }),
    enabled: pieTimeframe !== 'global',
    staleTime: 30000
  });

  const effectiveLeads = pieTimeframe === 'global' ? leads : pieLeads;

  /* ─── Compute pie data from actual filtered leads ─── */
  const computedPieData = useMemo(() => {
    const source = effectiveLeads;
    if (!source || source.length === 0) return [];
    const total = source.length;

    // Lead type overrides — these leads may have no sentiment, show a single segment
    if (leadType === 'non-eligible') return [{ name: 'Non-Eligible', value: 100, color: COLORS['Non-Eligible'] }];
    if (leadType === 'not-interested') return [{ name: 'Not Interested', value: 100, color: COLORS['Not Interested'] }];

    if (bucket === 'Lost') {
      const hotCount = source.filter(l => l.sentiment === 'Hot').length;
      const warmCount = source.filter(l => l.sentiment === 'Warm').length;
      const coldCount = source.filter(l => l.sentiment === 'Cold').length;
      return [
        { name: 'Hot', value: Math.round((hotCount / total) * 100), color: COLORS.Hot },
        { name: 'Warm', value: Math.round((warmCount / total) * 100), color: COLORS.Warm },
        { name: 'Cold', value: Math.round((coldCount / total) * 100), color: COLORS.Cold },
      ].filter(i => i.value > 0);
    }

    if (bucket === 'Hot' || bucket === 'Warm' || bucket === 'Cold') {
      return [{ name: bucket, value: 100, color: COLORS[bucket] }];
    }

    if (bucket === 'Converted') {
      return [{ name: 'Converted', value: 100, color: COLORS.Converted }];
    }

    if (bucket === 'Failed') {
      return total > 0 ? [{ name: 'Failed / Missed', value: 100, color: COLORS.Failed }] : [];
    }

    if (bucket === 'Pending' || bucket === 'DemoBooked' || bucket === 'Callback') {
      const hotCount = source.filter(l => l.sentiment === 'Hot').length;
      const warmCount = source.filter(l => l.sentiment === 'Warm').length;
      const coldCount = source.filter(l => l.sentiment === 'Cold').length;
      return [
        { name: 'Hot', value: Math.round((hotCount / total) * 100), color: COLORS.Hot },
        { name: 'Warm', value: Math.round((warmCount / total) * 100), color: COLORS.Warm },
        { name: 'Cold', value: Math.round((coldCount / total) * 100), color: COLORS.Cold },
      ].filter(i => i.value > 0);
    }

    // All: use global stageDistro but filter out 0%
    return (stageDistro || []).filter(i => i.value > 0);
  }, [effectiveLeads, bucket, stageDistro, leadType]);

  /* ─── Check if trend has any data ─── */
  const trendHasData = useMemo(() => {
    if (!trendData?.length) return false;
    return trendData.some(p => p.hot + p.warm + p.cold + p.converted + p.lost + (p.failed || 0) + (p.total || 0) > 0);
  }, [trendData]);

  /* ─── Bar chart: which bars to show based on bucket and leadType ─── */
  const visibleBars = useMemo(() => {
    // Lead types with no sentiment — show total count per day
    if (leadType === 'non-eligible' || leadType === 'not-interested') return ['total'];
    if (bucket === 'all') return ['hot', 'warm', 'cold', 'converted', 'lost'];
    if (bucket === 'Hot') return ['hot'];
    if (bucket === 'Warm') return ['warm'];
    if (bucket === 'Cold') return ['cold'];
    if (bucket === 'Converted') return ['converted'];
    if (bucket === 'Lost') return ['hot', 'warm', 'cold'];
    if (bucket === 'Pending') return ['hot', 'warm', 'cold'];
    if (bucket === 'DemoBooked' || bucket === 'Callback') return ['hot', 'warm', 'cold'];
    if (bucket === 'Failed') return ['failed'];
    return ['hot', 'warm', 'cold', 'converted', 'lost'];
  }, [bucket, leadType]);

  /* ─── Drilldown handlers ─── */
  const handleBarClick = (data: any, barKey: string) => {
    if (!data || !data.payload || !leads) return;
    const day = data.payload;
    const dayLeads = leads.filter(l => {
      const ct = l.CallTimestamp || l.created_at || '';
      const d = ct.substring(0, 10);
      return d >= day.from && d <= day.to;
    });
    const capitalize = barKey.charAt(0).toUpperCase() + barKey.slice(1);
    let filtered: LeadInsightRow[] = [];
    const FAILED_STATUSES = ['failed', 'error', 'no answer', 'no_answer'];
    if (['hot', 'warm', 'cold'].includes(barKey)) {
      filtered = dayLeads.filter(l => l.sentiment === capitalize);
    } else if (barKey === 'converted') {
      filtered = dayLeads.filter(l => (l.status as any) === 'crm_converted');
    } else if (barKey === 'lost') {
      filtered = dayLeads.filter(l => LOST_STATUSES.includes((l.status as any)));
    } else if (barKey === 'failed') {
      filtered = dayLeads.filter(l => FAILED_STATUSES.includes((l['lead stage'] || l.status || '').toLowerCase()));
    } else if (barKey === 'total') {
      filtered = dayLeads;
    }
    setDrilldown({ isOpen: true, title: `${barKey === 'total' ? 'All' : capitalize} Leads — ${day.name}`, leads: filtered });
  };

  const handlePieClick = (_: any, index: number) => {
    const item = computedPieData?.[index];
    if (!item || !leads) return;
    let filtered: LeadInsightRow[];
    if (['Hot', 'Warm', 'Cold'].includes(item.name)) {
      filtered = leads.filter(l => l.sentiment === item.name);
    } else if (item.name === 'Converted') {
      filtered = leads.filter(l => (l.status as any) === 'crm_converted');
    } else if (item.name === 'Lost') {
      filtered = leads.filter(l => LOST_STATUSES.includes((l.status as any)));
    } else {
      filtered = leads;
    }
    setDrilldown({ isOpen: true, title: `${item.name} Leads`, leads: filtered });
  };

  /* ─── URL & Export helpers ─── */
  const updateURL = (params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(location.search);
    Object.entries(params).forEach(([key, val]) => {
      if (val === null || val === 'all') newParams.delete(key);
      else newParams.set(key, val);
    });
    navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
  };

  const downloadCSV = (data: LeadInsightRow[], filename: string) => {
    const escape = (v: any) => `"${String(v || '').replace(/"/g, '""')}"`;
    const headers = ['ID', 'Name', 'Phone', 'Status', 'Sentiment', 'Lead Type', 'Duration (s)', 'Call Date', 'Summary', 'Objection'];
    const rows = data.map(l => [
      l.id, l['User Name'], l['Phone Number'], l.status, l.sentiment,
      l.lead_type || '', l.duration || '',
      l.CallTimestamp ? (() => { try { return format(new Date(l.CallTimestamp!), 'yyyy-MM-dd HH:mm'); } catch { return ''; } })() : '',
      l.concern, l['Conversation Summary']
    ].map(escape).join(','));
    const csvContent = [headers.map(escape).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `${filename}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} leads`);
    setIsExportOpen(false);
  };

  const downloadTranscripts = (data: LeadInsightRow[], filename: string) => {
    const content = data.map(l => {
      const dateStr = l.CallTimestamp ? (() => { try { return format(new Date(l.CallTimestamp!), 'MMM dd yyyy, hh:mm a'); } catch { return ''; } })() : 'N/A';
      const dur = l.duration ? `${Math.floor(Number(l.duration)/60)}m ${Number(l.duration)%60}s` : 'N/A';
      return [
        `====================================================`,
        `LEAD: ${l['User Name']} | Phone: ${l['Phone Number']}`,
        `Date: ${dateStr} | Duration: ${dur} | Sentiment: ${l.sentiment}`,
        `====================================================`,
        `SUMMARY:`,
        l['Conversation Summary'] || 'No summary.',
        ``,
        `OBJECTION:`,
        l.concern || 'None.',
        ``,
      ].join('\n');
    }).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `${filename}.txt`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Transcripts downloaded (${data.length} leads)`);
    setIsExportOpen(false);
  };

  const handleExportAction = async (type: 'all' | 'hot' | 'warm' | 'cold' | 'selection' | 'current' | 'transcripts_selection' | 'transcripts_all' | 'eligible' | 'non-eligible' | 'not-interested') => {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (type === 'selection') {
      const selected = selectedIds.map(id => selectedLeadsCache[id]).filter(Boolean);
      downloadCSV(selected.length ? selected : (leads?.filter(l => selectedIds.includes(l.id)) || []), `selected_leads_${today}`);
    } else if (type === 'transcripts_selection') {
      const selected = selectedIds.map(id => selectedLeadsCache[id]).filter(Boolean);
      downloadTranscripts(selected.length ? selected : (leads?.filter(l => selectedIds.includes(l.id)) || []), `transcripts_selected_${today}`);
    } else if (type === 'transcripts_all') {
      downloadTranscripts(leads || [], `transcripts_${bucket}_${today}`);
    } else if (type === 'all') {
      const all = await dataProvider.getLeads({ range: { from: '1970-01-01', to: '2100-12-31' }, bucket: 'all', limit: 10000 });
      downloadCSV(all, `all_leads_${today}`);
    } else if (type === 'eligible' || type === 'non-eligible' || type === 'not-interested') {
      const segment = await dataProvider.getLeads({ range: { from: '1970-01-01', to: '2100-12-31' }, bucket: 'all', leadType: type, limit: 10000 });
      downloadCSV(segment, `${type}_leads_${today}`);
    } else if (['hot', 'warm', 'cold'].includes(type)) {
      const segment = await dataProvider.getLeads({ range, bucket: type.charAt(0).toUpperCase() + type.slice(1) });
      downloadCSV(segment, `${type}_leads_${today}`);
    } else {
      downloadCSV(leads || [], `${bucket}_leads_${today}`);
    }
  };

  const toggleSelectLead = (lead: LeadInsightRow) => {
    const id = lead.id;
    setSelectedLeadsCache(prev => ({ ...prev, [id]: lead }));
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === (leads?.length || 0) && leads?.every(l => selectedIds.includes(l.id))) {
      setSelectedIds([]);
    } else {
      const newCache: Record<string, LeadInsightRow> = { ...selectedLeadsCache };
      leads?.forEach(l => { newCache[l.id] = l; });
      setSelectedLeadsCache(newCache);
      setSelectedIds(leads?.map(l => l.id) || []);
    }
  };

  const clearSelection = () => { setSelectedIds([]); setSelectedLeadsCache({}); };

  const pieSubtitle = useMemo(() => {
    if (leadType === 'non-eligible') return 'Non-eligible leads';
    if (leadType === 'not-interested') return 'Not interested leads';
    if (leadType === 'eligible') return 'Eligible lead breakdown';
    if (bucket === 'Lost') return 'Sentiment of lost leads';
    if (bucket === 'Pending') return 'Sentiment of pending leads';
    if (bucket === 'DemoBooked') return 'Sentiment of demo-booked leads';
    if (bucket === 'Callback') return 'Sentiment of callback leads';
    if (bucket === 'Failed') return 'Failed / Missed call volume';
    if (['Hot', 'Warm', 'Cold', 'Converted'].includes(bucket)) return `${bucket} leads only`;
    return 'Lead distribution';
  }, [bucket, leadType]);

  return (
    <PageShell>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Leads</h1>
            <Badge variant="teal" className="h-6 px-2 rounded-lg font-bold tabular-nums">
              {leads?.length || 0} {bucket !== 'all' ? `Filtered` : `Total`}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Manage and export your lead pipeline.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
            <button onClick={() => updateURL({ tab: 'overview' })} className={cn("px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all cursor-pointer", activeTab === 'overview' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}><LayoutDashboard size={15} /> Overview</button>
            <button onClick={() => updateURL({ tab: 'table' })} className={cn("px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all cursor-pointer", activeTab === 'table' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}><TableIcon size={15} /> Table</button>
            <button onClick={() => updateURL({ tab: 'outcomes' })} className={cn("px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all cursor-pointer", activeTab === 'outcomes' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}><ListChecks size={15} /> Outcomes</button>
          </div>
          <div className="relative" ref={exportRef}>
            <Button variant="outline" size="sm" onClick={() => setIsExportOpen(!isExportOpen)} className="h-9 px-4 flex items-center gap-2 rounded-xl cursor-pointer">
              <Download size={15} /> Export <ChevronDown size={14} className={cn("transition-transform", isExportOpen && "rotate-180")} />
            </Button>
            <AnimatePresence>
              {isExportOpen && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 mt-2 w-52 bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] z-[100] overflow-hidden p-1.5 space-y-0.5">
                  {selectedIds.length > 0 && (
                    <>
                      <p className="px-3 pt-1 pb-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {selectedIds.length} selected (across all categories)
                      </p>
                      <button onClick={() => handleExportAction('selection')} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent flex items-center justify-between cursor-pointer" style={{ color: 'var(--brand-600)' }}>
                        <span>Export Selected (CSV)</span><Badge variant="teal">{selectedIds.length}</Badge>
                      </button>
                      <button onClick={() => handleExportAction('transcripts_selection')} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent flex items-center justify-between cursor-pointer text-purple-500">
                        <span>Download Transcripts</span><Badge variant="zinc">{selectedIds.length}</Badge>
                      </button>
                      <button onClick={clearSelection} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent text-rose-400 cursor-pointer">Clear Selection</button>
                      <div className="h-px bg-border mx-2 my-1" />
                    </>
                  )}
                  <p className="px-3 pt-1 pb-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Export CSV</p>
                  <button onClick={() => handleExportAction('all')} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent text-foreground/70 transition-colors cursor-pointer">All Leads</button>
                  <button onClick={() => handleExportAction('hot')} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent text-rose-500 transition-colors cursor-pointer">Hot Leads</button>
                  <button onClick={() => handleExportAction('warm')} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent text-amber-500 transition-colors cursor-pointer">Warm Leads</button>
                  <button onClick={() => handleExportAction('cold')} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent text-blue-500 transition-colors cursor-pointer">Cold Leads</button>
                  <button onClick={() => handleExportAction('eligible')} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent text-teal-500 transition-colors cursor-pointer">Eligible Leads</button>
                  <button onClick={() => handleExportAction('non-eligible')} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent text-orange-500 transition-colors cursor-pointer">Non-Eligible Leads</button>
                  <button onClick={() => handleExportAction('not-interested')} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent text-slate-400 transition-colors cursor-pointer">Not Interested Leads</button>
                  <div className="h-px bg-border mx-2 my-1" />
                  <p className="px-3 pt-1 pb-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Transcripts</p>
                  <button onClick={() => handleExportAction('transcripts_all')} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent text-purple-500 transition-colors cursor-pointer">Current View Transcripts</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 mb-6">
        {BUCKET_OPTIONS.map((opt) => (
          <motion.button key={opt.value} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { updateURL({ bucket: opt.value }); setSelectedIds([]); }}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all border whitespace-nowrap flex items-center gap-2 cursor-pointer",
              bucket === opt.value
                ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-primary shadow-[0_4px_16px_rgba(var(--brand-rgb),0.3)]"
                : "bg-card border-white/[0.06] text-muted-foreground hover:border-white/15 hover:text-foreground"
            )}>
            {opt.label}
            <Badge className={cn("px-1.5 py-0 min-w-5 justify-center rounded-md font-bold text-[10px]", bucket === opt.value ? "bg-white/20 text-primary-foreground" : "bg-accent text-muted-foreground")}>{kpis?.bucketCounts?.[opt.value] || 0}</Badge>
          </motion.button>
        ))}
      </div>

      {/* Floating cross-category selection bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border border-primary/30 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl"
          >
            <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
              <CheckCircle2 size={14} className="text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">{selectedIds.length} lead{selectedIds.length > 1 ? 's' : ''} selected</span>
            <span className="text-xs text-muted-foreground">(across all categories)</span>
            <div className="w-px h-5 bg-border mx-1" />
            <button onClick={() => handleExportAction('selection')} className="text-xs font-semibold text-primary hover:underline cursor-pointer">Export CSV</button>
            <button onClick={() => handleExportAction('transcripts_selection')} className="text-xs font-semibold text-purple-500 hover:underline cursor-pointer">Transcripts</button>
            <button onClick={clearSelection} className="text-xs font-semibold text-rose-400 hover:underline cursor-pointer">Clear</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' ? (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* ── Acquisition Trend ── */}
              <div className="lg:col-span-8">
                <SectionCard
                  title="Acquisition Trend"
                  subtitle={leadType !== 'all' ? `Showing ${leadType} leads` : bucket !== 'all' ? `Showing ${bucket} leads` : 'Daily capture rate'}
                  icon={<TrendingUp size={16} />}
                  className="h-[420px]"
                  headerActions={<TimeframeDropdown value={trendTimeframe} onChange={setTrendTimeframe} />}
                >
                  {!trendHasData ? (
                    <ChartEmptyState />
                  ) : (
                    <div className="w-full h-full pb-4 mt-2">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="lBarHot" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6}/>
                            </linearGradient>
                            <linearGradient id="lBarWarm" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.6}/>
                            </linearGradient>
                            <linearGradient id="lBarCold" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6}/>
                            </linearGradient>
                            <linearGradient id="lBarConverted" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#06b6d4" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.6}/>
                            </linearGradient>
                            <linearGradient id="lBarLost" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#64748b" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#64748b" stopOpacity={0.6}/>
                            </linearGradient>
                            <linearGradient id="lBarFailed" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6}/>
                            </linearGradient>
                            <linearGradient id="lBarTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<CustomChartTooltip />} />
                          {visibleBars.includes('hot') && (
                            <Bar dataKey="hot" name="Hot" fill="url(#lBarHot)" barSize={20} stackId="a"
                              className="cursor-pointer" onClick={(data: any) => handleBarClick({ payload: data }, 'hot')} />
                          )}
                          {visibleBars.includes('warm') && (
                            <Bar dataKey="warm" name="Warm" fill="url(#lBarWarm)" barSize={20} stackId="a"
                              className="cursor-pointer" onClick={(data: any) => handleBarClick({ payload: data }, 'warm')} />
                          )}
                          {visibleBars.includes('cold') && (
                            <Bar dataKey="cold" name="Cold" fill="url(#lBarCold)" barSize={20} stackId="a"
                              className="cursor-pointer" onClick={(data: any) => handleBarClick({ payload: data }, 'cold')} />
                          )}
                          {visibleBars.includes('converted') && (
                            <Bar dataKey="converted" name="Converted" fill="url(#lBarConverted)" barSize={20} stackId="a"
                              className="cursor-pointer" onClick={(data: any) => handleBarClick({ payload: data }, 'converted')} />
                          )}
                          {visibleBars.includes('lost') && (
                            <Bar dataKey="lost" name="Lost" fill="url(#lBarLost)" radius={[4, 4, 0, 0]} barSize={20} stackId="a"
                              className="cursor-pointer" onClick={(data: any) => handleBarClick({ payload: data }, 'lost')} />
                          )}
                          {visibleBars.includes('failed') && (
                            <Bar dataKey="failed" name="Failed / Missed" fill="url(#lBarFailed)" radius={[4, 4, 0, 0]} barSize={20} stackId="a"
                              className="cursor-pointer" onClick={(data: any) => handleBarClick({ payload: data }, 'failed')} />
                          )}
                          {visibleBars.includes('total') && (
                            <Bar dataKey="total" name="Total Leads" fill="url(#lBarTotal)" radius={[4, 4, 0, 0]} barSize={20} stackId="a"
                              className="cursor-pointer" onClick={(data: any) => handleBarClick({ payload: data }, 'total')} />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* ── Segmentation Pie ── */}
              <div className="lg:col-span-4">
                <SectionCard
                  title="Segmentation"
                  subtitle={pieSubtitle}
                  icon={<Target size={16} />}
                  className="h-[420px] flex flex-col"
                  headerActions={<TimeframeDropdown value={pieTimeframe} onChange={setPieTimeframe} />}
                >
                  {!effectiveLeads?.length || computedPieData.length === 0 ? (
                    <ChartEmptyState />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-start w-full h-full pt-2">
                      <div className="w-full h-[200px] relative flex items-center justify-center">
                        {isMounted ? (
                          <>
                            {/* Glow ring */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-[160px] h-[160px] rounded-full opacity-20 blur-xl"
                                style={{ background: `conic-gradient(${computedPieData.map((d, i) => `${d.color} ${(i/computedPieData.length)*100}%`).join(', ')})` }} />
                            </div>
                            <PieChart width={200} height={200}>
                              <Pie data={computedPieData} innerRadius={60} outerRadius={80} paddingAngle={computedPieData.length > 1 ? 4 : 0} dataKey="value" stroke="none" cx="50%" cy="50%"
                                className="cursor-pointer" onClick={handlePieClick}
                                animationBegin={0} animationDuration={800} animationEasing="ease-out">
                                {computedPieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} className="outline-none transition-opacity cursor-pointer"
                                    style={{ filter: `drop-shadow(0 0 6px ${entry.color}50)` }} />
                                ))}
                              </Pie>
                              <Tooltip content={<PieTooltip />} />
                            </PieChart>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none translate-y-[-2px]">
                              <span className="text-2xl font-extrabold text-foreground tracking-tight tabular-nums">{effectiveLeads?.length || 0}</span>
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Leads</span>
                            </div>
                          </>
                        ) : (
                          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                        )}
                      </div>
                      {/* Legend */}
                      <div className="w-full space-y-1 mt-4 px-2 overflow-y-auto no-scrollbar pb-2">
                        {computedPieData.map((item) => (
                          <motion.div key={item.name} whileHover={{ x: 3 }}
                            onClick={() => {
                              const source = effectiveLeads || [];
                              const filtered = source.filter(l => {
                                if (['Hot', 'Warm', 'Cold'].includes(item.name)) return l.sentiment === item.name;
                                if (item.name === 'Converted') return (l.status as any) === 'crm_converted';
                                if (item.name === 'Lost') return LOST_STATUSES.includes((l.status as any));
                                return true;
                              });
                              setDrilldown({ isOpen: true, title: `${item.name} Leads`, leads: filtered });
                            }}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-white/[0.06] transition-all group cursor-pointer"
                            style={{ background: `linear-gradient(135deg, ${item.color}08 0%, transparent 100%)` }}>
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}40` }} />
                              <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold tabular-nums text-foreground">{item.value}%</span>
                              <Eye size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </SectionCard>
              </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { label: 'Hot', count: kpis?.bucketCounts?.['Hot'] || 0, color: COLORS.Hot, bucket: 'Hot' },
                { label: 'Warm', count: kpis?.bucketCounts?.['Warm'] || 0, color: COLORS.Warm, bucket: 'Warm' },
                { label: 'Cold', count: kpis?.bucketCounts?.['Cold'] || 0, color: COLORS.Cold, bucket: 'Cold' },
                { label: 'Demo Booked', count: kpis?.bucketCounts?.['DemoBooked'] || 0, color: COLORS.DemoBooked, bucket: 'DemoBooked' },
                { label: 'Callback', count: kpis?.bucketCounts?.['Callback'] || 0, color: COLORS.Callback, bucket: 'Callback' },
                { label: 'Failed', count: kpis?.bucketCounts?.['Failed'] || 0, color: COLORS.Failed, bucket: 'Failed' },
                { label: 'Converted', count: kpis?.bucketCounts?.['Converted'] || 0, color: COLORS.Converted, bucket: 'Converted' },
                { label: 'Lost', count: kpis?.bucketCounts?.['Lost'] || 0, color: COLORS.Lost, bucket: 'Lost' },
                { label: 'Pending', count: kpis?.bucketCounts?.['Pending'] || 0, color: COLORS.Pending, bucket: 'Pending' },
              ].map(stat => (
                <motion.div key={stat.label} whileHover={{ scale: 1.03, y: -2 }} transition={{ duration: 0.15 }}
                  onClick={() => updateURL({ bucket: stat.bucket })}
                  className="bg-card border border-white/[0.06] rounded-2xl p-4 flex items-center gap-3 cursor-pointer group transition-all"
                  style={{ boxShadow: `0 0 0 0px ${stat.color}00` }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${stat.color}30`; e.currentTarget.style.boxShadow = `0 4px 20px ${stat.color}15`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: stat.color, boxShadow: `0 0 8px ${stat.color}40` }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium group-hover:text-foreground transition-colors">{stat.label}</p>
                    <p className="text-lg font-bold text-foreground tabular-nums">{stat.count}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : activeTab === 'table' ? (
          /* ── Table Tab ── */
          <motion.div key="table" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Search leads..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="w-full bg-card border border-white/[0.06] rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all" />
              </div>
            </div>
            <Card className="overflow-hidden rounded-2xl border-white/[0.06]">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.04] text-xs font-medium text-muted-foreground bg-white/[0.02]">
                      <th className="p-4 w-12 text-center"><div className="cursor-pointer text-muted-foreground hover:text-foreground mx-auto flex items-center justify-center" onClick={toggleSelectAll}>{selectedIds.length === (leads?.length || 0) && selectedIds.length > 0 ? <CheckCircle2 size={16} className="text-primary" /> : <Circle size={16} />}</div></th>
                      <th className="px-4 py-3.5 font-medium">Status</th>
                      <th className="px-4 py-3.5 font-medium">Lead</th>
                      <th className="px-4 py-3.5 font-medium">Summary</th>
                      <th className="px-4 py-3.5 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {leadsLoading ? [...Array(5)].map((_, i) => <tr key={i}><td colSpan={5} className="p-4"><Skeleton className="h-12 w-full rounded-xl" /></td></tr>) : leads?.map((lead) => {
                      const rawStatus = String((lead as any).status || (lead as any)['lead stage'] || '').toLowerCase().trim();
                      const isConverted = ['crm_converted', 'converted'].includes(rawStatus);
                      const isLost = ['crm_lost', 'lost', 'not interested', 'wrong number', 'busy', 'voicemail'].includes(rawStatus);
                      const isFailed = ['failed', 'error', 'no answer', 'no_answer'].includes(rawStatus);
                      const isFinalized = isConverted || isLost || isFailed;
                      const isSelected = selectedIds.includes(lead.id);
                      return (
                        <tr key={lead.id} className={cn("group transition-colors cursor-pointer", isSelected ? "bg-primary/5" : "hover:bg-white/[0.02]")} onClick={() => navigate(`/leads/${lead.id}`)}>
                          <td className="p-4 text-center cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleSelectLead(lead); }}>
                            <div className="text-muted-foreground hover:text-foreground mx-auto flex items-center justify-center">{isSelected ? <CheckCircle2 size={16} className="text-primary" /> : <Circle size={16} />}</div>
                          </td>
                          <td className="px-4 py-4">
                            {isConverted ? (
                              <Badge variant="teal" className="font-medium text-xs">Converted</Badge>
                            ) : isLost ? (
                              <Badge variant="zinc" className="font-medium text-xs">Lost</Badge>
                            ) : rawStatus === 'demo_booked' ? (
                              <Badge variant="default" className="font-medium text-xs bg-violet-500/15 text-violet-400 border-violet-500/20">Demo Booked</Badge>
                            ) : rawStatus === 'call_back' || rawStatus === 'callback' ? (
                              <Badge variant="default" className="font-medium text-xs bg-orange-500/15 text-orange-400 border-orange-500/20">Callback</Badge>
                            ) : rawStatus === 'failed' || rawStatus === 'no answer' || rawStatus === 'no_answer' || rawStatus === 'error' ? (
                              <Badge variant="default" className="font-medium text-xs bg-red-500/15 text-red-400 border-red-500/20">Failed</Badge>
                            ) : lead.scoring.bucket ? (
                              <Badge variant={lead.scoring.bucket === 'Hot' ? 'danger' : lead.scoring.bucket === 'Warm' ? 'warning' : lead.scoring.bucket === 'Cold' ? 'info' : 'default'} className="font-medium text-xs">{lead.scoring.bucket}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-semibold text-xs bg-gradient-to-br from-primary to-primary/70 shadow-[0_4px_12px_rgba(var(--brand-rgb),0.3)]">{lead['User Name']?.[0]}</div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-semibold text-foreground">{lead['User Name']}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-muted-foreground">{lead['Phone Number']}</span>
                                  {(lead as any).lead_type === 'Not Interested' ? (
                                    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-rose-500/15 text-rose-400 border-rose-500/20">Not Interested</Badge>
                                  ) : /non.?eligible/i.test((lead as any).lead_type || '') ? (
                                    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/15 text-amber-400 border-amber-500/20">Non-Eligible</Badge>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 max-w-[300px]">
                            {(rawStatus === 'callback' || rawStatus === 'call_back' || rawStatus === 'demo_booked') ? (() => {
                              const summary = (lead as any)['Conversation Summary'] || '';
                              const requestedTime = (() => {
                                if (!summary) return null;
                                const patterns: RegExp[] = [
                                  /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*(?:\s+\d{4})?(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm))?)\b/i,
                                  /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+\d{4})?(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm))?)\b/i,
                                  /((?:tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:,?\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm))?)/i,
                                  /\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
                                  /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
                                  /\b(next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week))\b/i,
                                ];
                                for (const p of patterns) { const m = summary.match(p); if (m) return (m[1] || m[0]).trim(); }
                                return null;
                              })();
                              const isDemo = rawStatus === 'demo_booked';
                              const accentColor = isDemo ? '#a78bfa' : '#f97316';
                              const bgColor = isDemo ? 'rgba(167,139,250,0.08)' : 'rgba(249,115,22,0.08)';
                              const borderColor = isDemo ? 'rgba(167,139,250,0.25)' : 'rgba(249,115,22,0.25)';
                              const label = isDemo ? 'Requested Demo Time' : 'Requested Callback Time';
                              return (
                                <div className="flex flex-col gap-1.5">
                                  <p className="text-sm text-muted-foreground line-clamp-1">{summary || '...'}</p>
                                  <div
                                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                                    style={{ background: bgColor, border: `1px solid ${borderColor}` }}
                                  >
                                    <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: accentColor }}>
                                      {label}
                                    </span>
                                    <span className="text-[11px] font-bold" style={{ color: accentColor }}>
                                      {requestedTime ?? '—'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })() : (
                              <p className="text-sm text-muted-foreground line-clamp-1">{lead['Conversation Summary'] || '...'}</p>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isFinalized && (
                                <>
                                  <button onClick={(e) => { e.stopPropagation(); setWorkflowModal({ isOpen: true, lead, type: 'Converted' }); }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors cursor-pointer" title="Mark as Converted"><CheckCircle2 size={16} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); setWorkflowModal({ isOpen: true, lead, type: 'NotInterested' }); }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer" title="Mark as Lost"><X size={16} /></button>
                                </>
                              )}
                              <ChevronRight size={16} className="ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        ) : activeTab === 'outcomes' ? (
          /* ── Outcomes Tab ── */
          <motion.div key="outcomes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {/* Filter + Search bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Search by name, phone, reason..." value={outcomeSearch}
                  onChange={(e) => setOutcomeSearch(e.target.value)}
                  className="w-full bg-card border border-white/[0.06] rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all" />
              </div>
              <div className="flex gap-2">
                {(['all', 'Converted', 'Lost'] as const).map(f => (
                  <button key={f} onClick={() => setOutcomeFilter(f)}
                    className={cn("px-4 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer",
                      outcomeFilter === f
                        ? f === 'Converted' ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                          : f === 'Lost' ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                          : "bg-primary/15 border-primary/30 text-primary"
                        : "bg-card border-white/[0.06] text-muted-foreground hover:text-foreground")}>
                    {f === 'all' ? 'All' : f}
                    {f !== 'all' && <span className="ml-1.5 text-xs opacity-70">{outcomes?.filter((o: LeadOutcome) => o.outcome === f).length || 0}</span>}
                  </button>
                ))}
              </div>
            </div>

            <Card className="overflow-hidden rounded-2xl border-white/[0.06]">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.04] text-xs font-medium text-muted-foreground bg-white/[0.02]">
                      <th className="px-4 py-3.5">Outcome</th>
                      <th className="px-4 py-3.5">Lead</th>
                      <th className="px-4 py-3.5">Reason</th>
                      <th className="px-4 py-3.5">Note</th>
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {outcomesLoading
                      ? [...Array(4)].map((_, i) => <tr key={i}><td colSpan={6} className="p-4"><Skeleton className="h-10 w-full rounded-xl" /></td></tr>)
                      : filteredOutcomes.length === 0
                        ? <tr><td colSpan={6} className="py-16 text-center text-sm text-muted-foreground">No outcomes recorded yet.</td></tr>
                        : filteredOutcomes.map((o: LeadOutcome) => (
                          <tr key={o.id} className="group hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-4">
                              {o.outcome === 'Converted'
                                ? <Badge variant="teal" className="flex items-center gap-1.5 w-fit"><CheckCircle size={11} /> Converted</Badge>
                                : <Badge variant="danger" className="flex items-center gap-1.5 w-fit"><XCircle size={11} /> Lost</Badge>}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold",
                                  o.outcome === 'Converted' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                                  {o.lead_name?.[0] || '?'}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{o.lead_name}</p>
                                  <p className="text-xs text-muted-foreground">{o.phone_number}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 max-w-[180px]"><p className="text-xs text-muted-foreground truncate">{o.reason || '—'}</p></td>
                            <td className="px-4 py-4 max-w-[200px]"><p className="text-xs text-muted-foreground line-clamp-2">{o.note || '—'}</p></td>
                            <td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap">
                              {o.outcome_date ? (() => { try { return format(new Date(o.outcome_date), 'MMM dd, yyyy'); } catch { return o.outcome_date; } })() : '—'}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingOutcome(o); setEditForm({ reason: o.reason || '', note: o.note || '' }); }}
                                  className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors cursor-pointer" title="Edit">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => { if (confirm(`Delete this ${o.outcome} record for ${o.lead_name}? The lead status will be reverted.`)) deleteOutcomeMutation.mutate(o.id); }}
                                  className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground transition-colors cursor-pointer" title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Edit Modal */}
            {editingOutcome && (
              <Modal isOpen={true} onClose={() => setEditingOutcome(null)} title={`Edit ${editingOutcome.outcome} — ${editingOutcome.lead_name}`}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Reason</label>
                    <input value={editForm.reason} onChange={e => setEditForm(f => ({ ...f, reason: e.target.value }))}
                      className="w-full bg-secondary border border-border rounded-2xl p-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Note</label>
                    <textarea value={editForm.note} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} rows={4}
                      className="w-full bg-secondary border border-border rounded-2xl p-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="primary" className="flex-1 rounded-2xl"
                      loading={updateOutcomeMutation.isPending}
                      onClick={() => updateOutcomeMutation.mutate({ id: editingOutcome.id, updates: editForm })}>
                      Save Changes
                    </Button>
                    <Button variant="ghost" className="flex-1 rounded-2xl" onClick={() => setEditingOutcome(null)}>Cancel</Button>
                  </div>
                </div>
              </Modal>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {drilldown.isOpen && (
        <DrilldownTable leads={drilldown.leads} title={drilldown.title}
          onClose={() => setDrilldown(p => ({ ...p, isOpen: false }))} navigate={navigate} />
      )}
      <LeadWorkflowModals isOpen={workflowModal.isOpen} onClose={() => setWorkflowModal({ ...workflowModal, isOpen: false })} lead={workflowModal.lead} type={workflowModal.type} />
    </PageShell>
  );
};

export default LeadsExplorerPage;
