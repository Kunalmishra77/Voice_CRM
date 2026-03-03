import { supabase } from './lib/supabase.js';

// Table Names (Exact match from Supabase public schema)
const CONVERSATIONS_TABLE = 'whatsapp_conversations';
const INSIGHTS_TABLE = 'lead_insights';

// Column Mappings (Prompt specific)
const COLS = {
  conv: {
    timestamp: 'Timestamp',
    date: 'Date',
    time: 'Time',
    phone: 'Phone Number',
    name: 'User Name',
    message: 'User Message',
    response: 'Bot Response',
    stage: 'Conversation Stage',
    sessionId: 'Session ID',
    flag: 'Flag',
    summary: 'summery'
  },
  insight: {
    timestamp: 'Timestamp',
    date: 'Date',
    time: 'Time',
    phone: 'Phone Number',
    name: 'User Name',
    concern: 'concern',
    stage: 'lead stage',
    summary: 'Conversation Summary',
    sentiment: 'sentiment',
    action: 'Action to be taken'
  }
};

export const conversationService = {
  getConversations: async (filters: any) => {
    const { page = 1, limit = 20, q } = filters;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from(CONVERSATIONS_TABLE)
      .select('*', { count: 'exact' });

    if (q) {
      query = query.or(`"${COLS.conv.name}".ilike.%${q}%,"${COLS.conv.message}".ilike.%${q}%,"${COLS.conv.phone}".ilike.%${q}%`);
    }

    const { data, count, error } = await query
      .order(COLS.conv.timestamp, { ascending: false })
      .range(from, to);

    if (error) throw error;

    if (data && data.length > 0) {
      console.log('📡 Sample Conversation Row:', data[0]);
    }

    // Post-process to group by Session ID for the "Inbox" feel
    // In a real production app, this would be a View or RPC in Supabase
    const grouped: any[] = [];
    const seenSessions = new Set();

    (data || []).forEach(row => {
      const sId = row[COLS.conv.sessionId] || row[COLS.conv.phone];
      if (!seenSessions.has(sId)) {
        seenSessions.add(sId);
        grouped.push(row);
      }
    });

    return {
      data: grouped,
      meta: {
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  },

  getContacts: async (filters: any) => {
    const { q } = filters;
    
    // Fetch unique contacts by selecting phone and name
    // Since we want unique ones, we fetch all and filter in JS for now (Supabase REST doesn't support distinct)
    const { data, error } = await supabase
      .from(CONVERSATIONS_TABLE)
      .select(`"${COLS.conv.phone}","${COLS.conv.name}","${COLS.conv.stage}","${COLS.conv.timestamp}"`)
      .order(COLS.conv.timestamp, { ascending: false });

    if (error) throw error;

    const uniqueMap = new Map();
    (data || []).forEach(row => {
      const phone = row[COLS.conv.phone];
      if (!uniqueMap.has(phone)) {
        uniqueMap.set(phone, {
          phone,
          name: row[COLS.conv.name],
          lastStage: row[COLS.conv.stage],
          lastSeen: row[COLS.conv.timestamp]
        });
      }
    });

    let result = Array.from(uniqueMap.values());
    if (q) {
      const term = q.toLowerCase();
      result = result.filter(c => 
        c.phone.includes(term) || 
        (c.name && c.name.toLowerCase().includes(term))
      );
    }

    return result;
  },

  getBySessionId: async (sessionId: string) => {
    // If sessionId looks like a phone number, search by phone too as fallback
    const isPhone = /^\d+$/.test(sessionId);
    
    let query = supabase
      .from(CONVERSATIONS_TABLE)
      .select('*');

    if (isPhone) {
      query = query.or(`"${COLS.conv.sessionId}".eq."${sessionId}","${COLS.conv.phone}".eq."${sessionId}"`);
    } else {
      query = query.eq(COLS.conv.sessionId, sessionId);
    }

    const { data: messages, error: msgError } = await query
      .order(COLS.conv.timestamp, { ascending: true });

    if (msgError) throw msgError;

    // Get latest insight for the phone associated with this session
    const phone = messages?.[0]?.[COLS.conv.phone];
    let insight = null;
    if (phone) {
      const { data: insData } = await supabase
        .from(INSIGHTS_TABLE)
        .select('*')
        .eq(COLS.insight.phone, phone)
        .order(COLS.insight.timestamp, { ascending: false })
        .limit(1)
        .maybeSingle();
      insight = insData;
    }

    return {
      sessionId,
      phone,
      messages: messages || [],
      insight
    };
  }
};

export const leadService = {
  getLeads: async (filters: any) => {
    const { page = 1, limit = 10, stage, q } = filters;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from(INSIGHTS_TABLE)
      .select('*', { count: 'exact' });

    if (q) {
      query = query.or(`"${COLS.insight.name}".ilike.%${q}%,"${COLS.insight.phone}".ilike.%${q}%`);
    }
    if (stage && stage !== 'all') {
      query = query.eq(COLS.insight.stage, stage);
    }

    const { data, count, error } = await query
      .order(COLS.insight.timestamp, { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      meta: {
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  }
};

export const dashboardService = {
  getStats: async () => {
    const todayStr = new Date().toISOString().split('T')[0];

    const [
      qTotalConvs,
      qTotalLeads,
      qTodaysConvs,
      qTodaysLeads,
      qUniquePhones
    ] = await Promise.all([
      supabase.from(CONVERSATIONS_TABLE).select('*', { count: 'exact', head: true }),
      supabase.from(INSIGHTS_TABLE).select('*', { count: 'exact', head: true }),
      supabase.from(CONVERSATIONS_TABLE).select('*', { count: 'exact', head: true }).gte(COLS.conv.date, todayStr),
      supabase.from(INSIGHTS_TABLE).select('*', { count: 'exact', head: true }).gte(COLS.insight.date, todayStr),
      supabase.from(CONVERSATIONS_TABLE).select(`"${COLS.conv.phone}"`)
    ]);

    if (qUniquePhones.error) console.error('📡 Unique Phones Error:', qUniquePhones.error);
    
    const uniquePhonesData = qUniquePhones.data || [];
    if (uniquePhonesData.length > 0) {
      console.log('📡 Sample Row for Phone Mapping:', uniquePhonesData[0]);
    }

    const uniquePhones = new Set(uniquePhonesData.map(item => {
      const val = (item as any)[COLS.conv.phone];
      return val ? String(val).trim() : null;
    }).filter(Boolean)).size;

    // Stage distribution
    const { data: stages, error: stageError } = await supabase.from(INSIGHTS_TABLE).select(`"${COLS.insight.stage}"`);
    if (stageError) console.error('📡 Stage Distro Error:', stageError);

    const stage_counts = (stages || []).reduce((acc: any, curr: any) => {
      const s = (curr as any)[COLS.insight.stage] || 'Unknown';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    return {
      total_leads: qTotalLeads.count || 0,
      total_conversations: qTotalConvs.count || 0,
      todays_conversations: qTodaysConvs.count || 0,
      todays_leads: qTodaysLeads.count || 0,
      unique_phones: uniquePhones || 0,
      stage_counts
    };
  }
};

export const taskService = {
  getTasks: async (filters: any) => {
    let query = supabase.from('tasks').select('*');
    if (filters.contact_phone) query = query.eq('contact_phone', filters.contact_phone);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  createTask: async (task: any) => {
    const { data, error } = await supabase.from('tasks').insert([task]).select().single();
    if (error) throw error;
    return data;
  },
  updateTask: async (id: string, updates: any) => {
    const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
};

export const noteService = {
  getNotes: async (phone: string) => {
    const { data, error } = await supabase.from('notes').select('*').eq('contact_phone', phone).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  createNote: async (note: any) => {
    const { data, error } = await supabase.from('notes').insert([note]).select().single();
    if (error) throw error;
    return data;
  }
};

export const tagService = {
  getTags: async (phone: string) => {
    const { data, error } = await supabase.from('contact_tags').select('tag').eq('contact_phone', phone);
    if (error) throw error;
    return data.map(d => d.tag);
  },
  addTag: async (phone: string, tag: string) => {
    const { error } = await supabase.from('contact_tags').insert([{ contact_phone: phone, tag }]);
    if (error) throw error;
    return true;
  },
  removeTag: async (phone: string, tag: string) => {
    const { error } = await supabase.from('contact_tags').delete().eq('contact_phone', phone).eq('tag', tag);
    if (error) throw error;
    return true;
  }
};

// ============================================================
// PROXY SERVICE — Provides raw Supabase data to the frontend
// so the frontend never needs to call Supabase directly
// (which was causing CORS errors in the browser).
// ============================================================
export const proxyService = {

  // ── Lead Insights ──────────────────────────────────────────
  getInsights: async ({ from, to }: { from?: string; to?: string }) => {
    let q = supabase.from('lead_insights').select('*').order('created_at', { ascending: false });
    // Note: If created_at is not available, we could use Timestamp
    if (from) q = (q as any).gte('created_at', `${from}T00:00:00Z`);
    if (to)   q = (q as any).lte('created_at', `${to}T23:59:59Z`);
    const { data, error } = await q;
    if (error) {
      console.error('📡 Proxy getInsights error:', error);
      throw error;
    }
    return data || [];
  },

  getInsightsByIds: async (ids: number[]) => {
    if (!ids || ids.length === 0) return [];
    const { data, error } = await supabase.from('lead_insights').select('id, "User Name"').in('id', ids);
    if (error) throw error;
    return data || [];
  },

  getInsightByPhone: async (phone: string) => {
    const { data, error } = await supabase
      .from('lead_insights')
      .select('*')
      .eq('Phone Number', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  // ── CRM Lead State ─────────────────────────────────────────
  getStates: async (leadIds?: number[]) => {
    let q = supabase.from('crm_lead_state').select('*');
    if (leadIds && leadIds.length > 0) {
      q = (q as any).in('lead_insights_id', leadIds);
    }
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  upsertState: async (payload: any) => {
    const { error } = await supabase.from('crm_lead_state').upsert(payload, { onConflict: 'phone_number' });
    if (error) throw error;
    return { ok: true };
  },

  updateStateByPhone: async (phone: string, payload: any) => {
    const { data, error } = await supabase
      .from('crm_lead_state')
      .update(payload)
      .eq('phone_number', phone)
      .select();
    if (error) throw error;
    return data || [];
  },

  insertState: async (payload: any) => {
    const { error } = await supabase.from('crm_lead_state').insert(payload);
    if (error) throw error;
    return { ok: true };
  },

  // ── WhatsApp Conversations ─────────────────────────────────
  getConversationsRange: async ({ from, to }: { from?: string; to?: string }) => {
    let q = supabase.from('whatsapp_conversations').select('*').order('Timestamp', { ascending: false });
    if (from) q = (q as any).gte('Timestamp', `${from}T00:00:00Z`);
    if (to)   q = (q as any).lte('Timestamp', `${to}T23:59:59Z`);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  getConversationBySessionId: async (sessionId: string) => {
    const isPhone = /^\d+$/.test(sessionId);
    let q = supabase.from('whatsapp_conversations').select('*').order('Timestamp', { ascending: true });
    if (isPhone) {
      // Correct quoting for .or() syntax with spaces in column names
      q = (q as any).or(`"Session ID".eq.${sessionId},"Phone Number".eq.${sessionId}`);
    } else {
      q = (q as any).eq('Session ID', sessionId);
    }
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  // ── Lead Tasks ─────────────────────────────────────────────
  getTasks: async () => {
    let { data, error } = await supabase.from('lead_tasks').select('*').order('due_at', { ascending: true });
    if (error) {
      // Fallback to tasks table
      const fb = await supabase.from('tasks').select('*').order('due_at', { ascending: true });
      if (fb.error) throw fb.error;
      data = (fb.data || []).map((t: any) => ({ ...t, phone_number: t.phone_number || t.contact_phone }));
    }
    return data || [];
  },

  createTask: async (task: any) => {
    const { error } = await supabase.from('lead_tasks').insert({ ...task, created_at: new Date().toISOString() });
    if (error) {
      // Fallback
      const { error: fb } = await supabase.from('tasks').insert({
        contact_phone: task.phone_number, task_type: task.task_type,
        due_at: task.due_at, notes: task.notes, created_by: task.created_by,
        done: false, created_at: new Date().toISOString()
      });
      if (fb) throw fb;
    }
    return { ok: true };
  },

  updateTask: async (id: string, payload: any) => {
    const { error } = await supabase.from('lead_tasks').update(payload).eq('id', id);
    if (error) {
      const { error: fb } = await supabase.from('tasks').update(payload).eq('id', id);
      if (fb) throw fb;
    }
    return { ok: true };
  },

  // ── Lead Comments ──────────────────────────────────────────
  insertComment: async (payload: any) => {
    const { error } = await supabase.from('lead_comments').insert(payload);
    if (error) throw error;
    return { ok: true };
  },

  getComments: async ({ from, to, like }: { from?: string; to?: string; like?: string }) => {
    let q = supabase.from('lead_comments').select('*').order('created_at', { ascending: false });
    if (like)  q = (q as any).like('comment_text', like);
    if (from)  q = (q as any).gte('created_at', `${from}T00:00:00Z`);
    if (to)    q = (q as any).lte('created_at', `${to}T23:59:59Z`);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  // ── Optional / Safe Inserts ────────────────────────────────
  insertOptional: async (table: string, payload: any) => {
    // Will not throw — silently ignores missing table errors
    const ALLOWED = ['converted_leads', 'unconverted_leads'];
    if (!ALLOWED.includes(table)) return { ok: false, reason: 'table not allowed' };
    try {
      await supabase.from(table as any).insert(payload);
    } catch (_) { /* intentional silent */ }
    return { ok: true };
  },

  // ── Table / Column Existence Check ────────────────────────
  checkTable: async (table: string, columns: string) => {
    try {
      const { data, error } = await supabase.from(table as any).select(columns).limit(1);
      // If error exists but it is not a 404/PGRST116 (Not Found), it might be connection
      if (error && (error as any).code === 'PGRST116') return false; 
      if (error) {
        console.error(`📡 Table check failed for ${table}:`, error.message);
        return true; // Assume exists but connection failed (to avoid misleading frontend)
      }
      return true;
    } catch (e: any) {
      console.error(`📡 CheckTable catch error for ${table}:`, e.message);
      return true; // Fail safe to true
    }
  }
};
