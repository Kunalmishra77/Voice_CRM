import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  ListTodo,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  User,
  Phone,
  ArrowRight,
  MessageSquare,
  AlertCircle,
  CalendarClock,
  Trash2,
  Search,
  Users,
  UserPlus,
  Zap,
  RefreshCw,
  ChevronDown,
  Check,
  Flame,
  Thermometer,
  Snowflake,
  Target,
  TrendingUp,
  XCircle,
  Loader2,
  Layers,
  CircleDot,
  LayoutList,
  Mail,
  Building2,
  PhoneCall,
  X
} from 'lucide-react';
import { format, isBefore } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

import { SectionCard } from '../../ui/SectionCard';
import { EmptyState } from '../../ui/EmptyState';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { FixedDropdown } from '../../ui/FixedDropdown';
import { useGlobalFilters } from '../../state/globalFiltersStore';
import { dataProvider } from '../../data/dataProvider';
import { cn, safeFormat, safeParseISO } from '../../lib/utils';
import { PageShell } from '../../ui/PageShell';
import type { LeadTask, Employee } from '../../data/types';
import { bPost } from '../../data/backendApi';
import { useAuth } from '../../state/authStore';

// ─── Constants ──────────────────────────────────────────────────

const TASK_TYPES = [
  { value: 'Follow-up Call', label: 'Follow-up Call' },
  { value: 'Voice Broadcast', label: 'Voice Broadcast' },
  { value: 'Price Quote', label: 'Send Price Quote' },
  { value: 'Contract Signing', label: 'Contract Signing' },
  { value: 'Site Visit', label: 'Site Visit' },
  { value: 'Demo', label: 'Product Demo' },
  { value: 'Other', label: 'Other' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

interface AssignmentOption {
  value: string;
  label: string;
  desc: string;
  icon: React.FC<any>;
  group: string;
  color: string;
}

const ASSIGNMENT_OPTIONS: AssignmentOption[] = [
  // By Lead
  { value: 'specific', label: 'Specific Lead', desc: 'Pick one particular lead to assign', icon: Target, group: 'By Lead', color: 'text-primary' },
  { value: 'multiple', label: 'Multiple Leads', desc: 'Pick any mix of Hot, Warm, Cold leads', icon: Layers, group: 'By Lead', color: 'text-purple-500' },
  // By Sentiment
  { value: 'hot', label: 'All Hot Leads', desc: 'High intent — needs immediate attention', icon: Flame, group: 'By Sentiment', color: 'text-rose-500' },
  { value: 'warm', label: 'All Warm Leads', desc: 'Moderate interest — nurture required', icon: Thermometer, group: 'By Sentiment', color: 'text-amber-500' },
  { value: 'cold', label: 'All Cold Leads', desc: 'Low interest — re-engagement needed', icon: Snowflake, group: 'By Sentiment', color: 'text-blue-500' },
  // By Status
  { value: 'converted', label: 'All Converted Leads', desc: 'Successfully converted leads', icon: CheckCircle2, group: 'By Status', color: 'text-emerald-500' },
  { value: 'lost', label: 'All Lost Leads', desc: 'Lost or not interested leads', icon: XCircle, group: 'By Status', color: 'text-slate-500' },
  { value: 'pending', label: 'All Pending Leads', desc: 'Awaiting decision — active pipeline', icon: CircleDot, group: 'By Status', color: 'text-orange-500' },
  // Bulk
  { value: 'all', label: 'All Leads', desc: 'Every lead in the system', icon: Layers, group: 'Bulk', color: 'text-purple-500' },
];

// ─── Assignment Type Dropdown Component ─────────────────────────

const AssignmentTypeDropdown: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = ASSIGNMENT_OPTIONS.find(o => o.value === value);
  const groups = ['By Lead', 'By Sentiment', 'By Status', 'Bulk'];

  return (
    <div className="relative z-20" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-accent border border-border rounded-2xl p-4 flex items-center gap-3 transition-all hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-ring/20"
      >
        {selected && (
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", selected.color === 'text-primary' ? 'bg-primary/10' : `${selected.color.replace('text-', 'bg-').replace('500', '500/10')}`)}>
            <selected.icon size={16} className={selected.color} />
          </div>
        )}
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{selected?.label || 'Select assignment type...'}</p>
          <p className="text-[10px] text-muted-foreground truncate">{selected?.desc || ''}</p>
        </div>
        <ChevronDown size={16} className={cn("text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 z-[999] mt-1 bg-card border border-border rounded-2xl shadow-[var(--shadow-elevated)] overflow-hidden"
          >
            <div className="max-h-[360px] overflow-y-auto p-2">
              {groups.map((group, gi) => {
                const options = ASSIGNMENT_OPTIONS.filter(o => o.group === group);
                return (
                  <div key={group}>
                    {gi > 0 && <div className="h-px bg-border mx-2 my-1.5" />}
                    <p className="px-3 pt-2.5 pb-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{group}</p>
                    {options.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { onChange(opt.value); setIsOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                          value === opt.value
                            ? "bg-primary/5 border border-primary/20"
                            : "hover:bg-accent border border-transparent"
                        )}
                      >
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", opt.color === 'text-primary' ? 'bg-primary/10' : `${opt.color.replace('text-', 'bg-').replace('500', '500/10')}`)}>
                          <opt.icon size={14} className={opt.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground">{opt.label}</p>
                          <p className="text-[9px] text-muted-foreground">{opt.desc}</p>
                        </div>
                        {value === opt.value && <Check size={14} className="text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Helper: normalize status for filtering ─────────────────────
function normalizeStatus(raw: any): 'Converted' | 'Lost' | 'Pending' {
  const status = String(raw || '').toLowerCase().trim();
  if (status === 'crm_converted' || status === 'converted') return 'Converted';
  if (status === 'crm_lost' || status === 'lost' || ['not interested', 'wrong number', 'busy', 'voicemail'].includes(status)) return 'Lost';
  return 'Pending';
}

// ─── Main Component ─────────────────────────────────────────────

const TasksFollowupsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { dateRange } = useGlobalFilters();
  const { user: authUser } = useAuth();
  const isEmployee = authUser?.role === 'employee';

  // --- State ---
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isNewEmployeeModalOpen, setIsNewEmployeeModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<LeadTask | null>(null);

  const [assignmentType, setAssignmentType] = useState<string>('specific');
  const [form, setForm] = useState({
    phone: '',
    lead_name: '',
    lead_sentiment: '',
    type: 'Follow-up Call',
    due_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    notes: '',
    assigned_to: '',
    priority: 'medium',
    reassign_to: '',
  });
  const [leadSearch, setLeadSearch] = useState('');
  const [leadSentimentFilter, setLeadSentimentFilter] = useState<'all' | 'Hot' | 'Warm' | 'Cold'>('all');
  const [leadStatusFilter, setLeadStatusFilter] = useState<'all' | 'Pending' | 'Converted' | 'Lost'>('all');
  // Multi-select: stores selected lead objects
  const [selectedLeads, setSelectedLeads] = useState<Array<{ id: string; phone: string; name: string; sentiment: string }>>([]);
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', phone: '', department: '' });
  const [creatingEmployee, setCreatingEmployee] = useState(false);

  // --- Queries ---
  const { data: employees = [], refetch: refetchEmployees } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => (dataProvider as any).getEmployees(),
  });

  const effectiveEmployeeFilter = isEmployee ? (authUser?.id ?? 'all') : employeeFilter;

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery<LeadTask[]>({
    queryKey: ['tasks', effectiveEmployeeFilter],
    queryFn: () => (dataProvider as any).getTasks(dateRange, {
      assigned_to: effectiveEmployeeFilter !== 'all' ? effectiveEmployeeFilter : undefined,
    }),
  });

  const { data: allLeads } = useQuery({
    queryKey: ['all-leads-for-tasks'],
    queryFn: () => dataProvider.getLeads({ range: { from: '2020-01-01', to: '2030-01-01' } }),
  });

  // --- Computed ---
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
      total: tasks.length,
      pending: tasks.filter(t => !t.done).length,
      overdue: tasks.filter(t => !t.done && isBefore(safeParseISO(t.due_at), now)).length,
      completed: tasks.filter(t => t.done).length,
    };
  }, [tasks]);

  const employeeStats = useMemo(() => {
    const map: Record<string, { name: string; total: number; pending: number; completed: number }> = {};
    tasks.forEach(t => {
      const empId = t.assigned_to || 'unassigned';
      const emp = employees.find(e => e.id === empId);
      const name = emp?.name || (empId === 'unassigned' ? 'Unassigned' : empId);
      if (!map[empId]) map[empId] = { name, total: 0, pending: 0, completed: 0 };
      map[empId].total++;
      if (t.done) map[empId].completed++;
      else map[empId].pending++;
    });
    return Object.entries(map);
  }, [tasks, employees]);

  // Lead browser — filters by sentiment, status, and search text
  const browsableLeads = useMemo(() => {
    if (!allLeads) return [];
    let list = [...allLeads];

    // Filter by sentiment
    if (leadSentimentFilter !== 'all') {
      list = list.filter(l => l.sentiment === leadSentimentFilter);
    }

    // Filter by status
    if (leadStatusFilter !== 'all') {
      list = list.filter(l => normalizeStatus(l.status || l['lead stage']) === leadStatusFilter);
    }

    // Filter by search text
    if (leadSearch) {
      const q = leadSearch.toLowerCase();
      list = list.filter(l =>
        l['User Name'].toLowerCase().includes(q) ||
        l['Phone Number'].includes(q)
      );
    }

    return list.slice(0, 30);
  }, [allLeads, leadSearch, leadSentimentFilter, leadStatusFilter]);

  // Counts per sentiment for quick filter badges
  const leadFilterCounts = useMemo(() => {
    if (!allLeads) return { all: 0, Hot: 0, Warm: 0, Cold: 0 };
    let list = [...allLeads];
    if (leadStatusFilter !== 'all') {
      list = list.filter(l => normalizeStatus(l.status || l['lead stage']) === leadStatusFilter);
    }
    if (leadSearch) {
      const q = leadSearch.toLowerCase();
      list = list.filter(l => l['User Name'].toLowerCase().includes(q) || l['Phone Number'].includes(q));
    }
    return {
      all: list.length,
      Hot: list.filter(l => l.sentiment === 'Hot').length,
      Warm: list.filter(l => l.sentiment === 'Warm').length,
      Cold: list.filter(l => l.sentiment === 'Cold').length,
    };
  }, [allLeads, leadStatusFilter, leadSearch]);

  // Compute matching leads for bulk assignment
  const bulkMatchingLeads = useMemo(() => {
    if (!allLeads || assignmentType === 'specific') return [];
    if (assignmentType === 'all') return allLeads;
    // By sentiment
    const sentimentMap: Record<string, string> = { hot: 'Hot', warm: 'Warm', cold: 'Cold' };
    if (sentimentMap[assignmentType]) {
      return allLeads.filter(l => l.sentiment === sentimentMap[assignmentType]);
    }
    // By status
    const statusMap: Record<string, string> = { converted: 'Converted', lost: 'Lost', pending: 'Pending' };
    if (statusMap[assignmentType]) {
      return allLeads.filter(l => normalizeStatus(l.status || l['lead stage']) === statusMap[assignmentType]);
    }
    return [];
  }, [allLeads, assignmentType]);

  const bulkLeadCount = bulkMatchingLeads.length;

  // --- Get employee name by id ---
  const getEmployeeName = useCallback((id: string | null | undefined) => {
    if (!id) return 'Unassigned';
    const emp = employees.find(e => e.id === id);
    return emp?.name || id;
  }, [employees]);

  // Available employees (non-admin)
  const assignableEmployees = useMemo(() =>
    employees.filter(e => e.role === 'employee'),
  [employees]);

  // --- Handlers ---
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.assigned_to) {
      toast.error("Please select an employee to assign the task.");
      return;
    }

    if (assignmentType === 'specific') {
      if (!form.phone || !form.notes) {
        toast.error("Please select a lead and add notes.");
        return;
      }
      const success = await (dataProvider as any).createTask({
        phone_number: form.phone,
        lead_name: form.lead_name || 'Unknown',
        lead_sentiment: form.lead_sentiment || null,
        task_type: form.type,
        due_at: new Date(form.due_at).toISOString(),
        notes: form.notes,
        assigned_to: form.assigned_to,
        assigned_by: 'Admin',
        assignment_type: 'specific',
        priority: form.priority,
        created_by: 'Admin',
      });
      if (success) {
        toast.success("Task created and assigned!");
      } else {
        toast.error("Failed to create task.");
        return;
      }
    } else if (assignmentType === 'multiple') {
      if (selectedLeads.length === 0) {
        toast.error("Please select at least one lead.");
        return;
      }
      const bulkTasks = selectedLeads.map(l => ({
        phone_number: l.phone,
        lead_name: l.name,
        lead_sentiment: l.sentiment || null,
        lead_insights_id: parseInt(l.id) || undefined,
        task_type: form.type,
        due_at: new Date(form.due_at).toISOString(),
        notes: form.notes || `${form.type} — manually selected leads`,
        assigned_to: form.assigned_to,
        assigned_by: 'Admin',
        assignment_type: 'multiple',
        priority: form.priority,
        created_by: 'Admin',
      }));
      const result = await (dataProvider as any).createBulkTasks(bulkTasks);
      if (result.success) {
        toast.success(`${result.created} tasks created for ${selectedLeads.length} leads!`);
      } else {
        toast.error("Failed to create tasks.");
        return;
      }
    } else {
      // Bulk assignment
      if (bulkMatchingLeads.length === 0) {
        toast.error(`No matching leads found for "${ASSIGNMENT_OPTIONS.find(o => o.value === assignmentType)?.label}".`);
        return;
      }

      const bulkTasks = bulkMatchingLeads.map(l => ({
        phone_number: l['Phone Number'],
        lead_name: l['User Name'],
        lead_sentiment: l.sentiment || null,
        lead_insights_id: parseInt(l.id) || undefined,
        task_type: form.type,
        due_at: new Date(form.due_at).toISOString(),
        notes: form.notes || `${form.type} — ${ASSIGNMENT_OPTIONS.find(o => o.value === assignmentType)?.label}`,
        assigned_to: form.assigned_to,
        assigned_by: 'Admin',
        assignment_type: assignmentType,
        priority: form.priority,
        created_by: 'Admin',
      }));

      const result = await (dataProvider as any).createBulkTasks(bulkTasks);
      if (result.success) {
        toast.success(`${result.created} tasks created and assigned!`);
      } else {
        toast.error("Failed to create bulk tasks.");
        return;
      }
    }

    setIsNewModalOpen(false);
    resetForm();
    refetchTasks();
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.name.trim()) {
      toast.error("Employee name is required.");
      return;
    }
    setCreatingEmployee(true);
    try {
      const created = await bPost('/employees', {
        name: newEmployee.name.trim(),
        email: newEmployee.email.trim(),
        phone: newEmployee.phone.trim(),
        department: newEmployee.department.trim(),
        role: 'employee',
      });
      toast.success(`${newEmployee.name} added as team member!`);
      setIsNewEmployeeModalOpen(false);
      setNewEmployee({ name: '', email: '', phone: '', department: '' });
      refetchEmployees();
      // Auto-select the newly created employee
      if (created?.id) {
        setForm(prev => ({ ...prev, assigned_to: created.id }));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create employee.");
    } finally {
      setCreatingEmployee(false);
    }
  };

  const handleToggleTask = async (task: LeadTask) => {
    const success = await (dataProvider as any).updateTaskById(task.id, { done: !task.done });
    if (success) {
      toast.success(task.done ? "Task reopened." : "Task completed!");
      refetchTasks();
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTask) {
      const success = await (dataProvider as any).updateTaskById(selectedTask.id, {
        due_at: new Date(form.due_at).toISOString()
      });
      if (success) { toast.success("Task rescheduled."); refetchTasks(); }
      setIsRescheduleModalOpen(false);
      setSelectedTask(null);
    }
  };

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTask) {
      const success = await (dataProvider as any).updateTaskById(selectedTask.id, { notes: form.notes });
      if (success) { toast.success("Notes updated."); refetchTasks(); }
      setIsNoteModalOpen(false);
      setSelectedTask(null);
    }
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTask && form.reassign_to) {
      const success = await (dataProvider as any).updateTaskById(selectedTask.id, { assigned_to: form.reassign_to });
      if (success) { toast.success(`Task reassigned to ${getEmployeeName(form.reassign_to)}.`); refetchTasks(); }
      setIsReassignModalOpen(false);
      setSelectedTask(null);
    }
  };

  const handleDeleteTask = async (task: LeadTask) => {
    if (!confirm("Delete this task?")) return;
    const success = await (dataProvider as any).deleteTaskById(task.id);
    if (success) { toast.success("Task deleted."); refetchTasks(); }
  };

  const resetForm = () => {
    setForm({ phone: '', lead_name: '', lead_sentiment: '', type: 'Follow-up Call', due_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"), notes: '', assigned_to: '', priority: 'medium', reassign_to: '' });
    setLeadSearch('');
    setLeadSentimentFilter('all');
    setLeadStatusFilter('all');
    setAssignmentType('specific');
    setSelectedLeads([]);
  };

  const openReschedule = (task: LeadTask) => {
    setSelectedTask(task);
    setForm(prev => ({ ...prev, due_at: safeFormat(task.due_at, "yyyy-MM-dd'T'HH:mm") }));
    setIsRescheduleModalOpen(true);
  };

  const openNote = (task: LeadTask) => {
    setSelectedTask(task);
    setForm(prev => ({ ...prev, notes: task.notes }));
    setIsNoteModalOpen(true);
  };

  const openReassign = (task: LeadTask) => {
    setSelectedTask(task);
    setForm(prev => ({ ...prev, reassign_to: task.assigned_to || '' }));
    setIsReassignModalOpen(true);
  };

  const priorityColor = (p: string) => {
    if (p === 'urgent') return 'text-rose-500 bg-rose-500/10';
    if (p === 'high') return 'text-orange-500 bg-orange-500/10';
    if (p === 'medium') return 'text-amber-500 bg-amber-500/10';
    return 'text-blue-500 bg-blue-500/10';
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <PageShell>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Tasks</h1>
          <p className="text-muted-foreground font-medium mt-1">Assign and manage tasks across your team.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => refetchTasks()} className="rounded-2xl px-4 h-11 text-muted-foreground">
            <RefreshCw size={14} className="mr-2" /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => { resetForm(); setIsNewModalOpen(true); }} className="rounded-2xl px-6 h-11 shadow-sm">
            <Plus size={14} className="mr-2" /> Assign Task
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Summary Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 bg-card border border-border shadow-sm group hover:border-primary/30 transition-all cursor-pointer" onClick={() => setFilter('pending')}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/10 text-primary group-hover:scale-110 transition-transform"><Clock size={24} /></div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Pending</p>
                <h4 className="text-3xl font-bold text-foreground tabular-nums tracking-tight">{stats.pending}</h4>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-card border border-rose-500/20 shadow-sm group hover:border-rose-500/40 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:animate-pulse"><AlertCircle size={24} /></div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Overdue</p>
                <h4 className="text-3xl font-bold text-rose-500 tabular-nums tracking-tight">{stats.overdue}</h4>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-card border border-border shadow-sm group hover:border-emerald-500/30 transition-all cursor-pointer" onClick={() => setFilter('done')}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform"><CheckCircle2 size={24} /></div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Completed</p>
                <h4 className="text-3xl font-bold text-emerald-500 tabular-nums tracking-tight">{stats.completed}</h4>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-card border border-border shadow-sm group hover:border-primary/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform"><Users size={24} /></div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Team Members</p>
                <h4 className="text-3xl font-bold text-foreground tabular-nums tracking-tight">{employees.length}</h4>
              </div>
            </div>
          </Card>
        </div>

        {/* Employee Performance Strip */}
        {employeeStats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <button
              onClick={() => setEmployeeFilter('all')}
              className={cn(
                "p-4 rounded-2xl border transition-all text-left",
                employeeFilter === 'all' ? "border-primary/40 bg-primary/5 shadow-sm" : "border-border bg-card hover:border-border"
              )}
            >
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">All Team</p>
              <p className="text-lg font-bold text-foreground">{stats.total} tasks</p>
            </button>
            {employees.map(emp => {
              const empStat = employeeStats.find(([id]) => id === emp.id);
              const total = empStat ? empStat[1].total : 0;
              const pending = empStat ? empStat[1].pending : 0;
              return (
                <button
                  key={emp.id}
                  onClick={() => setEmployeeFilter(emp.id === employeeFilter ? 'all' : emp.id)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all text-left",
                    employeeFilter === emp.id ? "border-primary/40 bg-primary/5 shadow-sm" : "border-border bg-card hover:border-border"
                  )}
                >
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 truncate">{emp.name}</p>
                  <p className="text-lg font-bold text-foreground">{total} <span className="text-xs font-semibold text-muted-foreground">({pending} open)</span></p>
                </button>
              );
            })}
          </div>
        )}

        {/* Task Queue */}
        <SectionCard
          title="Task Queue"
          subtitle="Assigned tasks and follow-ups."
          icon={<ListTodo size={18} className="text-primary" />}
          headerActions={
            <div className="flex bg-accent p-1 rounded-2xl border border-border">
              {['pending', 'done', 'all'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={cn("px-6 py-2 text-xs font-semibold capitalize rounded-xl transition-all", filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
                >
                  {f}
                </button>
              ))}
            </div>
          }
        >
          <div className="space-y-4">
            {tasksLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <EmptyState
                icon={ListTodo}
                title="No tasks found"
                description={employeeFilter !== 'all' ? `No tasks assigned to ${getEmployeeName(employeeFilter)}.` : "No tasks match the current filter. Assign a new task to get started."}
                ctaText="Assign Task"
                onCtaClick={() => { resetForm(); setIsNewModalOpen(true); }}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "group flex items-center justify-between p-6 rounded-2xl bg-card border border-border shadow-sm transition-all relative overflow-hidden",
                      task.done ? "opacity-60 grayscale bg-secondary" : "hover:border-border"
                    )}
                  >
                    <div className="flex items-center gap-6 relative z-10 flex-1 min-w-0">
                      <button
                        onClick={() => handleToggleTask(task)}
                        className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border shadow-sm shrink-0",
                          task.done ? "bg-emerald-500 border-emerald-500 text-white" : "bg-card border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {task.done ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="zinc" className="border-none text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}>{task.task_type}</Badge>
                          {task.priority && task.priority !== 'medium' && (
                            <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded-full", priorityColor(task.priority))}>{task.priority}</span>
                          )}
                          {task.lead_sentiment && (
                            <Badge variant={task.lead_sentiment === 'Hot' ? 'danger' : task.lead_sentiment === 'Cold' ? 'success' : 'warning'} size="xs" className="text-[9px]">{task.lead_sentiment}</Badge>
                          )}
                          <span className={cn("text-xs font-semibold flex items-center gap-1.5", isBefore(safeParseISO(task.due_at), new Date()) && !task.done ? "text-rose-500" : "text-muted-foreground")}>
                            <Clock size={12} className={cn(isBefore(safeParseISO(task.due_at), new Date()) && !task.done ? "text-rose-500" : "")} style={!(isBefore(safeParseISO(task.due_at), new Date()) && !task.done) ? { color: 'var(--brand-500)' } : {}} />
                            {safeFormat(task.due_at, 'dd MMM • hh:mm a')}
                          </span>
                        </div>
                        <h4 className={cn("text-base font-bold mt-2 tracking-tight truncate", task.done ? "line-through text-muted-foreground" : "text-foreground")}>{task.notes}</h4>
                        <div className="flex items-center gap-5 mt-3 flex-wrap">
                          <div className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-colors" onClick={() => navigate(`/leads?search=${task.phone_number}`)}>
                            <User size={12} className="text-muted-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground">{task.lead_name}</span>
                          </div>
                          <div className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-colors" onClick={() => navigate(`/calls?phone=${task.phone_number}`)}>
                            <Phone size={12} className="text-muted-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground">{task.phone_number}</span>
                          </div>
                          {task.assigned_to && (
                            <div className="flex items-center gap-2">
                              <UserPlus size={12} className="text-purple-500" />
                              <span className="text-xs font-semibold text-purple-600">{getEmployeeName(task.assigned_to)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 relative z-10 shrink-0 ml-4">
                      <button onClick={() => openNote(task)} className="p-3 rounded-xl bg-accent text-muted-foreground hover:text-foreground transition-all" title="Update Notes"><MessageSquare size={16} /></button>
                      <button onClick={() => openReschedule(task)} className="p-3 rounded-xl bg-accent text-muted-foreground hover:text-foreground transition-all" title="Reschedule"><CalendarClock size={16} /></button>
                      <button onClick={() => openReassign(task)} className="p-3 rounded-xl bg-accent text-muted-foreground hover:text-purple-500 transition-all" title="Reassign"><UserPlus size={16} /></button>
                      <button onClick={() => handleDeleteTask(task)} className="p-3 rounded-xl bg-accent text-muted-foreground hover:text-rose-500 transition-all" title="Delete"><Trash2 size={16} /></button>
                      <div className="w-px h-8 bg-border mx-2" />
                      <Button variant="primary" size="sm" onClick={() => navigate(`/leads?search=${task.phone_number}`)} className="rounded-xl px-4 bg-primary text-primary-foreground font-semibold text-xs shadow-sm">
                        View <ArrowRight size={12} className="ml-2" />
                      </Button>
                    </div>

                    <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 transition-all", task.done ? "bg-emerald-500" : isBefore(safeParseISO(task.due_at), new Date()) ? "bg-rose-500" : "")} style={!task.done && !isBefore(safeParseISO(task.due_at), new Date()) ? { background: 'var(--brand-500)' } : {}} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* ════════════════════════════════════════════════════════════
          CREATE / ASSIGN TASK MODAL
         ════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Assign New Task"
        overflowHidden={false}
        className="max-w-lg"
      >
        <form onSubmit={handleCreateTask} className="space-y-5">

          {/* 1) Assignment Type — Professional Grouped Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground pl-1">Assignment Type</label>
            <AssignmentTypeDropdown value={assignmentType} onChange={setAssignmentType} />
          </div>

          {/* Bulk info banner */}
          {assignmentType !== 'specific' && assignmentType !== 'multiple' && (
            <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-primary" />
                <span className="text-xs font-bold text-foreground">
                  {bulkLeadCount} lead{bulkLeadCount !== 1 ? 's' : ''} matched
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                One task per lead will be created and assigned to the selected employee.
              </p>
            </div>
          )}

          {/* 2) Lead Browser Panel (specific = single, multiple = multi-checkbox) */}
          {(assignmentType === 'specific' || assignmentType === 'multiple') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground pl-1">
                  {assignmentType === 'multiple' ? `Select Leads (${selectedLeads.length} selected)` : 'Select Lead'}
                </label>
                {assignmentType === 'multiple' && selectedLeads.length > 0 && (
                  <button type="button" onClick={() => setSelectedLeads([])} className="text-[10px] font-bold text-rose-400 hover:text-rose-500">Clear all</button>
                )}
              </div>

              {/* Multi-select: chips of selected leads */}
              {assignmentType === 'multiple' && selectedLeads.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-primary/5 border border-primary/20">
                  {selectedLeads.map(l => (
                    <div key={l.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-card border border-border text-xs font-semibold">
                      <div className={cn("w-4 h-4 rounded-md flex items-center justify-center text-[8px] font-bold text-white", l.sentiment === 'Hot' ? 'bg-rose-500' : l.sentiment === 'Cold' ? 'bg-blue-500' : 'bg-amber-500')}>
                        {l.name[0]}
                      </div>
                      <span className="text-foreground max-w-[80px] truncate">{l.name}</span>
                      <button type="button" onClick={() => setSelectedLeads(prev => prev.filter(x => x.id !== l.id))} className="text-muted-foreground hover:text-rose-400 ml-0.5">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Single-select: selected lead chip */}
              {assignmentType === 'specific' && form.phone && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-primary/5 border border-primary/20">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, var(--brand-500), #34d399)' }}>
                    {form.lead_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{form.lead_name}</p>
                    <p className="text-[9px] text-muted-foreground">{form.phone}</p>
                  </div>
                  {form.lead_sentiment && (
                    <Badge variant={form.lead_sentiment === 'Hot' ? 'danger' : form.lead_sentiment === 'Cold' ? 'success' : 'warning'} size="xs">{form.lead_sentiment}</Badge>
                  )}
                  <button type="button" onClick={() => { setForm(f => ({ ...f, phone: '', lead_name: '', lead_sentiment: '' })); setLeadSearch(''); }} className="p-1.5 rounded-lg hover:bg-accent"><X size={12} className="text-muted-foreground" /></button>
                </div>
              )}

              {/* Lead browser — shown always for multiple, hidden when single is picked */}
              {(assignmentType === 'multiple' || !form.phone) && (
                <div className="rounded-2xl border border-border bg-accent/30 overflow-hidden">
                  {/* Search bar */}
                  <div className="p-3 border-b border-border">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={leadSearch}
                        onChange={(e) => setLeadSearch(e.target.value)}
                        placeholder="Search by name or phone..."
                        className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                      />
                    </div>
                  </div>

                  {/* Filter row */}
                  <div className="px-3 pt-2.5 pb-2 flex items-center gap-2 border-b border-border flex-wrap">
                    <div className="flex bg-card p-0.5 rounded-xl border border-border">
                      {([['all', 'All'], ['Hot', 'Hot'], ['Warm', 'Warm'], ['Cold', 'Cold']] as const).map(([val, label]) => (
                        <button key={val} type="button" onClick={() => setLeadSentimentFilter(val)}
                          className={cn("px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1",
                            leadSentimentFilter === val
                              ? val === 'Hot' ? "bg-rose-500 text-white" : val === 'Warm' ? "bg-amber-500 text-white" : val === 'Cold' ? "bg-blue-500 text-white" : "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}>
                          {val === 'Hot' && <Flame size={10} />}{val === 'Warm' && <Thermometer size={10} />}{val === 'Cold' && <Snowflake size={10} />}
                          {label} <span className="text-[8px] opacity-80 ml-0.5">{val === 'all' ? leadFilterCounts.all : leadFilterCounts[val as 'Hot'|'Warm'|'Cold']}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex bg-card p-0.5 rounded-xl border border-border ml-auto">
                      {([['all', 'All Status'], ['Pending', 'Pending'], ['Converted', 'Converted'], ['Lost', 'Lost']] as const).map(([val, label]) => (
                        <button key={val} type="button" onClick={() => setLeadStatusFilter(val)}
                          className={cn("px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                            leadStatusFilter === val
                              ? val === 'Converted' ? "bg-emerald-500 text-white" : val === 'Lost' ? "bg-slate-500 text-white" : val === 'Pending' ? "bg-orange-500 text-white" : "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}>{label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Scrollable lead list */}
                  <div className="max-h-[220px] overflow-y-auto p-1.5">
                    {browsableLeads.length === 0 ? (
                      <div className="py-8 text-center">
                        <Search size={18} className="mx-auto text-muted-foreground mb-2" />
                        <p className="text-[10px] font-semibold text-muted-foreground">No leads match the current filters.</p>
                      </div>
                    ) : browsableLeads.map(l => {
                      const status = normalizeStatus(l.status || l['lead stage']);
                      const isMultiSelected = assignmentType === 'multiple' && selectedLeads.some(s => s.id === l.id);
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            if (assignmentType === 'multiple') {
                              setSelectedLeads(prev =>
                                prev.some(s => s.id === l.id)
                                  ? prev.filter(s => s.id !== l.id)
                                  : [...prev, { id: l.id, phone: l['Phone Number'], name: l['User Name'], sentiment: l.sentiment || '' }]
                              );
                            } else {
                              setForm({ ...form, phone: l['Phone Number'], lead_name: l['User Name'], lead_sentiment: l.sentiment || '' });
                              setLeadSearch('');
                            }
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left group border mb-0.5",
                            isMultiSelected ? "bg-primary/5 border-primary/25" : "border-transparent hover:bg-card hover:border-border"
                          )}
                        >
                          {/* Checkbox (multi) or avatar (single) */}
                          {assignmentType === 'multiple' ? (
                            <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                              isMultiSelected ? "bg-primary border-primary" : "border-border"
                            )}>
                              {isMultiSelected && <Check size={11} className="text-white" />}
                            </div>
                          ) : (
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                              l.sentiment === 'Hot' ? "bg-rose-500" : l.sentiment === 'Cold' ? "bg-blue-500" : "bg-amber-500"
                            )}>{l['User Name']?.[0] || '?'}</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{l['User Name']}</p>
                            <p className="text-[9px] text-muted-foreground">{l['Phone Number']}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant={l.sentiment === 'Hot' ? 'danger' : l.sentiment === 'Cold' ? 'success' : 'warning'} size="xs" className="text-[8px] px-1.5">{l.sentiment}</Badge>
                            <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-full",
                              status === 'Converted' ? "bg-emerald-500/10 text-emerald-600" : status === 'Lost' ? "bg-slate-500/10 text-slate-500" : "bg-orange-500/10 text-orange-600"
                            )}>{status}</span>
                          </div>
                          {assignmentType === 'specific' && <ArrowRight size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />}
                        </button>
                      );
                    })}
                    {browsableLeads.length >= 30 && (
                      <p className="text-center text-[9px] text-muted-foreground py-2">Showing first 30. Use filters to narrow down.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3) Assign to Employee — with Add New */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground pl-1">Assign to Employee</label>
              <button
                type="button"
                onClick={() => setIsNewEmployeeModalOpen(true)}
                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors"
              >
                <Plus size={10} /> Add New
              </button>
            </div>

            {assignableEmployees.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-border bg-accent/50 text-center">
                <Users size={24} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-xs font-semibold text-muted-foreground mb-3">No employees yet</p>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsNewEmployeeModalOpen(true)} className="rounded-xl text-xs">
                  <Plus size={12} className="mr-1" /> Create First Employee
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {assignableEmployees.map(emp => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setForm({ ...form, assigned_to: emp.id })}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all flex items-center gap-3",
                      form.assigned_to === emp.id ? "border-primary/40 bg-primary/5 shadow-sm" : "border-border bg-accent hover:border-border"
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, var(--brand-500), #8b5cf6)' }}>
                      {emp.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{emp.name}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{emp.email}</p>
                    </div>
                    {form.assigned_to === emp.id && <Check size={14} className="text-primary shrink-0 ml-auto" />}
                  </button>
                ))}

                {/* Add New Employee inline card */}
                <button
                  type="button"
                  onClick={() => setIsNewEmployeeModalOpen(true)}
                  className="p-3 rounded-2xl border border-dashed border-border bg-accent/50 text-left transition-all flex items-center gap-3 hover:border-primary/30"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-muted text-muted-foreground shrink-0">
                    <Plus size={14} />
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground">Add New</p>
                </button>
              </div>
            )}
          </div>

          {/* 4) Task Type + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground pl-1">Task Type</label>
              <FixedDropdown options={TASK_TYPES} value={form.type} onChange={(v) => setForm({ ...form, type: v })} className="w-full h-14" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground pl-1">Priority</label>
              <FixedDropdown options={PRIORITY_OPTIONS} value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} className="w-full h-14" />
            </div>
          </div>

          {/* 5) Due Date */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground pl-1">Due Date</label>
            <input
              type="datetime-local"
              value={form.due_at}
              onChange={(e) => setForm({ ...form, due_at: e.target.value })}
              className="w-full bg-accent border border-border rounded-2xl p-4 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              required
            />
          </div>

          {/* 6) Notes */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground pl-1">Notes / Instructions</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Task details and instructions for the employee..."
              className="w-full h-24 bg-accent border border-border rounded-2xl p-4 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
              required={assignmentType === 'specific'}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="ghost" className="flex-1 py-4 text-muted-foreground" onClick={() => setIsNewModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1 py-4 rounded-2xl shadow-sm">
              {assignmentType === 'specific' ? 'Assign Task' : `Assign ${bulkLeadCount} Task${bulkLeadCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ════════════════════════════════════════════════════════════
          CREATE NEW EMPLOYEE MODAL
         ════════════════════════════════════════════════════════════ */}
      <Modal isOpen={isNewEmployeeModalOpen} onClose={() => setIsNewEmployeeModalOpen(false)} title="Add New Team Member">
        <form onSubmit={handleCreateEmployee} className="space-y-5 py-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground pl-1">Full Name *</label>
            <div className="relative">
              <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="w-full bg-accent border border-border rounded-2xl p-4 pl-12 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground pl-1">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                placeholder="e.g. rahul@company.com"
                className="w-full bg-accent border border-border rounded-2xl p-4 pl-12 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground pl-1">Phone</label>
              <div className="relative">
                <PhoneCall size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                  placeholder="+91..."
                  className="w-full bg-accent border border-border rounded-2xl p-4 pl-12 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground pl-1">Department</label>
              <div className="relative">
                <Building2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={newEmployee.department}
                  onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                  placeholder="e.g. Sales"
                  className="w-full bg-accent border border-border rounded-2xl p-4 pl-12 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="ghost" className="flex-1 py-4 text-muted-foreground" onClick={() => setIsNewEmployeeModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1 py-4 rounded-2xl shadow-sm" disabled={creatingEmployee}>
              {creatingEmployee ? <><Loader2 size={14} className="mr-2 animate-spin" /> Creating...</> : <><UserPlus size={14} className="mr-2" /> Add Employee</>}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ════════════════════════════════════════════════════════════
          RESCHEDULE MODAL
         ════════════════════════════════════════════════════════════ */}
      <Modal isOpen={isRescheduleModalOpen} onClose={() => setIsRescheduleModalOpen(false)} title="Reschedule Task">
        <form onSubmit={handleReschedule} className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">New Date</label>
            <input type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} className="w-full bg-accent border border-border rounded-2xl p-4 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" required />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsRescheduleModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1">Confirm</Button>
          </div>
        </form>
      </Modal>

      {/* ════════════════════════════════════════════════════════════
          NOTE MODAL
         ════════════════════════════════════════════════════════════ */}
      <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title="Update Notes">
        <form onSubmit={handleUpdateNote} className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full h-32 bg-accent border border-border rounded-2xl p-4 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none" required />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsNoteModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1">Save</Button>
          </div>
        </form>
      </Modal>

      {/* ════════════════════════════════════════════════════════════
          REASSIGN MODAL
         ════════════════════════════════════════════════════════════ */}
      <Modal isOpen={isReassignModalOpen} onClose={() => setIsReassignModalOpen(false)} title="Reassign Task">
        <form onSubmit={handleReassign} className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Assign to</label>
            <div className="grid grid-cols-1 gap-2">
              {assignableEmployees.map(emp => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setForm({ ...form, reassign_to: emp.id })}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all flex items-center gap-3",
                    form.reassign_to === emp.id ? "border-primary/40 bg-primary/5 shadow-sm" : "border-border bg-accent hover:border-border"
                  )}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, var(--brand-500), #8b5cf6)' }}>{emp.name.charAt(0)}</div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{emp.name}</p>
                    <p className="text-[10px] text-muted-foreground">{emp.email}</p>
                  </div>
                  {form.reassign_to === emp.id && <Check size={14} className="text-primary ml-auto" />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsReassignModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1">Reassign</Button>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
};

export default TasksFollowupsPage;
