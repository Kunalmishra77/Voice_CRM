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
    if (date_from) query = query.gte(COLS.leads.created_at, `${date_from}T00:00:00Z`);
    if (date_to) query = query.lte(COLS.leads.created_at, `${date_to}T23:59:59Z`);
    const { data, count, error } = await query.order(COLS.leads.created_at, { ascending: false }).range(from, to);
    if (error) throw error;
    return {
      data: (data || []).map(row => {
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
          "Conversation Stage": row[COLS.leads.status]
        };
      }),
      meta: { total: count || 0, page: Number(page), limit: Number(limit) }
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
    if (date_from) query = query.gte(COLS.leads.created_at, `${date_from}T00:00:00Z`);
    if (date_to) query = query.lte(COLS.leads.created_at, `${date_to}T23:59:59Z`);
    
    // Improved Stage Filtering
    if (stage && stage !== 'all') {
      if (stage === 'Converted') {
        query = query.eq(COLS.leads.status, CRM_CONVERTED);
      } else if (stage === 'Lost') {
        // Support both new 'crm_lost' and legacy lost statuses
        const lostTerms = [CRM_LOST, ...LOST_STATUSES];
        query = query.in(COLS.leads.status, lostTerms);
      } else if (stage === 'Pending') {
        const finalized = [CRM_CONVERTED, CRM_LOST, ...LOST_STATUSES];
        query = query.not(COLS.leads.status, 'in', `(${finalized.join(',')})`);
      } else if (['Hot', 'Warm', 'Cold'].includes(stage)) {
        // Sentiment-based filtering for non-finalized leads
        const finalized = [CRM_CONVERTED, CRM_LOST, ...LOST_STATUSES];
        query = query.not(COLS.leads.status, 'in', `(${finalized.join(',')})`);
        if (stage === 'Warm') {
          // Warm includes null/Average/warm and any other non-Hot, non-Cold sentiment (typos like "worm", etc.)
          // Use NOT Hot AND NOT Cold to match normalizeSentiment() logic
          query = query.not(COLS.leads.sentiment, 'in', `(Hot,hot,Cold,cold)`);
        } else if (stage === 'Hot') {
          query = query.or(`sentiment.eq.Hot,sentiment.eq.hot`);
        } else if (stage === 'Cold') {
          query = query.or(`sentiment.eq.Cold,sentiment.eq.cold`);
        }
      }
    }
    
    if (sentiment && sentiment !== 'all') {
      if (sentiment === 'Warm') {
        // Match anything that's NOT Hot and NOT Cold (same as normalizeSentiment logic)
        query = query.not(COLS.leads.sentiment, 'in', `(Hot,hot,Cold,cold)`);
      } else {
        // Case-insensitive: match both 'Hot'/'hot', 'Cold'/'cold'
        query = query.or(`${COLS.leads.sentiment}.eq.${sentiment},${COLS.leads.sentiment}.eq.${sentiment.toLowerCase()}`);
      }
    }
    
    const { data, count, error } = await query.order(COLS.leads.created_at, { ascending: false }).range(from, to);
    if (error) { console.error('[leads] Supabase error:', error.message); throw error; }
    console.log('[leads] returned', data?.length, 'rows, total:', count);
    return {
      data: (data || []).map(row => {
        const callTimestamp = parseCallDateTime(row[COLS.leads.timestamp]) || row[COLS.leads.created_at];
        return {
          ...row,
          "Phone Number": row[COLS.leads.phone],
          "User Name": row[COLS.leads.name],
          "concern": row[COLS.leads.summary],
          "lead stage": row[COLS.leads.status],
          "sentiment": normalizeSentiment(row[COLS.leads.sentiment]),
          "Conversation Summary": row[COLS.leads.summary],
          "Action to be taken": row[COLS.leads.comments],
          "Timestamp": row[COLS.leads.timestamp],
          "CallTimestamp": callTimestamp,
          "created_at": row[COLS.leads.created_at] // Keep original DB timestamp for date grouping
        };
      }),
      meta: { total: count || 0, page, limit }
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

    let query = supabase.from(LEADS_TABLE).select(`${COLS.leads.status}, ${COLS.leads.sentiment}, ${COLS.leads.phone}`, { count: 'exact' });
    if (date_from) query = query.gte(COLS.leads.created_at, `${date_from}T00:00:00Z`);
    if (date_to) query = query.lte(COLS.leads.created_at, `${date_to}T23:59:59Z`);
    const { data, count, error } = await query;
    if (error) { console.error('[metrics] Supabase error:', error.message); throw error; }
    console.log('[metrics] returned', data?.length, 'rows, total:', count);

    const stage_counts: any = { Hot: 0, Warm: 0, Cold: 0, Converted: 0, Lost: 0 };
    const phones = new Set();
    
    (data || []).forEach((row: any) => {
        const s = (row[COLS.leads.status] || '').toLowerCase();
        const sent = normalizeSentiment(row[COLS.leads.sentiment]);

        if (s === CRM_CONVERTED) {
          stage_counts.Converted++;
        } else if (s === CRM_LOST || LOST_STATUSES.includes(s)) {
          stage_counts.Lost++;
        } else {
          // It's a pending/active lead, count its normalized sentiment
          stage_counts[sent] = (stage_counts[sent] || 0) + 1;
        }
        
        if (row[COLS.leads.phone]) phones.add(row[COLS.leads.phone]);
    });

    const bucket_counts = {
      all: count || 0,
      Hot: stage_counts.Hot,
      Warm: stage_counts.Warm,
      Cold: stage_counts.Cold,
      Converted: stage_counts.Converted,
      Lost: stage_counts.Lost,
      Pending: (count || 0) - stage_counts.Converted - stage_counts.Lost
    };
    return {
      total_leads: count || 0,
      unique_phones: phones.size,
      stage_counts, 
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
        "sentiment": normalizeSentiment(data[COLS.leads.sentiment]),
        "Conversation Summary": data[COLS.leads.summary],
        "Action to be taken": data[COLS.leads.comments]
    };
  }
};
