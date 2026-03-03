import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Calendar, Phone, Clock, Mic, MessageSquare, 
  ChevronRight, Play, Copy, Download, User, Info, AlertCircle,
  TrendingUp, CheckCircle2, XCircle, Send, MoreVertical, Star,
  Target, Zap, Flame, IceCream, FileText, Share2, ArrowLeft,
  Loader2, PlayCircle, ExternalLink, Activity
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

import { dataProvider } from '../../data/dataProvider';
import { useGlobalFilters } from '../../state/globalFiltersStore';
import { useOutcomeStore } from '../../state/outcomeStore';
import { PageShell } from '../../ui/PageShell';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { FixedDropdown } from '../../ui/FixedDropdown';
import { EmptyState } from '../../ui/EmptyState';
import { cn } from '../../lib/utils';

const CallsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const { dateRange, searchQuery: globalSearch } = useGlobalFilters();
  const { outcomes, setOutcome } = useOutcomeStore();

  // --- UI State ---
  const [selectedCallId, setSelectedCallId] = useState<string | null>(queryParams.get('sessionId'));
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [outcomeType, setOutcomeType] = useState<'Converted' | 'Unconverted' | 'Pending'>('Pending');
  const [outcomeForm, setOutcomeForm] = useState({ reason: '', note: '' });
  
  // Responsive UI state
  const [view, setView] = useState<'list' | 'detail'>('list');

  // Sync selectedCallId with URL if it changes
  useEffect(() => {
    const id = queryParams.get('sessionId');
    if (id) {
      setSelectedCallId(id);
      setView('detail');
    }
  }, [location.search]);

  // --- Queries ---
  const { data: calls, isLoading: callsLoading } = useQuery({
    queryKey: ['calls-list', dateRange],
    queryFn: () => dataProvider.getSessions(dateRange),
  });

  const { data: transcript, isLoading: transcriptLoading } = useQuery({
    queryKey: ['transcript', selectedCallId],
    queryFn: () => dataProvider.getConversation(selectedCallId!),
    enabled: !!selectedCallId,
  });

  const selectedCall = useMemo(() => {
    return calls?.find(c => c.sessionId === selectedCallId);
  }, [calls, selectedCallId]);

  const { data: leadInsight } = useQuery({
    queryKey: ['lead-insight', selectedCall?.phone],
    queryFn: () => dataProvider.getLeadInsightByPhone(selectedCall?.phone!),
    enabled: !!selectedCall?.phone,
  });

  // --- Derived Data ---
  const filteredCalls = useMemo(() => {
    if (!calls) return [];
    let list = [...calls];
    
    // Global + Local Search
    const search = (localSearch || globalSearch || '').toLowerCase();
    if (search) {
      list = list.filter(c => 
        c.name.toLowerCase().includes(search) || 
        c.phone.includes(search) ||
        c.lastMessage.toLowerCase().includes(search)
      );
    }

    // Status Filter
    if (statusFilter !== 'all') {
      list = list.filter(c => c.status.toLowerCase() === statusFilter.toLowerCase());
    }

    return list;
  }, [calls, localSearch, globalSearch, statusFilter]);

  // --- Handlers ---
  const handleSelectCall = (id: string) => {
    setSelectedCallId(id);
    setView('detail');
    const params = new URLSearchParams(location.search);
    params.set('sessionId', id);
    navigate(`/calls?${params.toString()}`, { replace: true });
  };

  const handleCopyId = () => {
    if (selectedCallId) {
      navigator.clipboard.writeText(selectedCallId);
      toast.success("Call ID copied to clipboard");
    }
  };

  const handleExportCall = () => {
    toast.info("Synthesizing call intelligence report...");
    setTimeout(() => toast.success("PDF Export complete."), 2000);
  };

  const handleOpenOutcomeModal = (type: 'Converted' | 'Unconverted') => {
    setOutcomeType(type);
    setIsOutcomeModalOpen(true);
  };

  const handleSaveOutcome = () => {
    if (!selectedCall) return;
    setOutcome({
      call_id: selectedCall.sessionId,
      phone: selectedCall.phone,
      outcome: outcomeType,
      reason: outcomeForm.reason,
      note: outcomeForm.note,
      updated_at: new Date().toISOString()
    });
    setIsOutcomeModalOpen(false);
    toast.success(`Outcome marked as ${outcomeType}`);
  };

  // --- Sub-components ---
  const MessageBubble = ({ msg }: { msg: any }) => {
    const isBot = !!msg.bot_msg;
    const text = msg.bot_msg || msg.user_msg;
    
    return (
      <div className={cn("flex flex-col mb-6 animate-in slide-in-from-bottom-2", isBot ? "items-start" : "items-end")}>
        <div className={cn("flex items-center gap-2 mb-1.5 px-1", !isBot && "flex-row-reverse")}>
          <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">
            {isBot ? 'System / Bot' : 'Customer'}
          </span>
          <span className="text-[9px] font-bold text-zinc-300">
            {msg.timestamp ? format(parseISO(msg.timestamp), 'hh:mm:ss a') : ''}
          </span>
        </div>
        <div className={cn(
          "max-w-[90%] md:max-w-[85%] p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-sm",
          isBot 
            ? "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-none border border-black/5 dark:border-white/5" 
            : "bg-teal-500 text-white rounded-tr-none shadow-teal-500/10"
        )}>
          {text}
        </div>
      </div>
    );
  };

  return (
    <PageShell className="p-0 overflow-hidden h-[calc(100vh-80px)]">
      <div className="flex flex-col lg:flex-row h-full bg-zinc-50 dark:bg-black">
        
        {/* LEFT PANEL: Call List */}
        <div className={cn(
          "w-full lg:w-80 flex-shrink-0 border-r border-black/5 dark:border-white/10 flex flex-col bg-white dark:bg-[#111111]",
          view === 'detail' && "hidden lg:flex"
        )}>
          <div className="p-4 border-b border-black/5 dark:border-white/10 space-y-3">
             <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                  <Activity size={12} className="text-teal-500" /> Registry
                </h3>
                <Badge variant="secondary" size="xs" className="rounded-full">{filteredCalls.length}</Badge>
             </div>
             <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Filter by name/phone..."
                  className="w-full pl-9 pr-4 py-2 bg-zinc-100 dark:bg-white/5 border-none rounded-xl text-xs focus:ring-1 focus:ring-teal-500/20"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                />
             </div>
             <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {['all', 'active', 'done'].map(s => (
                  <button 
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "text-[9px] font-black uppercase px-3 py-1 rounded-full border transition-all flex-shrink-0",
                      statusFilter === s 
                        ? "bg-teal-500 text-white border-teal-500 shadow-lg shadow-teal-500/20" 
                        : "bg-white dark:bg-zinc-900 text-zinc-400 border-black/5 dark:border-white/10 hover:border-zinc-300"
                    )}
                  >
                    {s}
                  </button>
                ))}
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {callsLoading ? (
               <div className="p-10 flex flex-col items-center justify-center opacity-40">
                  <Loader2 className="animate-spin mb-2" size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Intercepting...</span>
               </div>
            ) : filteredCalls.length === 0 ? (
               <div className="p-10 text-center">
                  <p className="text-xs font-bold text-zinc-400 italic">No nodes detected.</p>
               </div>
            ) : (
              filteredCalls.map((call) => {
                const isSelected = selectedCallId === call.sessionId;
                const localOutcome = outcomes[call.sessionId];
                return (
                  <div 
                    key={call.sessionId}
                    onClick={() => handleSelectCall(call.sessionId)}
                    className={cn(
                      "p-4 border-b border-black/5 dark:border-white/5 cursor-pointer transition-all relative group",
                      isSelected ? "bg-teal-500/5 dark:bg-teal-500/10 border-l-4 border-l-teal-500" : "hover:bg-zinc-50 dark:hover:bg-white/5 border-l-4 border-l-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                       <div className={cn(
                         "w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black shadow-sm group-hover:scale-110 transition-transform",
                         call.status === 'NA' ? "bg-teal-500 text-white animate-pulse" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                       )}>
                        {call.name[0]}
                       </div>
                       <div className="flex-1 min-w-0">
                          <h4 className={cn("text-xs font-black truncate leading-tight uppercase tracking-tight italic", isSelected ? "text-teal-600 dark:text-teal-400" : "text-zinc-900 dark:text-zinc-100")}>
                            {call.name}
                          </h4>
                          <p className="text-[10px] font-bold text-zinc-400 mt-0.5">{call.phone}</p>
                       </div>
                       {call.status === 'NA' && <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
                    </div>
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Badge variant={call.status === 'NA' ? 'info' : 'secondary'} size="xs" className="text-[8px] uppercase px-1 py-0 rounded-md">
                            {call.status === 'NA' ? 'Active' : 'Ended'}
                          </Badge>
                          {localOutcome && (
                             <Badge variant={localOutcome.outcome === 'Converted' ? 'success' : 'danger'} size="xs" className="text-[8px] uppercase px-1 py-0 rounded-md">
                                {localOutcome.outcome}
                             </Badge>
                          )}
                       </div>
                       <span className="text-[9px] font-bold text-zinc-400">{format(parseISO(call.lastTimestamp), 'hh:mm a')}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CENTER PANEL: Transcript */}
        <div className={cn(
          "flex-1 flex flex-col bg-white dark:bg-black min-w-0 h-full",
          !selectedCallId && view === 'detail' && "hidden lg:flex"
        )}>
          {!selectedCallId ? (
            <div className="flex-1 flex items-center justify-center p-8">
               <EmptyState 
                 title="Select a node to inspect" 
                 description="Choose a call from the registry to view live transcription and intelligence nodes."
                 icon={MessageSquare}
               />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="h-20 md:h-16 px-4 md:px-6 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-white/80 dark:bg-black/80 backdrop-blur-xl sticky top-0 z-10">
                 <div className="flex items-center gap-3 min-w-0">
                    <Button variant="ghost" size="icon" onClick={() => setView('list')} className="lg:hidden text-zinc-500">
                       <ArrowLeft size={20} />
                    </Button>
                    <div className="flex flex-col min-w-0">
                       <h2 className="text-xs md:text-sm font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2 truncate">
                         <span className="truncate">{selectedCall?.name}</span> <span className="text-zinc-300 hidden sm:block">/</span> <span className="hidden sm:block truncate text-zinc-500">{selectedCall?.phone}</span>
                       </h2>
                       <p className="text-[9px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 truncate">Session: {selectedCallId?.substring(0, 12)}...</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-1.5 md:gap-2">
                    <Button variant="secondary" size="sm" onClick={handleCopyId} className="rounded-xl h-8 md:h-9 px-2 md:px-3">
                       <Copy size={14} />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleExportCall} className="rounded-xl h-8 md:h-9 px-2 md:px-3 hidden sm:flex">
                       <Download size={14} className="md:mr-2" /> <span className="hidden md:inline">Export</span>
                    </Button>
                    <Button variant="primary" size="sm" className="rounded-xl h-8 md:h-9 px-3 md:px-4 bg-zinc-900 dark:bg-white text-white dark:text-black">
                       <Play size={14} className="md:mr-2 fill-current" /> <span className="hidden md:inline">Listen</span>
                    </Button>
                 </div>
              </div>

              {/* Timeline */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 custom-scrollbar bg-zinc-50/30 dark:bg-white/[0.01]">
                 {transcriptLoading ? (
                   <div className="flex flex-col items-center justify-center h-full opacity-40">
                      <Loader2 className="animate-spin mb-4" size={32} />
                      <p className="text-sm font-black uppercase tracking-[0.3em]">Decoding Audio Stream...</p>
                   </div>
                 ) : (
                   <div className="max-w-3xl mx-auto py-10">
                      {transcript?.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                      <div className="flex items-center justify-center py-10">
                         <div className="px-4 py-1.5 rounded-full bg-zinc-200/50 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                           {selectedCall?.status === 'NA' ? 'Streaming live...' : 'End of Conversation'}
                         </div>
                      </div>
                   </div>
                 )}
              </div>
            </>
          )}
        </div>

        {/* RIGHT PANEL: Intelligence */}
        <div className={cn(
          "w-full lg:w-80 border-l border-black/5 dark:border-white/10 bg-white dark:bg-[#111111] flex flex-col overflow-y-auto custom-scrollbar h-full lg:h-auto",
          (!selectedCallId || view === 'list') && "hidden lg:flex"
        )}>
          {!selectedCallId || !leadInsight ? (
            <div className="p-8 text-center mt-20 opacity-40">
              <Zap size={32} className="mx-auto mb-4 text-zinc-300" />
              <p className="text-xs font-black uppercase tracking-widest leading-relaxed">Intelligence Engine Standby</p>
            </div>
          ) : (
            <div className="p-6 space-y-8">
              {/* Summary Section */}
              <div className="space-y-4">
                 <h3 className="text-[10px] font-black uppercase text-teal-500 tracking-[0.2em] flex items-center gap-2">
                    <Info size={12} /> Executive Summary
                 </h3>
                 <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300 leading-relaxed italic">
                    "{leadInsight['Conversation Summary']}"
                 </p>
                 <div className="flex flex-wrap gap-2">
                    <Badge variant={leadInsight.sentiment === 'Positive' ? 'success' : leadInsight.sentiment === 'Negative' ? 'danger' : 'secondary'} className="text-[9px] uppercase font-black">
                       {leadInsight.sentiment} Sentiment
                    </Badge>
                    <Badge variant="warning" className="text-[9px] uppercase font-black">
                       Score: {leadInsight.scoring.score}
                    </Badge>
                 </div>
              </div>

              {/* Intelligence Nodes */}
              <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/10">
                 <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] flex items-center gap-2">
                    <Target size={12} /> Intent & Concerns
                 </h3>
                 <div className="space-y-3">
                    <div className="p-3 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                       <p className="text-[9px] font-black text-orange-500 uppercase mb-1">Primary Objection</p>
                       <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{leadInsight.concern}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-teal-500/5 border border-teal-500/10">
                       <p className="text-[9px] font-black text-teal-500 uppercase mb-1">Recommended Action</p>
                       <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{leadInsight['Action to be taken']}</p>
                    </div>
                 </div>
              </div>

              {/* Follow-up Scripts */}
              <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/10">
                 <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] flex items-center gap-2">
                    <MessageSquare size={12} /> Suggested Scripts
                 </h3>
                 <div className="space-y-3">
                    {[
                      { t: 'Empathetic', s: `I understand ${leadInsight.concern} is a priority. Let's look at how we can help...` },
                      { t: 'Value-Driven', s: `Our solution for ${leadInsight.concern} has helped users see a 30% ROI...` },
                    ].map((script, i) => (
                      <div key={i} className="group relative p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-transparent hover:border-teal-500/20 transition-all">
                         <p className="text-[8px] font-black text-zinc-400 uppercase mb-1">{script.t}</p>
                         <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 leading-snug pr-6">{script.s}</p>
                         <button 
                           onClick={() => { navigator.clipboard.writeText(script.s); toast.success("Script copied"); }}
                           className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-teal-500"
                         >
                            <Copy size={12} />
                         </button>
                      </div>
                    ))}
                 </div>
              </div>

              {/* Outcome Component */}
              <div className="space-y-4 pt-6 mt-6 border-t border-black/5 dark:border-white/10 pb-10">
                 <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Update Node Outcome</h3>
                 <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={() => handleOpenOutcomeModal('Converted')}
                      className="rounded-2xl h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest border-none shadow-lg shadow-emerald-500/20 px-2"
                    >
                       Mark Converted
                    </Button>
                    <Button 
                      onClick={() => handleOpenOutcomeModal('Unconverted')}
                      className="rounded-2xl h-11 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest border-none shadow-lg shadow-rose-500/20 px-2"
                    >
                       Not Interested
                    </Button>
                 </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Outcome Modal */}
      <Modal 
        isOpen={isOutcomeModalOpen} 
        onClose={() => setIsOutcomeModalOpen(false)}
        title={`Confirm Outcome: ${outcomeType}`}
      >
        <div className="space-y-4 py-4">
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-400">Primary Reason</label>
              <FixedDropdown 
                options={outcomeType === 'Converted' 
                  ? [
                    { value: 'Pricing Match', label: 'Pricing Match' },
                    { value: 'Feature Fit', label: 'Feature Fit' },
                    { value: 'Urgency', label: 'Urgency' },
                  ] 
                  : [
                    { value: 'Too Expensive', label: 'Too Expensive' },
                    { value: 'Missing Features', label: 'Missing Features' },
                    { value: 'Bought Competitor', label: 'Bought Competitor' },
                  ]
                }
                value={outcomeForm.reason}
                onChange={(val) => setOutcomeForm(prev => ({ ...prev, reason: val }))}
                className="w-full"
              />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-400">Additional Notes</label>
              <textarea 
                className="w-full h-24 p-4 bg-zinc-100 dark:bg-white/5 rounded-2xl border-none text-sm font-medium focus:ring-1 focus:ring-teal-500/20"
                placeholder="Details about the decision..."
                value={outcomeForm.note}
                onChange={(e) => setOutcomeForm(prev => ({ ...prev, note: e.target.value }))}
              />
           </div>
           <div className="flex gap-3 pt-4">
              <Button variant="ghost" className="flex-1" onClick={() => setIsOutcomeModalOpen(false)}>Cancel</Button>
              <Button 
                variant="primary" 
                className="flex-1" 
                onClick={handleSaveOutcome}
                disabled={!outcomeForm.reason}
              >
                Confirm & Sync
              </Button>
           </div>
        </div>
      </Modal>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); }
      `}</style>
    </PageShell>
  );
};

export default CallsPage;
