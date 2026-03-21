import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox, PhoneCall, Wifi, Activity, User, ArrowRight, Zap, Clock,
  RefreshCw, Search, Filter, Radio, Mic, Settings, ShieldCheck,
  Globe, Plus, Send, Loader2, BellRing, MoreVertical, X, Volume2,
  CheckCircle2, TrendingUp, FileText, ArrowLeft
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

import { SectionCard } from '../../ui/SectionCard';
import { EmptyState } from '../../ui/EmptyState';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Skeleton } from '../../ui/Skeleton';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { useGlobalFilters } from '../../state/globalFiltersStore';
import { dataProvider } from '../../data/dataProvider';
import { type ChatMessage, type ChatSession } from '../../data/api';
import { cn, safeFormat } from '../../lib/utils';
import { PageShell } from '../../ui/PageShell';

interface LiveSession extends ChatSession {
  agentName?: string;
  isRinging: boolean;
}

const LiveCallsPage: React.FC = () => {
  const navigate = useNavigate();
  const { dateRange } = useGlobalFilters();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [autoAssign, setAutoAssign] = useState(true);
  const [alertsOnHot, setAlertsOnHot] = useState(true);
  const [view, setView] = useState<'list' | 'detail'>('list');

  const [activeSessions, setActiveSessions] = useState<LiveSession[]>([]);
  const [transcriptIndex, setTranscriptIndex] = useState<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: initialSessions, isLoading } = useQuery({
    queryKey: ['live-sessions-base', dateRange],
    queryFn: () => dataProvider.getSessions(dateRange),
  });

  const { data: fullTranscript } = useQuery({
    queryKey: ['live-transcript', selectedId],
    queryFn: () => dataProvider.getConversation(selectedId!),
    enabled: !!selectedId,
  });

  useEffect(() => {
    if (!initialSessions) return;
    const initial = initialSessions.slice(0, 5).map((s, i) => ({
      ...s,
      isRinging: i === 0,
      agentName: i === 0 ? 'Ringing...' : ['Agent 1', 'Agent 2', 'Agent 3'][i % 3]
    }));
    setActiveSessions(initial);
    const indices: Record<string, number> = {};
    initial.forEach(s => { indices[s.sessionId] = Math.floor(Math.random() * 5) + 3; });
    setTranscriptIndex(indices);

    const timer = setInterval(() => {
      setActiveSessions(prev => {
        if (Math.random() > 0.8) {
          const nextIdx = (prev.length + 1) % initialSessions.length;
          const newCall = {
            ...initialSessions[nextIdx],
            sessionId: `live_${Date.now()}_${Math.random()}`,
            isRinging: true,
            agentName: 'Ringing...',
            lastTimestamp: new Date().toISOString()
          };
          return [newCall, ...prev.slice(0, 10)];
        }
        return prev.map(s => {
          if (s.isRinging && Math.random() > 0.5) return { ...s, isRinging: false, agentName: ['Agent 1', 'Agent 2', 'Agent 3'][Math.floor(Math.random() * 3)] };
          return s;
        });
      });
      setTranscriptIndex(prev => {
        const next = { ...prev };
        activeSessions.forEach(s => { if (!s.isRinging) next[s.sessionId] = (next[s.sessionId] || 0) + 1; });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [initialSessions]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcriptIndex, selectedId]);

  const selectedSession = useMemo(() => activeSessions.find(s => s.sessionId === selectedId), [activeSessions, selectedId]);

  const visibleTranscript = useMemo(() => {
    if (!fullTranscript || !selectedId) return [];
    return fullTranscript.slice(0, transcriptIndex[selectedId] || 0);
  }, [fullTranscript, selectedId, transcriptIndex]);

  const handleLaunchBroadcast = () => {
    setIsBroadcastModalOpen(false);
    toast.success("Voice broadcast initiated successfully!");
  };

  const handleEndCall = () => {
    if (!selectedId) return;
    setActiveSessions(prev => prev.filter(s => s.sessionId !== selectedId));
    setSelectedId(null);
    setView('list');
    toast.success("Call ended successfully.");
  };

  return (
    <PageShell className="p-0 overflow-hidden h-[calc(100vh-80px)]">
      <div className="flex flex-col lg:flex-row h-full bg-background">

        {/* LIST */}
        <div className={cn("w-full lg:w-80 flex-shrink-0 border-r border-border flex flex-col bg-card", view === 'detail' && "hidden lg:flex")}>
          <div className="p-6 border-b border-border space-y-4">
             <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Activity size={14} className="text-primary" /> Live Calls</h2>
                <Badge variant="success" className="text-[8px] rounded-full px-2 py-0 animate-pulse">ACTIVE</Badge>
             </div>
             <Button variant="primary" size="sm" className="w-full rounded-2xl h-10 shadow-lg" onClick={() => setIsBroadcastModalOpen(true)}><Radio size={14} className="mr-2" /> New Broadcast</Button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
            {isLoading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />) : activeSessions.length === 0 ? <EmptyState icon={Inbox} title="No active calls" description="Waiting for incoming calls..." /> : activeSessions.map((sig) => (
                <div key={sig.sessionId} onClick={() => { setSelectedId(sig.sessionId); setView('detail'); }} className={cn("group p-4 rounded-2xl transition-all cursor-pointer border", selectedId === sig.sessionId ? "bg-primary/5 border-primary/30 shadow-sm" : "border-transparent hover:bg-accent hover:border-border")}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm bg-primary", sig.isRinging ? "bg-amber-500 animate-bounce" : "")}>{sig.isRinging ? <PhoneCall size={14} /> : sig.name[0]}</div>
                    <div className="flex-1 min-w-0"><h4 className="text-xs font-bold text-foreground truncate">{sig.name}</h4><p className="text-[10px] font-medium text-muted-foreground truncate">{sig.isRinging ? <span className="text-amber-500 animate-pulse">Ringing...</span> : sig.agentName}</p></div>
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground truncate pl-12 border-l border-border ml-4.5">"{sig.lastMessage}"</p>
                </div>
              ))}
          </div>
        </div>

        {/* TRANSCRIPT */}
        <div className={cn("flex-1 flex flex-col bg-background relative min-w-0 h-full", view === 'list' && "hidden lg:flex")}>
          {!selectedId ? <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-40"><Activity size={40} className="text-muted-foreground mb-4" /><h3 className="text-xl font-bold text-muted-foreground">Select a Call</h3></div> : (
            <>
              {/* Header */}
              <div className="h-20 px-4 md:px-8 border-b border-border flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-2xl z-20 gap-4">
                 <div className="flex items-center gap-3 md:gap-5 min-w-0 flex-1">
                    <Button variant="ghost" size="icon" onClick={() => setView('list')} className="lg:hidden text-muted-foreground flex-shrink-0"><ArrowLeft size={20} /></Button>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-accent border border-border flex items-center justify-center text-primary flex-shrink-0"><Mic size={20} className="animate-pulse" /></div>
                    <div className="min-w-0 flex-1">
                       <div className="flex items-center gap-2 overflow-hidden">
                          <h2 className="text-sm md:text-lg font-bold text-foreground tracking-tight truncate leading-tight">{selectedSession?.name}</h2>
                          <Badge variant="teal" className="text-[7px] animate-pulse rounded-full flex-shrink-0">IN-CALL</Badge>
                       </div>
                       <p className="text-[10px] font-medium text-muted-foreground truncate mt-0.5">{selectedSession?.agentName}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="secondary" size="sm" className="rounded-xl h-9 px-3 hidden sm:flex border-border text-[10px] font-semibold" onClick={() => toast.info("Call details panel coming soon")}><Settings size={12} className="mr-1.5" /> Details</Button>
                    <Button variant="secondary" size="sm" className="rounded-xl h-9 px-3 md:px-4 text-rose-500 hover:bg-rose-500/10 border-border text-[10px] font-semibold" onClick={handleEndCall}><X size={14} className="md:mr-1.5" /> End Call</Button>
                 </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar scroll-smooth">
                 <div className="max-w-3xl mx-auto space-y-8 pb-20">
                    {visibleTranscript.map((msg, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex flex-col", !!msg.bot_msg ? "items-start" : "items-end")}>
                          <div className={cn("flex items-center gap-2 mb-2 px-1", !msg.bot_msg && "flex-row-reverse")}>
                             <span className="text-[10px] font-semibold text-muted-foreground">{!!msg.bot_msg ? 'AI Agent' : 'Customer'}</span>
                             <span className="text-[9px] font-medium text-muted-foreground opacity-50">{safeFormat(msg.timestamp, 'hh:mm:ss a')}</span>
                          </div>
                          <div className={cn("max-w-[90%] md:max-w-[85%] p-4 md:p-5 rounded-3xl text-sm font-medium shadow-sm transition-all leading-relaxed", !!msg.bot_msg ? "bg-accent text-foreground rounded-tl-none border border-border" : "text-white rounded-tr-none shadow-lg")} style={!msg.bot_msg ? { background: 'var(--brand-500)' } : {}}>{msg.bot_msg || msg.user_msg}</div>
                        </motion.div>
                    ))}
                 </div>
              </div>
            </>
          )}
        </div>

        {/* STATUS PANEL */}
        <div className={cn(
          "w-full lg:w-[320px] flex-shrink-0 border-l border-border bg-card p-6 overflow-y-auto custom-scrollbar h-full lg:h-auto flex flex-col gap-10",
          (!selectedId || view === 'list') && "hidden lg:flex"
        )}>
           {/* System Status */}
           <div className="flex flex-col gap-4">
              <h3 className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-2 px-1"><ShieldCheck size={14} className="text-primary" /> System Status</h3>
              <div className="grid grid-cols-1 gap-2">
                 {[ { label: 'Connection', status: 'ONLINE', color: 'text-emerald-500' }, { label: 'Transcription', status: 'ACTIVE', color: 'text-primary' }, { label: 'Data Sync', status: 'READY', color: 'text-emerald-500' }, { label: 'Active Calls', status: `${activeSessions.length} ACTIVE`, color: 'text-blue-500' } ].map((item, i) => (
                   <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-accent/50 border border-border"><span className="text-[10px] font-semibold text-muted-foreground uppercase">{item.label}</span><span className={cn("text-[9px] font-bold uppercase", item.color)}>{item.status}</span></div>
                 ))}
              </div>
           </div>

           {/* Call Settings */}
           <div className="flex flex-col gap-4 pt-6 border-t border-border">
              <h3 className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider px-1">Call Settings</h3>
              <div className="grid grid-cols-1 gap-3">
                 {[ { t: 'Auto-assign', d: 'Round-robin assignment.', v: autoAssign, s: setAutoAssign }, { t: 'Hot Lead Alerts', d: 'Instant notifications.', v: alertsOnHot, s: setAlertsOnHot } ].map((o, i) => (
                   <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-accent/50 border border-border hover:border-primary/20 transition-all cursor-pointer" onClick={() => { o.s(!o.v); toast.success(`${o.t} ${o.v ? 'disabled' : 'enabled'}`); }}>
                    <div className="min-w-0 pr-4"><p className="text-xs font-bold text-foreground tracking-tight leading-none">{o.t}</p><p className="text-[10px] font-medium text-muted-foreground mt-1.5">{o.d}</p></div>
                    <div className={cn("w-10 h-5 rounded-full relative transition-colors duration-300 flex-shrink-0", o.v ? "" : "bg-muted")} style={o.v ? { background: 'var(--brand-500)' } : {}}><div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm", o.v ? "left-6" : "left-1")} /></div>
                   </div>
                 ))}
              </div>
           </div>

           {/* Call Insights */}
           {selectedSession && (
             <div className="flex flex-col gap-4 pt-6 border-t border-border animate-in fade-in slide-in-from-right-4">
                <h3 className="text-[10px] font-semibold uppercase text-primary tracking-wider flex items-center gap-2 px-1"><Zap size={14} /> Call Insights</h3>
                <div className="p-5 rounded-2xl border border-primary/10 space-y-3" style={{ background: 'var(--brand-50)' }}>
                   <div className="flex justify-between items-center"><span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--brand-600)' }}>Interest Level</span><TrendingUp size={12} className="text-primary" /></div>
                   <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--brand-100)' }}><motion.div initial={{ width: 0 }} animate={{ width: '78%' }} className="h-full rounded-full" style={{ background: 'var(--brand-500)' }} /></div>
                   <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">"Lead showing strong interest in offer."</p>
                </div>
                <Button variant="outline" className="w-full rounded-2xl h-12 border-border text-xs font-semibold group" onClick={() => toast.info("Audio monitoring coming soon")}><BellRing size={14} className="mr-2" /> Monitor Audio</Button>
             </div>
           )}
        </div>
      </div>

      <Modal isOpen={isBroadcastModalOpen} onClose={() => setIsBroadcastModalOpen(false)} title="New Voice Broadcast" className="max-w-md">
         <div className="space-y-6 py-4">
            <div className="space-y-2"><label className="text-[10px] font-semibold uppercase text-muted-foreground pl-1">Campaign Name</label><input type="text" placeholder="Campaign name..." className="w-full bg-secondary border border-border rounded-2xl h-12 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all" /></div>
            <div className="space-y-2"><label className="text-[10px] font-semibold uppercase text-muted-foreground pl-1">Campaign Template</label><div className="grid grid-cols-1 gap-2">
                  {['Standard Outreach', 'Follow-up Reminder'].map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-secondary border border-border hover:border-primary/30 transition-all cursor-pointer group"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-muted-foreground group-hover:text-primary transition-all"><FileText size={16} /></div><span className="text-xs font-semibold text-foreground">{t}</span></div><div className="w-4 h-4 rounded-full border-2 border-border group-hover:border-primary transition-all" /></div>
                  ))}
               </div></div>
            <div className="pt-4 flex gap-3"><Button variant="ghost" className="flex-1 rounded-2xl h-12 text-muted-foreground font-medium" onClick={() => setIsBroadcastModalOpen(false)}>Cancel</Button><Button variant="primary" className="flex-1 rounded-2xl h-12 shadow-lg font-semibold" onClick={handleLaunchBroadcast}>Launch Broadcast</Button></div>
         </div>
      </Modal>
    </PageShell>
  );
};

export default LiveCallsPage;
