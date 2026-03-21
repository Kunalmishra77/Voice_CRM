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
      loading: 'Refreshing insights...',
      success: 'Insights refreshed.',
      error: 'Refresh failed.',
    });
  };

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-none">Insights</h1>
          <p className="text-muted-foreground font-medium mt-1">Call analysis and lead scoring overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" onClick={handleSyncIntelligence} className="rounded-2xl px-6 shadow-sm bg-primary text-primary-foreground hover:scale-105 transition-transform h-10 text-xs font-semibold"><DatabaseZap size={14} className="mr-2" /> Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-8">
        <div className="lg:col-span-2 flex flex-col h-full">
          <SectionCard
            title="Sentiment Trend"
            subtitle="Emotional tracking over time."
            icon={<TrendingUp size={18} className="text-primary" />}
            className="h-full flex-1"
            headerActions={
              <div className="hidden sm:flex gap-4">
                 <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" /><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pos</span></div>
                 <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" /><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Neg</span></div>
              </div>
            }
          >
            <ChartContainer height="100%" className="min-h-[320px] w-full mt-4 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary?.sentimentTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorN" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '700', fill: 'var(--muted-foreground)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '700', fill: 'var(--muted-foreground)' }} />
                  <Tooltip cursor={false} contentStyle={{ borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-elevated)', background: 'var(--card)', backdropFilter: 'blur(10px)' }} />
                  <Area type="monotone" dataKey="pos" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorP)" />
                  <Area type="monotone" dataKey="neu" stroke="var(--muted-foreground)" strokeWidth={2} fill="transparent" strokeDasharray="5 5" opacity={0.3} />
                  <Area type="monotone" dataKey="neg" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorN)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </SectionCard>
        </div>

        <div className="h-full flex flex-col">
          <SectionCard title="Common Objections" subtitle="Top friction points." icon={<BrainCircuit size={18} className="text-purple-500" />} className="h-full flex-1">
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mt-2 max-h-[380px]">
              <div className="space-y-2 pb-2">
                {isLoading ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-2xl" />) : summary?.topConcerns.map((conc, i) => (
                  <div key={i} className="p-4 rounded-xl bg-secondary/50 border border-border/50 flex items-center justify-between group hover:border-primary/30 transition-all hover:bg-secondary">
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-2 h-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                      <span className="text-sm font-bold text-foreground/90 truncate">{conc.name}</span>
                    </div>
                    <Badge variant="zinc" className="text-[11px] tabular-nums font-bold px-2.5 py-0.5 h-6 rounded-lg border-none bg-background shadow-sm text-foreground">{conc.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Top Leads" subtitle="Ranked leads by scoring." icon={<Network size={18} className="text-orange-500" />} className="mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mt-4">
          {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-60 w-full rounded-2xl" />) : summary?.highIntentLeads.map((lead) => (
              <Card key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} className="p-6 flex flex-col justify-between hover:border-border hover:scale-[1.02] transition-all cursor-pointer group relative overflow-hidden h-64 bg-card border border-border shadow-sm">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm group-hover:scale-110 transition-transform" style={{ background: 'linear-gradient(to top right, var(--brand-500), #34d399)' }}>{lead['User Name']?.[0] || 'U'}</div>
                    <Badge variant={lead.scoring.score > 90 ? 'danger' : 'warning'} className="text-[8px] animate-pulse rounded-full px-2 uppercase font-semibold">{lead.scoring.score > 90 ? 'CRIT' : 'HIGH'}</Badge>
                  </div>
                  <h4 className="text-[14px] font-bold text-foreground tracking-tight line-clamp-1">{lead['User Name'] || 'Unknown'}</h4>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-1 tracking-tight truncate">{lead['Phone Number']}</p>
                  <p className="text-[11px] font-medium text-muted-foreground line-clamp-2 mt-4 leading-relaxed">"{lead.concern}"</p>
                </div>
                <div className="mt-auto relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[11px]" style={{ color: 'var(--brand-500)' }}><Activity size={14} /> Score: {lead.scoring.score}%</div>
                  <div className="p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all" style={{ background: 'var(--brand-50)', color: 'var(--brand-500)' }}><ArrowRight size={16} /></div>
                </div>
                <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] group-hover:opacity-[0.1] transition-opacity" style={{ color: 'var(--brand-500)' }}><Mic size={120} fill="currentColor" /></div>
              </Card>
            ))}
        </div>
      </SectionCard>
    </PageShell>
  );
};

export default CallInsightsPage;
