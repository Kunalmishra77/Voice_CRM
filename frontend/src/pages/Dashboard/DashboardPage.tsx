import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Flame, Zap, CheckCircle2, XCircle, TrendingUp, PhoneCall,
  Activity, UserPlus, FileClock, FileSearch, Clock, ArrowRight,
  ExternalLink, Search, Calendar, Filter, RefreshCw, X, Target,
  BarChart3, Radio, PieChart as PieIcon, BarChart4
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
import type { KPIStats, TrendPoint, StagePoint, FollowUpLead, VoicePulse, VoiceTrendPoint, LeadInsightRow } from '../../data/api';
import { useNavigate } from 'react-router-dom';
import { useGlobalFilters } from '../../state/globalFiltersStore';
import { PageShell } from '../../ui/PageShell';
import { StatCard } from '../../ui/StatCard';
import { SectionCard } from '../../ui/SectionCard';
import { ChartContainer } from '../../ui/ChartContainer';
import { EmptyState } from '../../ui/EmptyState';
import { Modal } from '../../ui/Modal';

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200 dark:border-white/10 p-3 rounded-2xl shadow-2xl">
        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 capitalize">{entry.name}:</span>
              </div>
              <span className="text-xs font-black text-zinc-900 dark:text-white">{entry.value}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 pt-2 border-t border-zinc-100 dark:border-white/5 text-[9px] font-bold text-teal-500 uppercase tracking-tight flex items-center gap-1">
          Click to Drilldown <ArrowRight size={8} />
        </p>
      </div>
    );
  }
  return null;
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const { dateRange, datePreset, setDatePreset, setSelectedStage } = useGlobalFilters();

  const [drilldown, setDrilldown] = useState<{ isOpen: boolean; title: string; date: string; data: LeadInsightRow[] }>({
    isOpen: false, title: '', date: '', data: []
  });

  useEffect(() => { setIsMounted(true); }, []);

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

  const { data: followUps } = useQuery<FollowUpLead[]>({
    queryKey: ['dashboard-followups', dateRange],
    queryFn: () => dataProvider.getTopFollowUps(dateRange),
  });

  const { data: callPulse } = useQuery<VoicePulse>({
    queryKey: ['dashboard-call-pulse', dateRange],
    queryFn: () => dataProvider.getVoicePulse(dateRange),
  });

  const { data: callTrend } = useQuery<VoiceTrendPoint[]>({
    queryKey: ['dashboard-call-trend', dateRange],
    queryFn: () => dataProvider.getVoiceTrend(dateRange, datePreset),
  });

  const { data: funnelData } = useQuery({
    queryKey: ['dashboard-funnel', dateRange],
    queryFn: () => dataProvider.getFunnel(dateRange),
  });

  const { data: agentPerformance } = useQuery({
    queryKey: ['dashboard-agents', dateRange],
    queryFn: () => dataProvider.getAgentPerformance(dateRange),
  });

  const handleStatClick = (bucket?: string) => {
    const params = new URLSearchParams();
    if (bucket) {
      if (['Hot', 'Warm', 'Cold', 'Average'].includes(bucket)) params.set('bucket', bucket);
      else params.set('status', bucket);
    }
    navigate(`/leads?${params.toString()}`);
  };

  const handleCallClick = (filter?: string) => {
    const params = new URLSearchParams();
    if (filter) params.set('filter', filter);
    navigate(`/calls?${params.toString()}`);
  };

  const handleChartPointClick = async (point: any) => {
    // 🛡 SAFETY: Ensure payload exists before accessing index 0
    if (!point || !point.activePayload || point.activePayload.length === 0) return;
    
    const label = point.activeLabel;
    const item = point.activePayload[0].payload;
    if (!item) return;
    
    toast.loading(`Extracting nodes for ${label}...`);
    const leads = await dataProvider.getLeads({ range: { from: item.from || item.name, to: item.to || item.name } });
    toast.dismiss();
    
    setDrilldown({
      isOpen: true,
      title: `Intelligence Drilldown`,
      date: label,
      data: leads.slice(0, 10)
    });
  };

  const handleResetFilters = () => setDatePreset('weekly');

  const isDataEmpty = useMemo(() => {
    if (kpisLoading) return false;
    return !kpis || kpis.totalLeads === 0;
  }, [kpis, kpisLoading]);

  // Standard row height for graphs and side-cards
  const ROW_HEIGHT = "h-[420px]";

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter uppercase italic leading-none">Command Center</h1>
          <p className="text-zinc-500 font-medium mt-1">Real-time voice intelligence operations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/leads')} className="rounded-2xl border-black/5 dark:border-white/10 hidden sm:flex h-10 px-5">Export Intel</Button>
          <Button variant="primary" size="sm" onClick={() => toast.success("Intercept Active")} className="rounded-2xl shadow-xl shadow-teal-500/20 px-5 h-10"><Radio size={14} className="mr-2 animate-pulse" /> Live Intercept</Button>
        </div>
      </div>

      {isDataEmpty ? (
        <div className="py-20 flex-1"><EmptyState icon={FileSearch} title="No nodes detected" description="Filters returned zero nodes." actionLabel="Reset" onAction={handleResetFilters} /></div>
      ) : (
        <div className="space-y-10">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4">
            <StatCard label="Nodes" value={kpis?.totalLeads ?? 0} icon={Users} trend={{ value: 12.5, isUp: true }} onClick={() => handleStatClick('all')} />
            <StatCard label="Hot" value={kpis?.hotLeads ?? 0} icon={Flame} variant="orange" trend={{ value: 8.2, isUp: true }} onClick={() => handleStatClick('Hot')} />
            <StatCard label="Warm" value={kpis?.warmLeads ?? 0} icon={Zap} variant="purple" trend={{ value: 2.4, isUp: false }} onClick={() => handleStatClick('Warm')} />
            <StatCard label="Cold" value={kpis?.coldLeads ?? 0} icon={Activity} variant="blue" trend={{ value: 1.5, isUp: true }} onClick={() => handleStatClick('Cold')} />
            <StatCard label="Converted" value={kpis?.converted ?? 0} icon={CheckCircle2} variant="teal" trend={{ value: 18.3, isUp: true }} onClick={() => handleStatClick('Converted')} />
            <StatCard label="Lost" value={kpis?.unconverted ?? 0} icon={XCircle} variant="danger" trend={{ value: 2.1, isUp: false }} onClick={() => handleStatClick('Unconverted')} />
            <StatCard label="Pending" value={kpis?.pendingDecisions ?? 0} icon={Clock} variant="orange" trend={{ value: 4.1, isUp: true }} onClick={() => handleStatClick('Pending')} />
            <StatCard label="Score" value={kpis?.avgScore ?? 0} icon={Target} variant="blue" trend={{ value: 5.2, isUp: true }} />
          </div>

          {/* Pulse Row */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1"><div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping" /><h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Live Voice Pulse</h3></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Incoming', value: callPulse?.incomingChats, icon: PhoneCall, filter: 'all', color: 'blue' },
                { label: 'Active', value: callPulse?.activeSessions, icon: Radio, filter: 'active', color: 'teal' },
                { label: 'New Nodes', value: callPulse?.newContacts, icon: UserPlus, filter: 'new', color: 'orange' },
                { label: 'Pre-Intel', value: callPulse?.preInsightSessions, icon: FileClock, filter: 'na', color: 'zinc' },
                { label: 'Intel Ready', value: callPulse?.insightReadySessions, icon: FileSearch, filter: 'done', color: 'purple' },
              ].map((item) => (
                <Card key={item.label} onClick={() => handleCallClick(item.filter)} className="p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all shadow-sm flex items-center gap-4 group border-black/5 dark:border-white/10 h-20">
                  <div className={cn("p-2.5 rounded-xl border transition-transform group-hover:scale-110 flex-shrink-0", 
                    item.color === 'blue' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                    item.color === 'teal' ? "bg-teal-500/10 text-teal-500 border-teal-500/20" :
                    item.color === 'orange' ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                    item.color === 'purple' ? "bg-purple-500/10 text-purple-500 border-purple-500/20" :
                    "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                  )}><item.icon size={16} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1 truncate">{item.label}</p>
                    <p className="text-xl font-black text-zinc-900 dark:text-white tabular-nums tracking-tighter">{item.value ?? 0}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Row 1: Trend & Distribution */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
            <div className="xl:col-span-8">
              <SectionCard title="Intelligence Trend" subtitle="Daily distribution of intent." icon={<TrendingUp size={16} className="text-orange-500" />} className={cn(ROW_HEIGHT, "flex flex-col")}>
                <ChartContainer height="100%" className="flex-1 w-full -mb-4">
                  <ResponsiveContainer width="100%" height="100%" debounce={100} minWidth={0} minHeight={0}>
                    <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onClick={handleChartPointClick} className="cursor-crosshair">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '700', fill: '#a1a1aa' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '700', fill: '#a1a1aa' }} />
                      <Tooltip cursor={false} content={<CustomChartTooltip />} />
                      <Bar dataKey="hot" fill="#f97316" radius={[4, 4, 0, 0]} barSize={12} stackId="a" />
                      <Bar dataKey="warm" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={12} stackId="a" />
                      <Bar dataKey="converted" fill="#14b8a6" radius={[0, 0, 0, 0]} barSize={12} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </SectionCard>
            </div>

            <div className="xl:col-span-4">
               <SectionCard title="Stage Distribution" subtitle="Node categories." icon={<PieIcon size={16} className="text-purple-500" />} className={cn(ROW_HEIGHT, "flex flex-col")}>
                 <div className="flex flex-col h-full overflow-hidden">
                    <ChartContainer height={200} className="mt-2 flex-shrink-0 relative">
                        {isMounted && stageDistro && stageDistro.length > 0 && (
                        <ResponsiveContainer width="100%" height="100%" debounce={100} minWidth={0} minHeight={0}><PieChart>
                            <Pie data={stageDistro} innerRadius="65%" outerRadius="85%" paddingAngle={8} dataKey="value" stroke="none" onClick={(data: any) => data?.name && (setSelectedStage(data.name), handleStatClick(data.name))}>
                            {stageDistro.map((e, i) => <Cell key={i} fill={e.color} className="outline-none cursor-pointer hover:opacity-80 transition-opacity" />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }} />
                        </PieChart></ResponsiveContainer>
                        )}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">{kpis?.totalLeads ?? 0}</span>
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Nodes</span>
                        </div>
                    </ChartContainer>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                        {(stageDistro || []).map((item) => (
                            <div key={item.name} onClick={() => handleStatClick(item.name)} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-white/5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 transition-all border border-transparent">
                            <div className="flex items-center gap-2 min-w-0"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-[10px] font-bold text-zinc-500 uppercase truncate">{item.name}</span></div>
                            <span className="text-xs font-black text-zinc-900 dark:text-white ml-2">{item.value}%</span>
                            </div>
                        ))}
                        </div>
                    </div>
                 </div>
               </SectionCard>
            </div>
          </div>

          {/* Row 2: Flow & Queue */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
             <div className="xl:col-span-8">
                <SectionCard title="Conversation Flow" subtitle="Interaction volume." icon={<BarChart4 size={16} className="text-teal-500" />} className={cn(ROW_HEIGHT, "flex flex-col")}>
                  <ChartContainer height="100%" className="flex-1 w-full -mb-4">
                    <ResponsiveContainer width="100%" height="100%" debounce={100} minWidth={0} minHeight={0}>
                      <AreaChart data={callTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onClick={handleChartPointClick} className="cursor-crosshair">
                        <defs><linearGradient id="colorC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2}/><stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '700', fill: '#a1a1aa' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '700', fill: '#a1a1aa' }} />
                        <Tooltip cursor={false} content={<CustomChartTooltip />} />
                        <Area type="monotone" dataKey="messages" name="Signals" stroke="#14b8a6" strokeWidth={4} fill="url(#colorC)" />
                        <Area type="monotone" dataKey="sessions" name="Links" stroke="#3b82f6" strokeWidth={4} fill="none" strokeDasharray="5 5" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </SectionCard>
             </div>

             <div className="xl:col-span-4">
                <SectionCard title="Priority Queue" subtitle="High intent nodes." icon={<Zap size={16} className="text-orange-500" />} className={cn(ROW_HEIGHT, "flex flex-col")}>
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mt-2 space-y-3">
                        {(followUps || []).slice(0, 15).map((item, i) => (
                        <div key={i} onClick={() => navigate(`/calls?phone=${item.phone}`)} className="flex items-center justify-between p-4 rounded-[1.5rem] bg-zinc-50 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer group border border-zinc-200/50 dark:border-white/5">
                            <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center font-black text-zinc-600 dark:text-zinc-400 shadow-sm group-hover:scale-105 transition-transform text-xs flex-shrink-0">{item.name[0]}</div>
                            <div className="min-w-0"><h4 className="text-[13px] font-black text-zinc-900 dark:text-white uppercase truncate tracking-tight italic">{item.name}</h4><div className="flex items-center gap-2 mt-1"><Badge variant={item.status === 'Hot' ? 'danger' : 'warning'} size="xs" className="px-1.5 py-0 uppercase font-black text-[8px]">{item.status}</Badge><span className="text-[9px] font-bold text-zinc-400">S: {item.score}</span></div></div>
                            </div>
                            <ArrowRight size={14} className="text-zinc-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </div>
                        ))}
                    </div>
                    <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest py-4 text-zinc-400 hover:text-teal-500 mt-4 flex-shrink-0 border-t border-black/5 dark:border-white/5 rounded-none" onClick={() => navigate('/leads')}>View Registry</Button>
                  </div>
                </SectionCard>
             </div>
          </div>

          {/* Row 3: Funnel & Agents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch pb-10">
            {/* Conversion Funnel */}
            <SectionCard title="Conversion Funnel" subtitle="Operational efficiency lifecycle." icon={<BarChart3 size={16} className="text-emerald-500" />} className={cn(ROW_HEIGHT, "flex flex-col")}>
              <div className="flex flex-col gap-6 py-4 overflow-y-auto no-scrollbar flex-1">
                {(funnelData || []).map((step: any, i: number) => (
                  <div key={step.label} className="group cursor-pointer" onClick={() => handleStatClick(step.label === 'New' ? 'Pending' : step.label)}>
                    <div className="flex items-center justify-between mb-2 px-1">
                       <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{step.label}</span>
                       <span className="text-sm font-black text-zinc-900 dark:text-white tabular-nums">{step.val}</span>
                    </div>
                    <div className="h-3 w-full bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden p-0.5 border border-zinc-200/20 dark:border-white/5">
                       <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: step.val }} 
                        className={cn("h-full rounded-full shadow-sm", 
                          step.color.includes('teal') ? "bg-teal-500" : 
                          step.color.includes('emerald') ? "bg-emerald-500" : 
                          step.color.includes('amber') ? "bg-orange-500" : "bg-rose-500"
                        )} 
                       />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Agent Performance */}
            <SectionCard title="Agent Performance" subtitle="Voice-to-revenue conversion." icon={<Users size={16} className="text-blue-500" />} className={cn(ROW_HEIGHT, "flex flex-col")}>
              <div className="space-y-8 py-4 overflow-y-auto custom-scrollbar pr-1 flex-1">
                {(agentPerformance || []).map((agent: any) => (
                  <div key={agent.name} className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <div className="flex items-center gap-3 min-w-0">
                         <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-[10px] font-black flex-shrink-0">{agent.name[0]}</div>
                         <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 tracking-tight truncate italic uppercase">{agent.name}</span>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className="text-[10px] font-bold text-zinc-400 tabular-nums">{agent.leads} Nodes</span>
                        <span className="text-xs font-black text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-2 py-0.5 rounded-md tabular-nums">{agent.conv}</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden p-0.5 border border-zinc-200/20 dark:border-white/5">
                      <motion.div initial={{ width: 0 }} animate={{ width: agent.conv }} className={cn("h-full rounded-full", agent.color.includes('teal') ? "bg-teal-500" : "bg-blue-500")} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Drilldown Modal */}
      <Modal isOpen={drilldown.isOpen} onClose={() => setDrilldown(p => ({ ...p, isOpen: false }))} title={`${drilldown.title} — ${drilldown.date}`} className="max-w-2xl">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar pb-2">
          {drilldown.data.length > 0 ? drilldown.data.map((l) => (
            <div key={l.id} onClick={() => navigate(`/leads/${l.id}`)} className="p-4 rounded-[2rem] bg-zinc-50 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 transition-all border border-zinc-200/50 dark:border-white/5 cursor-pointer flex items-center justify-between group">
              <div className="flex items-center gap-4 min-w-0"><div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white font-black group-hover:scale-105 transition-transform">{l['User Name']?.[0] || 'U'}</div><div className="min-w-0"><h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 truncate uppercase tracking-tight italic">{l['User Name']}</h4><p className="text-[10px] font-bold text-zinc-400 mt-0.5 truncate">{l['Phone Number']}</p></div></div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0"><Badge variant={l.scoring.bucket === 'Hot' ? 'danger' : 'warning'} size="xs">{l.scoring.bucket}</Badge><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{l.sentiment} INTENT</span></div>
            </div>
          )) : <div className="text-center py-10 text-zinc-500 uppercase text-[10px] font-black opacity-50">Empty segment nodes.</div>}
        </div>
        <div className="pt-6 flex flex-col sm:flex-row justify-end gap-3"><Button variant="ghost" className="rounded-xl h-12" onClick={() => setDrilldown(p => ({ ...p, isOpen: false }))}>Close Interface</Button><Button variant="primary" onClick={() => navigate('/leads')} className="rounded-xl h-12 shadow-xl">Full Registry <ExternalLink size={14} className="ml-2" /></Button></div>
      </Modal>
    </PageShell>
  );
};

export default DashboardPage;
