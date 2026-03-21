import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  FileText,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  ShieldCheck,
  Activity,
  Sparkles
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { toast } from 'sonner';

import { SectionCard } from '../../ui/SectionCard';
import { PageShell } from '../../ui/PageShell';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { ChartContainer } from '../../ui/ChartContainer';
import { useGlobalFilters } from '../../state/globalFiltersStore';
import { dataProvider } from '../../data/dataProvider';
import { type ReportsData } from '../../data/api';
import { cn } from '../../lib/utils';

const ReportsPage: React.FC = () => {
  const { dateRange } = useGlobalFilters();
  const [isRequestingPdf, setIsRequestingPdf] = useState(false);

  const { data, isLoading } = useQuery<ReportsData>({
    queryKey: ['reports-data', dateRange],
    queryFn: () => dataProvider.getReportsData(dateRange),
  });

  const handleRequestPdf = () => {
    setIsRequestingPdf(true);
    toast.promise(new Promise(resolve => setTimeout(resolve, 3000)), {
      loading: 'Generating report...',
      success: () => {
        setIsRequestingPdf(false);
        return 'Report generated successfully.';
      },
      error: 'Report generation failed.',
    });
  };

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Reports</h1>
          <p className="text-muted-foreground font-medium mt-1">Performance analysis and insights.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" onClick={handleRequestPdf} className="rounded-2xl px-6 shadow-lg h-11">
            <FileText size={14} className="mr-2" /> Generate PDF Report
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {(data?.engagementMetrics || [
          { label: 'Total Messages', value: '—', delta: '0%', isUp: true },
          { label: 'Avg Response Time', value: '—', delta: '0%', isUp: true },
          { label: 'Agent Handover', value: '—', delta: '0%', isUp: true },
          { label: 'Lead Velocity', value: '—', delta: '0%', isUp: true },
        ]).map((m, i) => (
          <Card key={i} className="p-6 bg-card border border-border shadow-sm overflow-hidden relative group">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 group-hover:text-primary transition-colors">{m.label}</p>
            <div className="flex items-end justify-between">
              <h4 className="text-3xl font-bold text-foreground tracking-tight tabular-nums">{m.value}</h4>
              <div className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1", m.isUp ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                {m.isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {m.delta}
              </div>
            </div>
            <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.03] text-primary group-hover:opacity-[0.08] transition-opacity">
               <Activity size={60} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Lead Lifecycle */}
        <SectionCard title="Lead Conversion Ratio" subtitle="Conversion efficiency analysis." icon={<PieIcon size={18} className="text-primary" />}>
          <ChartContainer height={300} className="relative w-full">
            {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10"><Loader2 className="animate-spin text-primary" /></div>}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.conversionRatio || []}
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={10}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f43f5e" />
                  <Cell fill="#3b82f6" />
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-elevated)', background: 'var(--card)', backdropFilter: 'blur(10px)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Efficiency</span>
               <span className="text-3xl font-bold text-foreground">84%</span>
            </div>
          </ChartContainer>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mt-4 px-2">
             {data?.conversionRatio.map((item, i) => (
               <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i === 0 ? '#10b981' : i === 1 ? '#f43f5e' : '#3b82f6' }} />
                  <span className="text-[10px] font-semibold text-muted-foreground">{item.name}</span>
               </div>
             ))}
          </div>
        </SectionCard>

        {/* Sentiment Distribution */}
        <SectionCard title="Sentiment Distribution" subtitle="Lead sentiment breakdown." icon={<Sparkles size={18} className="text-purple-500" />}>
          <ChartContainer height={300} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.sentimentSplit || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(120,120,120,0.08)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--muted-foreground)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--muted-foreground)' }} />
                <Tooltip cursor={false} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-elevated)', background: 'var(--card)', backdropFilter: 'blur(10px)' }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={60}>
                  {data?.sentimentSplit.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </SectionCard>

        {/* Performance Trend */}
        <div className="lg:col-span-2 pb-10">
          <SectionCard title="Performance Trend" subtitle="Leads to conversion over time." icon={<TrendingUp size={18} className="text-orange-500" />}>
            <ChartContainer height={350} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.performanceTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSig" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand-500)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--brand-500)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(120,120,120,0.08)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--muted-foreground)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--muted-foreground)' }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-elevated)', background: 'var(--card)', backdropFilter: 'blur(10px)' }} />
                  <Area type="monotone" dataKey="leads" stroke="var(--brand-500)" strokeWidth={3} fillOpacity={1} fill="url(#colorSig)" />
                  <Area type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorConv)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </SectionCard>
        </div>
      </div>

      {/* PDF Generation Modal */}
      <Modal isOpen={isRequestingPdf} onClose={() => {}} title="Generating Report..." showClose={false}>
         <div className="py-10 flex flex-col items-center justify-center space-y-6">
            <div className="relative">
               <div className="w-24 h-24 rounded-full border-4 border-primary/10 animate-spin" style={{ borderTopColor: 'var(--brand-500)' }} />
               <div className="absolute inset-0 flex items-center justify-center text-primary">
                  <FileText size={32} />
               </div>
            </div>
            <div className="text-center">
               <h3 className="text-lg font-bold text-foreground">Preparing Report</h3>
               <p className="text-xs font-medium text-muted-foreground mt-2">Generating your PDF report...</p>
            </div>
            <div className="w-full bg-accent h-1.5 rounded-full overflow-hidden">
               <motion.div
                 initial={{ width: 0 }}
                 animate={{ width: '100%' }}
                 transition={{ duration: 3, ease: 'linear' }}
                 className="h-full rounded-full"
                 style={{ background: 'var(--brand-500)' }}
               />
            </div>
         </div>
      </Modal>
    </PageShell>
  );
};

export default ReportsPage;
