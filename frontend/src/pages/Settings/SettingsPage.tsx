import React, { useState } from 'react';
import {
  Settings, Moon, Sun, Bell, Cpu,
  Database, Zap, Key,
  RefreshCw, Clock,
  History as HistoryIcon
} from 'lucide-react';
import { toast } from 'sonner';

import { PageShell } from '../../ui/PageShell';
import { SectionCard } from '../../ui/SectionCard';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { useTheme } from '../../state/themeStore';
import { cn } from '../../lib/utils';

const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [autoInsights, setAutoInsights] = useState(true);
  const [browserAlerts, setAlerts] = useState(true);
  const [retentionPeriod, setRetention] = useState('90');

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-none">Settings</h1>
          <p className="text-muted-foreground font-medium mt-1">Configure your CRM preferences and integrations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-10">
        <div className="lg:col-span-7 flex flex-col gap-8">
          <SectionCard title="Appearance" subtitle="Customize the interface." icon={<Sun size={18} className="text-primary" />}>
            <div className="grid grid-cols-2 gap-6 py-2">
               <button 
                 onClick={() => setTheme('light')} 
                 className={cn(
                   "flex flex-col items-center justify-center p-8 rounded-2xl border transition-all gap-4 group relative overflow-hidden", 
                   theme === 'light' ? "bg-card border-primary ring-1 ring-primary/20 shadow-lg scale-[1.02]" : "bg-secondary/50 border-border/50 text-muted-foreground hover:bg-secondary hover:border-border"
                 )}
               >
                 <div className={cn("p-4 rounded-2xl transition-all duration-300", theme === 'light' ? "bg-primary/10 text-primary scale-110 shadow-inner" : "bg-accent/50 text-muted-foreground group-hover:scale-110")}>
                   <Sun size={32} />
                 </div>
                 <span className="text-[13px] font-bold tracking-tight">Light Mode</span>
                 {theme === 'light' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />}
               </button>

               <button 
                 onClick={() => setTheme('dark')} 
                 className={cn(
                   "flex flex-col items-center justify-center p-8 rounded-2xl border transition-all gap-4 group relative overflow-hidden", 
                   theme === 'dark' ? "bg-card border-primary ring-1 ring-primary/20 shadow-lg scale-[1.02]" : "bg-secondary/50 border-border/50 text-muted-foreground hover:bg-secondary hover:border-border"
                 )}
               >
                 <div className={cn("p-4 rounded-2xl transition-all duration-300", theme === 'dark' ? "bg-primary/10 text-primary scale-110 shadow-inner" : "bg-accent/50 text-muted-foreground group-hover:scale-110")}>
                   <Moon size={32} />
                 </div>
                 <span className="text-[13px] font-bold tracking-tight">Dark Mode</span>
                 {theme === 'dark' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />}
               </button>
            </div>
          </SectionCard>

          <SectionCard title="Automation" subtitle="Configure automated behaviors." icon={<Cpu size={18} className="text-primary" />}>
            <div className="space-y-4 py-2">
               {[ { t: 'AI Insights', d: 'Auto-generate insights after calls.', v: autoInsights, s: setAutoInsights, i: Zap, c: 'teal' }, { t: 'Notifications', d: 'Browser alerts for important events.', v: browserAlerts, s: setAlerts, i: Bell, c: 'orange' } ].map((o, idx) => (
                 <div key={idx} className="flex items-center justify-between p-5 rounded-2xl bg-secondary/40 border border-border/50 group hover:border-primary/30 transition-all cursor-pointer" onClick={() => { o.s(!o.v); toast.success(`${o.t} ${o.v ? 'disabled' : 'enabled'}`); }}>
                    <div className="flex items-center gap-5">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm transition-transform group-hover:scale-105", o.v ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-accent/50 border-border text-muted-foreground')}>
                        <o.i size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground tracking-tight">{o.t}</p>
                        <p className="text-[11px] font-medium text-muted-foreground">{o.d}</p>
                      </div>
                    </div>
                    <div className={cn("w-11 h-6 rounded-full relative transition-all duration-300 flex-shrink-0", o.v ? 'bg-primary' : "bg-zinc-300 dark:bg-zinc-700")}>
                      <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md", o.v ? "left-6" : "left-1")} />
                    </div>
                 </div>
               ))}
               <div className="p-6 rounded-2xl bg-secondary/40 border border-border/50 space-y-6">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-sm">
                      <Clock size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground tracking-tight">Data Retention</p>
                      <p className="text-[11px] font-medium text-muted-foreground">How long to keep call data.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                     {['30', '90', '365', '∞'].map(d => (
                       <button key={d} onClick={() => { setRetention(d); toast.success(`Retention set to ${d === '∞' ? 'unlimited' : d + ' days'}`); }} className={cn("py-3 rounded-xl text-[11px] font-bold transition-all border shadow-sm", retentionPeriod === d ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border/60 text-muted-foreground hover:border-primary/40 hover:bg-accent")}>{d} Days</button>
                     ))}
                  </div>
               </div>
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-8">
          <SectionCard title="Audit Log" subtitle="Recent changes." icon={<HistoryIcon size={18} className="text-primary" />}>
             <div className="space-y-3 py-2 flex flex-col">
                {[ { a: 'Data retention updated', t: '2h ago', i: Database, c: 'text-blue-500', bg: 'bg-blue-500/10' }, { a: 'Connection re-tested', t: '5h ago', i: RefreshCw, c: 'text-emerald-500', bg: 'bg-emerald-500/10' }, { a: 'Keys rotated', t: '1d ago', i: Key, c: 'text-purple-500', bg: 'bg-purple-500/10' } ].map((l, i) => (
                  <div key={i} className="flex items-center gap-5 p-4 rounded-2xl bg-secondary/30 hover:bg-secondary/60 transition-all group border border-border/40 hover:border-primary/20">
                     <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm", l.bg, l.c)}>
                       <l.i size={18} />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-xs font-bold text-foreground truncate tracking-tight">{l.a}</p>
                       <p className="text-[10px] font-bold text-muted-foreground mt-1 opacity-60 uppercase tracking-wider">{l.t}</p>
                     </div>
                  </div>
                ))}
                <div className="pt-4">
                  <Button 
                    variant="outline" 
                    className="w-full text-xs font-bold text-muted-foreground hover:text-primary py-6 rounded-2xl border-dashed border-2 border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all" 
                    onClick={() => toast.info("Full audit log coming soon")}
                  >
                    View Full Audit Log
                  </Button>
                </div>
             </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
};

export default SettingsPage;
