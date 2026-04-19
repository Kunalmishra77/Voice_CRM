import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, BrainCircuit, Activity, Network, ArrowRight,
  Mic, RefreshCw, Flame, Thermometer, Snowflake,
  PhoneCall, CheckCircle2, Timer, BarChart2, Loader2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { SectionCard } from '../../ui/SectionCard';
import { EmptyState } from '../../ui/EmptyState';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { Skeleton } from '../../ui/Skeleton';
import { useGlobalFilters } from '../../state/globalFiltersStore';
import { dataProvider } from '../../data/dataProvider';
import { type LeadInsightRow, type LeadInsightsSummary } from '../../data/api';
import { cn } from '../../lib/utils';
import { PageShell } from '../../ui/PageShell';
import { ChartContainer } from '../../ui/ChartContainer';

/* ── Helpers ─────────────────────────────────────────────────── */
function fmtDuration(secs: number | string | undefined): string {
  const s = typeof secs === 'string' ? parseInt(secs, 10) : (secs || 0);
  if (!s || isNaN(s)) return '—';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${s}s`;
}

/* ── Sentiment colours matching the rest of the app ─────────── */
const HOT_COLOR  = '#ef4444';
const WARM_COLOR = '#f59e0b';
const COLD_COLOR = '#3b82f6';

const CONCERN_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#818cf8', '#7c3aed', '#9333ea', '#a855f7', '#c026d3', '#db2777',
];

const CallInsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const { dateRange, leadType } = useGlobalFilters();

  const { data: summary, isLoading, isFetching, refetch } = useQuery<LeadInsightsSummary>({
    queryKey: ['call-insights-summary', dateRange, leadType],
    queryFn: () => dataProvider.getLeadInsightsSummary(dateRange, leadType),
    staleTime: 60000,
  });

  /* ── Derived stats ─────────────────────────────────────────── */
  const stats = useMemo(() => {
    const leads: LeadInsightRow[] = summary?.highIntentLeads ?? [];
    if (!summary) return null;

    // Use direct counts from backend — reliable regardless of date grouping
    const total     = summary.totalLeads ?? 0;
    const totalHot  = summary.hotCount  ?? 0;
    const totalWarm = summary.warmCount ?? 0;
    const totalCold = summary.coldCount ?? 0;

    const hotPct  = total > 0 ? Math.round((totalHot  / total) * 100) : 0;
    const coldPct = total > 0 ? Math.round((totalCold / total) * 100) : 0;
    const warmPct = total > 0 ? Math.round((totalWarm / total) * 100) : 0;

    const avgDur = summary.avgDuration ?? 0;

    return { total, totalHot, totalWarm, totalCold, hotPct, warmPct, coldPct, avgDur };
  }, [summary]);

  const handleRefresh = () => {
    refetch();
    toast.success('Refreshing insights…');
  };

  /* ── Concern bar chart data ────────────────────────────────── */
  const concernChartData = useMemo(() =>
    (summary?.topConcerns ?? []).slice(0, 8).map((c, i) => ({
      ...c,
      color: CONCERN_COLORS[i % CONCERN_COLORS.length],
      // Truncate long names for the chart axis
      shortName: c.name.length > 40 ? c.name.substring(0, 40) + '…' : c.name,
    })),
  [summary]);

  return (
    <PageShell>
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-none">Insights</h1>
          <p className="text-muted-foreground font-medium mt-1">
            Call sentiment analysis and lead scoring overview.
            {leadType !== 'all' && (
              <span className="ml-2 text-primary font-bold capitalize">({leadType} leads)</span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          className="rounded-2xl px-6 h-10 text-xs font-semibold gap-2"
        >
          {isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </Button>
      </div>

      {/* ── Summary KPI bar ──────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Calls',      value: stats.total,               icon: PhoneCall,     color: 'text-primary',        bg: 'bg-primary/10',        border: 'border-primary/20' },
            { label: 'Hot Rate',         value: `${stats.hotPct}%`,        icon: Flame,         color: 'text-rose-500',       bg: 'bg-rose-500/10',       border: 'border-rose-500/20' },
            { label: 'Cold Rate',        value: `${stats.coldPct}%`,       icon: Snowflake,     color: 'text-blue-500',       bg: 'bg-blue-500/10',       border: 'border-blue-500/20' },
            { label: 'Avg Duration',     value: fmtDuration(stats.avgDur), icon: Timer,         color: 'text-amber-500',      bg: 'bg-amber-500/10',      border: 'border-amber-500/20' },
          ].map((card, i) => (
            <div key={i} className={cn("p-5 rounded-2xl border flex items-center gap-4", card.bg, card.border)}>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", card.bg, card.color)}>
                <card.icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tracking-tight">{card.value}</p>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">{card.label}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Sentiment trend + Objections ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-8">
        <div className="lg:col-span-2 flex flex-col h-full">
          <SectionCard
            title="Sentiment Trend"
            subtitle="Hot / Warm / Cold lead distribution over time."
            icon={<TrendingUp size={18} className="text-primary" />}
            className="h-full flex-1"
            headerActions={
              <div className="hidden sm:flex gap-4">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: HOT_COLOR }} /><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hot</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: WARM_COLOR }} /><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Warm</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: COLD_COLOR }} /><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cold</span></div>
              </div>
            }
          >
            {isLoading ? (
              <Skeleton className="h-72 w-full rounded-2xl mt-4" />
            ) : !summary?.sentimentTrend?.length ? (
              <EmptyState icon={BarChart2} title="No trend data" description="No calls in this date range." />
            ) : (
              <ChartContainer height="100%" className="min-h-[320px] w-full mt-4 flex-1">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={summary.sentimentTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradHot"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={HOT_COLOR}  stopOpacity={0.25}/><stop offset="95%" stopColor={HOT_COLOR}  stopOpacity={0}/></linearGradient>
                      <linearGradient id="gradWarm" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={WARM_COLOR} stopOpacity={0.20}/><stop offset="95%" stopColor={WARM_COLOR} stopOpacity={0}/></linearGradient>
                      <linearGradient id="gradCold" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLD_COLOR} stopOpacity={0.20}/><stop offset="95%" stopColor={COLD_COLOR} stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '700', fill: 'var(--muted-foreground)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '700', fill: 'var(--muted-foreground)' }} />
                    <Tooltip
                      cursor={false}
                      contentStyle={{ borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--card)', backdropFilter: 'blur(10px)' }}
                      formatter={(val: any, name: any) => [val, name === 'pos' ? 'Hot' : name === 'neu' ? 'Warm' : 'Cold'] as [any, string]}
                    />
                    <Area type="monotone" dataKey="pos" stroke={HOT_COLOR}  strokeWidth={2.5} fillOpacity={1} fill="url(#gradHot)"  name="Hot" />
                    <Area type="monotone" dataKey="neu" stroke={WARM_COLOR} strokeWidth={2.5} fillOpacity={1} fill="url(#gradWarm)" name="Warm" />
                    <Area type="monotone" dataKey="neg" stroke={COLD_COLOR} strokeWidth={2.5} fillOpacity={1} fill="url(#gradCold)" name="Cold" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </SectionCard>
        </div>

        <div className="h-full flex flex-col">
          <SectionCard
            title="Common Objections"
            subtitle="Top friction points from call summaries."
            icon={<BrainCircuit size={18} className="text-purple-500" />}
            className="h-full flex-1"
          >
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mt-3 max-h-[360px] space-y-2 pb-2">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)
                : !summary?.topConcerns?.length
                ? <EmptyState icon={BrainCircuit} title="No objections found" description="No call summaries in this range." />
                : summary.topConcerns.map((conc, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-secondary/50 border border-border/50 flex items-start justify-between gap-3 group hover:border-primary/30 hover:bg-secondary transition-all">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: CONCERN_COLORS[i % CONCERN_COLORS.length] }} />
                        <span className="text-xs font-semibold text-foreground/90 leading-relaxed line-clamp-2">{conc.name}</span>
                      </div>
                      <Badge variant="zinc" className="text-[10px] tabular-nums font-bold px-2 py-0.5 rounded-lg border-none bg-background shadow-sm text-foreground flex-shrink-0">{conc.count}</Badge>
                    </div>
                  ))
              }
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Objection bar chart ───────────────────────────────── */}
      {!isLoading && concernChartData.length > 0 && (
        <SectionCard title="Objection Frequency" subtitle="How often each objection appears in calls." icon={<BarChart2 size={18} className="text-indigo-500" />} className="mb-8">
          <ChartContainer height={220} className="mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={concernChartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.4} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                <YAxis type="category" dataKey="shortName" width={180} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                <Tooltip
                  cursor={{ fill: 'var(--accent)', opacity: 0.5 }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)' }}
                  formatter={(val: any) => [val, 'Occurrences']}
                  labelFormatter={(label) => concernChartData.find(c => c.shortName === label)?.name ?? label}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={20}>
                  {concernChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </SectionCard>
      )}

      {/* ── Top Hot Leads ─────────────────────────────────────── */}
      <SectionCard
        title="Top Hot Leads"
        subtitle="High-intent leads requiring immediate follow-up."
        icon={<Network size={18} className="text-orange-500" />}
        className="mb-10"
      >
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mt-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-60 w-full rounded-2xl" />)}
          </div>
        ) : !summary?.highIntentLeads?.length ? (
          <EmptyState icon={Flame} title="No hot leads" description="No high-intent leads in this date range." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mt-4">
            {summary.highIntentLeads.map((lead) => (
              <Card
                key={lead.id}
                onClick={() => navigate(`/leads/${lead.id}`)}
                className="p-6 flex flex-col justify-between hover:border-border hover:scale-[1.02] transition-all cursor-pointer group relative overflow-hidden h-64 bg-card border border-border shadow-sm"
              >
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm group-hover:scale-110 transition-transform" style={{ background: 'linear-gradient(to top right, #ef4444, #f59e0b)' }}>
                      {lead['User Name']?.[0] || 'U'}
                    </div>
                    <Badge variant="danger" className="text-[8px] animate-pulse rounded-full px-2 uppercase font-semibold">HOT</Badge>
                  </div>
                  <h4 className="text-[14px] font-bold text-foreground tracking-tight line-clamp-1">{lead['User Name'] || 'Unknown'}</h4>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-1 tracking-tight truncate">{lead['Phone Number']}</p>
                  <p className="text-[11px] font-medium text-muted-foreground line-clamp-2 mt-4 leading-relaxed">"{lead.concern}"</p>
                </div>
                <div className="mt-auto relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[11px]" style={{ color: 'var(--brand-500)' }}>
                    <Activity size={14} /> Score: {lead.scoring.score}%
                  </div>
                  <div className="p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all" style={{ background: 'var(--brand-50)', color: 'var(--brand-500)' }}>
                    <ArrowRight size={16} />
                  </div>
                </div>
                <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity" style={{ color: '#ef4444' }}>
                  <Flame size={120} fill="currentColor" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
};

export default CallInsightsPage;
