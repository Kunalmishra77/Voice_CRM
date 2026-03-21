import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, Flame, Zap, CheckCircle2, XCircle, TrendingUp, PhoneCall,
  Activity, FileSearch, Clock, Target, Radio, PieChart as PieIcon, BarChart4, Loader2, ArrowRight
} from 'lucide-react';
import { Card } from '../../ui/Card';
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
import { format, parseISO } from 'date-fns';

const CHART_COLORS = {
  hot: '#ef4444',
  warm: '#f59e0b',
  cold: '#3b82f6',
  brand: 'var(--brand-500)',
};

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border p-3 rounded-xl shadow-[var(--shadow-elevated)] text-foreground">
        <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                <span className="text-sm font-medium capitalize">{entry.name}</span>
              </div>
              <span className="text-sm font-semibold">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const KPICards = React.memo(({ kpis, handleStatClick }: { kpis: KPIStats | undefined, handleStatClick: (b?: string) => void }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
    <StatCard label="Total Leads" value={kpis?.totalLeads ?? 0} icon={Users} variant="teal" onClick={() => handleStatClick('all')} />
    <StatCard label="Hot" value={kpis?.hotLeads ?? 0} icon={Flame} variant="orange" onClick={() => handleStatClick('Hot')} />
    <StatCard label="Warm" value={kpis?.warmLeads ?? 0} icon={Zap} variant="purple" onClick={() => handleStatClick('Warm')} />
    <StatCard label="Cold" value={kpis?.coldLeads ?? 0} icon={Activity} variant="blue" onClick={() => handleStatClick('Cold')} />
    <StatCard label="Converted" value={kpis?.converted ?? 0} icon={CheckCircle2} variant="teal" onClick={() => handleStatClick('Converted')} />
    <StatCard label="Lost" value={kpis?.unconverted ?? 0} icon={XCircle} variant="danger" onClick={() => handleStatClick('Lost')} />
    <StatCard label="Pending" value={kpis?.pendingDecisions ?? 0} icon={Clock} variant="orange" onClick={() => handleStatClick('Pending')} />
    <StatCard label="Avg Score" value={kpis?.avgScore ?? 0} icon={Target} variant="blue" />
  </div>
));

const RecentActivityTable = React.memo(({ recentLeads, navigate }: { recentLeads: any[] | undefined, navigate: any }) => (
  <SectionCard title="Recent Activity" subtitle="Latest leads" icon={<Activity size={16} />}>
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border text-xs font-medium text-muted-foreground">
            <th className="px-4 py-3 font-medium">Lead</th>
            <th className="px-4 py-3 font-medium">Sentiment</th>
            <th className="px-4 py-3 font-medium text-center">Duration</th>
            <th className="px-4 py-3 font-medium text-right">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {(recentLeads || []).slice(0, 5).map((lead: any) => (
            <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} className="group hover:bg-accent/50 transition-colors cursor-pointer">
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold bg-primary shadow-sm">{lead['User Name']?.[0]}</div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{lead['User Name']}</span>
                    <span className="text-xs text-muted-foreground">{lead['Phone Number']}</span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <Badge variant={lead.sentiment === 'Hot' ? 'danger' : lead.sentiment === 'Warm' ? 'warning' : 'success'} className="font-medium text-xs">
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
                  } catch (e) {
                    return 'N/A';
                  }
                })()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </SectionCard>
));

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const { dateRange, datePreset } = useGlobalFilters();

  const [drilldown, setDrilldown] = useState<{ isOpen: boolean; title: string; date: string; data: LeadInsightRow[] }>({
    isOpen: false, title: '', date: '', data: []
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const { data: kpis, isLoading: kpisLoading } = useQuery<KPIStats>({
    queryKey: ['dashboard-kpis', dateRange],
    queryFn: () => dataProvider.getDashboardKPIs(dateRange),
  });

  const { data: trendData } = useQuery<TrendPoint[]>({
    queryKey: ['dashboard-trend', dateRange],
    queryFn: () => dataProvider.getLeadsTrend(dateRange, datePreset),
  });

  const { data: stageDistro } = useQuery<StagePoint[]>({
    queryKey: ['dashboard-stage', dateRange],
    queryFn: () => dataProvider.getStageDistribution(dateRange),
  });

  const { data: callTrend } = useQuery<VoiceTrendPoint[]>({
    queryKey: ['dashboard-call-trend', dateRange],
    queryFn: () => dataProvider.getVoiceTrend(dateRange, datePreset),
  });

  const { data: recentLeads } = useQuery({
    queryKey: ['recent-leads'],
    queryFn: () => dataProvider.getLeads({ range: dateRange, limit: 5 })
  });

  const handleStatClick = (bucket?: string) => {
    const params = new URLSearchParams();
    if (bucket) {
      if (['Hot', 'Warm', 'Cold', 'Average'].includes(bucket)) params.set('bucket', bucket);
      else params.set('status', bucket);
    }
    navigate(`/leads?${params.toString()}`);
  };

  const handleChartPointClick = async (point: any) => {
    if (!point || !point.activePayload || point.activePayload.length === 0) return;
    const label = point.activeLabel;
    const item = point.activePayload[0].payload;
    if (!item) return;
    toast.loading(`Loading details...`);
    const leads = await dataProvider.getLeads({ range: { from: item.from || item.name, to: item.to || item.name } });
    toast.dismiss();
    setDrilldown({ isOpen: true, title: `Activity Drilldown`, date: label, data: leads.slice(0, 10) });
  };

  const isDataEmpty = useMemo(() => {
    if (kpisLoading) return false;
    return !kpis || kpis.totalLeads === 0;
  }, [kpis, kpisLoading]);

  const ROW_HEIGHT = "h-[280px]";

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor leads, calls and performance metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/leads')} className="rounded-xl h-9 bg-card">View Leads</Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/live-calls')} className="rounded-xl h-9 shadow-sm"><Radio size={14} className="mr-2" /> Live Feed</Button>
        </div>
      </div>

      {isDataEmpty ? (
        <div className="py-20 flex-1"><EmptyState icon={FileSearch} title="No data found" description="Adjust your filters to see metrics." onAction={() => {}} /></div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <KPICards kpis={kpis} handleStatClick={handleStatClick} />

          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            {/* Left Col (Charts) */}
            <div className="xl:col-span-2 flex flex-col gap-6">
              <SectionCard title="Lead Acquisition Trend" subtitle="Volume over time" icon={<TrendingUp size={16} />} className={ROW_HEIGHT}>
                <div className="w-full h-full pb-2">
                  {isMounted ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart data={trendData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onClick={handleChartPointClick}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                        <Tooltip cursor={{ fill: 'var(--accent)' }} content={<CustomChartTooltip />} />
                        <Bar dataKey="hot" fill={CHART_COLORS.hot} radius={[3, 3, 0, 0]} barSize={18} stackId="a" />
                        <Bar dataKey="warm" fill={CHART_COLORS.warm} radius={[0, 0, 0, 0]} barSize={18} stackId="a" />
                        <Bar dataKey="cold" fill={CHART_COLORS.cold} radius={[0, 0, 0, 0]} barSize={18} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Interaction Volume" subtitle="Signal flow" icon={<BarChart4 size={16} />} className={ROW_HEIGHT}>
                <div className="w-full h-full pb-2">
                  {isMounted ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <AreaChart data={callTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onClick={handleChartPointClick}>
                        <defs><linearGradient id="colorC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--brand-500)" stopOpacity={0.25}/><stop offset="95%" stopColor="var(--brand-500)" stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                        <Tooltip cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '3 3' }} content={<CustomChartTooltip />} />
                        <Area type="monotone" dataKey="messages" name="Calls" stroke="var(--brand-500)" strokeWidth={2} fill="url(#colorC)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
                  )}
                </div>
              </SectionCard>
            </div>

            {/* Right Col (Distribution) */}
            <div className="xl:col-span-1">
              <SectionCard title="Lead Distribution" icon={<PieIcon size={16} />} className="h-[584px]">
                <div className="flex flex-col items-center justify-center h-full gap-6 py-6">
                  {/* Legend */}
                  <div className="w-full grid grid-cols-2 gap-3 px-2">
                    {[
                      { name: 'Hot', color: '#ef4444' },
                      { name: 'Warm', color: '#f59e0b' },
                      { name: 'Cold', color: '#3b82f6' },
                      { name: 'Average', color: '#10b981' }
                    ].map((item) => {
                      const val = stageDistro?.find(s => s.name === (item.name === 'Average' ? 'null' : item.name))?.value || 0;
                      return (
                        <div key={item.name} onClick={() => handleStatClick(item.name)} className="flex items-center justify-between p-3 rounded-xl bg-secondary border border-border hover:border-primary/20 cursor-pointer transition-all group">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{item.name}</span>
                          </div>
                          <span className="text-xs font-bold text-foreground tabular-nums">{val}%</span>
                        </div>
                      );
                    })}
                  </div>

                  <div onClick={() => handleStatClick('all')} className="w-full max-w-[200px] flex items-center justify-between p-3 px-5 rounded-xl border cursor-pointer transition-all group mx-4" style={{ background: 'var(--brand-50)', borderColor: 'var(--brand-200)' }}>
                    <span className="text-xs font-bold tracking-wide" style={{ color: 'var(--brand-700)' }}>All Leads</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" style={{ color: 'var(--brand-500)' }} />
                  </div>

                  {/* Pie Chart */}
                  <div className="flex-1 flex items-center justify-center w-full">
                    {isMounted && stageDistro && stageDistro.length > 0 ? (
                      <div className="relative flex items-center justify-center cursor-pointer" onClick={() => handleStatClick('all')}>
                        <PieChart width={200} height={200}>
                          <Pie data={stageDistro} innerRadius={65} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none" cx="50%" cy="50%">
                            {stageDistro.map((e, i) => <Cell key={i} fill={e.color} className="outline-none hover:opacity-80 transition-opacity cursor-pointer" />)}
                          </Pie>
                        </PieChart>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-3xl font-bold text-foreground tracking-tight tabular-nums">{kpis?.totalLeads ?? 0}</span>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">Total</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-[200px] h-[200px] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-500)' }} /></div>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

          <RecentActivityTable recentLeads={recentLeads} navigate={navigate} />
        </div>
      )}

      <Modal isOpen={drilldown.isOpen} onClose={() => setDrilldown(p => ({ ...p, isOpen: false }))} title={`${drilldown.title} — ${drilldown.date}`} className="max-w-xl">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar pb-2">
          {drilldown.data.length > 0 ? drilldown.data.map((l) => (
            <div key={l.id} onClick={() => { setDrilldown(p => ({ ...p, isOpen: false })); navigate(`/leads/${l.id}`); }} className="p-3.5 rounded-xl border border-border hover:bg-accent cursor-pointer flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-semibold text-xs bg-primary shadow-sm">{l['User Name']?.[0] || 'U'}</div>

                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">{l['User Name']}</span>
                  <span className="text-xs text-muted-foreground">{l['Phone Number']}</span>
                </div>
              </div>
              <Badge variant={l.scoring.bucket === 'Hot' ? 'danger' : l.scoring.bucket === 'Warm' ? 'warning' : 'teal'} className="font-medium">{l.scoring.bucket}</Badge>
            </div>
          )) : <div className="text-center py-8 text-muted-foreground text-sm font-medium">No records found.</div>}
        </div>
      </Modal>
    </PageShell>
  );
};

export default DashboardPage;
