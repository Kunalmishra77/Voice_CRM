import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, Calendar, Phone, Clock, MessageSquare, 
  ChevronRight, Play, Copy, Download, User, Info,
  TrendingUp, CheckCircle2, XCircle, Send, MoreVertical,
  Target, Zap, Flame, FileText, Share2, ArrowLeft,
  Loader2, ExternalLink, Activity, PhoneIncoming, AlertCircle
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
import { cn, safeFormat } from '../../lib/utils';

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
  
  const [view, setView] = useState<'list' | 'detail'>('list');

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

  const { data: leadInsight, isLoading: insightLoading } = useQuery({
    queryKey: ['lead-insight', selectedCall?.phone],
    queryFn: () => dataProvider.getLeadInsightByPhone(selectedCall?.phone!),
    enabled: !!selectedCall?.phone,
  });

  // --- Derived Data ---
  const filteredCalls = useMemo(() => {
    if (!calls) return [];
    let list = [...calls];
    const search = (localSearch || globalSearch || '').toLowerCase();
    if (search) {
      list = list.filter(c => 
        c.name.toLowerCase().includes(search) || 
        c.phone.includes(search) ||
        c.lastMessage.toLowerCase().includes(search)
      );
    }
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
      toast.success("Call ID copied");
    }
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
    toast.success(`Node synchronized as ${outcomeType}`);
  };

  // --- Sub-components ---
  const MessageBubble = ({ msg }: { msg: any }) => {
    const isBot = !!msg.bot_msg;
    const text = msg.bot_msg || msg.user_msg;
    
    return (
      <div className={cn("flex flex-col mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500", isBot ? "items-start" : "items-end")}>
        <div className={cn("flex items-center gap-3 mb-2 px-1", !isBot && "flex-row-reverse")}>
          <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
            {isBot ? 'Intelligence Engine' : 'Entity Node'}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground/60">
            {safeFormat(msg.timestamp, 'HH:mm:ss', '')}
          </span>
        </div>
        <div className={cn(
          "max-w-[85%] md:max-w-[75%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm transition-all",
          isBot 
            ? "bg-card border border-border text-foreground rounded-tl-none" 
            : "bg-primary text-primary-foreground rounded-tr-none"
        )}>
          {text}
        </div>
      </div>
    );
  };

  return (
    <PageShell className="p-0 overflow-hidden h-[calc(100vh-64px)]">
      <div className="flex flex-col lg:flex-row h-full">
        
        {/* LEFT: Registry List */}
        <div className={cn(
          "w-full lg:w-72 flex-shrink-0 border-r border-border flex flex-col bg-background",
          view === 'detail' && "hidden lg:flex"
        )}>
          <div className="p-5 border-b border-border space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Activity size={14} className="text-blue-500" /> Registry
                </h3>
                <Badge variant="zinc" size="xs" className="rounded-md font-bold">{filteredCalls.length}</Badge>
             </div>
             <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Identity or frequency..."
                  className="w-full pl-9 pr-4 py-2 bg-accent/50 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                />
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {callsLoading ? (
               <div className="p-12 flex flex-col items-center justify-center space-y-3 opacity-50">
                  <Loader2 className="animate-spin text-muted-foreground" size={20} />
                  <span className="text-[10px] font-medium uppercase tracking-widest">Scanning...</span>
               </div>
            ) : filteredCalls.length === 0 ? (
               <div className="p-12 text-center">
                  <p className="text-xs font-medium text-muted-foreground italic">No signals detected.</p>
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
                      "p-4 border-b border-border/50 cursor-pointer transition-all relative group",
                      isSelected ? "bg-accent border-l-2 border-l-foreground" : "hover:bg-accent/50 border-l-2 border-l-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2.5">
                       <div className={cn(
                         "w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shadow-sm transition-all",
                         call.status === 'NA' ? "bg-blue-500 text-white animate-pulse" : "bg-primary/10 text-primary"
                       )}>
                        {call.name[0]}
                       </div>
                       <div className="flex-1 min-w-0">
                          <h4 className={cn("text-sm font-semibold truncate leading-none mb-1.5", isSelected ? "text-foreground" : "text-foreground/80")}>
                            {call.name}
                          </h4>
                          <p className="text-[11px] font-medium text-muted-foreground">{call.phone}</p>
                       </div>
                    </div>
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Badge variant={call.status === 'NA' ? 'info' : 'zinc'} size="xs" className="text-[9px] uppercase font-semibold">
                            {call.status === 'NA' ? 'Active' : 'Ended'}
                          </Badge>
                          {localOutcome && (
                             <Badge variant={localOutcome.outcome === 'Converted' ? 'success' : 'danger'} size="xs" className="text-[9px] uppercase font-semibold">
                                {localOutcome.outcome}
                             </Badge>
                          )}
                       </div>
                       <span className="text-[10px] font-medium text-muted-foreground/60">{safeFormat(call.lastTimestamp, 'HH:mm')}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CENTER: Interaction Timeline */}
        <div className={cn(
          "flex-1 flex flex-col bg-background min-w-0 h-full",
          !selectedCallId && view === 'detail' && "hidden lg:flex"
        )}>
          {!selectedCallId ? (
            <div className="flex-1 flex items-center justify-center p-12">
               <EmptyState 
                 title="Node Inspection" 
                 description="Select an interaction from the registry to view decoded signals and intelligence patterns."
                 icon={PhoneIncoming}
               />
            </div>
          ) : (
            <>
              {/* Transcript Header */}
              <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-10">
                 <div className="flex items-center gap-4 min-w-0">
                    <Button variant="ghost" size="icon" onClick={() => setView('list')} className="lg:hidden text-muted-foreground h-8 w-8">
                       <ArrowLeft size={18} />
                    </Button>
                    <div className="flex flex-col min-w-0">
                       <h2 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2 truncate">
                         {selectedCall?.name} <span className="text-border mx-1">•</span> <span className="text-muted-foreground font-medium">{selectedCall?.phone}</span>
                       </h2>
                       <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5 truncate opacity-60">System ID: {selectedCallId?.substring(0, 16)}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyId} className="h-8 w-8 p-0 rounded-md bg-card border-border shadow-sm">
                       <Copy size={14} />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-3 rounded-md bg-card border-border shadow-sm hidden sm:flex text-xs font-semibold">
                       <Download size={14} className="mr-2" /> Export
                    </Button>
                    <Button variant="primary" size="sm" className="h-8 px-4 rounded-md shadow-sm text-xs font-semibold">
                       <Play size={14} className="mr-2 fill-current" /> Listen
                    </Button>
                 </div>
              </div>

              {/* Timeline Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-accent/10">
                 {transcriptLoading ? (
                   <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-40">
                      <Loader2 className="animate-spin text-muted-foreground" size={32} />
                      <p className="text-xs font-semibold uppercase tracking-[0.2em]">Decoding Signal Stream...</p>
                   </div>
                 ) : (
                   <div className="max-w-3xl mx-auto py-8">
                      {transcript?.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                      <div className="flex items-center justify-center py-12">
                         <div className="px-4 py-1.5 rounded-full bg-accent border border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 shadow-sm">
                           {selectedCall?.status === 'NA' ? 'Streaming live...' : 'End of interaction'}
                         </div>
                      </div>
                   </div>
                 )}
              </div>
            </>
          )}
        </div>

        {/* RIGHT: Intelligence Panel */}
        <div className={cn(
          "w-full lg:w-80 border-l border-border bg-card flex flex-col overflow-y-auto custom-scrollbar h-full lg:h-auto",
          (!selectedCallId || view === 'list') && "hidden lg:flex"
        )}>
          {!selectedCallId ? (
            <div className="p-12 text-center mt-24 opacity-30 flex flex-col items-center">
              <Zap size={32} className="mb-4" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Engine Standby</p>
            </div>
          ) : insightLoading ? (
            <div className="p-12 text-center mt-24 flex flex-col items-center gap-4">
               <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
               <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Synthesizing Intel...</p>
            </div>
          ) : !leadInsight ? (
            <div className="p-12 text-center mt-24 opacity-30 flex flex-col items-center">
              <AlertCircle size={32} className="mb-4" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Intel Node Missing</p>
            </div>
          ) : (
            <div className="p-6 space-y-8 pb-12">
              {/* Executive Summary */}
              <div className="space-y-4">
                 <h3 className="text-[10px] font-bold uppercase text-blue-500 tracking-[0.2em] flex items-center gap-2">
                    <Info size={14} /> Executive Summary
                 </h3>
                 <p className="text-sm font-medium text-foreground leading-relaxed italic opacity-90">
                    "{leadInsight['Conversation Summary']}"
                 </p>
                 <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant={leadInsight.sentiment === 'Hot' ? 'danger' : leadInsight.sentiment === 'Warm' ? 'warning' : 'zinc'} className="text-[10px] font-bold">
                       {leadInsight.sentiment} Intensity
                    </Badge>
                    <Badge variant="warning" className="text-[10px] font-bold">
                       Lead Score: {leadInsight.scoring?.score || 0}
                    </Badge>
                 </div>
              </div>

              {/* Signals */}
              <div className="space-y-4 pt-6 border-t border-border">
                 <h3 className="text-[10px] font-bold uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2">
                    <Target size={14} /> Critical Signals
                 </h3>
                 <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 shadow-sm">
                       <p className="text-[10px] font-bold text-orange-500 uppercase mb-1.5 tracking-wider">Primary Objection</p>
                       <p className="text-sm font-semibold text-foreground/90">{leadInsight.concern || 'Not detected'}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 shadow-sm">
                       <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1.5 tracking-wider">Recommended Strategy</p>
                       <p className="text-sm font-semibold text-foreground/90">{leadInsight['Action to be taken'] || 'Monitor node'}</p>
                    </div>
                 </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4 pt-8 border-t border-border">
                 <h3 className="text-[10px] font-bold uppercase text-muted-foreground tracking-[0.2em]">Node Disposition</h3>
                 {(() => {
                    const localOutcome = outcomes[selectedCall.sessionId];
                    const currentStatus = localOutcome?.outcome || leadInsight.status;
                    
                    if (currentStatus === 'Converted' || currentStatus === 'Unconverted' || currentStatus === 'NotInterested' || currentStatus === 'Closed') {
                       return (
                          <div className="p-4 rounded-xl bg-accent border border-border flex flex-col items-center justify-center gap-2 animate-in fade-in zoom-in duration-300">
                             <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center mb-1",
                                currentStatus === 'Converted' ? "bg-emerald-500/20 text-emerald-600" : "bg-rose-500/20 text-rose-600"
                             )}>
                                {currentStatus === 'Converted' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                             </div>
                             <p className="text-xs font-bold uppercase tracking-widest text-foreground">
                                Finalized as {currentStatus}
                             </p>
                             {localOutcome?.reason && (
                                <p className="text-[10px] font-medium text-muted-foreground italic text-center">
                                   Reason: {localOutcome.reason}
                                </p>
                             )}
                          </div>
                       );
                    }

                    return (
                       <div className="grid grid-cols-1 gap-2.5">
                          <Button 
                            variant="primary"
                            onClick={() => handleOpenOutcomeModal('Converted')}
                            className="rounded-lg h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest border-none shadow-sm shadow-emerald-500/10"
                          >
                             Mark Converted
                          </Button>
                          <Button 
                            variant="secondary"
                            onClick={() => handleOpenOutcomeModal('Unconverted')}
                            className="rounded-lg h-10 font-bold text-xs uppercase tracking-widest bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                          >
                             Mark Unconverted
                          </Button>
                       </div>
                    );
                 })()}
              </div>

            </div>
          )}
        </div>

      </div>

      <Modal 
        isOpen={isOutcomeModalOpen} 
        onClose={() => setIsOutcomeModalOpen(false)}
        title={`Finalize Disposition: ${outcomeType}`}
      >
        <div className="space-y-5 py-4">
           <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Classification Reason</label>
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
                className="w-full h-10 rounded-lg border-border"
              />
           </div>
           <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Decision Notes</label>
              <textarea 
                className="w-full h-28 p-4 bg-accent/30 rounded-xl border border-border text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                placeholder="Log internal context for this decision..."
                value={outcomeForm.note}
                onChange={(e) => setOutcomeForm(prev => ({ ...prev, note: e.target.value }))}
              />
           </div>
           <div className="flex gap-3 pt-2">
              <Button variant="ghost" className="flex-1 rounded-lg h-11 font-semibold" onClick={() => setIsOutcomeModalOpen(false)}>Abort</Button>
              <Button 
                variant="primary" 
                className="flex-1 rounded-lg h-11 font-bold shadow-sm" 
                onClick={handleSaveOutcome}
                disabled={!outcomeForm.reason}
              >
                Sync Decision
              </Button>
           </div>
        </div>
      </Modal>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
      `}</style>
    </PageShell>
  );
};

export default CallsPage;
