import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  LayoutDashboard, 
  Table as TableIcon,
  Filter,
  Download,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Zap,
  CheckCircle2,
  Circle,
  MoreVertical,
  ExternalLink,
  Loader2,
  TrendingUp,
  Smile,
  Meh,
  Frown,
  ArrowRight,
  User,
  History,
  PhoneCall,
  Activity,
  MessageSquare,
  UserPlus,
  Target,
  Clock,
  ShieldCheck,
  FileText,
  Save,
  CheckCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { dataProvider } from '../../data/dataProvider';
import { type LeadInsightRow, type TrendPoint, type StagePoint, type FollowUpLead } from '../../data/api';
import { useGlobalFilters } from '../../state/globalFiltersStore';
import { useLeadsStore } from '../../state/leadsStore';
import { formatRangeLabel } from '../../utils/dateRange';
import { cn } from '../../lib/utils';
import { format, parseISO } from 'date-fns';

// UI Components
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import CustomDropdown from '../../ui/CustomDropdownMenu';
import { PageShell } from '../../ui/PageShell';
import { SectionCard } from '../../ui/SectionCard';
import { Skeleton } from '../../ui/Skeleton';
import { LeadWorkflowModals } from '../../components/Lead/LeadWorkflowModals';
import { ChartContainer } from '../../ui/ChartContainer';
import { Modal } from '../../ui/Modal';

// Charts
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
  Cell
} from 'recharts';

const BUCKET_OPTIONS = [
  { value: 'all', label: 'All Buckets', color: 'zinc' },
  { value: 'Hot', label: 'Hot', color: 'danger' },
  { value: 'Warm', label: 'Warm', color: 'warning' },
  { value: 'Average', label: 'Average', color: 'success' },
  { value: 'Cold', label: 'Cold', color: 'info' },
  { value: 'Converted', label: 'Converted', color: 'success' },
  { value: 'Unconverted', label: 'Unconverted', color: 'danger' },
  { value: 'Pending', label: 'Pending', color: 'warning' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'New', label: 'New' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'FollowUpScheduled', label: 'Follow Up' },
  { value: 'Converted', label: 'Converted' },
  { value: 'Unconverted', label: 'Unconverted' },
  { value: 'Pending', label: 'Pending' },
];

const SENTIMENT_OPTIONS = [
  { value: 'all', label: 'All Sentiments' },
  { value: 'Positive', label: 'Positive' },
  { value: 'Neutral', label: 'Neutral' },
  { value: 'Negative', label: 'Negative' },
];

const AGENTS = ['Rahul S.', 'Sanya M.', 'Arjun K.', 'Priya T.', 'Unassigned'];

const LeadsExplorerPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { dateRange, datePreset, searchQuery, setSearchQuery } = useGlobalFilters();
  const { outcomes, metadata, comments, addComment, setMetadata } = useLeadsStore();
  const range = dateRange;
  const queryParams = new URLSearchParams(location.search);

  // --- URL & Basic State ---
  const activeTab = (queryParams.get('tab') as 'overview' | 'table') || 'table';
  const bucket = queryParams.get('bucket') || 'all';
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [statusFilter, setStatusFilter] = useState(queryParams.get('status') || 'all');
  const [sentimentFilter, setSentimentFilter] = useState(queryParams.get('sentiment') || 'all');
  const [workedFilter, setWorkedFilter] = useState<'all' | 'yes' | 'no'>((queryParams.get('worked') as any) || 'all');
  
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Modals
  const [workflowModal, setWorkflowModal] = useState<{ isOpen: boolean; lead: LeadInsightRow | null; type: 'Converted' | 'NotInterested' | 'Closed' | null }>({
    isOpen: false,
    lead: null,
    type: null
  });

  const [commentModal, setCommentModal] = useState<{ isOpen: boolean; lead: LeadInsightRow | null; text: string }>({
    isOpen: false,
    lead: null,
    text: ''
  });

  const [assignModal, setAssignModal] = useState<{ isOpen: boolean; lead: LeadInsightRow | null }>({
    isOpen: false,
    lead: null
  });

  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  // --- Sync URL helpers ---
  const updateURL = (params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(location.search);
    Object.entries(params).forEach(([key, val]) => {
      if (val === null || val === 'all') newParams.delete(key);
      else newParams.set(key, val);
    });
    navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
  };

  const handleBucketChange = (newBucket: string) => {
    updateURL({ bucket: newBucket });
    setPage(1);
  };

  const handleTabChange = (tab: 'overview' | 'table') => {
    updateURL({ tab });
  };

  // --- Queries ---
  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads-table', dateRange, bucket, statusFilter, localSearch, sentimentFilter, workedFilter],
    queryFn: () => dataProvider.getLeads({ 
      range, bucket, status: statusFilter, search: localSearch, sentiment: sentimentFilter, worked: workedFilter 
    }),
  });

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['leads-trend', dateRange, bucket],
    queryFn: () => dataProvider.getLeadsTrend(range, datePreset, bucket),
  });

  const { data: stageDistro, isLoading: stageLoading } = useQuery({
    queryKey: ['leads-stage', dateRange, bucket],
    queryFn: () => dataProvider.getStageDistribution(range, bucket),
  });

  const { data: priorityQueue, isLoading: queueLoading } = useQuery({
    queryKey: ['leads-queue', dateRange, bucket],
    queryFn: () => dataProvider.getTopFollowUps(range, bucket),
  });

  const { data: funnelData, isLoading: funnelLoading } = useQuery({
    queryKey: ['leads-funnel', dateRange, bucket],
    queryFn: () => dataProvider.getFunnel(range, bucket),
  });

  const toggleWorkedMutation = useMutation({
    mutationFn: (data: { id: string, phone: string, current: boolean }) => 
      dataProvider.toggleWorkedStatus(data.id, data.phone, data.current),
    onSuccess: (_, variables) => {
      setMetadata(variables.id, { is_worked: !variables.current });
      queryClient.invalidateQueries({ queryKey: ['leads-table'] });
      queryClient.invalidateQueries({ queryKey: ['leads-queue'] });
      toast.success("Lead synchronization successful.");
    }
  });

  // --- Actions ---
  const handleAddComment = () => {
    if (commentModal.lead && commentModal.text.trim()) {
      addComment(commentModal.lead.id, commentModal.text);
      setCommentModal({ isOpen: false, lead: null, text: '' });
      toast.success("Comment saved to intelligence node.");
    }
  };

  const handleAssignAgent = (agent: string) => {
    if (assignModal.lead) {
      setMetadata(assignModal.lead.id, { owner: agent });
      setAssignModal({ isOpen: false, lead: null });
      toast.success(`Entity node assigned to ${agent}`);
      queryClient.invalidateQueries({ queryKey: ['leads-table'] });
    }
  };

  // --- Table Helpers ---
  const paginatedLeads = useMemo(() => {
    if (!leads) return [];
    return leads.slice((page - 1) * pageSize, page * pageSize);
  }, [leads, page]);

  const totalPages = Math.ceil((leads?.length || 0) / pageSize);

  const getSentimentIcon = (sent: string) => {
    const s = (sent || '').toLowerCase();
    if (s.includes('pos')) return <Smile size={14} className="text-emerald-500" />;
    if (s.includes('neg')) return <Frown size={14} className="text-rose-500" />;
    return <Meh size={14} className="text-amber-500" />;
  };

  const handleExportCSV = () => {
    if (!leads || leads.length === 0) {
      toast.error("No intelligence to export.");
      return;
    }
    const dataToExport = selectedLeads.length > 0 
      ? leads.filter(l => selectedLeads.includes(l.id)) 
      : leads;

    const headers = ["Name", "Phone", "Bucket", "Score", "Sentiment", "Status", "Concern", "Summary", "Next Action", "Created At"];
    const csvContent = [
      headers.join(","),
      ...dataToExport.map(l => [
        `"${l['User Name']}"`,
        `"${l['Phone Number']}"`,
        l.scoring.bucket,
        l.scoring.score,
        l.sentiment,
        l.status,
        `"${l.concern.replace(/"/g, '""')}"`,
        `"${l['Conversation Summary'].replace(/"/g, '""')}"`,
        `"${l['Action to be taken'].replace(/"/g, '""')}"`,
        l.created_at
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `VoiceCRM_Leads_${bucket}_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    toast.success(`Exported ${dataToExport.length} intelligence nodes.`);
  };

  return (
    <PageShell>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter uppercase italic">Leads Explorer</h1>
          <p className="text-zinc-500 font-medium mt-1">Unified intelligence registry.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex bg-zinc-100 dark:bg-white/5 p-1 rounded-2xl border border-zinc-200/50 dark:border-white/10">
            <button
              onClick={() => handleTabChange('overview')}
              className={cn(
                "flex-1 sm:flex-none px-4 md:px-6 py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2",
                activeTab === 'overview' 
                  ? "bg-white dark:bg-zinc-800 text-teal-600 dark:text-teal-400 shadow-lg" 
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
              )}
            >
              <LayoutDashboard size={14} /> <span className="hidden sm:inline">Overview</span>
            </button>
            <button
              onClick={() => handleTabChange('table')}
              className={cn(
                "flex-1 sm:flex-none px-4 md:px-6 py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2",
                activeTab === 'table' 
                  ? "bg-white dark:bg-zinc-800 text-teal-600 dark:text-teal-400 shadow-lg" 
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
              )}
            >
              <TableIcon size={14} /> <span className="hidden sm:inline">Table</span>
            </button>
          </div>
          <Button variant="secondary" size="sm" onClick={handleExportCSV} className="rounded-2xl h-11 px-6 border-black/5 dark:border-white/10 shadow-sm">
            <Download size={14} className="mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* Bucket Chips Row */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 -mx-4 px-4 md:mx-0 md:px-0">
        {BUCKET_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleBucketChange(opt.value)}
            className={cn(
              "px-4 md:px-5 py-2 md:py-2.5 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap flex items-center gap-2",
              bucket === opt.value
                ? "bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-xl scale-105"
                : "bg-white dark:bg-white/5 border-zinc-200 dark:border-white/5 text-zinc-500 hover:border-teal-500/30 hover:text-zinc-900 dark:hover:text-zinc-300"
            )}
          >
            {opt.label}
            <Badge variant={opt.color as any} className="ml-1 opacity-80 text-[8px] px-1.5">{opt.value === 'all' ? (leads?.length || 0) : (leads?.filter(l => l.scoring.bucket === opt.value || l.status === opt.value).length || 0)}</Badge>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Leads Trend Chart */}
            <div className="lg:col-span-2">
              <SectionCard title="Acquisition Velocity" subtitle={`Tracking ${bucket} node capture rate.`} icon={<TrendingUp size={18} className="text-teal-500" />}>
                <ChartContainer height={350} className="w-full">
                  {trendLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(120,120,120,0.05)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '900', fill: '#71717a' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '900', fill: '#71717a' }} />
                      <Tooltip 
                        cursor={false}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }}
                      />
                      <Bar dataKey="hot" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="warm" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="converted" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </SectionCard>
            </div>

            {/* Stage Split Donut */}
            <div>
              <SectionCard title="Funnel Distribution" subtitle="Segmentation of filtered nodes." icon={<Target size={18} className="text-purple-500" />}>
                <ChartContainer height={250} className="relative w-full">
                  {stageLoading && <Loader2 className="absolute w-8 h-8 text-teal-500 animate-spin" />}
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stageDistro || []}
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {(stageDistro || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} className="cursor-pointer outline-none hover:opacity-80 transition-opacity" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-4xl font-black text-zinc-900 dark:text-zinc-100 tabular-nums">{leads?.length || 0}</span>
                     <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">Analyzed</span>
                  </div>
                </ChartContainer>
                <div className="grid grid-cols-2 gap-3 mt-8">
                  {(stageDistro || []).map((item) => (
                    <div key={item.name} className="flex items-center gap-2 p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/50 dark:border-white/5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color, color: item.color }} />
                      <span className="text-[10px] font-black text-zinc-500 uppercase truncate">{item.name}</span>
                      <span className="ml-auto text-xs font-black tabular-nums">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            {/* Bottom Row */}
            <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
              <SectionCard title="Priority Queue" subtitle="High intent unworked nodes." icon={<Zap size={18} className="text-orange-500" />}>
                <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
                  {queueLoading ? (
                    Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
                  ) : (priorityQueue || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30">
                      <CheckCircle2 size={40} className="text-teal-500" />
                      <p className="text-[10px] font-black uppercase mt-4">Queue Synchronized</p>
                    </div>
                  ) : (priorityQueue || []).map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => navigate(`/calls?phone=${item.phone}`)}
                      className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5 hover:border-teal-500/30 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center font-black text-white group-hover:scale-110 transition-transform text-xs shadow-sm flex-shrink-0">{item.name[0]}</div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight italic truncate">{item.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="zinc" size="xs" className="text-[8px] px-1 py-0">{item.score}</Badge>
                            {item.missingCount > 0 && <span className="text-[8px] text-rose-500 font-bold uppercase truncate">-{item.missingCount} Signals</span>}
                          </div>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-zinc-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Lifecycle Funnel" subtitle="Interception flow." icon={<ShieldCheck size={18} className="text-blue-500" />}>
                <div className="space-y-6 py-4">
                  {(funnelData || []).map((step: any, i: number) => (
                    <div 
                      key={step.label} 
                      className="group cursor-pointer"
                      onClick={() => {
                        setStatusFilter(step.label === 'New' ? 'New' : step.label === 'Progress' ? 'InProgress' : step.label === 'Followup' ? 'FollowUpScheduled' : 'Converted');
                        handleTabChange('table');
                      }}
                    >
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-teal-500 transition-colors">{step.label}</span>
                        <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 tabular-nums">{step.val}</span>
                      </div>
                      <div className="h-2.5 w-full bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden p-0.5 border border-zinc-200/30 dark:border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: step.val }}
                          className={cn("h-full rounded-full transition-all duration-1000 shadow-sm", 
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

              <SectionCard title="Intelligence Hub" subtitle="Management actions." icon={<Activity size={18} className="text-teal-500" />}>
                <div className="grid grid-cols-1 gap-3 py-4">
                  <Button variant="outline" className="justify-start py-6 rounded-2xl border-zinc-200/50 dark:border-white/5 group hover:border-teal-500/30 transition-all px-4" onClick={handleExportCSV}>
                    <Download size={18} className="mr-3 text-teal-500 flex-shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest truncate">Download Report</span>
                  </Button>
                  <Button variant="outline" className="justify-start py-6 rounded-2xl border-zinc-200/50 dark:border-white/5 group hover:border-teal-500/30 transition-all px-4" onClick={() => toast.info("Bulk synchronization engine initializing...")}>
                    <Zap size={18} className="mr-3 text-teal-500 flex-shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest truncate">Bulk Update</span>
                  </Button>
                  <Button variant="primary" className="justify-start py-6 rounded-2xl shadow-xl shadow-teal-500/10 px-4" onClick={() => toast.info("Ownership allocation matrix open.")}>
                    <UserPlus size={18} className="mr-3 flex-shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest truncate">Assign Ownership</span>
                  </Button>
                </div>
              </SectionCard>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Filters Bar */}
            <Card overflowHidden={false} className="relative z-20 p-4 bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-zinc-200 dark:border-white/5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-4 rounded-3xl">
              <div className="relative flex-1 min-w-0">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Search intelligence nodes..."
                  value={localSearch}
                  onChange={(e) => {
                    setLocalSearch(e.target.value);
                    setSearchQuery(e.target.value);
                    updateURL({ search: e.target.value });
                  }}
                  className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl py-2.5 pl-12 pr-4 text-xs font-bold focus:ring-2 focus:ring-teal-500/20 outline-none truncate"
                />
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                   <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Status</span>
                   <CustomDropdown 
                    options={STATUS_OPTIONS} 
                    value={statusFilter} 
                    onChange={(v) => { setStatusFilter(v); updateURL({ status: v }); }} 
                    className="w-32 md:w-40"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                   <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Tone</span>
                   <CustomDropdown 
                    options={SENTIMENT_OPTIONS} 
                    value={sentimentFilter} 
                    onChange={(v) => { setSentimentFilter(v); updateURL({ sentiment: v }); }} 
                    className="w-32 md:w-40"
                  />
                </div>

                <div className="flex bg-zinc-100 dark:bg-white/5 p-1 rounded-2xl border border-zinc-200 dark:border-white/10">
                  <button 
                    onClick={() => { setWorkedFilter('all'); updateURL({ worked: 'all' }); }}
                    className={cn("px-3 md:px-4 py-1.5 text-[9px] font-black uppercase rounded-xl transition-all", workedFilter === 'all' ? "bg-white dark:bg-zinc-800 text-teal-500 shadow-sm" : "text-zinc-500")}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => { setWorkedFilter('yes'); updateURL({ worked: 'yes' }); }}
                    className={cn("px-3 md:px-4 py-1.5 text-[9px] font-black uppercase rounded-xl transition-all", workedFilter === 'yes' ? "bg-white dark:bg-zinc-800 text-teal-500 shadow-sm" : "text-zinc-500")}
                  >
                    Done
                  </button>
                  <button 
                    onClick={() => { setWorkedFilter('no'); updateURL({ worked: 'no' }); }}
                    className={cn("px-3 md:px-4 py-1.5 text-[9px] font-black uppercase rounded-xl transition-all", workedFilter === 'no' ? "bg-white dark:bg-zinc-800 text-teal-500 shadow-sm" : "text-zinc-500")}
                  >
                    New
                  </button>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 ml-auto md:ml-0"
                  onClick={() => {
                    setLocalSearch('');
                    setSearchQuery('');
                    setStatusFilter('all');
                    setSentimentFilter('all');
                    setWorkedFilter('all');
                    handleBucketChange('all');
                    navigate(location.pathname);
                  }}
                >
                  Reset
                </Button>
              </div>
            </Card>

            {/* Table */}
            <Card className="border border-zinc-200 dark:border-white/5 shadow-2xl bg-white/80 dark:bg-black/40 backdrop-blur-xl overflow-hidden flex flex-col min-h-[600px] rounded-3xl">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="border-b border-zinc-200/50 dark:border-white/5 bg-zinc-50/30 dark:bg-white/[0.01]">
                      <th className="p-6 w-12 text-center">
                        <div className="cursor-pointer text-zinc-400 mx-auto" onClick={() => setSelectedLeads(selectedLeads.length === paginatedLeads.length ? [] : paginatedLeads.map(l => l.id))}>
                          {selectedLeads.length === paginatedLeads.length && paginatedLeads.length > 0 ? <CheckCircle2 size={18} className="text-teal-500" /> : <Circle size={18} />}
                        </div>
                      </th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Analysis</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Entity</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Call Intent</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">AI Synthesis</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Owner</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Outcome</th>
                      <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">Worked</th>
                      <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-right">Interactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/50 dark:divide-white/5">
                    {leadsLoading ? (
                      Array.from({ length: 8 }).map((_, i) => <tr key={i}><td colSpan={9} className="p-6"><Skeleton className="h-16 w-full rounded-2xl" /></td></tr>)
                    ) : paginatedLeads.length === 0 ? (
                      <tr><td colSpan={9} className="p-32 text-center text-zinc-500 font-bold uppercase tracking-widest italic opacity-50">No nodes synchronized</td></tr>
                    ) : paginatedLeads.map((lead) => {
                      const localMeta = metadata[lead.id] || {};
                      const localOutcome = outcomes[lead.id];
                      const localComments = comments[lead.id] || [];
                      const owner = localMeta.owner || lead.owner || 'Unassigned';
                      const isWorked = localMeta.is_worked ?? lead.worked;

                      return (
                        <tr 
                          key={lead.id} 
                          className="group hover:bg-teal-500/5 transition-colors cursor-pointer"
                          onClick={() => navigate(`/calls?sessionId=${lead.id}`)}
                        >
                          <td className="p-6 text-center" onClick={(e) => { e.stopPropagation(); setSelectedLeads(prev => prev.includes(lead.id) ? prev.filter(i => i !== lead.id) : [...prev, lead.id]); }}>
                            <div className="text-zinc-400 transition-colors mx-auto">
                              {selectedLeads.includes(lead.id) ? <CheckCircle2 size={18} className="text-teal-500" /> : <Circle size={18} />}
                            </div>
                          </td>
                          <td className="px-4 py-6">
                            <div className="flex flex-col gap-2">
                              <Badge variant={lead.scoring.bucket === 'Hot' ? 'danger' : lead.scoring.bucket === 'Warm' ? 'warning' : lead.scoring.bucket === 'Average' ? 'success' : 'info'} className="w-fit text-[8px] uppercase font-black px-2 py-0.5 rounded-full">{lead.scoring.bucket}</Badge>
                              <span className="text-[10px] font-black tabular-nums text-zinc-400">P-{lead.scoring.score}</span>
                            </div>
                          </td>
                          <td className="px-4 py-6">
                            <div className="flex items-center gap-3">
                               <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-zinc-100 to-zinc-50 dark:from-white/10 dark:to-white/5 flex items-center justify-center text-xs font-black group-hover:scale-110 transition-transform">{lead['User Name']?.[0]}</div>
                               <div className="flex flex-col min-w-0">
                                  <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 tracking-tight uppercase italic truncate max-w-[150px]">{lead['User Name'] || 'Unknown'}</span>
                                  <span className="text-[10px] font-bold text-teal-600 tracking-tighter">{lead['Phone Number']}</span>
                               </div>
                            </div>
                          </td>
                          <td className="px-4 py-6 max-w-[200px]">
                            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 line-clamp-1 truncate uppercase tracking-tighter">{lead.concern}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              {getSentimentIcon(lead.sentiment)}
                              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">{lead.sentiment || 'Neutral'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-6 max-w-[300px]">
                            <p className="text-[11px] font-medium text-zinc-500 line-clamp-2 leading-relaxed italic">"{lead['Conversation Summary']}"</p>
                            <div className="text-teal-600 font-black text-[9px] uppercase mt-1.5 flex items-center gap-1.5"><ArrowRight size={12} /> {lead['Action to be taken']}</div>
                          </td>
                          <td className="px-4 py-6">
                             <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-[8px] font-black text-zinc-400">{owner[0]}</div>
                                <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 truncate max-w-[100px]">{owner}</span>
                             </div>
                          </td>
                          <td className="px-4 py-6">
                             {localOutcome ? (
                               <Badge variant={localOutcome.outcome === 'Converted' ? 'success' : 'danger'} className="text-[8px] uppercase">{localOutcome.outcome}</Badge>
                             ) : (
                               <Badge variant="zinc" className="text-[8px] uppercase opacity-50">{lead.status}</Badge>
                             )}
                             <p className="text-[8px] font-bold text-zinc-400 mt-1 uppercase tracking-tighter">{format(parseISO(lead.created_at), 'MMM dd, hh:mm a')}</p>
                          </td>
                          <td className="px-4 py-6 text-center">
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleWorkedMutation.mutate({ id: lead.id, phone: lead['Phone Number'], current: !!isWorked }); }}
                              className={cn("w-10 h-5 rounded-full relative transition-all mx-auto", isWorked ? "bg-teal-500" : "bg-zinc-200 dark:bg-zinc-800")}
                            >
                              <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm", isWorked ? "right-1" : "left-1")} />
                            </button>
                          </td>
                          <td className="px-6 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setCommentModal({ isOpen: true, lead, text: '' }); }}
                                className="p-2 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:text-teal-500 transition-all relative"
                                title="Add Comment"
                              >
                                <MessageSquare size={14} />
                                {localComments.length > 0 && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-teal-500 text-[7px] font-black text-white flex items-center justify-center">{localComments.length}</div>}
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setAssignModal({ isOpen: true, lead }); }}
                                className="p-2 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:text-teal-500 transition-all"
                                title="Assign Agent"
                              >
                                <UserPlus size={14} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setWorkflowModal({ isOpen: true, lead, type: 'Converted' }); }}
                                className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                title="Convert"
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setWorkflowModal({ isOpen: true, lead, type: 'NotInterested' }); }}
                                className="p-2 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                title="Reject"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-6 border-t border-zinc-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between bg-zinc-50 dark:bg-white/[0.01] gap-4">
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center sm:text-left">Node { (page-1)*pageSize + 1 } - { Math.min(page*pageSize, leads?.length || 0) } of {leads?.length || 0} Analyzed</div>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-9 px-4 rounded-xl border-zinc-200 dark:border-white/10"><ChevronLeft size={16} /></Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="h-9 px-4 rounded-xl border-zinc-200 dark:border-white/10"><ChevronRight size={16} /></Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assignment Modal */}
      <Modal isOpen={assignModal.isOpen} onClose={() => setAssignModal({ isOpen: false, lead: null })} title="Assign Ownership">
         <div className="space-y-4 py-4">
            <p className="text-xs font-medium text-zinc-500">Allocate node <span className="text-zinc-900 dark:text-white font-bold">{assignModal.lead?.['User Name']}</span> to a representative.</p>
            <div className="grid grid-cols-1 gap-2">
               {AGENTS.map(agent => (
                 <button 
                   key={agent}
                   onClick={() => handleAssignAgent(agent)}
                   className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 hover:bg-teal-500/10 border border-zinc-200/50 dark:border-white/5 transition-all group"
                 >
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black">{agent[0]}</div>
                       <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 uppercase italic tracking-tight">{agent}</span>
                    </div>
                    <ArrowRight size={14} className="text-zinc-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
                 </button>
               ))}
            </div>
         </div>
      </Modal>

      {/* Comment Modal */}
      <Modal isOpen={commentModal.isOpen} onClose={() => setCommentModal({ ...commentModal, isOpen: false })} title="Node Intelligence Logs">
         <div className="space-y-6 py-4">
            <div className="space-y-4 max-h-40 overflow-y-auto no-scrollbar">
               {commentModal.lead && comments[commentModal.lead.id]?.length > 0 ? (
                 comments[commentModal.lead.id].map(comm => (
                   <div key={comm.id} className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-transparent">
                      <div className="flex justify-between items-center mb-1">
                         <span className="text-[8px] font-black uppercase text-teal-500 tracking-widest">{comm.author}</span>
                         <span className="text-[8px] font-bold text-zinc-400">{format(parseISO(comm.created_at), 'MMM dd, HH:mm')}</span>
                      </div>
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{comm.text}</p>
                   </div>
                 ))
               ) : (
                 <div className="text-center py-4 text-[10px] font-black uppercase text-zinc-400 italic">No logs detected for this node.</div>
               )}
            </div>
            <div className="space-y-2 pt-4 border-t border-black/5 dark:border-white/10">
               <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Add New Entry</label>
               <textarea 
                 className="w-full h-24 p-4 bg-zinc-100 dark:bg-white/5 border-none rounded-2xl text-xs font-medium focus:ring-2 focus:ring-teal-500/20 outline-none"
                 placeholder="Synchronize findings..."
                 value={commentModal.text}
                 onChange={(e) => setCommentModal({ ...commentModal, text: e.target.value })}
               />
            </div>
            <div className="flex gap-3">
               <Button variant="ghost" className="flex-1 rounded-xl h-11 text-zinc-500" onClick={() => setCommentModal({ ...commentModal, isOpen: false })}>Cancel</Button>
               <Button variant="primary" className="flex-1 rounded-xl h-11" onClick={handleAddComment} disabled={!commentModal.text.trim()}>Save Log</Button>
            </div>
         </div>
      </Modal>

      <LeadWorkflowModals
        isOpen={workflowModal.isOpen}
        onClose={() => setWorkflowModal({ ...workflowModal, isOpen: false })}
        lead={workflowModal.lead}
        type={workflowModal.type}
      />
    </PageShell>
  );
};

export default LeadsExplorerPage;
