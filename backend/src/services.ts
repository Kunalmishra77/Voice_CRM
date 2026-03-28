import { supabase } from './lib/supabase.js';

const LEADS_TABLE = 'call_leads';
const COLS = {
  leads: {
    id: 'leadid',
    name: 'name',
    phone: 'mobile_number',
    status: 'status',
    timestamp: 'call_date_time',
    duration: 'duration',
    summary: 'summary',
    recording: 'recording_url',
    sentiment: 'sentiment',
    created_at: 'created_at',
    comments: 'comments'
  }
};

const CRM_CONVERTED = 'crm_converted';
const CRM_LOST = 'crm_lost';
const LOST_STATUSES = ['not interested', 'wrong number', 'busy', 'voicemail'];

/** Validate a YYYY-MM-DD date string */
function isValidDate(s: any): s is string {
  if (typeof s !== 'string' || !s) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

/** Parse pagination values safely */
function safeInt(v: any, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Normalize raw sentiment from DB to consistent capitalized form */
function normalizeSentiment(raw: any): string {
  if (!raw) return 'Warm';
  const lower = String(raw).toLowerCase().trim();
  if (lower === 'hot') return 'Hot';
  if (lower === 'cold') return 'Cold';
  if (lower === 'warm' || lower === 'average') return 'Warm';
  return 'Warm'; // fallback for unknown values
}

/** Normalize lead status to stable buckets (Converted, Lost, Pending) */
function normalizeStatus(raw: any): 'Converted' | 'Lost' | 'Pending' {
  const status = String(raw || '').toLowerCase().trim();
  if (status === 'crm_converted' || status === 'converted') return 'Converted';
  if (status === 'crm_lost' || status === 'lost' || LOST_STATUSES.includes(status)) return 'Lost';
  return 'Pending';
}

/** Parse custom call_date_time format: "2:00 pmThursday, 12 March 2026" */
function parseCallDateTime(s: string): string | null {
  if (!s || typeof s !== 'string') return null;
  try {
    // Extract date part: "12 March 2026"
    const dateMatch = s.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})/);
    // Extract time part: "2:00 pm"
    const timeMatch = s.match(/(\d{1,2}:\d{2}\s+[ap]m)/i);
    
    if (dateMatch && timeMatch) {
      const dateStr = `${dateMatch[1]} ${timeMatch[1]}`;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    
    // Fallback: try parsing the whole string after removing the day name
    const cleaned = s.replace(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/gi, '');
    const d2 = new Date(cleaned);
    return isNaN(d2.getTime()) ? null : d2.toISOString();
  } catch (e) {
    return null;
  }
}

export const conversationService = {
  getConversations: async (filters: any) => {
    const { q } = filters;
    const page = safeInt(filters.page, 1);
    const limit = safeInt(filters.limit, 500);
    const date_from = isValidDate(filters.date_from) ? filters.date_from.trim() : null;
    const date_to = isValidDate(filters.date_to) ? filters.date_to.trim() : null;
    console.log('[conversations] filters:', { q, date_from, date_to, page, limit });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let query = supabase.from(LEADS_TABLE).select('*', { count: 'exact' });
    if (q) query = query.or(`${COLS.leads.name}.ilike.%${q}%,${COLS.leads.summary}.ilike.%${q}%,${COLS.leads.phone}.ilike.%${q}%`);

    // DB-level prefilter on created_at to reduce transferred rows
    if (date_from) query = query.gte(COLS.leads.created_at, `${date_from}T00:00:00`);
    if (date_to) query = query.lte(COLS.leads.created_at, `${date_to}T23:59:59`);

    const { data, error } = await query.order(COLS.leads.created_at, { ascending: false });
    if (error) throw error;

    const allRows = (data || []).map(row => {
      const callTimestamp = parseCallDateTime(row[COLS.leads.timestamp]) || row[COLS.leads.created_at];
      return {
        ...row,
        "Phone Number": row[COLS.leads.phone],
        "User Name": row[COLS.leads.name],
        "Timestamp": row[COLS.leads.timestamp],
        "CallTimestamp": callTimestamp,
        "Session ID": row[COLS.leads.id].toString(),
        "User Message": row[COLS.leads.summary] || 'No summary',
        "Bot Response": 'Voice Intercept',
        "Conversation Stage": row[COLS.leads.status],
        "recording_url": row[COLS.leads.recording] || null,
        "callDate": callTimestamp.substring(0, 10)
      };
    });

    const filtered = allRows.filter(row => {
      if (date_from && row.callDate < date_from) return false;
      if (date_to && row.callDate > date_to) return false;
      return true;
    });

    const paginated = filtered.slice(from, from + limit);
    return {
      data: paginated,
      meta: { total: filtered.length, page: Number(page), limit: Number(limit) }
    };
  },
  getContacts: async (filters: any) => {
    const { data, error } = await supabase.from(LEADS_TABLE).select(`${COLS.leads.phone}, ${COLS.leads.name}, ${COLS.leads.status}, ${COLS.leads.created_at}`).order(COLS.leads.created_at, { ascending: false });
    if (error) throw error;
    const uniqueMap = new Map();
    (data || []).forEach((row: any) => {
      const phone = row[COLS.leads.phone];
      if (!uniqueMap.has(phone)) {
        uniqueMap.set(phone, { phone, name: row[COLS.leads.name], lastStage: row[COLS.leads.status], lastSeen: row[COLS.leads.created_at] });
      }
    });
    return Array.from(uniqueMap.values());
  },
  getBySessionId: async (sessionId: string) => {
    const { data, error } = await supabase.from(LEADS_TABLE).select('*').eq(COLS.leads.id, sessionId).maybeSingle();
    if (error || !data) return { sessionId, messages: [] };
    return {
      sessionId,
      phone: data[COLS.leads.phone],
      messages: [{
        id: data[COLS.leads.id].toString(),
        "Timestamp": data[COLS.leads.timestamp] || data[COLS.leads.created_at],
        "Phone Number": data[COLS.leads.phone],
        "User Name": data[COLS.leads.name],
        "User Message": data[COLS.leads.summary],
        "Bot Response": "Voice Log. Duration: " + (data[COLS.leads.duration] || 0) + "s",
        "recording_url": data[COLS.leads.recording]
      }],
      insight: {
          "Phone Number": data[COLS.leads.phone],
          "User Name": data[COLS.leads.name],
          "concern": data[COLS.leads.summary],
          "lead stage": data[COLS.leads.status],
          "sentiment": normalizeSentiment(data[COLS.leads.sentiment]),
          "Conversation Summary": data[COLS.leads.summary],
          "Action to be taken": data[COLS.leads.comments]
      }
    };
  }
};

export const leadService = {
  getLeads: async (filters: any) => {
    const { stage, sentiment, q } = filters;
    const page = safeInt(filters.page, 1);
    const limit = safeInt(filters.limit, 500);
    const date_from = isValidDate(filters.date_from) ? filters.date_from.trim() : null;
    const date_to = isValidDate(filters.date_to) ? filters.date_to.trim() : null;
    console.log('[leads] filters:', { stage, sentiment, q, date_from, date_to, page, limit });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let query = supabase.from(LEADS_TABLE).select('*', { count: 'exact' });

    if (q) query = query.or(`${COLS.leads.name}.ilike.%${q}%,${COLS.leads.phone}.ilike.%${q}%`);

    // DB-level prefilter using created_at (proper timestamp) to reduce data transferred
    if (date_from) query = query.gte(COLS.leads.created_at, `${date_from}T00:00:00`);
    if (date_to) query = query.lte(COLS.leads.created_at, `${date_to}T23:59:59`);

    const { data, error } = await query.order(COLS.leads.created_at, { ascending: false });
    if (error) { console.error('[leads] Supabase error:', error.message); throw error; }

    const allRows = (data || []).map(row => {
      const r = row as any;
      const callTimestamp = parseCallDateTime(r[COLS.leads.timestamp]) || r[COLS.leads.created_at];
      return {
        ...r,
        "Phone Number": r[COLS.leads.phone],
        "User Name": r[COLS.leads.name],
        "concern": r[COLS.leads.summary],
        "lead stage": r[COLS.leads.status],
        "sentiment": normalizeSentiment(r[COLS.leads.sentiment]),
        "Conversation Summary": r[COLS.leads.summary],
        "Action to be taken": r[COLS.leads.comments],
        "recording_url": r[COLS.leads.recording] || null,
        "Timestamp": r[COLS.leads.timestamp],
        "CallTimestamp": callTimestamp,
        "created_at": r[COLS.leads.created_at],
        "callDate": callTimestamp.substring(0, 10)
      };
    });

    // 1. Filter by Date
    let filtered = allRows.filter(row => {
      if (date_from && row.callDate < date_from) return false;
      if (date_to && row.callDate > date_to) return false;
      return true;
    });
    
    // 2. Filter by Stage
    if (stage && stage !== 'all') {
      if (stage === 'Converted') {
        filtered = filtered.filter(l => [CRM_CONVERTED, 'crm_converted', 'Converted', 'converted'].includes(l.status));
      } else if (stage === 'Lost') {
        const lostTerms = [CRM_LOST, 'crm_lost', 'Lost', 'lost', ...LOST_STATUSES];
        filtered = filtered.filter(l => lostTerms.includes(l.status));
      } else if (stage === 'Pending') {
        const finalized = [CRM_CONVERTED, 'crm_converted', 'Converted', 'converted', CRM_LOST, 'crm_lost', 'Lost', 'lost', ...LOST_STATUSES];
        filtered = filtered.filter(l => !finalized.includes(l.status));
      } else if (['Hot', 'Warm', 'Cold'].includes(stage)) {
        const finalized = [CRM_CONVERTED, 'crm_converted', 'Converted', 'converted', CRM_LOST, 'crm_lost', 'Lost', 'lost', ...LOST_STATUSES];
        filtered = filtered.filter(l => !finalized.includes(l.status) && l.sentiment === stage);
      }
    }
    
    // 3. Filter by Sentiment
    if (sentiment && sentiment !== 'all') {
      filtered = filtered.filter(l => l.sentiment === sentiment);
    }
    
    const total = filtered.length;
    const paginated = filtered.slice(from, from + limit);

    console.log('[leads] returned', paginated.length, 'rows, total:', total);
    return {
      data: paginated,
      meta: { total, page, limit }
    };
  },
  updateStatus: async (params: any) => {
    const { leadid, status, reason, note } = params;
    let dbStatus = CRM_CONVERTED;
    if (status === 'NotInterested' || status === 'Closed') dbStatus = CRM_LOST;
    const fullComment = `[${status}] Reason: ${reason} | Note: ${note}`;
    const { data, error } = await supabase.from(LEADS_TABLE).update({ status: dbStatus, comments: fullComment }).eq('leadid', leadid).select();
    if (error) throw error;
    return { success: true, data };
  }
};

export const dashboardService = {
  getStats: async (filters: any = {}) => {
    const date_from = isValidDate(filters.date_from) ? filters.date_from.trim() : null;
    const date_to = isValidDate(filters.date_to) ? filters.date_to.trim() : null;
    console.log('[metrics] filters:', { date_from, date_to });

    let query = supabase.from(LEADS_TABLE).select(`${COLS.leads.status}, ${COLS.leads.sentiment}, ${COLS.leads.phone}, ${COLS.leads.timestamp}, ${COLS.leads.created_at}`, { count: 'exact' });

    // DB-level prefilter on created_at to reduce transferred rows
    if (date_from) query = query.gte(COLS.leads.created_at, `${date_from}T00:00:00`);
    if (date_to) query = query.lte(COLS.leads.created_at, `${date_to}T23:59:59`);

    const { data, count, error } = await query;
    if (error) { console.error('[metrics] Supabase error:', error.message); throw error; }

    const stage_counts: any = { Hot: 0, Warm: 0, Cold: 0, Converted: 0, Lost: 0 };
    const phones = new Set();
    
    // Filter data in-memory because call_date_time is a string and cannot be filtered effectively in SQL
    const filteredData = (data || []).filter(row => {
      if (!date_from && !date_to) return true;
      const callTs = parseCallDateTime((row as any)[COLS.leads.timestamp]) || (row as any)[COLS.leads.created_at];
      const callDate = callTs.substring(0, 10);
      if (date_from && callDate < date_from) return false;
      if (date_to && callDate > date_to) return false;
      return true;
    });

    filteredData.forEach((row: any) => {
        const normalizedStatus = normalizeStatus(row[COLS.leads.status]);
        const sent = normalizeSentiment(row[COLS.leads.sentiment]);

        if (normalizedStatus === 'Converted') {
          stage_counts.Converted++;
        } else if (normalizedStatus === 'Lost') {
          stage_counts.Lost++;
        } else {
          // It's a pending/active lead, count its normalized sentiment
          stage_counts[sent] = (stage_counts[sent] || 0) + 1;
        }

        if (row[COLS.leads.phone]) phones.add(row[COLS.leads.phone]);
    });

    const totalFiltered = filteredData.length;
    const bucket_counts = {
      all: totalFiltered,
      Hot: stage_counts.Hot,
      Warm: stage_counts.Warm,
      Cold: stage_counts.Cold,
      Converted: stage_counts.Converted,
      Lost: stage_counts.Lost,
      Pending: totalFiltered - stage_counts.Converted - stage_counts.Lost
    };
    return {
      total_leads: totalFiltered,
      unique_phones: phones.size,
      stage_counts,
      bucket_counts
    };
  }
};

// ─── Live Call Monitor ──────────────────────────────────────────
// Reads real-time call statuses from the database
// Google Sheet flow: "to call" → "calling" → (call ends → data updated)
const CALL_ACTIVE_STATUSES = ['to call', 'to_call', 'calling', 'ringing', 'in progress', 'in_progress'];
const CALL_QUEUED_STATUSES = ['to call', 'to_call', 'queued', 'scheduled'];
const CALL_LIVE_STATUSES = ['calling', 'ringing', 'in progress', 'in_progress'];

function normalizeCallStatus(raw: any): 'queued' | 'calling' | 'completed' | 'failed' {
  const s = String(raw || '').toLowerCase().trim();
  if (CALL_QUEUED_STATUSES.includes(s)) return 'queued';
  if (CALL_LIVE_STATUSES.includes(s)) return 'calling';
  if (['failed', 'error', 'no answer', 'no_answer'].includes(s)) return 'failed';
  // 'done' is the Google Sheet status after call ends
  if (s === 'done' || s === 'completed' || s === 'answered') return 'completed';
  return 'completed';
}

export const liveCallService = {
  // Get current call activity — lightweight query, only recent rows
  getCallActivity: async () => {
    // Fetch today's data only for live monitoring (performance: limits rows)
    const today = new Date().toISOString().substring(0, 10);
    const { data, error } = await supabase
      .from(LEADS_TABLE)
      .select(`${COLS.leads.id}, ${COLS.leads.name}, ${COLS.leads.phone}, ${COLS.leads.status}, ${COLS.leads.sentiment}, ${COLS.leads.duration}, ${COLS.leads.created_at}`)
      .gte(COLS.leads.created_at, `${today}T00:00:00`)
      .order(COLS.leads.created_at, { ascending: false })
      .limit(500);

    if (error) { console.error('[live] error:', error.message); throw error; }

    const rows = (data || []).map((r: any) => ({
      id: r[COLS.leads.id]?.toString(),
      name: r[COLS.leads.name] || 'Unknown',
      phone: r[COLS.leads.phone],
      raw_status: r[COLS.leads.status],
      call_status: normalizeCallStatus(r[COLS.leads.status]),
      sentiment: normalizeSentiment(r[COLS.leads.sentiment]),
      duration: r[COLS.leads.duration] || 0,
      created_at: r[COLS.leads.created_at],
    }));

    const queued = rows.filter(r => r.call_status === 'queued');
    const calling = rows.filter(r => r.call_status === 'calling');
    const completed = rows.filter(r => r.call_status === 'completed');
    const failed = rows.filter(r => r.call_status === 'failed');

    return {
      summary: {
        total_today: rows.length,
        queued: queued.length,
        calling: calling.length,
        completed: completed.length,
        failed: failed.length,
      },
      // Return active calls (queued + calling) in full, completed as recent 50
      active_calls: [...calling, ...queued],
      recent_completed: completed.slice(0, 50),
      recent_failed: failed.slice(0, 20),
      last_updated: new Date().toISOString(),
    };
  },
};

// ─── Employee System (Supabase-backed with fallback) ────────────
const EMPLOYEES_TABLE = 'crm_employees';

// Default seed employees — used only if DB table is empty or missing
const DEFAULT_EMPLOYEES = [
  { id: 'emp_1', name: 'Admin', email: 'admin@voicecrm.app', role: 'admin', phone: '', department: '' },
];

export const employeeService = {
  getAll: async () => {
    try {
      const { data, error } = await supabase
        .from(EMPLOYEES_TABLE)
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        return data.map((e: any) => ({
          id: e.id,
          name: e.name,
          email: e.email || '',
          role: e.role || 'employee',
          phone: e.phone || '',
          department: e.department || '',
        }));
      }
      return DEFAULT_EMPLOYEES;
    } catch (e) {
      console.warn('[employees] Supabase table not found, using defaults');
      return DEFAULT_EMPLOYEES;
    }
  },

  getById: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from(EMPLOYEES_TABLE)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) return null;
      return { id: data.id, name: data.name, email: data.email, role: data.role, phone: data.phone || '', department: data.department || '' };
    } catch {
      return DEFAULT_EMPLOYEES.find(e => e.id === id) || null;
    }
  },

  create: async (employee: { name: string; email?: string; role?: string; phone?: string; department?: string }) => {
    const row = {
      name: employee.name,
      email: employee.email || '',
      role: employee.role || 'employee',
      phone: employee.phone || '',
      department: employee.department || '',
    };
    const { data, error } = await supabase.from(EMPLOYEES_TABLE).insert(row).select();
    if (error) {
      console.error('[employees] create error:', error.message);
      throw error;
    }
    return data?.[0] || row;
  },

  delete: async (id: string) => {
    const { error } = await supabase.from(EMPLOYEES_TABLE).delete().eq('id', id);
    if (error) {
      console.error('[employees] delete error:', error.message);
      throw error;
    }
    return { success: true };
  },
};

// ─── Task Service (Supabase-backed) ─────────────────────────────
const TASKS_TABLE = 'lead_tasks';

export const taskService = {
  getTasks: async (filters: any = {}) => {
    const { assigned_to, status, sentiment, q } = filters;
    let query = supabase.from(TASKS_TABLE).select('*').order('due_at', { ascending: true });

    if (assigned_to) query = query.eq('assigned_to', assigned_to);
    if (status === 'done') query = query.eq('done', true);
    else if (status === 'pending') query = query.eq('done', false);

    const { data, error } = await query;
    if (error) {
      console.error('[tasks] Supabase error:', error.message);
      // Table might not exist yet — return empty gracefully
      return [];
    }

    let tasks = (data || []).map((t: any) => ({
      id: t.id?.toString() || t.lead_insights_id?.toString(),
      lead_insights_id: t.lead_insights_id,
      phone_number: t.phone_number,
      lead_name: t.lead_name || 'Unknown',
      lead_sentiment: t.lead_sentiment || null,
      due_at: t.due_at,
      task_type: t.task_type || 'Follow-up Call',
      notes: t.notes || '',
      assigned_to: t.assigned_to || null,
      assigned_by: t.assigned_by || null,
      assignment_type: t.assignment_type || 'specific',
      created_by: t.created_by || 'Admin',
      done: t.done || false,
      done_at: t.done_at || null,
      created_at: t.created_at,
      priority: t.priority || 'medium',
    }));

    // Client-side filters for fields not easily filtered in SQL
    if (sentiment) {
      tasks = tasks.filter((t: any) => t.lead_sentiment === sentiment);
    }
    if (q) {
      const lower = q.toLowerCase();
      tasks = tasks.filter((t: any) =>
        (t.lead_name || '').toLowerCase().includes(lower) ||
        (t.phone_number || '').includes(lower) ||
        (t.notes || '').toLowerCase().includes(lower)
      );
    }

    return tasks;
  },

  createTask: async (task: any) => {
    const row: any = {
      phone_number: task.phone_number,
      lead_name: task.lead_name || 'Unknown',
      lead_sentiment: task.lead_sentiment || null,
      due_at: task.due_at,
      task_type: task.task_type || 'Follow-up Call',
      notes: task.notes || '',
      assigned_to: task.assigned_to || null,
      assigned_by: task.assigned_by || 'Admin',
      assignment_type: task.assignment_type || 'specific',
      created_by: task.created_by || 'Admin',
      done: false,
      priority: task.priority || 'medium',
    };
    if (task.lead_insights_id) row.lead_insights_id = task.lead_insights_id;

    const { data, error } = await supabase.from(TASKS_TABLE).insert(row).select();
    if (error) {
      console.error('[tasks] create error:', error.message);
      throw error;
    }
    return data?.[0] || row;
  },

  createBulkTasks: async (tasks: any[]) => {
    const rows = tasks.map(task => ({
      phone_number: task.phone_number,
      lead_name: task.lead_name || 'Unknown',
      lead_sentiment: task.lead_sentiment || null,
      due_at: task.due_at,
      task_type: task.task_type || 'Follow-up Call',
      notes: task.notes || '',
      assigned_to: task.assigned_to || null,
      assigned_by: task.assigned_by || 'Admin',
      assignment_type: task.assignment_type || 'bulk',
      created_by: task.created_by || 'Admin',
      done: false,
      priority: task.priority || 'medium',
      ...(task.lead_insights_id ? { lead_insights_id: task.lead_insights_id } : {}),
    }));

    const { data, error } = await supabase.from(TASKS_TABLE).insert(rows).select();
    if (error) {
      console.error('[tasks] bulk create error:', error.message);
      throw error;
    }
    return data || [];
  },

  updateTask: async (id: string, updates: any) => {
    const allowed: any = {};
    if (updates.notes !== undefined) allowed.notes = updates.notes;
    if (updates.due_at !== undefined) allowed.due_at = updates.due_at;
    if (updates.done !== undefined) {
      allowed.done = updates.done;
      allowed.done_at = updates.done ? new Date().toISOString() : null;
    }
    if (updates.assigned_to !== undefined) allowed.assigned_to = updates.assigned_to;
    if (updates.task_type !== undefined) allowed.task_type = updates.task_type;
    if (updates.priority !== undefined) allowed.priority = updates.priority;

    const { data, error } = await supabase.from(TASKS_TABLE).update(allowed).eq('id', id).select();
    if (error) {
      console.error('[tasks] update error:', error.message);
      throw error;
    }
    return { success: true, data: data?.[0] };
  },

  deleteTask: async (id: string) => {
    const { error } = await supabase.from(TASKS_TABLE).delete().eq('id', id);
    if (error) {
      console.error('[tasks] delete error:', error.message);
      throw error;
    }
    return { success: true };
  },

  getTaskStats: async (filters: any = {}) => {
    const tasks = await taskService.getTasks(filters);
    const now = new Date();
    const pending = tasks.filter((t: any) => !t.done);
    const overdue = pending.filter((t: any) => new Date(t.due_at) < now);
    const completed = tasks.filter((t: any) => t.done);

    // Stats per employee
    const byEmployee: Record<string, { total: number; pending: number; overdue: number; completed: number }> = {};
    tasks.forEach((t: any) => {
      const emp = t.assigned_to || 'Unassigned';
      if (!byEmployee[emp]) byEmployee[emp] = { total: 0, pending: 0, overdue: 0, completed: 0 };
      byEmployee[emp].total++;
      if (t.done) byEmployee[emp].completed++;
      else {
        byEmployee[emp].pending++;
        if (new Date(t.due_at) < now) byEmployee[emp].overdue++;
      }
    });

    return {
      total: tasks.length,
      pending: pending.length,
      overdue: overdue.length,
      completed: completed.length,
      byEmployee,
    };
  }
};

export const noteService = { getNotes: async () => [] };
export const tagService = { getTags: async () => [] };
export const proxyService = { 
  checkTable: async (table: string) => table === 'call_leads',
  getInsightByPhone: async (phone: string) => {
    const { data, error } = await supabase.from(LEADS_TABLE).select('*').eq(COLS.leads.phone, phone).order(COLS.leads.created_at, { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
        ...data,
        "Phone Number": data[COLS.leads.phone],
        "User Name": data[COLS.leads.name],
        "concern": data[COLS.leads.summary],
        "lead stage": data[COLS.leads.status],
        "sentiment": normalizeSentiment(data[COLS.leads.sentiment]),
        "Conversation Summary": data[COLS.leads.summary],
        "Action to be taken": data[COLS.leads.comments]
    };
  }
};
