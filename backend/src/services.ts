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

export const conversationService = {
  getConversations: async (filters: any) => {
    const { page = 1, limit = 100, q } = filters;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let query = supabase.from(LEADS_TABLE).select('*', { count: 'exact' });
    if (q) query = query.or(`"${COLS.leads.name}".ilike.%${q}%,"${COLS.leads.summary}".ilike.%${q}%,"${COLS.leads.phone}".ilike.%${q}%`);
    const { data, count, error } = await query.order(COLS.leads.created_at, { ascending: false }).range(from, to);
    if (error) throw error;
    return {
      data: (data || []).map(row => ({
        ...row,
        "Phone Number": row[COLS.leads.phone],
        "User Name": row[COLS.leads.name],
        "Timestamp": row[COLS.leads.timestamp] || row[COLS.leads.created_at],
        "Session ID": row[COLS.leads.id].toString(),
        "User Message": row[COLS.leads.summary] || 'No summary',
        "Bot Response": 'Voice Intercept',
        "Conversation Stage": row[COLS.leads.status]
      })),
      meta: { total: count || 0, page: Number(page), limit: Number(limit) }
    };
  },
  getContacts: async (filters: any) => {
    const { data, error } = await supabase.from(LEADS_TABLE).select(`"${COLS.leads.phone}","${COLS.leads.name}","${COLS.leads.status}","${COLS.leads.created_at}"`).order(COLS.leads.created_at, { ascending: false });
    if (error) throw error;
    const uniqueMap = new Map();
    (data || []).forEach(row => {
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
          "sentiment": data[COLS.leads.sentiment] || 'Average',
          "Conversation Summary": data[COLS.leads.summary],
          "Action to be taken": data[COLS.leads.comments]
      }
    };
  }
};

export const leadService = {
  getLeads: async (filters: any) => {
    const { page = 1, limit = 100, stage, sentiment, q } = filters;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let query = supabase.from(LEADS_TABLE).select('*', { count: 'exact' });
    if (q) query = query.or(`"${COLS.leads.name}".ilike.%${q}%,"${COLS.leads.phone}".ilike.%${q}%`);
    if (stage && stage !== 'all') {
      if (stage === 'Converted') query = query.eq(COLS.leads.status, CRM_CONVERTED);
      else if (stage === 'Lost') query = query.eq(COLS.leads.status, CRM_LOST);
      else if (stage === 'Pending') query = query.not(COLS.leads.status, 'in', `(${CRM_CONVERTED},${CRM_LOST})`);
      else if (['Hot', 'Warm', 'Cold', 'Average'].includes(stage)) {
          query = query.not(COLS.leads.status, 'in', `(${CRM_CONVERTED},${CRM_LOST})`);
          if (stage === 'Average') query = query.is(COLS.leads.sentiment, null);
          else query = query.eq(COLS.leads.sentiment, stage);
      }
    }
    if (sentiment && sentiment !== 'all') {
      if (sentiment === 'Average') query = query.is(COLS.leads.sentiment, null);
      else query = query.eq(COLS.leads.sentiment, sentiment);
    }
    const { data, count, error } = await query.order(COLS.leads.created_at, { ascending: false }).range(from, to);
    if (error) throw error;
    return {
      data: (data || []).map(row => ({
        ...row,
        "Phone Number": row[COLS.leads.phone],
        "User Name": row[COLS.leads.name],
        "concern": row[COLS.leads.summary],
        "lead stage": row[COLS.leads.status],
        "sentiment": row[COLS.leads.sentiment] || 'Average',
        "Conversation Summary": row[COLS.leads.summary],
        "Action to be taken": row[COLS.leads.comments],
        "Timestamp": row[COLS.leads.timestamp] || row[COLS.leads.created_at]
      })),
      meta: { total: count || 0, page: Number(page), limit: Number(limit) }
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
  getStats: async () => {
    const { data, count } = await supabase.from(LEADS_TABLE).select(`"${COLS.leads.status}", "${COLS.leads.sentiment}", "${COLS.leads.phone}"`, { count: 'exact' });
    const status_counts: any = { [CRM_CONVERTED]: 0, [CRM_LOST]: 0 };
    const sentiment_counts: any = { Hot: 0, Warm: 0, Cold: 0, null: 0 };
    const phones = new Set();
    (data || []).forEach((row: any) => {
        const s = row[COLS.leads.status] || 'unknown';
        const sent = row[COLS.leads.sentiment] || 'null';
        status_counts[s] = (status_counts[s] || 0) + 1;
        if (s !== CRM_CONVERTED && s !== CRM_LOST) sentiment_counts[sent] = (sentiment_counts[sent] || 0) + 1;
        if (row[COLS.leads.phone]) phones.add(row[COLS.leads.phone]);
    });
    const bucket_counts = {
      all: count || 0,
      Hot: sentiment_counts['Hot'] || 0,
      Warm: sentiment_counts['Warm'] || 0,
      Cold: sentiment_counts['Cold'] || 0,
      Average: sentiment_counts['null'] || 0,
      Converted: status_counts[CRM_CONVERTED] || 0,
      Lost: status_counts[CRM_LOST] || 0,
      Pending: (count || 0) - (status_counts[CRM_CONVERTED] || 0) - (status_counts[CRM_LOST] || 0)
    };
    return {
      total_leads: count || 0,
      unique_phones: phones.size,
      stage_counts: sentiment_counts, 
      bucket_counts
    };
  }
};

export const taskService = { getTasks: async () => [] };
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
        "sentiment": data[COLS.leads.sentiment] || 'Average',
        "Conversation Summary": data[COLS.leads.summary],
        "Action to be taken": data[COLS.leads.comments]
    };
  }
};
