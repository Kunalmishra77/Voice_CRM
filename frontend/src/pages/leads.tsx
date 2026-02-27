import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataApi } from '../data/api';
import { useNavigate } from 'react-router-dom';
import { formatPhoneIndian, cn } from '../lib/utils';
import { Search, ChevronLeft, ChevronRight, Download, CheckCircle2, Circle, MessageCircle, MoreHorizontal, Zap, Filter, Smile, Meh, Frown } from 'lucide-react';
import { CustomDropdown } from '../components/ui/dropdown';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'New', label: 'New' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'FollowUpScheduled', label: 'Follow Up' },
  { value: 'Converted', label: 'Converted' },
  { value: 'NotInterested', label: 'Not Interested' },
  { value: 'Closed', label: 'Closed' },
];

const WORKED_OPTIONS = [
  { value: 'all', label: 'All Worked' },
  { value: 'true', label: 'Worked Only' },
  { value: 'false', label: 'Unworked Only' },
];

export default function LeadsHub() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [worked, setWorked] = useState('all');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads', { search, page, status, worked }],
    queryFn: async () => await dataApi.fetchLeads({ search, status, worked, limit: 100 })
  });

  // Simple client-side pagination for this spec
  const limit = 15;
  const paginatedData = (leads || []).slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil((leads || []).length / limit);

  const workedMutation = useMutation({
    mutationFn: ({ phone, flag }: { phone: string; flag: boolean }) => dataApi.setWorked(phone, flag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead workflow status updated');
    }
  });

  const handleExport = (format: 'csv' | 'xlsx') => {
    if (!leads) return;
    const leadsToExport = selectedLeads.length > 0 
      ? leads.filter((l: any) => selectedLeads.includes(l.phone))
      : leads;
    
    if (format === 'csv') dataApi.exportToCSV(leadsToExport, 'leads_export');
    else dataApi.exportToExcel(leadsToExport, 'leads_export');
    
    toast.success(`Exporting ${leadsToExport.length} leads as ${format.toUpperCase()}`);
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === paginatedData.length) setSelectedLeads([]);
    else setSelectedLeads(paginatedData.map((l: any) => l.phone));
  };

  const toggleSelectOne = (phone: string) => {
    setSelectedLeads(prev => prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]);
  };

  const getSentimentIcon = (sentiment: string) => {
    const s = sentiment?.toLowerCase();
    if (s?.includes('pos')) return <Smile size={14} className="text-[hsl(var(--success))]" />;
    if (s?.includes('neg')) return <Frown size={14} className="text-[hsl(var(--danger))]" />;
    return <Meh size={14} className="text-[hsl(var(--warning))]" />;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-in fade-in duration-500">
      
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--text-main))]">Leads <span className="font-light text-[hsl(var(--text-muted))]">Insights</span></h1>
          <p className="text-sm font-medium text-[hsl(var(--text-dim))] mt-1">
            Managing <span className="text-[hsl(var(--text-main))] font-bold">{leads?.length || 0}</span> synthesized leads.
          </p>
        </div>
        
        <div className="flex items-center gap-3 surface-card p-2 rounded-2xl border border-[hsl(var(--border-strong))] shadow-lg">
          <div className="relative group w-64 ml-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-dim))] group-focus-within:text-[hsl(var(--accent-main))] transition-colors" size={16} />
            <input
              type="text" placeholder="Search name or phone..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-transparent border-none py-2 pl-10 pr-4 text-sm font-medium outline-none transition-all placeholder:text-[hsl(var(--text-dim))] text-[hsl(var(--text-main))]"
            />
          </div>
          <div className="w-px h-6 bg-[hsl(var(--border-strong))]"></div>
          <CustomDropdown options={STATUS_OPTIONS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} placeholder="Status" className="w-40 border-none bg-transparent" />
          <div className="w-px h-6 bg-[hsl(var(--border-strong))]"></div>
          <CustomDropdown options={WORKED_OPTIONS} value={worked} onChange={(v) => { setWorked(v); setPage(1); }} placeholder="Worked" className="w-40 border-none bg-transparent" />
          <div className="w-px h-6 bg-[hsl(var(--border-strong))]"></div>
          <button onClick={() => handleExport('csv')} className="px-3 text-xs font-bold text-[hsl(var(--text-muted))] hover:text-white transition-colors">CSV</button>
          <button onClick={() => handleExport('xlsx')} className="px-3 pr-4 text-xs font-bold text-[hsl(var(--text-muted))] hover:text-[hsl(var(--success))] transition-colors">XLSX</button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="surface-glass inner-glow rounded-[2rem] shadow-2xl overflow-hidden flex flex-col flex-1 border-[hsl(var(--border-subtle))] relative">
        
        {/* Bulk Action Header */}
        {selectedLeads.length > 0 && (
          <div className="absolute top-0 left-0 right-0 z-20 px-8 py-3 bg-[hsl(var(--accent-main))] text-black flex items-center justify-between font-bold text-xs animate-in slide-in-from-top duration-300">
             <div className="flex items-center gap-4">
                <span>{selectedLeads.length} leads selected</span>
                <button onClick={() => setSelectedLeads([])} className="bg-black/10 hover:bg-black/20 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-widest text-[10px]">Clear Selection</button>
             </div>
             <div className="flex items-center gap-4">
                <button onClick={() => handleExport('csv')} className="flex items-center gap-1.5 hover:underline"><Download size={14} /> Export CSV</button>
             </div>
          </div>
        )}

        <div className="flex-1 overflow-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="surface-panel sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-5 w-12 border-b border-[hsl(var(--border-strong))]">
                  <button onClick={toggleSelectAll} className="p-1 text-[hsl(var(--text-muted))] hover:text-white transition-colors">
                    {selectedLeads.length === paginatedData.length && paginatedData.length > 0 ? <CheckCircle2 size={18} className="text-[hsl(var(--accent-main))]" /> : <Circle size={18} />}
                  </button>
                </th>
                <th className="px-4 py-5 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--text-muted))] border-b border-[hsl(var(--border-strong))]">Stage</th>
                <th className="px-4 py-5 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--text-muted))] border-b border-[hsl(var(--border-strong))] text-center">Score</th>
                <th className="px-4 py-5 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--text-muted))] border-b border-[hsl(var(--border-strong))]">Identity</th>
                <th className="px-4 py-5 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--text-muted))] border-b border-[hsl(var(--border-strong))]">Concern & Sentiment</th>
                <th className="px-4 py-5 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--text-muted))] border-b border-[hsl(var(--border-strong))] w-1/4">Summary & Action</th>
                <th className="px-4 py-5 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--text-muted))] border-b border-[hsl(var(--border-strong))]">Missing Info</th>
                <th className="px-4 py-5 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--text-muted))] border-b border-[hsl(var(--border-strong))]">Status/Owner</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--text-muted))] border-b border-[hsl(var(--border-strong))] text-right">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border-subtle))]">
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="px-6 py-5"><div className="h-10 w-full bg-[hsl(var(--bg-surface-raised))] rounded-xl"></div></td>
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-32 text-center text-[hsl(var(--text-dim))] font-medium text-sm">
                    <div className="flex flex-col items-center justify-center">
                       <Filter size={32} className="mb-4 opacity-20" />
                       No leads match the current filters.
                    </div>
                  </td>
                </tr>
              ) : paginatedData.map((lead: any) => (
                <tr 
                  key={lead.id} 
                  className={cn(
                    "group hover:bg-[hsl(var(--bg-surface-hover))]/50 cursor-pointer transition-all border-l-[3px]",
                    selectedLeads.includes(lead.phone) ? "bg-[hsl(var(--accent-dim))]/5 border-[hsl(var(--accent-main))]" : "border-transparent hover:border-[hsl(var(--border-strong))]"
                  )}
                  onClick={() => navigate(`/leads/${lead.phone}`)}
                >
                  <td className="px-6 py-5" onClick={(e) => { e.stopPropagation(); toggleSelectOne(lead.phone); }}>
                    <div className="p-1 rounded text-[hsl(var(--text-dim))] group-hover:text-white transition-colors">
                      {selectedLeads.includes(lead.phone) ? <CheckCircle2 size={18} className="text-[hsl(var(--accent-main))]" /> : <Circle size={18} />}
                    </div>
                  </td>
                  <td className="px-4 py-5 whitespace-nowrap">
                     <span className={cn(
                       "px-2.5 py-1 rounded-md text-[9px] font-bold tracking-widest uppercase border shadow-sm",
                       lead.lead_stage?.toLowerCase() === 'hot' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : 
                       lead.lead_stage?.toLowerCase() === 'warm' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                       "bg-[hsl(var(--accent-dim))] text-[hsl(var(--accent-main))] border-[hsl(var(--accent-glow))]"
                     )}>{lead.lead_stage}</span>
                  </td>
                  <td className="px-4 py-5 text-center">
                     <div className={cn("text-sm font-bold tabular-nums", lead.lead_score > 70 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--text-main))]")}>{lead.lead_score}</div>
                  </td>
                  <td className="px-4 py-5 min-w-[160px]">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[hsl(var(--text-main))] group-hover:text-[hsl(var(--accent-main))] transition-colors truncate">{lead.name}</span>
                      <span className="text-[10px] text-[hsl(var(--text-muted))] mt-0.5 font-bold tracking-tight">{formatPhoneIndian(lead.phone)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-[hsl(var(--text-main))] truncate max-w-[160px]">{lead.concern}</span>
                      <div className="flex items-center gap-1.5 bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-strong))] w-fit px-2 py-0.5 rounded text-[9px] font-bold uppercase text-[hsl(var(--text-muted))]">
                        {getSentimentIcon(lead.sentiment)} {lead.sentiment}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex flex-col gap-1 max-w-sm">
                      <span className="text-xs text-[hsl(var(--text-muted))] line-clamp-1 italic group-hover:text-white transition-colors">"{lead.summary}"</span>
                      <span className="text-[9px] font-bold text-[hsl(var(--accent-main))] uppercase tracking-wider flex items-center gap-1.5">
                        <Zap size={10} fill="currentColor" /> {lead.next_action}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                     <div className="flex flex-wrap gap-1">
                        {lead.missing_state && <span className="px-1.5 py-0.5 rounded-[4px] bg-[hsl(var(--danger))/0.1] text-[hsl(var(--danger))] text-[8px] font-black uppercase border border-[hsl(var(--danger))/0.2]">NO_STATE</span>}
                        {lead.missing_capacity_tph && <span className="px-1.5 py-0.5 rounded-[4px] bg-[hsl(var(--warning))/0.1] text-[hsl(var(--warning))] text-[8px] font-black uppercase border border-[hsl(var(--warning))/0.2]">NO_TPH</span>}
                        {!lead.missing_state && !lead.missing_capacity_tph && <span className="text-[8px] font-bold text-[hsl(var(--success))] uppercase opacity-50">Complete</span>}
                     </div>
                  </td>
                  <td className="px-4 py-5">
                     <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-[hsl(var(--text-main))] bg-[hsl(var(--bg-surface-raised))] px-2 py-0.5 rounded border border-[hsl(var(--border-strong))] w-fit">{lead.status}</span>
                        <span className="text-[9px] font-medium text-[hsl(var(--text-dim))] uppercase tracking-widest">{lead.owner_user_id === 'Unassigned' ? 'Unassigned' : 'Agent view'}</span>
                     </div>
                  </td>
                                      <td className="px-6 py-5 text-right whitespace-nowrap">
                                       <div className="flex flex-col items-end gap-1">
                                         <div className="text-[10px] font-bold text-[hsl(var(--text-main))] flex items-center gap-2">
                  
                         {lead.comments_count > 0 && <span className="flex items-center gap-1 text-[hsl(var(--accent-main))]"><MessageCircle size={10} /> {lead.comments_count}</span>}
                         {new Date(lead.ts_i).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </div>
                       <div className="text-[9px] font-bold text-[hsl(var(--text-dim))] uppercase tracking-widest">{new Date(lead.ts_i).toLocaleDateString()}</div>
                       <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); workedMutation.mutate({ phone: lead.phone, flag: !lead.worked_flag }); }}
                            className={cn(
                              "p-1.5 rounded-lg border transition-all active:scale-95",
                              lead.worked_flag ? "bg-[hsl(var(--success))/0.1] text-[hsl(var(--success))] border-[hsl(var(--success))/0.2]" : "surface-card text-[hsl(var(--text-dim))] border-[hsl(var(--border-strong))] hover:text-white"
                            )}
                            title={lead.worked_flag ? "Mark as Unworked" : "Mark as Worked"}
                          >
                             <CheckCircle2 size={14} />
                          </button>
                          <button className="p-1.5 surface-card rounded-lg border border-[hsl(var(--border-strong))] text-[hsl(var(--text-dim))] hover:text-white transition-all active:scale-95">
                             <MoreHorizontal size={14} />
                          </button>
                       </div>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-8 py-5 border-t border-[hsl(var(--border-subtle))] surface-panel flex items-center justify-between z-10 shrink-0">
          <div className="text-xs font-semibold text-[hsl(var(--text-muted))] uppercase tracking-widest flex items-center gap-2">
            Page <span className="text-[hsl(var(--accent-main))] text-sm font-bold">{page}</span> <span className="opacity-30">/</span> {totalPages || 1}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-2 surface-card rounded-xl hover:bg-[hsl(var(--bg-surface-hover))] hover:text-white disabled:opacity-30 transition-all border border-[hsl(var(--border-strong))] text-[hsl(var(--text-muted))]">
               <ChevronLeft size={16} />
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="p-2 surface-card rounded-xl hover:bg-[hsl(var(--bg-surface-hover))] hover:text-white disabled:opacity-30 transition-all border border-[hsl(var(--border-strong))] text-[hsl(var(--text-muted))]">
               <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}