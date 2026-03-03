import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Zap, Sparkles, TrendingUp, Smile, Meh, Frown, Target, ArrowRight,
  BrainCircuit, MessageSquare, BarChart3, Loader2, Activity,
  PhoneCall, Mic, DatabaseZap, Network
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

const CallInsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const { dateRange } = useGlobalFilters();

  const { data: summary, isLoading } = useQuery<LeadInsightsSummary>({
    queryKey: ['call-insights-summary', dateRange],
    queryFn: () => dataProvider.getLeadInsightsSummary(dateRange),
  });

  const handleSyncIntelligence = () => {
    toast.promise(new Promise(resolve => setTimeout(resolve, 2000)), {
      loading: 'Deep-scanning signal matrix...',
      success: 'Intelligence synchronized.',
      error: 'Signal loss detected.',
    });
  };

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter uppercase italic leading-none">Intelligence Matrix</h1>
          <p className="text-zinc-500 font-medium mt-1">Behavioral signal synthesis and analysis.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" onClick={handleSyncIntelligence} className="rounded-2xl px-6 shadow-xl shadow-teal-500/20 bg-zinc-900 dark:bg-white text-white dark:text-black hover:scale-105 transition-transform h-10 uppercase text-[10px] font-black tracking-widest"><DatabaseZap size={14} className="mr-2" /> Sync Intel</Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        <div className="lg:col-span-2 flex flex-col h-full">
          <SectionCard 
            title="Sentiment Pulse" 
            subtitle="Temporal emotional tracking."
            icon={<TrendingUp size={18} className="text-teal-500" />}
            className="h-full flex-1"
            headerActions={
              <div className="hidden sm:flex gap-4">
                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" /><span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Pos</span></div>
                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" /><span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Neg</span></div>
              </div>
            }
          >
            <ChartContainer height="100%" className="min-h-[300px] w-full mt-4 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary?.sentimentTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorN" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(120,120,120,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '900', fill: '#71717a' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '900', fill: '#71717a' }} />
                  <Tooltip cursor={false} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }} />
                  <Area type="monotone" dataKey="pos" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorP)" />
                  <Area type="monotone" dataKey="neu" stroke="#71717a" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                  <Area type="monotone" dataKey="neg" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorN)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </SectionCard>
        </div>

        <div className="h-full flex flex-col">
          <SectionCard title="Common Objections" subtitle="Top friction points." icon={<BrainCircuit size={18} className="text-purple-500" />} className="h-full flex-1">
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mt-2 max-h-[350px]">
              <div className="space-y-3 pb-2">
                {isLoading ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-2xl" />) : summary?.topConcerns.map((conc, i) => (
                  <div key={i} className="p-4 rounded-3xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/50 dark:border-white/5 flex items-center justify-between group hover:border-teal-500/20 transition-all hover:bg-black/5 dark:hover:bg-white/5">
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                      <span className="text-[10px] font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-widest truncate italic">{conc.name}</span>
                    </div>
                    <Badge variant="zinc" className="text-[10px] tabular-nums font-black px-2.5 py-0.5 h-6 rounded-xl border-none bg-zinc-100 dark:bg-white/10">{conc.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Probability Matrix" subtitle="Ranked nodes by behavioral scoring." icon={<Network size={18} className="text-orange-500" />} className="mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mt-4">
          {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-60 w-full rounded-3xl" />) : summary?.highIntentLeads.map((lead) => (
              <Card key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} className="p-6 flex flex-col justify-between hover:border-teal-500/40 hover:scale-[1.02] transition-all cursor-pointer group relative overflow-hidden h-64 bg-white dark:bg-[#09090b]/40 border border-zinc-200 dark:border-white/5 shadow-sm">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white font-black shadow-lg group-hover:scale-110 transition-transform">{lead['User Name']?.[0] || 'U'}</div>
                    <Badge variant={lead.scoring.score > 90 ? 'danger' : 'warning'} className="text-[8px] animate-pulse rounded-full px-2 uppercase font-black">{lead.scoring.score > 90 ? 'CRIT' : 'HIGH'}</Badge>
                  </div>
                  <h4 className="text-[14px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight line-clamp-1 italic">{lead['User Name'] || 'Unknown'}</h4>
                  <p className="text-[10px] font-bold text-zinc-500 mt-1 tracking-tighter truncate">{lead['Phone Number']}</p>
                  <p className="text-[11px] font-medium text-zinc-400 line-clamp-2 mt-4 italic leading-relaxed">"{lead.concern}"</p>
                </div>
                <div className="mt-auto relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-teal-500 font-black text-[11px] uppercase tracking-tighter"><Activity size={14} /> P: {lead.scoring.score}%</div>
                  <div className="p-2 rounded-xl bg-teal-500/10 text-teal-500 opacity-0 group-hover:opacity-100 transition-all"><ArrowRight size={16} /></div>
                </div>
                <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] group-hover:opacity-[0.1] transition-opacity text-teal-500"><Mic size={120} fill="currentColor" /></div>
              </Card>
            ))}
        </div>
      </SectionCard>
    </PageShell>
  );
};

export default CallInsightsPage;
