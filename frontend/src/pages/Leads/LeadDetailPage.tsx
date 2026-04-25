import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  User,
  MessageSquare,
  Zap,
  PhoneCall,
  PhoneMissed,
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
  CheckCircle,
  Headphones,
  Play,
  Volume2,
  Download,
  Clock,
  CalendarClock,
  AlarmClock
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

  const rawStatus = String((lead as any).status || (lead as any)['lead stage'] || '').toLowerCase().trim();
  const isConverted = ['crm_converted', 'converted'].includes(rawStatus);
  const isLost = ['crm_lost', 'lost', 'not interested', 'wrong number', 'busy', 'voicemail'].includes(rawStatus);
  const isDemoBooked = rawStatus === 'demo_booked';
  const isCallback = rawStatus === 'call_back' || rawStatus === 'callback';
  const isMissed = ['failed', 'error', 'no answer', 'no_answer'].includes(rawStatus);
  const isFinalized = isConverted || isLost || isMissed;

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
          {isConverted && (
            <div className="flex items-center gap-2 px-5 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-semibold text-sm">
              <CheckCircle size={15} /> Converted
            </div>
          )}
          {isLost && (
            <div className="flex items-center gap-2 px-5 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 font-semibold text-sm">
              <X size={15} /> Lost
            </div>
          )}
          {isDemoBooked && (
            <div className="flex items-center gap-2 px-5 h-11 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-violet-400 font-semibold text-sm">
              <PhoneCall size={15} /> Demo Booked
            </div>
          )}
          {isCallback && (
            <div className="flex items-center gap-2 px-5 h-11 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-semibold text-sm">
              <PhoneCall size={15} /> Callback Requested
            </div>
          )}
          {isMissed && (
            <div className="flex items-center gap-2 px-5 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold text-sm">
              <PhoneMissed size={15} /> Missed Call
            </div>
          )}
          {!isFinalized && (
            <>
              <Button variant="outline" size="sm" onClick={() => setWorkflowModal({ isOpen: true, lead, type: 'NotInterested' })} className="rounded-2xl px-6 h-11 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                <X size={14} className="mr-2" /> Mark as Lost
              </Button>
              <Button variant="primary" size="sm" onClick={() => setWorkflowModal({ isOpen: true, lead, type: 'Converted' })} className="rounded-2xl px-6 h-11 shadow-sm bg-emerald-500 border-emerald-500 hover:bg-emerald-600">
                <CheckCircle size={14} className="mr-2" /> Mark as Converted
              </Button>
            </>
          )}
          <Button variant="secondary" size="sm" onClick={() => {
            // Download call transcript as a .txt file
            const callDate = lead.CallTimestamp || lead.created_at || '';
            const dateStr = callDate ? (() => { try { return format(new Date(callDate), 'MMM dd yyyy, hh:mm a'); } catch { return ''; } })() : '';
            const safeName = lead['User Name']?.replace(/[^a-zA-Z0-9]/g, '_') || 'Lead';
            const content = [
              `CALL TRANSCRIPT`,
              `=====================================`,
              `Name:      ${lead['User Name']}`,
              `Phone:     ${lead['Phone Number']}`,
              `Date:      ${dateStr}`,
              `Duration:  ${lead.duration ? `${Math.floor(Number(lead.duration)/60)}m ${Number(lead.duration)%60}s` : 'N/A'}`,
              `Sentiment: ${lead.sentiment}`,
              `Status:    ${lead.status || lead['lead stage']}`,
              `Lead Type: ${lead.lead_type || 'N/A'}`,
              `=====================================`,
              ``,
              `SUMMARY`,
              `-------`,
              lead['Conversation Summary'] || 'No summary available.',
              ``,
              `PRIMARY OBJECTION`,
              `-----------------`,
              lead.concern || 'None recorded.',
              ``,
              `RECOMMENDED ACTION`,
              `------------------`,
              lead['Action to be taken'] || 'None recorded.',
            ].join('\n');
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safeName}_transcript_${callDate ? format(new Date(callDate), 'yyyy-MM-dd') : 'unknown'}.txt`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Transcript downloaded');
          }} className="rounded-2xl px-6 h-11">
            <Download size={14} className="mr-2" /> Download Transcript
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
                 {lead.scoring.bucket ? (
                   <Badge variant={lead.scoring.bucket === 'Hot' ? 'danger' : lead.scoring.bucket === 'Warm' ? 'warning' : 'success'} size="sm" className="px-4 py-1 font-semibold">
                     {lead.scoring.bucket}
                   </Badge>
                 ) : (
                   <Badge variant="default" size="sm" className="px-4 py-1 font-semibold bg-red-500/15 text-red-400 border-red-500/20">Failed</Badge>
                 )}
                 {lead.scoring.score > 0 && (
                   <Badge variant="zinc" size="sm" className="px-4 py-1 font-semibold">
                     Score: {lead.scoring.score}
                   </Badge>
                 )}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-border">
               {[
                 { label: 'Phone', value: lead['Phone Number'], icon: Phone },
                 { label: 'Lead Type', value: (lead as any).lead_type || 'Eligible', icon: UserCheck },
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

          {/* Call Recording Player */}
          <SectionCard title="Call Recording" subtitle="Listen to the voice recording." icon={<Headphones size={16} style={{ color: 'var(--brand-500)' }} />}>
            {lead.recording_url ? (() => {
              const callDate = (() => {
                try {
                  const ts = lead.CallTimestamp || lead.created_at;
                  if (!ts) return null;
                  const d = new Date(ts);
                  return isNaN(d.getTime()) ? null : d;
                } catch { return null; }
              })();
              const dateLabel = callDate ? format(callDate, 'MMM dd, yyyy') : null;
              const timeLabel = callDate ? format(callDate, 'hh:mm a') : null;
              const safeFileName = `${lead['User Name'].replace(/[^a-zA-Z0-9]/g, '_')}_${callDate ? format(callDate, 'yyyy-MM-dd_HH-mm') : 'recording'}.mp3`;

              const handleDownload = () => {
                // Use backend proxy to avoid CORS — server fetches and streams as attachment
                const BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3010/api';
                const API_KEY = (import.meta.env.VITE_API_KEY as string) || 'dev_key_2026';
                const proxyUrl = `${BASE}/recordings/download?url=${encodeURIComponent(lead.recording_url!)}&filename=${encodeURIComponent(safeFileName)}&x-api-key=${API_KEY}`;
                const a = document.createElement('a');
                a.href = proxyUrl;
                a.download = safeFileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                toast.success(`Downloading: ${safeFileName}`);
              };

              return (
                <div className="py-4 space-y-4">
                  {/* Meta row: date + time + download */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                      {dateLabel && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                          <Calendar size={12} className="text-primary" />
                          {dateLabel}
                        </div>
                      )}
                      {timeLabel && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                          <Activity size={12} className="text-primary" />
                          {timeLabel}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all"
                    >
                      <Download size={11} /> Download
                    </button>
                  </div>

                  {/* Player */}
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary border border-border">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--brand-100)' }}>
                      <Volume2 size={18} style={{ color: 'var(--brand-600)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 truncate">{safeFileName}</p>
                      <audio
                        controls
                        controlsList="nodownload"
                        preload="metadata"
                        className="w-full h-10 rounded-lg"
                        style={{ maxWidth: '100%' }}
                      >
                        <source src={lead.recording_url} />
                        Your browser does not support audio playback.
                      </audio>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-3">
                  <Headphones size={20} className="text-muted-foreground" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground">No recording available for this lead.</p>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Call History" subtitle="Previous interactions." icon={<History size={16} className="text-purple-500" />}>
             <div className="space-y-4">
                {leadCalls.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No call history found.</p>
                ) : (
                  leadCalls.map((call, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-secondary border border-transparent hover:border-border transition-all group">
                       <div className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => navigate(`/calls?sessionId=${call.sessionId}`)}>
                          <span className="text-xs font-semibold text-foreground">{call.status === 'Done' ? 'Completed' : 'Active'}</span>
                          <span className="text-[9px] font-bold text-muted-foreground">
                            {(() => {
                               try {
                                  if (!call.lastTimestamp) return 'N/A';
                                  // Try ISO parse first, then Date constructor as fallback
                                  let date = parseISO(call.lastTimestamp);
                                  if (isNaN(date.getTime())) date = new Date(call.lastTimestamp);
                                  return isNaN(date.getTime()) ? 'N/A' : format(date, 'MMM dd, yyyy · hh:mm a');
                               } catch (e) { return 'N/A'; }
                            })()}
                          </span>
                       </div>
                       <p className="text-[11px] font-medium text-muted-foreground line-clamp-1 cursor-pointer mb-2" onClick={() => navigate(`/calls?sessionId=${call.sessionId}`)}>"{call.lastMessage}"</p>
                       {call.recording_url && (
                         <audio controls controlsList="nodownload" preload="none" className="w-full h-8 mt-1" style={{ maxWidth: '100%' }}>
                           <source src={call.recording_url} />
                         </audio>
                       )}
                    </div>
                  ))
                )}
             </div>
          </SectionCard>
        </div>

        {/* Insights */}
        <div className="lg:col-span-8 space-y-8">

          {/* ── Callback / Demo scheduling info ───────────────────── */}
          {(isCallback || isDemoBooked) && (() => {
            const callDate = (() => {
              try {
                const ts = lead.CallTimestamp || lead.created_at;
                if (!ts) return null;
                const d = new Date(ts);
                return isNaN(d.getTime()) ? null : d;
              } catch { return null; }
            })();
            const title = isCallback ? 'Callback Request Details' : 'Demo Booking Details';
            const subtitle = isCallback
              ? 'The customer requested a callback during this call.'
              : 'The customer booked a demo during this call.';
            const accentColor = isCallback ? 'orange' : 'violet';
            const Icon = isCallback ? AlarmClock : CalendarClock;
            const borderClass = isCallback
              ? 'border-orange-500/20 bg-orange-500/5'
              : 'border-violet-500/20 bg-violet-500/5';
            const iconColor = isCallback ? '#f97316' : '#a78bfa';

            return (
              <SectionCard
                title={title}
                subtitle={subtitle}
                icon={<Icon size={18} style={{ color: iconColor }} />}
              >
                <div className={`space-y-4 p-4 rounded-2xl border ${borderClass}`}>
                  {/* When the request was made */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shrink-0">
                      <Clock size={14} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                        {isCallback ? 'Callback Requested On' : 'Demo Booked On'}
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {callDate ? format(callDate, 'EEEE, MMM dd yyyy · hh:mm a') : 'Time not recorded'}
                      </p>
                    </div>
                  </div>

                  {/* What the customer said */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shrink-0 mt-0.5">
                      <MessageSquare size={14} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        What the Customer Said
                      </p>
                      <p className="text-sm font-medium text-foreground leading-relaxed">
                        {lead['Conversation Summary'] || 'No call summary available.'}
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground/60 pl-11 italic">
                    The exact {isCallback ? 'callback time' : 'demo date'} requested by the customer is mentioned in their statement above.
                  </p>
                </div>
              </SectionCard>
            );
          })()}

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
                          <p className="text-sm font-bold text-foreground">
                            {lead['Action to be taken'] || (
                              (lead as any).lead_type === 'Not Interested'
                                ? 'Lead expressed no interest. Do not follow up unless re-engagement is explicitly requested.'
                                : !lead.sentiment
                                ? 'Call failed — retry the call or verify the phone number before next attempt.'
                                : lead.sentiment === 'Hot'
                                ? 'Schedule a follow-up call within 24 hours — high intent, close the deal now.'
                                : lead.sentiment === 'Warm'
                                ? 'Send a personalised email with pricing details and schedule a demo within 3 days.'
                                : 'Add to re-engagement campaign; follow up in 2 weeks with a targeted offer.'
                            )}
                          </p>
                       </div>
                    </div>
                 </div>

                 {(() => {
                    if (!lead.sentiment) return null; // no sentiment bar for failed calls
                    const sentimentPct = lead.sentiment === 'Hot' ? 88 : lead.sentiment === 'Warm' ? 55 : lead.sentiment === 'Cold' ? 22 : 50;
                    const barColor = lead.sentiment === 'Hot' ? 'bg-rose-500' : lead.sentiment === 'Cold' ? 'bg-blue-500' : lead.sentiment === 'Warm' ? 'bg-amber-500' : '';
                    const barStyle = !barColor ? { background: 'var(--brand-500)' } : {};
                    return (
                      <div className="space-y-4 pt-4">
                         <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                            <TrendingUp size={14} style={{ color: 'var(--brand-500)' }} /> Sentiment Score
                         </h3>
                         <div className="space-y-2">
                            <div className="flex justify-between items-center mb-1">
                               <span className="text-xs font-semibold text-muted-foreground" style={{ color: 'var(--brand-600)' }}>{lead.sentiment}</span>
                               <span className="text-xs font-bold">{sentimentPct}%</span>
                            </div>
                            <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                               <div className={cn("h-full rounded-full shadow-sm transition-all", barColor)} style={{ width: `${sentimentPct}%`, ...barStyle }} />
                            </div>
                         </div>
                      </div>
                    );
                 })()}
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
