import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, LayoutDashboard, Table as TableIcon, Download, ChevronRight, Loader2, TrendingUp, Target, CheckCircle2, Circle, X, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { dataProvider } from '../../data/dataProvider';
import { type LeadInsightRow } from '../../data/api';
import { useGlobalFilters } from '../../state/globalFiltersStore';
import { cn } from '../../lib/utils';

// UI Components
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import CustomDropdown from '../../ui/CustomDropdownMenu';
import { PageShell } from '../../ui/PageShell';
import { SectionCard } from '../../ui/SectionCard';
import { Skeleton } from '../../ui/Skeleton';
import { LeadWorkflowModals } from '../../components/Lead/LeadWorkflowModals';

// Charts
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border p-3 rounded-xl shadow-premium">
        <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                <span className="text-sm font-medium text-foreground capitalize">{entry.name}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{entry.value}</span>
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
      <div className="bg-card border border-border p-2.5 px-4 rounded-xl shadow-premium">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.color || payload[0].fill }} />
          <span className="text-xs font-semibold text-foreground capitalize">{payload[0].name}</span>
          <span className="text-xs font-bold text-foreground ml-2">{payload[0].value}%</span>
        </div>
      </div>
    );
  }
  return null;
};

const BUCKET_OPTIONS = [
  { value: 'all', label: 'All', color: 'zinc' },
  { value: 'Hot', label: 'Hot', color: 'danger' },
  { value: 'Warm', label: 'Warm', color: 'warning' },
  { value: 'Average', label: 'Average', color: 'success' },
  { value: 'Cold', label: 'Cold', color: 'info' },
  { value: 'Converted', label: 'Converted', color: 'success' },
  { value: 'Lost', label: 'Lost', color: 'danger' },
  { value: 'Pending', label: 'Pending', color: 'warning' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'done', label: 'Converted' },
  { value: 'to call', label: 'Pending' },
  { value: 'not interested', label: 'Not Interested' },
];

const LeadsExplorerPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { dateRange, searchQuery, setSearchQuery } = useGlobalFilters();
  const range = dateRange;
  const queryParams = new URLSearchParams(location.search);

  const activeTab = (queryParams.get('tab') as 'overview' | 'table') || 'overview';
  const bucket = queryParams.get('bucket') || 'all';
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    setLocalSearch(searchQuery);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setIsExportOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [workflowModal, setWorkflowModal] = useState<{ isOpen: boolean; lead: LeadInsightRow | null; type: 'Converted' | 'NotInterested' | 'Closed' | null }>({
    isOpen: false, lead: null, type: null
  });

  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads-table', dateRange, bucket, localSearch],
    queryFn: () => dataProvider.getLeads({ range, bucket, search: localSearch }),
  });

  const { data: kpis } = useQuery({
    queryKey: ['dashboard-kpis', range],
    queryFn: () => dataProvider.getDashboardKPIs(range),
  });

  const { data: trendData } = useQuery({
    queryKey: ['leads-trend', dateRange, bucket],
    queryFn: () => dataProvider.getLeadsTrend(range, 'weekly', bucket),
  });

  const { data: stageDistro } = useQuery({
    queryKey: ['leads-stage', dateRange, bucket],
    queryFn: () => dataProvider.getStageDistribution(range, bucket),
  });

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
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success(`Export successful.`);
    setIsExportOpen(false);
  };

  const handleExportAction = async (type: 'all' | 'hot' | 'warm' | 'cold' | 'selection' | 'current') => {
    if (type === 'selection') {
        const data = leads?.filter(l => selectedIds.includes(l.id)) || [];
        downloadCSV(data, `particular_selection`);
    } else if (type === 'all') {
        const all = await dataProvider.getLeads({ range: { from: '2000-01-01', to: '2100-01-01' }, bucket: 'all' });
        downloadCSV(all, `all_leads_registry`);
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

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Intelligence Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and export intercepted signals.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex bg-card p-1 rounded-lg border border-border shadow-sm">
              <button onClick={() => updateURL({ tab: 'overview' })} className={cn("px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors", activeTab === 'overview' ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}><LayoutDashboard size={16} /> Overview</button>
              <button onClick={() => updateURL({ tab: 'table' })} className={cn("px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors", activeTab === 'table' ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}><TableIcon size={16} /> Table</button>
           </div>
           
           <div className="relative" ref={exportRef}>
              <Button variant="outline" size="sm" onClick={() => setIsExportOpen(!isExportOpen)} className="h-9 px-4 flex items-center gap-2">
                <Download size={16} /> Export <ChevronDown size={14} className={cn("transition-transform", isExportOpen && "rotate-180")} />
              </Button>
              
              <AnimatePresence>
                {isExportOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: 10 }} 
                    className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-premium z-[100] overflow-hidden p-1 space-y-0.5 bg-background border-border"
                    style={{ backgroundColor: 'var(--card)', boxShadow: 'var(--shadow-premium)', border: '1px solid var(--border)' }}
                  >
                    {selectedIds.length > 0 && (
                      <>
                        <button onClick={() => handleExportAction('selection')} className="w-full text-left px-3 py-2 rounded-md text-sm font-medium hover:bg-accent text-blue-500 flex items-center justify-between"><span>Selected</span><Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">{selectedIds.length}</Badge></button>
                        <div className="h-px bg-border mx-2 my-1" />
                      </>
                    )}
                    <button onClick={() => handleExportAction('all')} className="w-full text-left px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors">Full Database</button>
                    <div className="h-px bg-border mx-2 my-1" />
                    <button onClick={() => handleExportAction('hot')} className="w-full text-left px-3 py-2 rounded-md text-sm font-medium hover:bg-accent text-rose-500 transition-colors">Hot Segment</button>
                    <button onClick={() => handleExportAction('warm')} className="w-full text-left px-3 py-2 rounded-md text-sm font-medium hover:bg-accent text-amber-500 transition-colors">Warm Segment</button>
                    <button onClick={() => handleExportAction('cold')} className="w-full text-left px-3 py-2 rounded-md text-sm font-medium hover:bg-accent text-blue-500 transition-colors">Cold Segment</button>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 mb-6">
        {BUCKET_OPTIONS.map((opt) => (
          <button key={opt.value} onClick={() => { updateURL({ bucket: opt.value }); setSelectedIds([]); }} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors border whitespace-nowrap flex items-center gap-2", bucket === opt.value ? "bg-foreground text-background border-foreground" : "bg-card border-border text-muted-foreground hover:border-zinc-400/30")}>
            {opt.label}
            <Badge className={cn("px-1.5 py-0 min-w-5 justify-center rounded-md font-bold", bucket === opt.value ? "bg-background/20 text-background" : "bg-accent text-muted-foreground")}>{kpis?.bucketCounts?.[opt.value] || 0}</Badge>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' ? (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <SectionCard title="Acquisition Trend" subtitle="Daily capture rate" icon={<TrendingUp size={16} />} className="h-[400px]">
                <div className="w-full h-full pb-4 mt-2">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={trendData || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                      <Tooltip cursor={{ fill: 'var(--accent)' }} contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }} />
                      <Bar dataKey="hot" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} stackId="a" />
                      <Bar dataKey="warm" fill="#f59e0b" radius={[0, 0, 0, 0]} barSize={24} stackId="a" />
                      <Bar dataKey="cold" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={24} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            </div>
            <div className="lg:col-span-4">
              <SectionCard title="Segmentation" subtitle="Distribution" icon={<Target size={16} />} className="h-[400px] flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-start w-full h-full pt-4">
                  {isMounted && stageDistro && stageDistro.length > 0 ? (
                    <div className="w-full h-[200px] relative flex items-center justify-center">
                      <PieChart width={200} height={200}>
                        <Pie data={stageDistro} innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none" cx="50%" cy="50%">
                          {stageDistro.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} className="outline-none hover:opacity-80 transition-opacity" />)}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none translate-y-[-2px]">
                         <span className="text-2xl font-semibold text-foreground tracking-tight">{leads?.length || 0}</span>
                         <span className="text-[10px] font-medium text-muted-foreground">Nodes</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center"><Loader2 className="w-8 h-8 text-muted-foreground animate-spin" /></div>
                  )}
                  <div className="w-full space-y-1.5 mt-6 px-2 overflow-y-auto no-scrollbar pb-2">
                    {(stageDistro || []).map((item) => (
                      <div key={item.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent border border-transparent transition-colors group cursor-pointer" onClick={() => updateURL({ bucket: item.name })}>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[11px] group-hover:text-foreground">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-foreground">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </div>
          </motion.div>
        ) : (
          <motion.div key="table" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Search intercepted nodes..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="w-full bg-card border border-border rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-xs font-medium text-muted-foreground bg-accent/30">
                      <th className="p-4 w-12 text-center"><div className="cursor-pointer text-muted-foreground hover:text-foreground mx-auto flex items-center justify-center" onClick={toggleSelectAll}>{selectedIds.length === (leads?.length || 0) && selectedIds.length > 0 ? <CheckCircle2 size={16} className="text-blue-500" /> : <Circle size={16} />}</div></th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Entity</th>
                      <th className="px-4 py-3 font-medium">Synthesis</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {leadsLoading ? [...Array(5)].map((_, i) => <tr key={i}><td colSpan={5} className="p-4"><Skeleton className="h-12 w-full rounded-lg" /></td></tr>) : leads?.map((lead) => {
                      const showActionBtns = ['Hot', 'Warm', 'Cold'].includes(bucket);
                      const isSelected = selectedIds.includes(lead.id);
                      return (
                        <tr key={lead.id} className={cn("group transition-colors cursor-pointer", isSelected ? "bg-blue-500/5" : "hover:bg-accent")} onClick={() => navigate(`/leads/${lead.id}`)}>
                          <td className="p-4 text-center" onClick={(e) => { e.stopPropagation(); setSelectedIds(prev => prev.includes(lead.id) ? prev.filter(i => i !== lead.id) : [...prev, lead.id]); }}><div className="text-muted-foreground hover:text-foreground mx-auto flex items-center justify-center">{isSelected ? <CheckCircle2 size={16} className="text-blue-500" /> : <Circle size={16} />}</div></td>
                          <td className="px-4 py-4"><Badge variant={lead.scoring.bucket === 'Hot' ? 'danger' : lead.scoring.bucket === 'Warm' ? 'warning' : 'default'} className="px-2 py-0.5 rounded-md font-medium text-xs">{lead.scoring.bucket}</Badge></td>
                          <td className="px-4 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">{lead['User Name']?.[0]}</div><div className="flex flex-col"><span className="text-sm font-semibold">{lead['User Name']}</span><span className="text-xs text-muted-foreground">{lead['Phone Number']}</span></div></div></td>
                          <td className="px-4 py-4 max-w-[300px]"><p className="text-sm text-muted-foreground line-clamp-1">{lead['Conversation Summary'] || '...'}</p></td>
                          <td className="px-4 py-4 text-right"><div className="flex items-center justify-end gap-2">{showActionBtns && (<><button onClick={(e) => { e.stopPropagation(); setWorkflowModal({ isOpen: true, lead, type: 'Converted' }); }} className="p-1.5 rounded-md text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"><CheckCircle2 size={16} /></button><button onClick={(e) => { e.stopPropagation(); setWorkflowModal({ isOpen: true, lead, type: 'NotInterested' }); }} className="p-1.5 rounded-md text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"><X size={16} /></button></>)}<ChevronRight size={16} className="ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></div></td>
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
      <LeadWorkflowModals isOpen={workflowModal.isOpen} onClose={() => setWorkflowModal({ ...workflowModal, isOpen: false })} lead={workflowModal.lead} type={workflowModal.type} />
    </PageShell>
  );
};

export default LeadsExplorerPage;
