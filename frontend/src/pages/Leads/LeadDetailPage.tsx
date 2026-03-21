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
            <Skeleton className="h-[500px] w-full rounded-2xl" />
            <Skeleton className="h-[500px] lg:col-span-2 w-full rounded-2xl" />
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
          title="Lead Not Found"
          description="The lead you are searching for does not exist."
          ctaText="Return to Leads"
          onCtaClick={() => navigate('/leads')}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="rounded-xl text-muted-foreground">
          <ChevronLeft size={16} className="mr-1" /> Back to Leads
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">{lead['User Name']}</h1>
          <p className="text-muted-foreground font-medium mt-1">Lead details for {lead['Phone Number']}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setWorkflowModal({ isOpen: true, lead, type: 'NotInterested' })} className="rounded-2xl px-6 h-11 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
            <X size={14} className="mr-2" /> Mark as Lost
          </Button>
          <Button variant="primary" size="sm" onClick={() => setWorkflowModal({ isOpen: true, lead, type: 'Converted' })} className="rounded-2xl px-6 h-11 shadow-sm bg-emerald-500 border-emerald-500 hover:bg-emerald-600">
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
          <SectionCard title="Profile" subtitle="Lead information and metadata.">
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-28 h-28 rounded-2xl flex items-center justify-center text-white mb-6 shadow-sm group-hover:scale-105 transition-transform duration-500" style={{ background: 'linear-gradient(to top right, var(--brand-500), #34d399)' }}>
                <User size={56} />
              </div>
              <h4 className="text-2xl font-bold text-foreground tracking-tight">{lead['User Name']}</h4>
              <p className="text-xs font-semibold text-muted-foreground mt-3">ID: {lead.id}</p>

              <div className="flex gap-2 mt-6">
                 <Badge variant={lead.scoring.bucket === 'Hot' ? 'danger' : lead.scoring.bucket === 'Warm' ? 'warning' : 'success'} size="sm" className="px-4 py-1 font-semibold">
                    {lead.scoring.bucket}
                 </Badge>
                 <Badge variant="zinc" size="sm" className="px-4 py-1 font-semibold">
                    Score: {lead.scoring.score}
                 </Badge>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-border">
               {[
                 { label: 'Phone', value: lead['Phone Number'], icon: Phone },
                 { label: 'Owner', value: lead.owner || 'Unassigned', icon: UserCheck },
                 { label: 'Status', value: lead.status || lead['lead stage'], icon: Activity },
                 { label: 'Last Contact', value: (() => {
                    try {
                      if (!lead.created_at) return 'N/A';
                      const date = parseISO(lead.created_at);
                      return isNaN(date.getTime()) ? 'N/A' : format(date, 'MMM dd, yyyy HH:mm');
                    } catch (e) { return 'N/A'; }
                 })(), icon: Calendar },
               ].map((item, i) => (
                 <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-muted-foreground">
                       <item.icon size={14} />
                    </div>
                    <div>
                       <p className="text-xs font-semibold text-muted-foreground leading-none mb-1">{item.label}</p>
                       <p className="text-xs font-bold text-foreground">{item.value}</p>
                    </div>
                 </div>
               ))}
            </div>
          </SectionCard>

          <SectionCard title="Call History" subtitle="Previous interactions." icon={<History size={16} className="text-purple-500" />}>
             <div className="space-y-4">
                {leadCalls.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No call history found.</p>
                ) : (
                  leadCalls.map((call, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-secondary border border-transparent hover:border-border transition-all cursor-pointer group" onClick={() => navigate(`/calls?sessionId=${call.sessionId}`)}>
                       <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-semibold text-foreground">{call.status === 'Done' ? 'Completed' : 'Active'}</span>
                          <span className="text-[9px] font-bold text-muted-foreground">
                            {(() => {
                               try {
                                  if (!call.lastTimestamp) return 'N/A';
                                  const date = parseISO(call.lastTimestamp);
                                  return isNaN(date.getTime()) ? 'N/A' : format(date, 'MMM dd');
                               } catch (e) { return 'N/A'; }
                            })()}
                          </span>
                       </div>
                       <p className="text-[11px] font-medium text-muted-foreground line-clamp-1">"{call.lastMessage}"</p>
                    </div>
                  ))
                )}
             </div>
          </SectionCard>
        </div>

        {/* Insights */}
        <div className="lg:col-span-8 space-y-8">
           <SectionCard title="Call Analysis" subtitle="AI-processed voice interaction insights." icon={<Mic size={18} style={{ color: 'var(--brand-500)' }} />}>
              <div className="space-y-8 py-4">
                 <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                       <Info size={14} style={{ color: 'var(--brand-500)' }} /> Summary
                    </h3>
                    <Card className="p-6 border border-primary/10 rounded-2xl bg-accent">
                       <p className="text-base font-medium text-foreground leading-relaxed">
                          "{lead['Conversation Summary']}"
                       </p>
                    </Card>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                       <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                          <Target size={14} className="text-orange-500" /> Primary Objection
                       </h3>
                       <div className="p-5 rounded-2xl bg-secondary border border-border">
                          <p className="text-sm font-bold text-foreground">{lead.concern}</p>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                          <ShieldCheck size={14} className="text-emerald-500" /> Recommended Action
                       </h3>
                       <div className="p-5 rounded-2xl bg-secondary border border-border">
                          <p className="text-sm font-bold text-foreground">{lead['Action to be taken']}</p>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4 pt-4">
                    <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                       <TrendingUp size={14} style={{ color: 'var(--brand-500)' }} /> Sentiment
                    </h3>
                    <div className="space-y-2">
                       <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-muted-foreground" style={{ color: 'var(--brand-600)' }}>{(lead.sentiment || 'Neutral')}</span>
                          <span className="text-xs font-bold">88%</span>
                       </div>
                       <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full shadow-sm", lead.sentiment === 'Positive' || lead.sentiment === 'Hot' ? "bg-emerald-500" : lead.sentiment === 'Negative' ? "bg-rose-500" : "")} style={lead.sentiment !== 'Positive' && lead.sentiment !== 'Hot' && lead.sentiment !== 'Negative' ? { background: 'var(--brand-500)' } : {}} />
                       </div>
                    </div>
                 </div>
              </div>
           </SectionCard>

           <SectionCard title="Follow-up Scripts" subtitle="Suggested follow-up templates for this lead." icon={<MessageSquare size={18} className="text-blue-500" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                 {[
                   { t: 'Empathy Approach', s: `I understand that ${(lead.concern || 'your requirements').toLowerCase()} is your main focus. We've optimized our solution to address exactly that...` },
                   { t: 'Value Proposition', s: `Our latest results for users facing ${(lead.concern || 'efficiency challenges').toLowerCase()} show a 40% improvement in outcomes...` },
                 ].map((script, i) => (
                   <Card key={i} className="p-6 bg-card border-border group hover:border-border transition-all">
                      <div className="flex justify-between items-start mb-4">
                         <span className="text-xs font-semibold text-muted-foreground">{script.t}</span>
                         <Badge variant="zinc" className="text-[8px] font-semibold uppercase">v2.4</Badge>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground leading-relaxed mb-6">"{script.s}"</p>
                      <Button variant="outline" className="w-full rounded-xl h-10 text-xs font-semibold" onClick={() => { navigator.clipboard.writeText(script.s); toast.success("Script copied."); }}>Copy Script</Button>
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
