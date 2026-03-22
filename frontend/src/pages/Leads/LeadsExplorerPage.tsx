import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search, LayoutDashboard, Table as TableIcon, Download, ChevronRight, Loader2, TrendingUp, Target, CheckCircle2, Circle, X, ChevronDown, Calendar, Eye, FileSearch
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';

import { dataProvider } from '../../data/dataProvider';
import { type LeadInsightRow } from '../../data/api';
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
  Converted: '#06b6d4', Lost: '#64748b', Pending: '#a855f7'
};

const LOST_STATUSES = ['crm_lost', 'not interested', 'wrong number', 'busy', 'voicemail'];

const BUCKET_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Hot', label: 'Hot' },
  { value: 'Warm', label: 'Warm' },
  { value: 'Cold', label: 'Cold' },
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
    case 'all': return { from: '2000-01-01', to: '2100-12-31' };
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
                <Badge variant={l.sentiment === 'Hot' ? 'danger' : l.sentiment === 'Warm' ? 'warning' : l.sentiment === 'Cold' ? 'info' : 'default'}
                  className="font-medium text-xs">{l.sentiment || l.scoring?.bucket}</Badge>
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
  const { dateRange, searchQuery, selectedAgent, selectedStage, lastUpdated } = useGlobalFilters();
  const range = dateRange;
  const queryParams = new URLSearchParams(location.search);

  const activeTab = (queryParams.get('tab') as 'overview' | 'table') || 'overview';
  const bucket = queryParams.get('bucket') || 'all';
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

  // Effective ranges for each graph
  const trendRange = useMemo(() => getTimeframeRange(trendTimeframe, range), [trendTimeframe, range]);
  const pieRange = useMemo(() => getTimeframeRange(pieTimeframe, range), [pieTimeframe, range]);

  /* ─── Data Queries ─── */
  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads-table', dateRange, bucket, localSearch, selectedAgent, selectedStage, lastUpdated],
    queryFn: () => dataProvider.getLeads({ range, bucket, search: localSearch, agent: selectedAgent, stage: selectedStage }),
    staleTime: 30000
  });

  const { data: kpis } = useQuery({
    queryKey: ['dashboard-kpis', range, lastUpdated],
    queryFn: () => dataProvider.getDashboardKPIs(range),
    staleTime: 30000
  });

  const { data: trendData } = useQuery({
    queryKey: ['leads-trend', trendRange, bucket, lastUpdated],
    queryFn: () => dataProvider.getLeadsTrend(trendRange, 'weekly', bucket),
    staleTime: 30000
  });

  const { data: stageDistro } = useQuery({
    queryKey: ['leads-stage', pieRange, lastUpdated],
    queryFn: () => dataProvider.getStageDistribution(pieRange),
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

    if (bucket === 'Pending') {
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
  }, [effectiveLeads, bucket, stageDistro]);

  /* ─── Check if trend has any data ─── */
  const trendHasData = useMemo(() => {
    if (!trendData?.length) return false;
    return trendData.some(p => p.hot + p.warm + p.cold + p.converted + p.lost > 0);
  }, [trendData]);

  /* ─── Bar chart: which bars to show based on bucket ─── */
  const visibleBars = useMemo(() => {
    if (bucket === 'all') return ['hot', 'warm', 'cold', 'converted', 'lost'];
    if (bucket === 'Hot') return ['hot'];
    if (bucket === 'Warm') return ['warm'];
    if (bucket === 'Cold') return ['cold'];
    if (bucket === 'Converted') return ['converted'];
    if (bucket === 'Lost') return ['hot', 'warm', 'cold'];
    if (bucket === 'Pending') return ['hot', 'warm', 'cold'];
    return ['hot', 'warm', 'cold', 'converted', 'lost'];
  }, [bucket]);

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
    if (['hot', 'warm', 'cold'].includes(barKey)) {
      filtered = dayLeads.filter(l => l.sentiment === capitalize);
    } else if (barKey === 'converted') {
      filtered = dayLeads.filter(l => (l.status as any) === 'crm_converted');
    } else if (barKey === 'lost') {
      filtered = dayLeads.filter(l => LOST_STATUSES.includes((l.status as any)));
    }
    setDrilldown({ isOpen: true, title: `${capitalize} Leads — ${day.name}`, leads: filtered });
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
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Name,Phone,Status,Sentiment,Summary\n"
      + data.map(l => `${l['User Name']},${l['Phone Number']},${l.status},${l.sentiment},"${l.concern}"`).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success(`Export successful.`);
    setIsExportOpen(false);
  };

  const handleExportAction = async (type: 'all' | 'hot' | 'warm' | 'cold' | 'selection' | 'current') => {
    if (type === 'selection') {
      downloadCSV(leads?.filter(l => selectedIds.includes(l.id)) || [], `particular_selection`);
    } else if (type === 'all') {
      const all = await dataProvider.getLeads({ range: { from: '2000-01-01', to: '2100-01-01' }, bucket: 'all' });
      downloadCSV(all, `all_leads`);
    } else if (['hot', 'warm', 'cold'].includes(type)) {
      const segment = await dataProvider.getLeads({ range, bucket: type.charAt(0).toUpperCase() + type.slice(1) });
      downloadCSV(segment, `segment_${type}`);
    } else {
      downloadCSV(leads || [], `filtered_view`);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === (leads?.length || 0)) setSelectedIds([]);
    else setSelectedIds(leads?.map(l => l.id) || []);
  };

  const pieSubtitle = useMemo(() => {
    if (bucket === 'Lost') return 'Sentiment of lost leads';
    if (bucket === 'Pending') return 'Sentiment of pending leads';
    if (['Hot', 'Warm', 'Cold', 'Converted'].includes(bucket)) return `${bucket} leads only`;
    return 'Lead distribution';
  }, [bucket]);

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
                      <button onClick={() => handleExportAction('selection')} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent flex items-center justify-between cursor-pointer" style={{ color: 'var(--brand-600)' }}><span>Selected</span><Badge variant="teal">{selectedIds.length}</Badge></button>
                      <div className="h-px bg-border mx-2 my-1" />
                    </>
                  )}
                  <button onClick={() => handleExportAction('all')} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent text-foreground/70 transition-colors cursor-pointer">Full Database</button>
                  <div className="h-px bg-border mx-2 my-1" />
                  <button onClick={() => handleExportAction('hot')} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent text-rose-500 transition-colors cursor-pointer">Hot Segment</button>
                  <button onClick={() => handleExportAction('warm')} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent text-amber-500 transition-colors cursor-pointer">Warm Segment</button>
                  <button onClick={() => handleExportAction('cold')} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent text-blue-500 transition-colors cursor-pointer">Cold Segment</button>
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

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' ? (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* ── Acquisition Trend ── */}
              <div className="lg:col-span-8">
                <SectionCard
                  title="Acquisition Trend"
                  subtitle={bucket !== 'all' ? `Showing ${bucket} leads` : 'Daily capture rate'}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Hot', count: kpis?.bucketCounts?.['Hot'] || 0, color: COLORS.Hot, bucket: 'Hot' },
                { label: 'Warm', count: kpis?.bucketCounts?.['Warm'] || 0, color: COLORS.Warm, bucket: 'Warm' },
                { label: 'Cold', count: kpis?.bucketCounts?.['Cold'] || 0, color: COLORS.Cold, bucket: 'Cold' },
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
        ) : (
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
                      const showActionBtns = ['Hot', 'Warm', 'Cold'].includes(bucket);
                      const isSelected = selectedIds.includes(lead.id);
                      return (
                        <tr key={lead.id} className={cn("group transition-colors cursor-pointer", isSelected ? "bg-primary/5" : "hover:bg-white/[0.02]")} onClick={() => navigate(`/leads/${lead.id}`)}>
                          <td className="p-4 text-center cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedIds(prev => prev.includes(lead.id) ? prev.filter(i => i !== lead.id) : [...prev, lead.id]); }}>
                            <div className="text-muted-foreground hover:text-foreground mx-auto flex items-center justify-center">{isSelected ? <CheckCircle2 size={16} className="text-primary" /> : <Circle size={16} />}</div>
                          </td>
                          <td className="px-4 py-4"><Badge variant={lead.scoring.bucket === 'Hot' ? 'danger' : lead.scoring.bucket === 'Warm' ? 'warning' : 'default'} className="font-medium text-xs">{lead.scoring.bucket}</Badge></td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-semibold text-xs bg-gradient-to-br from-primary to-primary/70 shadow-[0_4px_12px_rgba(var(--brand-rgb),0.3)]">{lead['User Name']?.[0]}</div>
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-foreground">{lead['User Name']}</span>
                                <span className="text-xs text-muted-foreground">{lead['Phone Number']}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 max-w-[300px]"><p className="text-sm text-muted-foreground line-clamp-1">{lead['Conversation Summary'] || '...'}</p></td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {showActionBtns && (
                                <>
                                  <button onClick={(e) => { e.stopPropagation(); setWorkflowModal({ isOpen: true, lead, type: 'Converted' }); }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors cursor-pointer"><CheckCircle2 size={16} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); setWorkflowModal({ isOpen: true, lead, type: 'NotInterested' }); }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"><X size={16} /></button>
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
        )}
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
