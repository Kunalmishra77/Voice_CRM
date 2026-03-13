import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronLeft, 
  User, 
  MessageSquare, 
  Zap, 
  PhoneCall, 
  Mic, 
  ShieldCheck, 
  Target, 
  TrendingUp, 
  Activity,
  History,
  Info,
  Calendar,
  Phone,
  UserCheck,
  X,
  CheckCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

import { dataProvider } from '../../data/dataProvider';
import { Button } from '../../ui/Button';
import { SectionCard } from '../../ui/SectionCard';
import { EmptyState } from '../../ui/EmptyState';
import { PageShell } from '../../ui/PageShell';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { Skeleton } from '../../ui/Skeleton';
import { cn } from '../../lib/utils';
import { LeadWorkflowModals } from '../../components/Lead/LeadWorkflowModals';
import { type LeadInsightRow } from '../../data/api';

const LeadDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [workflowModal, setWorkflowModal] = useState<{ isOpen: boolean; lead: LeadInsightRow | null; type: 'Converted' | 'NotInterested' | 'Closed' | null }>({
    isOpen: false,
    lead: null,
    type: null
  });

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead-detail', id],
    queryFn: async () => {
      const all = await dataProvider.getLeads({ range: { from: '2020-01-01', to: '2030-01-01' } });
      return all.find(l => l.id === id) || null;
    },
    enabled: !!id
  });

  const { data: calls } = useQuery({
    queryKey: ['lead-calls', lead?.['Phone Number']],
    queryFn: () => dataProvider.getSessions({ from: '2020-01-01', to: '2030-01-01' }),
    enabled: !!lead?.['Phone Number']
  });

  const leadCalls = useMemo(() => {
    if (!calls || !lead) return [];
    return calls.filter(c => c.phone === lead['Phone Number']);
  }, [calls, lead]);

  if (isLoading) {
    return (
      <PageShell>
        <div className="space-y-8">
          <Skeleton className="h-10 w-40 rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="h-[500px] w-full rounded-[2.5rem]" />
            <Skeleton className="h-[500px] lg:col-span-2 w-full rounded-[2.5rem]" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (!lead) {
    return (
      <PageShell>
        <EmptyState 
          icon={ShieldCheck} 
          title="Entity Node Not Found" 
          description="The intelligence node you are searching for does not exist in this matrix segment."
          ctaText="Return to Explorer"
          onCtaClick={() => navigate('/leads')}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="rounded-xl text-zinc-500">
          <ChevronLeft size={16} className="mr-1" /> Back to Explorer
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter uppercase italic">{lead['User Name']}</h1>
          <p className="text-zinc-500 font-medium mt-1">Deep-dive intelligence for entity node: {lead['Phone Number']}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setWorkflowModal({ isOpen: true, lead, type: 'NotInterested' })} className="rounded-2xl px-6 h-11 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
            <X size={14} className="mr-2" /> Mark as Lost
          </Button>
          <Button variant="primary" size="sm" onClick={() => setWorkflowModal({ isOpen: true, lead, type: 'Converted' })} className="rounded-2xl px-6 h-11 shadow-xl shadow-teal-500/20 bg-emerald-500 border-emerald-500 hover:bg-emerald-600">
            <CheckCircle size={14} className="mr-2" /> Mark as Converted
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/calls?sessionId=${lead.id}`)} className="rounded-2xl px-6 h-11">
            <PhoneCall size={14} className="mr-2" /> View Transcript
          </Button>
        </div>
      </div>

      {/* Add Modal Component */}
      <LeadWorkflowModals
        isOpen={workflowModal.isOpen}
        onClose={() => setWorkflowModal({ isOpen: false, lead: null, type: null })}
        lead={workflowModal.lead}
        type={workflowModal.type}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        {/* Profile Card */}
        <div className="lg:col-span-4 space-y-8">
          <SectionCard title="Identity Profile" subtitle="Base entity information and metadata.">
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-28 h-28 rounded-[2.5rem] bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white mb-6 shadow-2xl shadow-teal-500/20 group-hover:scale-105 transition-transform duration-500">
                <User size={56} />
              </div>
              <h4 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 italic uppercase tracking-tight">{lead['User Name']}</h4>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mt-3">Node ID: {lead.id}</p>
              
              <div className="flex gap-2 mt-6">
                 <Badge variant={lead.scoring.bucket === 'Hot' ? 'danger' : lead.scoring.bucket === 'Warm' ? 'warning' : 'success'} size="sm" className="px-4 py-1 uppercase font-black">
                    {lead.scoring.bucket}
                 </Badge>
                 <Badge variant="zinc" size="sm" className="px-4 py-1 font-black">
                    Score: {lead.scoring.score}
                 </Badge>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-black/5 dark:border-white/5">
               {[
                 { label: 'Primary Frequency', value: lead['Phone Number'], icon: Phone },
                 { label: 'Assigned Operator', value: lead.owner || 'Unassigned', icon: UserCheck },
                 { label: 'Current Status', value: lead.status || lead['lead stage'], icon: Activity },
                 { label: 'Last Intercept', value: (() => {
                    try {
                      if (!lead.created_at) return 'N/A';
                      const date = parseISO(lead.created_at);
                      return isNaN(date.getTime()) ? 'N/A' : format(date, 'MMM dd, yyyy HH:mm');
                    } catch (e) { return 'N/A'; }
                 })(), icon: Calendar },
               ].map((item, i) => (
                 <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-400">
                       <item.icon size={14} />
                    </div>
                    <div>
                       <p className="text-[8px] font-black uppercase text-zinc-400 tracking-widest leading-none mb-1">{item.label}</p>
                       <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{item.value}</p>
                    </div>
                 </div>
               ))}
            </div>
          </SectionCard>

          <SectionCard title="Handshake Logs" subtitle="Temporal interaction trail." icon={<History size={16} className="text-purple-500" />}>
             <div className="space-y-4">
                {leadCalls.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No historical logs detected.</p>
                ) : (
                  leadCalls.map((call, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-transparent hover:border-teal-500/20 transition-all cursor-pointer group" onClick={() => navigate(`/calls?sessionId=${call.sessionId}`)}>
                       <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase">{call.status === 'Done' ? 'VOICE_COMPLETED' : 'VOICE_ACTIVE'}</span>
                          <span className="text-[9px] font-bold text-zinc-400">
                            {(() => {
                               try {
                                  if (!call.lastTimestamp) return 'N/A';
                                  const date = parseISO(call.lastTimestamp);
                                  return isNaN(date.getTime()) ? 'N/A' : format(date, 'MMM dd');
                               } catch (e) { return 'N/A'; }
                            })()}
                          </span>
                       </div>
                       <p className="text-[11px] font-medium text-zinc-500 line-clamp-1 italic">"{call.lastMessage}"</p>
                    </div>
                  ))
                )}
             </div>
          </SectionCard>
        </div>

        {/* Intelligence Deep-dive */}
        <div className="lg:col-span-8 space-y-8">
           <SectionCard title="Behavioral Synthesis" subtitle="AI-processed voice interaction patterns." icon={<Mic size={18} className="text-teal-500" />}>
              <div className="space-y-8 py-4">
                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] flex items-center gap-2">
                       <Info size={14} className="text-teal-500" /> Global Summary
                    </h3>
                    <Card className="p-6 bg-teal-500/5 border-teal-500/10 rounded-[2rem]">
                       <p className="text-base font-medium text-zinc-700 dark:text-zinc-200 leading-relaxed italic">
                          "{lead['Conversation Summary']}"
                       </p>
                    </Card>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                       <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] flex items-center gap-2">
                          <Target size={14} className="text-orange-500" /> Primary Objection
                       </h3>
                       <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
                          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{lead.concern}</p>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] flex items-center gap-2">
                          <ShieldCheck size={14} className="text-emerald-500" /> Recommended Strategy
                       </h3>
                       <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
                          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{lead['Action to be taken']}</p>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4 pt-4">
                    <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] flex items-center gap-2">
                       <TrendingUp size={14} className="text-teal-500" /> Sentiment intensity
                    </h3>
                    <div className="space-y-2">
                       <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase">{(lead.sentiment || 'Neutral')} Vector</span>
                          <span className="text-xs font-black">88%</span>
                       </div>
                       <div className="h-2 w-full bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full shadow-sm", lead.sentiment === 'Positive' || lead.sentiment === 'Hot' ? "bg-emerald-500" : lead.sentiment === 'Negative' ? "bg-rose-500" : "bg-teal-500")} style={{ width: '88%' }} />
                       </div>
                    </div>
                 </div>
              </div>
           </SectionCard>

           <SectionCard title="Agent Interaction Scripts" subtitle="Optimized follow-up templates for this node." icon={<MessageSquare size={18} className="text-blue-500" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                 {[
                   { t: 'The Empathy Handshake', s: `I understand that ${(lead.concern || 'your requirements').toLowerCase()} is your main focus. We've optimized our engine to solve exactly that...` },
                   { t: 'The Performance Pivot', s: `Our latest benchmarks for users facing ${(lead.concern || 'efficiency challenges').toLowerCase()} show a 40% improvement in deployment speed...` },
                 ].map((script, i) => (
                   <Card key={i} className="p-6 bg-zinc-50 dark:bg-white/[0.02] border-zinc-200/50 dark:border-white/5 group hover:border-teal-500/30 transition-all">
                      <div className="flex justify-between items-start mb-4">
                         <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-teal-500 transition-colors">{script.t}</span>
                         <Badge variant="zinc" className="text-[8px] font-black uppercase">v2.4</Badge>
                      </div>
                      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">"{script.s}"</p>
                      <Button variant="outline" className="w-full rounded-xl h-10 text-[10px] font-black uppercase tracking-widest" onClick={() => { navigator.clipboard.writeText(script.s); toast.success("Script copied to bridge."); }}>Copy Protocol</Button>
                   </Card>
                 ))}
              </div>
           </SectionCard>
        </div>
      </div>
    </PageShell>
  );
};

export default LeadDetailPage;
