import { useQuery } from '@tanstack/react-query';
import { dataApi } from '../data/api';
import { useNavigate } from 'react-router-dom';
import { formatPhoneIndian } from '../lib/utils';
import { MessageSquare, Phone, Clock, UserPlus, Activity, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LiveInbox() {
  const navigate = useNavigate();
  
  const { data: activeSessions, isLoading } = useQuery({
    queryKey: ['live-inbox'],
    queryFn: async () => await dataApi.fetchLiveInbox(),
    refetchInterval: 5000, // Poll every 5s for realtime feel without WebSockets
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div>
        <div className="flex items-center gap-2 mb-2 text-[hsl(var(--accent-main))]">
           <Activity size={18} className="animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-[0.2em]">Real-time Signal Buffer</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Live <span className="font-light text-[hsl(var(--text-muted))]">Inbox</span></h1>
        <p className="text-sm font-medium text-[hsl(var(--text-dim))] mt-1">
          Monitoring <span className="text-white font-bold">{activeSessions?.length || 0}</span> active connections waiting for the 9 AM synthesis batch.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [...Array(6)].map((_, i) => <div key={i} className="h-48 skeleton-pulse rounded-[1.5rem]"></div>)
        ) : (activeSessions?.length || 0) === 0 ? (
          <div className="col-span-full py-32 flex flex-col items-center justify-center text-center surface-glass rounded-[2rem] border border-dashed border-[hsl(var(--border-strong))]">
             <MessageSquare size={48} className="mb-4 text-[hsl(var(--text-dim))] opacity-20" />
             <p className="text-sm font-bold text-[hsl(var(--text-muted))] uppercase tracking-widest">Buffer Empty</p>
             <p className="text-xs font-medium text-[hsl(var(--text-dim))] mt-2">No active pre-insight sessions detected.</p>
          </div>
        ) : (
          activeSessions?.map((session: any) => (
            <motion.div 
              key={session.id}
              whileHover={{ y: -4 }}
              onClick={() => navigate(`/leads/${session.phone}`)}
              className="surface-glass inner-glow rounded-[1.5rem] p-6 border-[hsl(var(--border-subtle))] cursor-pointer group hover:border-[hsl(var(--border-strong))] transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-[hsl(var(--warning))] text-black text-[8px] font-black uppercase px-2 py-0.5 rounded-bl-lg">
                 Pre-Insight
              </div>

              <div className="flex justify-between items-start mb-5">
                <div className="w-12 h-12 rounded-[1rem] bg-[hsl(var(--bg-base))] border border-[hsl(var(--border-strong))] flex items-center justify-center text-xl font-bold text-[hsl(var(--accent-main))] shadow-inner">
                  {session.name?.[0] || 'U'}
                </div>
              </div>

              <div className="space-y-1 mb-5">
                <h3 className="text-sm font-bold text-white group-hover:text-[hsl(var(--accent-main))] transition-colors truncate">{session.name || 'Anonymous Node'}</h3>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[hsl(var(--text-muted))] uppercase">
                   <Phone size={10} /> {formatPhoneIndian(session.phone)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-strong))] mb-5 h-[68px]">
                 <p className="text-xs font-medium text-[hsl(var(--text-muted))] line-clamp-2 italic">"{session.user_msg}"</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[hsl(var(--border-subtle))]">
                 <div className="flex items-center gap-1.5 text-[9px] font-bold text-[hsl(var(--text-dim))] uppercase tracking-widest">
                    <Clock size={10} /> {new Date(session.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </div>
                 <button className="flex items-center gap-1.5 text-[9px] font-black text-[hsl(var(--text-muted))] hover:text-white uppercase tracking-widest transition-colors">
                    Assign <UserPlus size={12} />
                 </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}