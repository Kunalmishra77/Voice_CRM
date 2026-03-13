import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Flame, Zap, CheckCircle2, XCircle, TrendingUp, PhoneCall,
  Activity, UserPlus, FileSearch, Clock, Target, Radio, PieChart as PieIcon, BarChart4, Loader2, ArrowRight, Play
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
import type { KPIStats, TrendPoint, StagePoint, VoicePulse, VoiceTrendPoint, LeadInsightRow } from '../../data/api';
import { useNavigate } from 'react-router-dom';
import { useGlobalFilters } from '../../state/globalFiltersStore';
import { PageShell } from '../../ui/PageShell';
import { StatCard } from '../../ui/StatCard';
import { SectionCard } from '../../ui/SectionCard';
import { EmptyState } from '../../ui/EmptyState';
import { Modal } from '../../ui/Modal';
import { format, parseISO } from 'date-fns';

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border p-3 rounded-xl shadow-premium text-foreground">
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

const PieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border p-2.5 px-4 rounded-xl shadow-premium text-foreground">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.color || payload[0].fill }} />
          <span className="text-xs font-semibold capitalize">{payload[0].name}</span>
          <span className="text-xs font-bold ml-2">{payload[0].value}%</span>
        </div>
      </div>
    );
  }
  return null;
};

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

  const ROW_HEIGHT = "h-[300px]";

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor real-time system performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/leads')} className="rounded-lg h-9 bg-card">View Registry</Button>
          <Button variant="primary" size="sm" className="rounded-lg h-9 shadow-sm"><Radio size={14} className="mr-2" /> Live Intercept</Button>
        </div>
      </div>

      {isDataEmpty ? (
        <div className="py-20 flex-1"><EmptyState icon={FileSearch} title="No data found" description="Adjust your filters to see metrics." onAction={() => {}} /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            <StatCard label="Total Leads" value={kpis?.totalLeads ?? 0} icon={Users} onClick={() => handleStatClick('all')} />
            <StatCard label="Hot" value={kpis?.hotLeads ?? 0} icon={Flame} variant="orange" onClick={() => handleStatClick('Hot')} />
            <StatCard label="Warm" value={kpis?.warmLeads ?? 0} icon={Zap} variant="purple" onClick={() => handleStatClick('Warm')} />
            <StatCard label="Cold" value={kpis?.coldLeads ?? 0} icon={Activity} variant="blue" onClick={() => handleStatClick('Cold')} />
            <StatCard label="Converted" value={kpis?.converted ?? 0} icon={CheckCircle2} variant="teal" onClick={() => handleStatClick('Converted')} />
            <StatCard label="Lost" value={kpis?.unconverted ?? 0} icon={XCircle} variant="danger" onClick={() => handleStatClick('Lost')} />
            <StatCard label="Pending" value={kpis?.pendingDecisions ?? 0} icon={Clock} variant="orange" onClick={() => handleStatClick('Pending')} />
            <StatCard label="Avg Score" value={kpis?.avgScore ?? 0} icon={Target} variant="blue" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            {/* Left Col (Charts) */}
            <div className="xl:col-span-2 flex flex-col gap-6">
              <SectionCard title="Acquisition Trend" subtitle="Volume over time" icon={<TrendingUp size={16} />} className={ROW_HEIGHT}>
                <div className="w-full h-full pb-2">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={trendData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onClick={handleChartPointClick}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                      <Tooltip cursor={{ fill: 'var(--accent)' }} content={<CustomChartTooltip />} />
                      <Bar dataKey="hot" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={16} stackId="a" />
                      <Bar dataKey="warm" fill="#f59e0b" radius={[0, 0, 0, 0]} barSize={16} stackId="a" />
                      <Bar dataKey="cold" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={16} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard title="Interaction Volume" subtitle="Signal flow" icon={<BarChart4 size={16} />} className={ROW_HEIGHT}>
                <div className="w-full h-full pb-2">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={callTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onClick={handleChartPointClick}>
                      <defs><linearGradient id="colorC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                      <Tooltip cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '3 3' }} content={<CustomChartTooltip />} />
                      <Area type="monotone" dataKey="messages" name="Signals" stroke="#3b82f6" strokeWidth={2} fill="url(#colorC)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            </div>

            {/* Right Col (Pie) */}
            <div className="xl:col-span-1">
               <SectionCard title="Distribution" icon={<PieIcon size={16} />} className="h-[280px]">
                 <div className="flex flex-row items-center h-full gap-4">
                    {/* Left: Legend */}
                    <div className="flex-1 space-y-0.5">
                        {[
                          { name: 'Hot', color: '#ef4444' },
                          { name: 'Warm', color: '#f59e0b' },
                          { name: 'Cold', color: '#3b82f6' },
                          { name: 'Average', color: '#10b981' }
                        ].map((item) => {
                            const val = stageDistro?.find(s => s.name === (item.name === 'Average' ? 'null' : item.name))?.value || 0;
                            return (
                                <div key={item.name} onClick={() => handleStatClick(item.name)} className="flex items-center justify-between p-1.5 rounded-md hover:bg-accent cursor-pointer transition-colors group">
                                  <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                                      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-tight">{item.name}</span>
                                  </div>
                                  <span className="text-[11px] font-semibold text-foreground">{val}%</span>
                                </div>
                            );
                        })}
                        <div onClick={() => handleStatClick('all')} className="flex items-center justify-between p-1.5 rounded-md hover:bg-accent cursor-pointer transition-colors group mt-1 pt-2 border-t border-border/50">
                          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground uppercase tracking-tight">Registry</span>
                          <ArrowRight size={10} className="text-muted-foreground group-hover:text-foreground" />
                        </div>
                    </div>

                    {/* Right: Pie Chart */}
                    <div className="flex-shrink-0">
                      {isMounted && stageDistro && stageDistro.length > 0 ? (
                        <div className="relative flex items-center justify-center cursor-pointer" onClick={() => handleStatClick('all')}>
                          <PieChart width={140} height={140}>
                              <Pie 
                                data={stageDistro} 
                                innerRadius={45} 
                                outerRadius={65} 
                                paddingAngle={4} 
                                dataKey="value" 
                                stroke="none"
                                cx="50%"
                                cy="50%"
                              >
                              {stageDistro.map((e, i) => <Cell key={i} fill={e.color} className="outline-none hover:opacity-80 transition-opacity cursor-pointer" />)}
                              </Pie>
                          </PieChart>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-lg font-bold text-foreground leading-none">{kpis?.totalLeads ?? 0}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-[140px] h-[140px] flex items-center justify-center"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
                      )}
                    </div>
                 </div>
               </SectionCard>
            </div>
          </div>

          <SectionCard title="Recent Activity" subtitle="Latest intercepts" icon={<Activity size={16} />}>
             <div className="overflow-x-auto w-full">
                <table className="w-full text-left">
                   <thead>
                      <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                         <th className="px-4 py-3 font-medium">Entity</th>
                         <th className="px-4 py-3 font-medium">Sentiment</th>
                         <th className="px-4 py-3 font-medium text-center">Duration</th>
                         <th className="px-4 py-3 font-medium text-right">Time</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-border">
                      {(recentLeads || []).slice(0, 5).map((lead: any) => (
                        <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} className="group hover:bg-accent transition-colors cursor-pointer">
                           <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">{lead['User Name']?.[0]}</div>
                                 <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-foreground">{lead['User Name']}</span>
                                    <span className="text-xs text-muted-foreground">{lead['Phone Number']}</span>
                                 </div>
                              </div>
                           </td>
                           <td className="px-4 py-3.5">
                              <Badge variant={lead.sentiment === 'Hot' ? 'danger' : lead.sentiment === 'Warm' ? 'warning' : 'success'} className="px-2.5 py-0.5 rounded-md font-medium text-xs">
                                {lead.sentiment}
                              </Badge>
                           </td>
                           <td className="px-4 py-3.5 text-center text-sm font-medium text-foreground">{lead.duration}s</td>
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
        </div>
      )}

      <Modal isOpen={drilldown.isOpen} onClose={() => setDrilldown(p => ({ ...p, isOpen: false }))} title={`${drilldown.title} — ${drilldown.date}`} className="max-w-xl">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar pb-2">
          {drilldown.data.length > 0 ? drilldown.data.map((l) => (
            <div key={l.id} onClick={() => { setDrilldown(p => ({ ...p, isOpen: false })); navigate(`/leads/${l.id}`); }} className="p-3.5 rounded-lg border border-border hover:bg-accent cursor-pointer flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">{l['User Name']?.[0] || 'U'}</div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">{l['User Name']}</span>
                  <span className="text-xs text-muted-foreground">{l['Phone Number']}</span>
                </div>
              </div>
              <Badge variant={l.scoring.bucket === 'Hot' ? 'danger' : l.scoring.bucket === 'Warm' ? 'warning' : 'warning'} className="rounded-md font-medium">{l.scoring.bucket}</Badge>
            </div>
          )) : <div className="text-center py-8 text-muted-foreground text-sm font-medium">No records found.</div>}
        </div>
      </Modal>
    </PageShell>
  );
};

export default DashboardPage;
