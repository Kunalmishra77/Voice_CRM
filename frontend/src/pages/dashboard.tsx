import { useQuery } from '@tanstack/react-query';
import { dataApi } from '../data/api';
import { TrendingUp, Users, Clock, AlertCircle, Zap, ArrowRight, Activity, BarChart3 } from 'lucide-react';
import { formatPhoneIndian, cn } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { ChartContainer } from '../components/ui/chart-container';

export default function Dashboard() {
  const navigate = useNavigate();
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => await dataApi.fetchDashboardKPIs(),
    refetchInterval: 30000,
  });

  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', { limit: 100 }],
    queryFn: async () => await dataApi.fetchLeads({ limit: 100 })
  });

  // Mock trend data for pixel-perfect visualization
  const trendData = [
    { day: 'Mon', leads: 42, msgs: 120 },
    { day: 'Tue', leads: 38, msgs: 98 },
    { day: 'Wed', leads: 55, msgs: 145 },
    { day: 'Thu', leads: 62, msgs: 180 },
    { day: 'Fri', leads: 48, msgs: 110 },
    { day: 'Sat', leads: 30, msgs: 75 },
    { day: 'Sun', leads: 25, msgs: 60 },
  ];

  const topFollowUps = (leads || [])
    .filter(l => !l.worked_flag && l.status !== 'Closed' && l.status !== 'Converted')
    .sort((a, b) => b.lead_score - a.lead_score)
    .slice(0, 6);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--text-main))]">Command <span className="font-light text-[hsl(var(--text-muted))]">Center</span></h1>
          <p className="text-sm font-medium text-[hsl(var(--text-dim))] mt-1">Real-time revenue intelligence & operations.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--accent-dim))] border border-[hsl(var(--accent-glow))] text-[10px] font-black text-[hsl(var(--accent-main))] uppercase tracking-[0.2em]">
           <Activity size={12} className="animate-pulse" /> Live Feed Active
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Leads" value={stats?.totalLeads} icon={Users} variant="teal" loading={statsLoading} />
        <StatCard title="Hot Leads (24h)" value={stats?.newLeadsToday} icon={Zap} variant="danger" loading={statsLoading} />
        <StatCard title="Avg Lead Score" value={72} icon={TrendingUp} variant="warning" loading={statsLoading} />
        <StatCard title="Converted" value={stats?.converted} icon={Clock} variant="info" loading={statsLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* Signal Volume Trend */}
        <div className="lg:col-span-8 surface-glass inner-glow rounded-[2rem] p-8 flex flex-col min-h-[450px]">
           <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-xl font-bold text-[hsl(var(--text-main))] tracking-tight flex items-center gap-2">
                  <BarChart3 size={20} className="text-[hsl(var(--accent-main))]" /> Lead Velocity
                </h3>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1 font-medium">Daily lead generation & signal volume.</p>
              </div>
           </div>
           
           <div className="flex-1 w-full">
              <ChartContainer height={280}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent-main))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--accent-main))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border-strong))" opacity={0.5} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--text-dim))' }} dy={10} />
                    <YAxis hide />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--bg-surface-raised))', border: '1px solid hsl(var(--border-strong))', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                      itemStyle={{ color: 'hsl(var(--text-main))', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="leads" stroke="hsl(var(--accent-main))" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
           </div>
        </div>

        {/* Pipeline Health Pie */}
        <div className="lg:col-span-4 surface-glass inner-glow rounded-[2rem] p-8 flex flex-col min-h-[450px]">
           <h3 className="text-xl font-bold text-[hsl(var(--text-main))] tracking-tight mb-2">Stage Split</h3>
           <p className="text-xs text-[hsl(var(--text-muted))] mb-10 font-medium">Lead distribution by journey stage.</p>
           
           <div className="flex-1 flex items-center justify-center relative min-h-[220px]">
              <div className="w-full h-full absolute inset-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={stats?.stageDistro || []} innerRadius={75} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                      {stats?.stageDistro?.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={['hsl(var(--accent-main))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--danger))'][index % 4]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--bg-surface-raised))', border: 'none', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="pointer-events-none text-center z-10">
                 <div className="text-4xl font-black text-[hsl(var(--text-main))] tabular-nums">{stats?.totalLeads}</div>
                 <div className="text-[10px] font-black text-[hsl(var(--text-dim))] uppercase tracking-[0.2em]">Total</div>
              </div>
           </div>

           <div className="mt-8 grid grid-cols-2 gap-3">
              {(stats?.stageDistro || []).map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-[hsl(var(--bg-surface-raised))]/50 border border-[hsl(var(--border-strong))]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['hsl(var(--accent-main))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--danger))'][i % 4] }}></div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-[hsl(var(--text-dim))] uppercase tracking-tighter">{entry.name}</span>
                    <span className="text-xs font-bold text-[hsl(var(--text-main))]">{entry.value}</span>
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* Priority Action Table */}
        <div className="lg:col-span-12 surface-glass inner-glow rounded-[2rem] overflow-hidden border border-[hsl(var(--border-subtle))]">
           <div className="px-8 py-6 border-b border-[hsl(var(--border-subtle))] flex items-center justify-between bg-[hsl(var(--bg-surface-raised))]/30">
              <div>
                <h3 className="text-lg font-bold text-[hsl(var(--text-main))] tracking-tight flex items-center gap-2">
                  Priority Action Queue
                </h3>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1 font-medium">Ranked by intent signal and time-to-reply.</p>
              </div>
              <Link to="/leads" className="px-4 py-2 rounded-xl surface-card border border-[hsl(var(--border-strong))] text-[10px] font-black text-[hsl(var(--text-main))] uppercase tracking-widest hover:border-[hsl(var(--accent-main))] transition-all">View Insights Hub</Link>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[hsl(var(--bg-surface-raised))]/50">
                    <th className="px-8 py-4 text-[10px] font-black uppercase text-[hsl(var(--text-dim))] tracking-widest">Target Lead</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase text-[hsl(var(--text-dim))] tracking-widest">Current Concern</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase text-[hsl(var(--text-dim))] tracking-widest text-center">Intent</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase text-[hsl(var(--text-dim))] tracking-widest text-right">Engagement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border-subtle))]">
                  {leadsLoading ? (
                    [...Array(4)].map((_, i) => <tr key={i} className="h-20 animate-pulse bg-[hsl(var(--bg-surface-raised))]/20"></tr>)
                  ) : topFollowUps.map((lead: any) => (
                    <tr key={lead.id} onClick={() => navigate(`/leads/${lead.phone}`)} className="hover:bg-[hsl(var(--bg-surface-hover))] transition-colors cursor-pointer group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--bg-base))] border border-[hsl(var(--border-strong))] flex items-center justify-center font-bold text-[hsl(var(--accent-main))] shadow-inner group-hover:scale-110 transition-transform">
                            {lead.name?.[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-[hsl(var(--text-main))] group-hover:text-[hsl(var(--accent-main))] transition-colors">{lead.name}</span>
                            <span className="text-[10px] font-semibold text-[hsl(var(--text-muted))]">{formatPhoneIndian(lead.phone)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 max-w-xs">
                        <p className="text-xs font-medium text-[hsl(var(--text-dim))] line-clamp-1 group-hover:text-[hsl(var(--text-muted))] transition-colors">{lead.concern}</p>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="inline-flex items-center gap-2 bg-[hsl(var(--bg-base))] px-3 py-1 rounded-full border border-[hsl(var(--border-strong))]">
                           <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--accent-main))] animate-pulse"></div>
                           <span className="text-xs font-bold text-[hsl(var(--text-main))] tabular-nums">{lead.lead_score}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="p-2.5 rounded-xl surface-card border border-[hsl(var(--border-strong))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-main))] hover:border-[hsl(var(--accent-main))] transition-all">
                          <ArrowRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ title, value, icon: Icon, variant = 'teal', loading }: any) => {
  const colors: Record<string, string> = {
    teal: 'text-[hsl(var(--accent-main))] bg-[hsl(var(--accent-dim))] border-[hsl(var(--accent-glow))]',
    danger: 'text-[hsl(var(--danger))] bg-[hsl(var(--danger))/0.1] border-[hsl(var(--danger))/0.2]',
    warning: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))/0.1] border-[hsl(var(--warning))/0.2]',
    info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };

  return (
    <motion.div whileHover={{ y: -4 }} className="surface-glass inner-glow rounded-[2rem] p-6 shadow-lg relative overflow-hidden group border-[hsl(var(--border-subtle))] transition-all hover:border-[hsl(var(--border-strong))]">
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className={cn("p-3 rounded-2xl border shadow-sm transition-transform group-hover:scale-110", colors[variant])}>
          <Icon size={22} strokeWidth={2.5} />
        </div>
      </div>
      <div className="relative z-10">
        <h3 className="text-[10px] font-black text-[hsl(var(--text-dim))] mb-1 uppercase tracking-[0.2em] group-hover:text-[hsl(var(--text-muted))] transition-colors">{title}</h3>
        {loading ? (
          <div className="h-10 w-24 skeleton-pulse rounded-xl mt-1"></div>
        ) : (
          <div className="text-4xl font-black text-[hsl(var(--text-main))] tracking-tighter tabular-nums">{value || 0}</div>
        )}
      </div>
    </motion.div>
  );
};
