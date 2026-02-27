import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataApi, type LeadStatus } from '../data/api';
import { formatPhoneIndian, cn } from '../lib/utils';
import { ArrowLeft, CheckCircle2, Circle, Send, MessageCircle, AlertCircle, Phone, ListTodo, Plus, ShieldCheck, History } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { CustomDropdown } from '../components/ui/dropdown';

const STATUS_OPTIONS = [
  { value: 'New', label: 'New' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'FollowUpScheduled', label: 'Follow Up' },
  { value: 'Converted', label: 'Converted' },
  { value: 'NotInterested', label: 'Not Interested' },
  { value: 'Closed', label: 'Closed' },
];

export default function LeadDetail() {
  const { id: phone } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const { data: detail, isLoading } = useQuery({
    queryKey: ['lead-detail', phone],
    queryFn: async () => await dataApi.fetchLeadDetail(phone || ''),
    enabled: !!phone,
  });

  const setStatusMutation = useMutation({
    mutationFn: (status: LeadStatus) => dataApi.setStatus(phone || '', status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-detail', phone] });
      toast.success('Pipeline status updated');
    }
  });

  const setWorkedMutation = useMutation({
    mutationFn: (flag: boolean) => dataApi.setWorked(phone || '', flag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-detail', phone] });
      toast.success(variables ? 'Lead marked as worked' : 'Lead unworked');
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: (text: string) => dataApi.addComment(phone || '', text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-detail', phone] });
      setNewComment('');
      toast.success('Note added to timeline');
    }
  });

  if (isLoading) {
    return <div className="h-[calc(100vh-140px)] flex items-center justify-center text-sm font-bold text-[hsl(var(--text-muted))] animate-pulse">Syncing Secure Signal Buffer...</div>;
  }

  const { insight, messages, state, extracted, score, comments } = detail || { 
    insight: null, messages: [], state: { status_enum: 'New', worked_flag: false }, 
    extracted: { missing_state: true, missing_district: true, missing_capacity_tph: true },
    score: { score_0_100: 0, reason_codes: [] },
    comments: [] 
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Reply copied to clipboard');
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 animate-in fade-in duration-500 max-w-[1800px] mx-auto">
      
      {/* LEFT: Intelligence Panel */}
      <div className="w-[320px] flex flex-col gap-6 shrink-0 h-full overflow-y-auto no-scrollbar">
        <div className="surface-glass inner-glow rounded-[2rem] p-6 shadow-sm border-[hsl(var(--border-subtle))]">
           <button onClick={() => navigate('/leads')} className="flex items-center gap-2 text-[10px] font-bold text-[hsl(var(--text-muted))] hover:text-white uppercase tracking-widest transition-colors mb-8">
              <ArrowLeft size={14} /> Back to Hub
           </button>

           <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-[1.5rem] bg-[hsl(var(--bg-base))] border border-[hsl(var(--border-strong))] flex items-center justify-center text-3xl font-bold text-[hsl(var(--accent-main))] mx-auto mb-4 shadow-inner">
                {insight?.name?.[0] || 'U'}
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{insight?.name || 'Unknown User'}</h2>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--text-muted))] mt-2 bg-[hsl(var(--bg-surface-raised))] px-3 py-1 rounded-lg border border-[hsl(var(--border-strong))]">
                 <Phone size={12} className="text-[hsl(var(--accent-main))]" /> {formatPhoneIndian(phone || '')}
              </div>
           </div>

           <div className="mt-8 space-y-6">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-widest block">Lead Score</span>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-white tabular-nums">{score.score_0_100}</div>
                  <div className="flex-1 h-1.5 bg-[hsl(var(--bg-base))] rounded-full border border-[hsl(var(--border-strong))] overflow-hidden">
                     <div className={cn(
                       "h-full rounded-full transition-all duration-1000",
                       score.score_0_100 > 70 ? "bg-[hsl(var(--success))]" : score.score_0_100 > 40 ? "bg-[hsl(var(--warning))]" : "bg-[hsl(var(--text-dim))]"
                     )} style={{ width: `${score.score_0_100}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[hsl(var(--bg-base))] border border-[hsl(var(--border-strong))] shadow-inner text-center">
                 <span className="text-[9px] font-black uppercase tracking-widest text-[hsl(var(--text-dim))] block mb-1">Extracted Sentiment</span>
                 <span className="text-sm font-bold text-white">{insight?.sentiment || 'Neutral'}</span>
              </div>

              <div className="space-y-2">
                 <span className="text-[10px] font-black uppercase text-[hsl(var(--text-dim))] tracking-widest">Extracted Summary</span>
                 <p className="text-xs font-medium text-[hsl(var(--text-muted))] leading-relaxed">
                   {insight?.summary || "No summary available. Session might still be active."}
                 </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-[hsl(var(--border-subtle))]">
                <span className="text-[10px] font-black uppercase text-[hsl(var(--text-dim))] tracking-widest">Requirements Check</span>
                <div className="space-y-2">
                   <RequirementBadge label="State / Location" missing={extracted.missing_state} />
                   <RequirementBadge label="District" missing={extracted.missing_district} />
                   <RequirementBadge label="Capacity (TPH)" missing={extracted.missing_capacity_tph} />
                </div>
              </div>

              {score.reason_codes?.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-[hsl(var(--border-subtle))]">
                  <span className="text-[10px] font-black uppercase text-[hsl(var(--text-dim))] tracking-widest">Score Rationale</span>
                  <div className="space-y-1.5">
                     {score.reason_codes.map((r: string, i: number) => (
                       <div key={i} className="text-[11px] font-medium text-[hsl(var(--text-muted))] flex items-start gap-2">
                          <CheckCircle2 size={12} className="text-[hsl(var(--accent-main))] mt-0.5 shrink-0" />
                          {r}
                       </div>
                     ))}
                  </div>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* CENTER: Timeline Panel */}
      <div className="flex-1 surface-glass inner-glow rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl border-[hsl(var(--border-subtle))] relative">
        <div className="h-14 border-b border-[hsl(var(--border-subtle))] surface-panel flex items-center px-8 z-10 shrink-0 shadow-sm">
           <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <History size={16} className="text-[hsl(var(--accent-main))]" /> Interaction Timeline
           </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar bg-[hsl(var(--bg-base))] bg-[radial-gradient(hsl(var(--border-subtle))_1px,transparent_1px)] [background-size:24px_24px]">
           {messages.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-[hsl(var(--text-dim))] italic text-sm">
               <History size={32} className="mb-4 opacity-30" />
               No recorded interactions.
             </div>
           ) : (
             messages.map((msg: any, idx: number) => (
               <div key={idx} className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex flex-col items-start max-w-[85%]">
                    <div className="px-5 py-3.5 bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-strong))] text-white rounded-2xl rounded-tl-none text-sm leading-relaxed shadow-sm font-medium">
                      {msg.user_msg}
                    </div>
                    <span className="text-[9px] font-bold text-[hsl(var(--text-dim))] mt-1.5 uppercase ml-1">Client • {new Date(msg.ts).toLocaleTimeString()}</span>
                  </div>
                  {msg.bot_msg && (
                    <div className="flex flex-col items-end max-w-[85%] ml-auto mt-6">
                      <div className="px-5 py-3.5 bg-[hsl(var(--accent-main))] text-black rounded-2xl rounded-tr-none text-sm leading-relaxed shadow-md font-bold">
                        {msg.bot_msg}
                      </div>
                      <span className="text-[9px] font-bold text-[hsl(var(--accent-main))] mt-1.5 uppercase mr-1 flex items-center gap-1">
                        <ShieldCheck size={10} /> Platform • Stage: {msg.stage}
                      </span>
                    </div>
                  )}
               </div>
             ))
           )}
        </div>
      </div>

      {/* RIGHT: Work Panel */}
      <div className="w-[340px] flex flex-col gap-6 shrink-0 h-full overflow-y-auto no-scrollbar">
        <div className="surface-glass inner-glow rounded-[2rem] p-6 shadow-sm border-[hsl(var(--border-subtle))] space-y-6">
           
           <div>
             <h3 className="text-[10px] font-black uppercase text-[hsl(var(--text-dim))] tracking-widest mb-4">Operations & Status</h3>
             <div className="space-y-4">
                <CustomDropdown options={STATUS_OPTIONS} value={state.status_enum} onChange={(v) => setStatusMutation.mutate(v as LeadStatus)} className="w-full" />
                <button 
                  onClick={() => setWorkedMutation.mutate(!state.worked_flag)}
                  className={cn(
                    "w-full py-3.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95",
                    state.worked_flag ? "bg-[hsl(var(--success))/0.1] text-[hsl(var(--success))] border-[hsl(var(--success))/0.2]" : "surface-card text-[hsl(var(--text-muted))] border-[hsl(var(--border-strong))] hover:text-white hover:border-[hsl(var(--border-subtle))]"
                  )}
                >
                  {state.worked_flag ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  {state.worked_flag ? "MARK AS UNWORKED" : "MARK AS WORKED"}
                </button>
             </div>
           </div>

           <div className="pt-6 border-t border-[hsl(var(--border-subtle))]">
              <h3 className="text-[10px] font-black uppercase text-[hsl(var(--text-dim))] tracking-widest mb-4">Recommended Action</h3>
              <div className="p-4 rounded-xl bg-[hsl(var(--accent-dim))] border border-[hsl(var(--accent-glow))] text-sm font-bold text-[hsl(var(--text-main))] flex items-start gap-3 shadow-sm">
                <AlertCircle size={18} className="shrink-0 text-[hsl(var(--accent-main))]" />
                {insight?.next_action || 'Review conversation and follow up.'}
              </div>
           </div>

           <div className="pt-6 border-t border-[hsl(var(--border-subtle))]">
              <h3 className="text-[10px] font-black uppercase text-[hsl(var(--text-dim))] tracking-widest mb-4">Suggested Replies</h3>
              <div className="space-y-3">
                 <ReplyCard variant="Direct" text={`Hi ${insight?.name || 'there'}, based on your interest, I'd like to share our 5 TPH capacity spec sheet. Let me know when you are free for a call.`} onCopy={handleCopy} />
                 <ReplyCard variant="Persuasive" text={`We are seeing high demand in your state for our machines. Could you confirm your exact district so I can calculate logistics?`} onCopy={handleCopy} />
              </div>
           </div>

           <div className="pt-6 border-t border-[hsl(var(--border-subtle))] flex-1 flex flex-col min-h-0">
              <h3 className="text-[10px] font-black uppercase text-[hsl(var(--text-dim))] tracking-widest mb-4">Internal Notes</h3>
              <form 
                onSubmit={(e) => { e.preventDefault(); if (newComment.trim()) addCommentMutation.mutate(newComment.trim()); }} 
                className="relative mb-4"
              >
                 <textarea 
                   value={newComment} onChange={e => setNewComment(e.target.value)}
                   placeholder="Add internal intelligence..."
                   className="w-full bg-[hsl(var(--bg-base))] border border-[hsl(var(--border-strong))] rounded-xl p-4 pr-12 text-xs font-medium min-h-[100px] outline-none focus:border-[hsl(var(--accent-main))] transition-all text-white shadow-inner"
                 />
                 <button type="submit" disabled={!newComment || addCommentMutation.isPending} className="absolute bottom-3 right-3 p-2 bg-[hsl(var(--accent-main))] text-black rounded-lg hover:bg-[hsl(var(--accent-hover))] transition-all active:scale-90 disabled:opacity-30">
                    <Send size={14} />
                 </button>
              </form>
              <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
                 {comments.length === 0 ? (
                    <div className="text-center py-6 text-xs text-[hsl(var(--text-dim))] font-medium italic">No internal notes yet.</div>
                 ) : (
                   comments.map((c: any) => (
                     <div key={c.id} className="p-3 rounded-xl bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-strong))]">
                        <p className="text-[11px] font-medium text-white whitespace-pre-wrap">{c.comment_text}</p>
                        <div className="flex justify-between mt-2 text-[8px] font-bold uppercase text-[hsl(var(--text-dim))]">
                           <span>{c.created_by}</span>
                           <span>{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}

function RequirementBadge({ label, missing }: { label: string; missing: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-between px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all",
      missing 
        ? "bg-[hsl(var(--danger))/0.05] border-[hsl(var(--danger))/0.2] text-[hsl(var(--danger))]" 
        : "bg-[hsl(var(--success))/0.05] border-[hsl(var(--success))/0.2] text-[hsl(var(--success))]"
    )}>
       <span>{label}</span>
       {missing ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
    </div>
  );
}

function ReplyCard({ variant, text, onCopy }: { variant: string; text: string; onCopy: (t: string) => void }) {
  return (
    <div className="p-4 rounded-xl surface-card border border-[hsl(var(--border-strong))] group relative hover:border-[hsl(var(--accent-main))] transition-all">
       <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-black uppercase text-[hsl(var(--text-muted))] tracking-widest group-hover:text-[hsl(var(--accent-main))] transition-colors">{variant} Variant</span>
          <button onClick={() => onCopy(text)} className="p-1.5 rounded-lg bg-[hsl(var(--bg-base))] hover:bg-[hsl(var(--accent-dim))] hover:text-[hsl(var(--accent-main))] text-[hsl(var(--text-muted))] border border-[hsl(var(--border-strong))] transition-all">
             <Plus size={12} />
          </button>
       </div>
       <p className="text-[11px] font-semibold text-white leading-relaxed">{text}</p>
    </div>
  );
}
