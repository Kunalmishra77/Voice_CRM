import React, { useState } from 'react';
import { 
  Settings, Moon, Sun, Bell, ShieldCheck, Cpu, Globe, Key, 
  Database, Zap, CheckCircle2, AlertCircle, RefreshCw,
  ExternalLink, ChevronRight, MessageSquare, Lock, Clock,
  History as HistoryIcon
} from 'lucide-react';
import { toast } from 'sonner';

import { PageShell } from '../../ui/PageShell';
import { SectionCard } from '../../ui/SectionCard';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { useTheme } from '../../state/themeStore';
import { cn } from '../../lib/utils';

const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [autoInsights, setAutoInsights] = useState(true);
  const [browserAlerts, setAlerts] = useState(true);
  const [retentionPeriod, setRetention] = useState('90');
  const [isTestConnectionModalOpen, setIsTestConnectionModalOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = () => {
    setIsTestConnectionModalOpen(true);
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      toast.success("Node connectivity nominal.");
    }, 2000);
  };

  const handleRotateKeys = () => {
    toast.promise(new Promise(resolve => setTimeout(resolve, 1500)), {
      loading: 'Rotating keys...',
      success: 'Entropy pool updated.',
      error: 'Rotation failed.',
    });
  };

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter uppercase italic leading-none">Parameters</h1>
          <p className="text-zinc-500 font-medium mt-1">Global operational logic and security vectors.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-10">
        <div className="lg:col-span-7 flex flex-col gap-8">
          <SectionCard title="Interface" subtitle="Custom appearance." icon={<Sun size={18} className="text-orange-500" />}>
            <div className="grid grid-cols-2 gap-6 py-2">
               <button onClick={() => setTheme('light')} className={cn("flex flex-col items-center justify-center p-8 rounded-[2.5rem] border transition-all gap-4 group", theme === 'light' ? "bg-white border-teal-500 shadow-2xl scale-[1.02]" : "bg-zinc-50 border-transparent text-zinc-400")}><div className={cn("p-4 rounded-3xl transition-colors", theme === 'light' ? "bg-teal-500/10 text-teal-500" : "bg-zinc-200 text-zinc-400")}><Sun size={32} /></div><span className="text-[11px] font-black uppercase tracking-[0.2em]">Photopic</span></button>
               <button onClick={() => setTheme('dark')} className={cn("flex flex-col items-center justify-center p-8 rounded-[2.5rem] border transition-all gap-4 group", theme === 'dark' ? "bg-zinc-900 border-teal-500 shadow-2xl scale-[1.02]" : "bg-zinc-100 border-transparent text-zinc-400")}><div className={cn("p-4 rounded-3xl transition-colors", theme === 'dark' ? "bg-teal-500/10 text-teal-500" : "bg-zinc-200 text-zinc-400")}><Moon size={32} /></div><span className="text-[11px] font-black uppercase tracking-[0.2em]">Scotopic</span></button>
            </div>
          </SectionCard>

          <SectionCard title="Automation" subtitle="Interception behaviors." icon={<Cpu size={18} className="text-teal-500" />}>
            <div className="space-y-6 py-2">
               {[ { t: 'AI Synthesis', d: 'Insights post-call.', v: autoInsights, s: setAutoInsights, i: Zap, c: 'teal' }, { t: 'Notifications', d: 'Critical signals.', v: browserAlerts, s: setAlerts, i: Bell, c: 'orange' } ].map((o, idx) => (
                 <div key={idx} className="flex items-center justify-between p-6 rounded-[2rem] bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 group hover:border-teal-500/20 transition-all cursor-pointer" onClick={() => o.s(!o.v)}>
                    <div className="flex items-center gap-5"><div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border", o.c === 'teal' ? 'bg-teal-500/10 text-teal-500 border-teal-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20')}><o.i size={24} /></div><div><p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight italic">{o.t}</p><p className="text-[11px] font-medium text-zinc-500">{o.d}</p></div></div>
                    <div className={cn("w-12 h-6 rounded-full relative transition-colors duration-300 flex-shrink-0", o.v ? (o.c === 'teal' ? 'bg-teal-500' : 'bg-orange-500') : "bg-zinc-300 dark:bg-zinc-700")}><div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm", o.v ? "left-7" : "left-1")} /></div>
                 </div>
               ))}
               <div className="p-6 rounded-[2rem] bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 space-y-6">
                  <div className="flex items-center gap-5"><div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20"><Clock size={24} /></div><div><p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight italic">Retention</p><p className="text-[11px] font-medium text-zinc-500">Node purging policy.</p></div></div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                     {['30', '90', '365', '∞'].map(d => (
                       <button key={d} onClick={() => setRetention(d)} className={cn("py-3 rounded-2xl text-[11px] font-black uppercase transition-all border", retentionPeriod === d ? "bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-lg" : "bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-400 hover:border-zinc-300")}>{d} Days</button>
                     ))}
                  </div>
               </div>
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-8">
          <SectionCard title="Infrastructure" subtitle="Node connections." icon={<Globe size={18} className="text-blue-500" />}>
            <div className="space-y-6 py-2">
               <div className="p-6 rounded-[2.5rem] bg-zinc-900 dark:bg-white/[0.05] text-white shadow-2xl relative overflow-hidden group">
                  <div className="relative z-10 space-y-6">
                     <div className="flex justify-between items-start">
                        <div><Badge variant="zinc" className="bg-white/10 border-white/20 text-white text-[9px] uppercase font-black mb-3 px-3 py-1 rounded-full">Voice Provider</Badge><h4 className="text-2xl font-black tracking-tighter uppercase italic">V-Nexus Global</h4></div>
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30 animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.2)]"><ShieldCheck size={24} /></div>
                     </div>
                     <div className="space-y-2"><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Endpoint</p><div className="bg-white/5 p-3 rounded-xl border border-white/5 backdrop-blur-md"><code className="text-[10px] font-mono opacity-80 break-all">https://api.v-nexus.io/v1/intercept/...</code></div></div>
                     <div className="flex gap-3"><Button variant="secondary" size="sm" onClick={handleTestConnection} className="h-11 px-6 rounded-2xl text-[11px] font-black bg-white/10 border-white/10 text-white hover:bg-white/20 uppercase tracking-widest flex-1">Test</Button><Button variant="ghost" size="sm" onClick={handleRotateKeys} className="h-11 px-6 rounded-2xl text-[11px] font-black text-zinc-400 hover:text-white uppercase tracking-widest flex-1">Rotate</Button></div>
                  </div>
                  <Database size={140} className="absolute right-[-30px] bottom-[-30px] opacity-[0.05] group-hover:scale-110 transition-transform text-teal-500" />
               </div>
               <div className="p-6 rounded-[2rem] bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 space-y-5 shadow-inner">
                  <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.25em] flex items-center gap-2 pl-1"><Lock size={14} className="text-purple-500" /> Key Matrix</h3>
                  <div className="space-y-3">
                     {[ { l: 'Public', v: 'pk_live_8299...' }, { l: 'Secret', v: '••••••••••••' } ].map((k, i) => (
                       <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/5 shadow-sm"><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">{k.l}</span><code className="text-[10px] font-mono text-teal-500 font-black">{k.v}</code></div>
                     ))}
                  </div>
               </div>
            </div>
          </SectionCard>

          <SectionCard title="Audit" subtitle="Config mutations." icon={<HistoryIcon size={18} className="text-zinc-500" />}>
             <div className="space-y-4 py-2 flex flex-col">
                {[ { a: 'Retention purger', t: '2h ago', i: Database, c: 'text-blue-500' }, { a: 'Relay re-synced', t: '5h ago', i: RefreshCw, c: 'text-teal-500' }, { a: 'Key rotation', t: '1d ago', i: Key, c: 'text-purple-500' } ].map((l, i) => (
                  <div key={i} className="flex items-center gap-5 p-4 rounded-2xl hover:bg-zinc-50 dark:hover:bg-white/5 transition-all group border border-transparent hover:border-zinc-200 dark:hover:border-white/10">
                     <div className={cn("w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform", l.c)}><l.i size={18} /></div>
                     <div className="flex-1 min-w-0"><p className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase italic truncate">{l.a}</p><p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1 opacity-60">{l.t}</p></div>
                  </div>
                ))}
                <div className="pt-4"><Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 hover:text-teal-500 py-5 rounded-2xl border-dashed border-2 border-zinc-100 dark:border-white/5">Full Security Audit</Button></div>
             </div>
          </SectionCard>
        </div>
      </div>

      <Modal isOpen={isTestConnectionModalOpen} onClose={() => setIsTestConnectionModalOpen(false)} title="Handshake" className="max-w-md">
         <div className="py-12 flex flex-col items-center justify-center space-y-10">
            {isTesting ? (
              <><div className="relative"><div className="w-28 h-28 rounded-full border-4 border-teal-500/10 border-t-teal-500 animate-spin" /><div className="absolute inset-0 flex items-center justify-center text-teal-500 animate-pulse"><Globe size={40} /></div></div><div className="text-center"><h3 className="text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-white italic">Pinging Node...</h3><p className="text-sm font-medium text-zinc-500 mt-3 italic">Routing through V-Nexus mesh.</p></div></>
            ) : (
              <><div className="w-28 h-28 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-[0_0_60px_rgba(16,185,129,0.15)]"><CheckCircle2 size={56} /></div><div className="text-center"><h3 className="text-xl font-black uppercase tracking-[0.2em] text-emerald-500 italic">Verified</h3><p className="text-sm font-medium text-zinc-500 mt-3 italic max-w-xs mx-auto">All operational nodes prioritized.</p></div><Button variant="primary" className="w-full py-5 rounded-2xl" onClick={() => setIsTestConnectionModalOpen(false)}>Close</Button></>
            )}
         </div>
      </Modal>
    </PageShell>
  );
};

export default SettingsPage;
