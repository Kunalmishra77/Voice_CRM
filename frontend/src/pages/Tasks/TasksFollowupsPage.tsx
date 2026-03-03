import React, { useState, useMemo, useEffect } from 'react';
import { 
  ListTodo, 
  Plus, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  User, 
  Phone, 
  ArrowRight, 
  MessageSquare, 
  Filter,
  MoreVertical,
  Loader2,
  AlertCircle,
  Save,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  Mic,
  CalendarClock,
  Pencil,
  Trash2,
  Search,
  CheckCircle
} from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { SectionCard } from '../../ui/SectionCard';
import { EmptyState } from '../../ui/EmptyState';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Skeleton } from '../../ui/Skeleton';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { FixedDropdown } from '../../ui/FixedDropdown';
import { useGlobalFilters } from '../../state/globalFiltersStore';
import { useTasksStore, type LeadTask } from '../../state/tasksStore';
import { dataProvider } from '../../data/dataProvider';
import { cn } from '../../lib/utils';
import { PageShell } from '../../ui/PageShell';

const TASK_TYPES = [
  { value: 'Follow-up Call', label: 'Follow-up Call' },
  { value: 'Voice Broadcast', label: 'Voice Broadcast' },
  { value: 'Price Quote', label: 'Send Price Quote' },
  { value: 'Contract Signing', label: 'Contract Signing' },
  { value: 'Other', label: 'Other' },
];

const TasksFollowupsPage: React.FC = () => {
  const navigate = useNavigate();
  const { dateRange } = useGlobalFilters();
  const { tasks, addTask, toggleTask, updateTask, deleteTask, setTasks } = useTasksStore();

  // --- State ---
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<LeadTask | null>(null);
  
  const [form, setForm] = useState({
    phone: '',
    lead_name: '',
    type: 'Follow-up Call',
    due_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    notes: ''
  });

  const [leadSearch, setLeadSearch] = useState('');
  
  // --- Queries ---
  const { data: allLeads } = useQuery({
    queryKey: ['all-leads-for-tasks'],
    queryFn: () => dataProvider.getLeads({ range: { from: '2020-01-01', to: '2030-01-01' } }),
  });

  // Initialize tasks if store is empty (mock data)
  useEffect(() => {
    if (tasks.length === 0) {
      dataProvider.getTasks(dateRange).then(mockTasks => {
        setTasks(mockTasks as LeadTask[]);
      });
    }
  }, [dateRange, setTasks, tasks.length]);

  const filteredTasks = useMemo(() => {
    let list = [...tasks];
    if (filter !== 'all') {
      list = list.filter(t => filter === 'done' ? t.done : !t.done);
    }
    return list.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
  }, [tasks, filter]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      pending: tasks.filter(t => !t.done).length,
      overdue: tasks.filter(t => !t.done && isBefore(parseISO(t.due_at), now)).length,
      completed: tasks.filter(t => t.done).length
    };
  }, [tasks]);

  const searchedLeads = useMemo(() => {
    if (!allLeads || !leadSearch) return [];
    const q = leadSearch.toLowerCase();
    return allLeads.filter(l => 
      l['User Name'].toLowerCase().includes(q) || 
      l['Phone Number'].includes(q)
    ).slice(0, 5);
  }, [allLeads, leadSearch]);

  // --- Handlers ---
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone || !form.notes) {
      toast.error("Required fields missing.");
      return;
    }
    addTask({
      phone_number: form.phone,
      lead_name: form.lead_name || 'Unknown',
      task_type: form.type,
      due_at: new Date(form.due_at).toISOString(),
      notes: form.notes,
      created_by: 'Agent',
      done: false
    });
    toast.success("Task forged successfully.");
    setIsNewModalOpen(false);
    setForm({ phone: '', lead_name: '', type: 'Follow-up Call', due_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"), notes: '' });
    setLeadSearch('');
  };

  const handleReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTask) {
      updateTask(selectedTask.id, { due_at: new Date(form.due_at).toISOString() });
      toast.success("Interaction rescheduled.");
      setIsRescheduleModalOpen(false);
      setSelectedTask(null);
    }
  };

  const handleUpdateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTask) {
      updateTask(selectedTask.id, { notes: form.notes });
      toast.success("Operational logs updated.");
      setIsNoteModalOpen(false);
      setSelectedTask(null);
    }
  };

  const openReschedule = (task: LeadTask) => {
    setSelectedTask(task);
    setForm(prev => ({ ...prev, due_at: format(parseISO(task.due_at), "yyyy-MM-dd'T'HH:mm") }));
    setIsRescheduleModalOpen(true);
  };

  const openNote = (task: LeadTask) => {
    setSelectedTask(task);
    setForm(prev => ({ ...prev, notes: task.notes }));
    setIsNoteModalOpen(true);
  };

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter uppercase italic">Tasks</h1>
          <p className="text-zinc-500 font-medium mt-1">Operational workflow and scheduled lead interactions.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" onClick={() => setIsNewModalOpen(true)} className="rounded-2xl px-6 h-11 shadow-xl shadow-teal-500/20">
            <Plus size={14} className="mr-2" /> New Task
          </Button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 shadow-sm group hover:border-teal-500/30 transition-all cursor-pointer" onClick={() => setFilter('pending')}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-500 group-hover:scale-110 transition-transform"><Clock size={24} /></div>
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pending Items</p>
              <h4 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tighter">{stats.pending}</h4>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-white dark:bg-white/[0.02] border border-rose-200 dark:border-rose-500/10 shadow-sm group hover:scale-105 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:animate-pulse"><AlertCircle size={24} /></div>
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Overdue</p>
              <h4 className="text-3xl font-black text-rose-500 tabular-nums tracking-tighter">{stats.overdue}</h4>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 shadow-sm group hover:border-emerald-500/30 transition-all cursor-pointer" onClick={() => setFilter('done')}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform"><CheckCircle2 size={24} /></div>
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Completed</p>
              <h4 className="text-3xl font-black text-emerald-500 tabular-nums tracking-tighter">{stats.completed}</h4>
            </div>
          </div>
        </Card>
      </div>
      
      <SectionCard 
        title="Workflow Queue" 
        subtitle="Priority items requiring immediate attention."
        icon={<ListTodo size={18} className="text-teal-500" />}
        headerActions={
          <div className="flex bg-zinc-100 dark:bg-white/5 p-1 rounded-2xl border border-zinc-200/50 dark:border-white/10">
            {['pending', 'done', 'all'].map((f) => (
              <button 
                key={f}
                onClick={() => setFilter(f as any)}
                className={cn(
                  "px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all", 
                  filter === f ? "bg-white dark:bg-zinc-800 text-teal-500 shadow-lg" : "text-zinc-500"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        }
      >
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <EmptyState 
              icon={ListTodo}
              title="No tasks detected"
              description="The operational grid is clear for this frequency. Synchronize new nodes to populate the queue."
              ctaText="Forge New Interaction"
              onCtaClick={() => setIsNewModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredTasks.map((task) => (
                <div 
                  key={task.id}
                  className={cn(
                    "group flex items-center justify-between p-6 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 shadow-sm transition-all relative overflow-hidden",
                    task.done ? "opacity-60 grayscale bg-zinc-50 dark:bg-zinc-900/40" : "hover:border-teal-500/30"
                  )}
                >
                  <div className="flex items-center gap-6 relative z-10">
                    <button 
                      onClick={() => toggleTask(task.id)}
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border shadow-sm",
                        task.done 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : "bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-300 hover:border-teal-500 hover:text-teal-500"
                      )}
                    >
                      {task.done ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </button>
                    <div>
                      <div className="flex items-center gap-3">
                        <Badge variant="zinc" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-none text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">{task.task_type}</Badge>
                        <span className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5", isBefore(parseISO(task.due_at), new Date()) && !task.done ? "text-rose-500" : "text-zinc-400")}>
                          <Clock size={12} className={cn(isBefore(parseISO(task.due_at), new Date()) && !task.done ? "text-rose-500" : "text-teal-500")} />
                          {format(parseISO(task.due_at), 'dd MMM • hh:mm a')}
                        </span>
                      </div>
                      <h4 className={cn("text-base font-black mt-2 tracking-tight", task.done ? "line-through text-zinc-500" : "text-zinc-900 dark:text-zinc-100")}>
                        {task.notes}
                      </h4>
                      <div className="flex items-center gap-5 mt-3">
                         <div className="flex items-center gap-2 cursor-pointer hover:text-teal-500 transition-colors" onClick={() => navigate(`/leads?search=${task.phone_number}`)}>
                            <User size={12} className="text-zinc-400" />
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">{task.lead_name}</span>
                         </div>
                         <div className="flex items-center gap-2 cursor-pointer hover:text-teal-500 transition-colors" onClick={() => navigate(`/calls?phone=${task.phone_number}`)}>
                            <Phone size={12} className="text-zinc-400" />
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">{task.phone_number}</span>
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 relative z-10">
                    <button 
                      onClick={() => openNote(task)}
                      className="p-3 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-400 hover:text-teal-500 transition-all"
                      title="Update Notes"
                    >
                      <MessageSquare size={16} />
                    </button>
                    <button 
                      onClick={() => openReschedule(task)}
                      className="p-3 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-400 hover:text-teal-500 transition-all"
                      title="Reschedule"
                    >
                      <CalendarClock size={16} />
                    </button>
                    <button 
                      onClick={() => { if(confirm("Terminate task data?")) deleteTask(task.id); }}
                      className="p-3 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-400 hover:text-rose-500 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="w-px h-8 bg-zinc-200 dark:bg-white/10 mx-2" />
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={() => navigate(`/calls?phone=${task.phone_number}`)}
                      className="rounded-xl px-4 bg-zinc-900 dark:bg-white text-white dark:text-black font-black uppercase text-[10px] tracking-widest shadow-lg"
                    >
                      Execute <ArrowRight size={12} className="ml-2" />
                    </Button>
                  </div>

                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5 transition-all",
                    task.done ? "bg-emerald-500 shadow-[0_0_15px_#10b981]" : isBefore(parseISO(task.due_at), new Date()) ? "bg-rose-500 shadow-[0_0_15px_#f43f5e]" : "bg-teal-500 shadow-[0_0_15px_#14b8a6]"
                  )} />
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {/* New Task Modal */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Forge New Node Interaction"
        overflowHidden={false}
      >
        <form onSubmit={handleCreateTask} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2 relative">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Target Entity Node</label>
              <div className="relative">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text" 
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              
              {searchedLeads.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden p-1">
                  {searchedLeads.map(l => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, phone: l['Phone Number'], lead_name: l['User Name'] });
                        setLeadSearch(l['User Name']);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-teal-500/10 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-black">{l['User Name'][0]}</div>
                        <div>
                          <p className="text-xs font-black text-zinc-900 dark:text-white uppercase italic">{l['User Name']}</p>
                          <p className="text-[9px] font-bold text-zinc-400">{l['Phone Number']}</p>
                        </div>
                      </div>
                      <Badge variant="zinc" size="xs" className="opacity-0 group-hover:opacity-100">Select</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Action Type</label>
              <FixedDropdown 
                options={TASK_TYPES}
                value={form.type}
                onChange={(v) => setForm({ ...form, type: v })}
                className="w-full h-14"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Scheduled Time</label>
              <input 
                type="datetime-local" 
                value={form.due_at}
                onChange={(e) => setForm({ ...form, due_at: e.target.value })}
                className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Operational Notes</label>
              <textarea 
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Details of the interaction strategy..."
                className="w-full h-24 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                required
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="ghost" className="flex-1 py-4 text-zinc-500" onClick={() => setIsNewModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1 py-4 rounded-2xl shadow-xl shadow-teal-500/20">Forge Interaction</Button>
          </div>
        </form>
      </Modal>

      {/* Reschedule Modal */}
      <Modal isOpen={isRescheduleModalOpen} onClose={() => setIsRescheduleModalOpen(false)} title="Reschedule Interaction">
         <form onSubmit={handleReschedule} className="space-y-6 py-4">
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">New Deployment Time</label>
               <input 
                 type="datetime-local" 
                 value={form.due_at}
                 onChange={(e) => setForm({ ...form, due_at: e.target.value })}
                 className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                 required
               />
            </div>
            <div className="flex gap-3">
               <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsRescheduleModalOpen(false)}>Abort</Button>
               <Button type="submit" variant="primary" className="flex-1">Confirm Sync</Button>
            </div>
         </form>
      </Modal>

      {/* Note Modal */}
      <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title="Operational Logs Update">
         <form onSubmit={handleUpdateNote} className="space-y-6 py-4">
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Interaction Strategy</label>
               <textarea 
                 value={form.notes}
                 onChange={(e) => setForm({ ...form, notes: e.target.value })}
                 className="w-full h-32 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                 required
               />
            </div>
            <div className="flex gap-3">
               <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsNoteModalOpen(false)}>Discard</Button>
               <Button type="submit" variant="primary" className="flex-1">Update Logs</Button>
            </div>
         </form>
      </Modal>

    </PageShell>
  );
};

export default TasksFollowupsPage;
