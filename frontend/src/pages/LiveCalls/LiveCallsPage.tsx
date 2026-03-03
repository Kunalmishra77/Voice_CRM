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
import { cn } from '../../lib/utils';
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
      agentName: i === 0 ? 'Ringing...' : ['Rahul S.', 'Sanya M.', 'Arjun K.'][i % 3]
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
          if (s.isRinging && Math.random() > 0.5) return { ...s, isRinging: false, agentName: ['Rahul S.', 'Sanya M.', 'Arjun K.'][Math.floor(Math.random() * 3)] };
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

  return (
    <PageShell className="p-0 overflow-hidden h-[calc(100vh-80px)]">
      <div className="flex flex-col lg:flex-row h-full bg-zinc-50 dark:bg-black">
        
        {/* LIST */}
        <div className={cn("w-full lg:w-80 flex-shrink-0 border-r border-black/5 dark:border-white/10 flex flex-col bg-white dark:bg-[#09090b]", view === 'detail' && "hidden lg:flex")}>
          <div className="p-6 border-b border-black/5 dark:border-white/10 space-y-4">
             <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2"><Activity size={14} className="text-teal-500" /> Interceptor</h2>
                <Badge variant="success" className="text-[8px] rounded-full px-2 py-0 animate-pulse">ACTIVE</Badge>
             </div>
             <Button variant="primary" size="sm" className="w-full rounded-2xl h-10 shadow-lg shadow-teal-500/20" onClick={() => setIsBroadcastModalOpen(true)}><Radio size={14} className="mr-2" /> New Broadcast</Button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
            {isLoading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />) : activeSessions.length === 0 ? <EmptyState icon={Inbox} title="No nodes" description="Scanning..." /> : activeSessions.map((sig) => (
                <div key={sig.sessionId} onClick={() => { setSelectedId(sig.sessionId); setView('detail'); }} className={cn("group p-4 rounded-2xl transition-all cursor-pointer border border-transparent", selectedId === sig.sessionId ? "bg-teal-500/5 dark:bg-teal-500/10 border-teal-500/30 shadow-sm shadow-teal-500/5" : "hover:bg-zinc-100 dark:hover:bg-white/5 border-zinc-200/50 dark:border-white/5")}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-sm", sig.isRinging ? "bg-amber-500 animate-bounce" : "bg-gradient-to-tr from-teal-500 to-emerald-400")}>{sig.isRinging ? <PhoneCall size={14} /> : sig.name[0]}</div>
                    <div className="flex-1 min-w-0"><h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 truncate uppercase italic">{sig.name}</h4><p className="text-[10px] font-bold text-zinc-400 truncate">{sig.isRinging ? <span className="text-amber-500 animate-pulse">RINGING...</span> : sig.agentName}</p></div>
                  </div>
                  <p className="text-[10px] font-medium text-zinc-500 truncate italic pl-12 border-l border-zinc-200 dark:border-white/10 ml-4.5">"{sig.lastMessage}"</p>
                </div>
              ))}
          </div>
        </div>

        {/* TRANSCRIPT */}
        <div className={cn("flex-1 flex flex-col bg-white dark:bg-black relative min-w-0 h-full", view === 'list' && "hidden lg:flex")}>
          {!selectedId ? <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-40"><Activity size={40} className="text-zinc-300 mb-4" /><h3 className="text-xl font-black uppercase tracking-widest text-zinc-400 italic">Select Stream</h3></div> : (
            <>
              {/* Header Fixed */}
              <div className="h-20 px-4 md:px-8 border-b border-black/5 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-2xl z-20 gap-4">
                 <div className="flex items-center gap-3 md:gap-5 min-w-0 flex-1">
                    <Button variant="ghost" size="icon" onClick={() => setView('list')} className="lg:hidden text-zinc-500 flex-shrink-0"><ArrowLeft size={20} /></Button>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/10 flex items-center justify-center text-teal-500 flex-shrink-0 shadow-inner"><Mic size={20} className="animate-pulse" /></div>
                    <div className="min-w-0 flex-1">
                       <div className="flex items-center gap-2 overflow-hidden">
                          <h2 className="text-sm md:text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight truncate uppercase italic leading-tight">{selectedSession?.name}</h2>
                          <Badge variant="teal" className="text-[7px] animate-pulse rounded-full flex-shrink-0">IN-CALL</Badge>
                       </div>
                       <p className="text-[8px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest truncate mt-0.5 opacity-60 italic">{selectedSession?.agentName} • GRID: AS-WEST-1</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="secondary" size="sm" className="rounded-xl h-9 px-3 hidden sm:flex border-black/5 dark:border-white/10 text-[10px] uppercase font-black tracking-widest">Parameters</Button>
                    <Button variant="secondary" size="sm" className="rounded-xl h-9 px-3 md:px-4 text-rose-500 hover:bg-rose-500/10 border-black/5 dark:border-white/10 text-[10px] uppercase font-black tracking-widest"><X size={14} className="md:mr-2" /> Terminate</Button>
                 </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar scroll-smooth bg-zinc-50/30 dark:bg-white/[0.01]">
                 <div className="max-w-3xl mx-auto space-y-8 pb-20">
                    {visibleTranscript.map((msg, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex flex-col", !!msg.bot_msg ? "items-start" : "items-end")}>
                          <div className={cn("flex items-center gap-2 mb-2 px-1", !msg.bot_msg && "flex-row-reverse")}>
                             <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest opacity-60">{!!msg.bot_msg ? 'Bot Node' : 'Client'}</span>
                             <span className="text-[9px] font-bold text-zinc-300 italic opacity-40">{format(parseISO(msg.timestamp), 'hh:mm:ss a')}</span>
                          </div>
                          <div className={cn("max-w-[90%] md:max-w-[85%] p-4 md:p-5 rounded-3xl text-sm font-medium shadow-sm transition-all leading-relaxed", !!msg.bot_msg ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-tl-none border border-black/5 dark:border-white/5" : "bg-teal-500 text-white rounded-tr-none shadow-teal-500/10 shadow-lg")}>{msg.bot_msg || msg.user_msg}</div>
                        </motion.div>
                    ))}
                 </div>
              </div>
            </>
          )}
        </div>

        {/* HEALTH PANEL - RE-FIXED TO STACK VERTICALLY */}
        <div className={cn(
          "w-full lg:w-[320px] flex-shrink-0 border-l border-black/5 dark:border-white/10 bg-white dark:bg-[#09090b] p-6 overflow-y-auto custom-scrollbar h-full lg:h-auto flex flex-col gap-10", 
          (!selectedId || view === 'list') && "hidden lg:flex"
        )}>
           {/* Section 1 */}
           <div className="flex flex-col gap-4">
              <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.25em] flex items-center gap-2 px-1"><ShieldCheck size={14} className="text-teal-500" /> System Health</h3>
              <div className="grid grid-cols-1 gap-2">
                 {[ { label: 'Relay', status: 'ONLINE', color: 'text-emerald-500' }, { label: 'Transcription', status: 'ACTIVE', color: 'text-teal-500' }, { label: 'Vector Store', status: 'SYNCHED', color: 'text-emerald-500' }, { label: 'Links', status: `${activeSessions.length} LINKS`, color: 'text-blue-500' } ].map((item, i) => (
                   <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/50 dark:border-white/5"><span className="text-[10px] font-bold text-zinc-500 uppercase">{item.label}</span><span className={cn("text-[9px] font-black uppercase", item.color)}>{item.status}</span></div>
                 ))}
              </div>
           </div>

           {/* Section 2 */}
           <div className="flex flex-col gap-4 pt-6 border-t border-black/5 dark:border-white/10">
              <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.25em] px-1">Operational Logic</h3>
              <div className="grid grid-cols-1 gap-3">
                 {[ { t: 'Auto-assign', d: 'Round-robin.', v: autoAssign, s: setAutoAssign }, { t: 'Hot Alerts', d: 'Instant notify.', v: alertsOnHot, s: setAlertsOnHot } ].map((o, i) => (
                   <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-transparent hover:border-teal-500/20 transition-all cursor-pointer shadow-sm" onClick={() => o.s(!o.v)}>
                    <div className="min-w-0 pr-4"><p className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase italic tracking-tight leading-none">{o.t}</p><p className="text-[10px] font-medium text-zinc-500 mt-1.5">{o.d}</p></div>
                    <div className={cn("w-10 h-5 rounded-full relative transition-colors duration-300 flex-shrink-0", o.v ? "bg-teal-500" : "bg-zinc-300 dark:bg-zinc-700")}><div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm", o.v ? "left-6" : "left-1")} /></div>
                   </div>
                 ))}
              </div>
           </div>

           {/* Section 3 */}
           {selectedSession && (
             <div className="flex flex-col gap-4 pt-6 border-t border-black/5 dark:border-white/10 animate-in fade-in slide-in-from-right-4">
                <h3 className="text-[10px] font-black uppercase text-teal-500 tracking-[0.25em] flex items-center gap-2 px-1"><Zap size={14} /> Link Insights</h3>
                <div className="p-5 rounded-3xl bg-teal-500/5 border border-teal-500/10 space-y-3 shadow-inner">
                   <div className="flex justify-between items-center"><span className="text-[9px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest">Intensity</span><TrendingUp size={12} className="text-teal-500" /></div>
                   <div className="h-1.5 w-full bg-teal-500/10 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: '78%' }} className="h-full bg-teal-500 rounded-full shadow-[0_0_8px_rgba(20,184,166,0.5)]" /></div>
                   <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 italic leading-relaxed">"Node reacting positively to demo offer."</p>
                </div>
                <Button variant="outline" className="w-full rounded-2xl h-12 border-black/5 dark:border-white/10 text-[10px] font-black uppercase tracking-widest group shadow-sm"><BellRing size={14} className="mr-2 group-hover:animate-shake" /> Monitor Audio</Button>
             </div>
           )}
        </div>
      </div>

      <Modal isOpen={isBroadcastModalOpen} onClose={() => setIsBroadcastModalOpen(false)} title="New Voice Broadcast" className="max-w-md">
         <div className="space-y-6 py-4">
            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-zinc-400 pl-1">Campaign Name</label><input type="text" placeholder="Spring_Reactivation_26" className="w-full bg-zinc-100 dark:bg-white/5 border-none rounded-2xl h-12 px-4 text-sm font-medium focus:ring-2 focus:ring-teal-500/20 outline-none transition-all" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-zinc-400 pl-1">Intelligence Template</label><div className="grid grid-cols-1 gap-2">
                  {['Standard Demo Invite', 'Abandoned Cart Recovery'].map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 hover:border-teal-500/30 transition-all cursor-pointer group shadow-sm"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-teal-500 group-hover:bg-teal-500/10 transition-all"><FileText size={16} /></div><span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 uppercase italic tracking-tight">{t}</span></div><div className="w-4 h-4 rounded-full border-2 border-zinc-200 dark:border-white/10 group-hover:border-teal-500 transition-all" /></div>
                  ))}
               </div></div>
            <div className="pt-4 flex gap-3"><Button variant="ghost" className="flex-1 rounded-2xl h-12 text-zinc-500 font-bold uppercase text-[10px] tracking-widest" onClick={() => setIsBroadcastModalOpen(false)}>Cancel</Button><Button variant="primary" className="flex-1 rounded-2xl h-12 shadow-xl shadow-teal-500/10 font-black uppercase text-[10px] tracking-widest" onClick={handleLaunchBroadcast}>Launch Signal</Button></div>
         </div>
      </Modal>
    </PageShell>
  );
};

export default LiveCallsPage;
