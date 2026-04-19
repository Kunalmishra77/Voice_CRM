import { supabase } from './lib/supabase.js';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Raw pg pool — used for task/employee writes to bypass PostgREST schema cache
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

const LEADS_TABLE = 'call_leads';
const COLS = {
  leads: {
    id: 'Leadid',              // capital L
    name: 'name',
    phone: 'mobile_number',
    status: 'status',
    timestamp: 'call_date_time',
    duration: 'Duration',      // capital D, stored as string
    summary: 'Summary',        // capital S
    recording: 'recording_url',
    sentiment: 'Sentiment',    // capital S
    lead_type: 'Type of Lead'  // singular (no 's'), "Eligilble" or "Non Eligible"
    // NOTE: no created_at column in DB
  }
};

const CRM_CONVERTED = 'crm_converted';
const CRM_LOST = 'crm_lost';
const LOST_STATUSES = ['not interested', 'wrong number', 'busy', 'voicemail'];

// ── "Not Interested" detection ────────────────────────────────────────────────
// Covers: explicit Type-of-Lead value from voice bot (Option A)
//       + keyword scan of the Conversation Summary (Option B / fallback)
// Add new phrases here freely — matching is case-insensitive substring search.
const NOT_INTERESTED_KEYWORDS: string[] = [
  // ── English ──────────────────────────────────────────────────────────────
  'not interested', 'no interest', 'not at all interested',
  'declined to speak', 'declined the offer', 'declined the call',
  'declined.*speak',
  'not interested in learning', 'not interested in discussing',
  'not suitable', 'not relevant', 'not for me', 'not for us',
  'not a fit', 'not a good fit', 'not useful',
  'disinterest', 'disinterested', 'expressed disinterest',
  'does not want', "don't want", 'do not want', "doesn't want",
  'not want', 'does not wish', "doesn't wish",
  'no need', 'not need', "don't need", "doesn't need", 'not needed',
  'not required', 'not looking for', 'not in need', 'won\'t be needing',
  'refused', 'refusal', 'not willing', 'unwilling',
  'hung up', 'hang up', 'cut the call', 'disconnected abruptly',
  'not considering', 'already have', 'already using',
  'told the agent to stop', 'asked the agent to stop',
  'not at this time', 'not now', 'please remove', 'do not call',
  // ── Hindi / Hinglish ─────────────────────────────────────────────────────
  'nahi chahiye', 'nhi chahiye', 'nahin chahiye', 'nahi chahie',
  'nahi lena', 'nhi lena', 'nahin lena', 'nahi lena hai',
  'interest nahi', 'interested nahi', 'nahi interested', 'koi interest nahi',
  'zaroorat nahi', 'zaroorat nahin', 'koi zaroorat nahi', 'iski zaroorat nahi',
  'chahiye nahi', 'chahie nahi',
  'bilkul nahi', 'bilkul nahin', 'bilkul nhi',
  'nahi chahta', 'nahi chahti', 'nahi chahte',
  'mujhe nahi chahiye', 'hume nahi chahiye', 'hamein nahi chahiye',
  'yeh nahi chahiye', 'iski koi zaroorat nahi',
  'karna nahi', 'nahi karna', 'lena nahi',
  'band karo', 'mat karo', 'call mat karo', 'dobara call mat',
  'ek baar nahi', 'ek bar nahi', 'nahi nahi',
  'nahi chahiye mujhe', 'nahi chahiye hume',
  // ── Urdu / Roman Urdu ────────────────────────────────────────────────────
  'nahi chahta', 'mujhe nahi', 'hamein nahi', 'koi zaroorat',
  'muze nahi chahiye', 'muje nahi chahiye',
];

const NOT_INTERESTED_TYPE_VALUES = [
  'not interested', 'not_interested', 'notinterested', 'not-interested',
  'not interested at all', 'disinterested',
];

/** Returns true if the summary text strongly suggests the lead explicitly refused */
function isNotInterestedBySummary(summary: string): boolean {
  if (!summary) return false;
  const lower = summary.toLowerCase();
  return NOT_INTERESTED_KEYWORDS.some(kw => lower.includes(kw));
}

/** Returns true if this lead should be classified as "Not Interested"
 *  Checks both: (A) explicit Type-of-Lead column value, (B) summary keywords */
function isNotInterestedLead(leadTypeRaw: string, summary: string): boolean {
  const lt = (leadTypeRaw || '').toLowerCase().trim();
  if (NOT_INTERESTED_TYPE_VALUES.includes(lt)) return true;
  return isNotInterestedBySummary(summary);
}

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

// IST offset: UTC+5:30 = 330 minutes = 19800000 ms
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** Returns true if a date string has explicit timezone information */
function hasTimezone(s: string): boolean {
  // Matches: Z, +05:30, -05:30, GMT+0530, UTC, etc.
  return /Z$|[+-]\d{2}:?\d{2}|GMT|UTC/i.test(s);
}

/**
 * Parse custom call_date_time format and return correct UTC ISO string.
 *
 * The voice bot and Google Sheets store times in IST (UTC+5:30) with NO
 * timezone marker.  Vercel runs in UTC so `new Date("2:00 pm")` treats it
 * as UTC 14:00, which then displays as 19:30 IST in the browser — 5.5 h
 * too late.  We detect the missing-timezone case and subtract the IST
 * offset so the stored UTC value is correct for the actual wall-clock time.
 */
function parseCallDateTime(s: string): string | null {
  if (!s || typeof s !== 'string' || s.trim() === '') return null;
  const raw = s.trim();
  try {
    // ── Epoch milliseconds (e.g. "1744377000000") ────────────────────────
    if (/^\d{10,13}$/.test(raw)) {
      const ms = raw.length === 13 ? Number(raw) : Number(raw) * 1000;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d.toISOString();
    }

    // ── SQL datetime "YYYY-MM-DD HH:MM:SS" or date-only "YYYY-MM-DD" ────────
    if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/.test(raw)) {
      const d = new Date(raw.replace(' ', 'T'));
      if (!isNaN(d.getTime())) return new Date(d.getTime() - IST_OFFSET_MS).toISOString();
      return null;
    }

    // ── Already ISO with T (e.g. "2026-03-12T14:00:00.000Z" or "+05:30") ─
    if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return null;
      if (!hasTimezone(raw)) return new Date(d.getTime() - IST_OFFSET_MS).toISOString();
      return d.toISOString();
    }

    // ── Indian date formats: "DD/MM/YYYY" or "DD/MM/YYYY HH:MM" ─────────
    // Indian convention is always DD/MM/YYYY (day first)
    const indMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[T\s](\d{1,2}:\d{2}(?::\d{2})?))?/);
    if (indMatch) {
      const [, dd, mm, yyyy, time] = indMatch;
      const iso = `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}${time ? 'T' + time : 'T00:00:00'}`;
      const d = new Date(iso);
      if (!isNaN(d.getTime())) return new Date(d.getTime() - IST_OFFSET_MS).toISOString();
    }

    // ── JS Date.toString() "Tue Nov 03 2026 14:23:58 GMT+0530 ..." ───────
    if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+[A-Za-z]{3}/i.test(raw)) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d.toISOString();
    }

    // ── Voice bot format: "2:00 pmThursday, 12 March 2026" ───────────────
    const dateMatch = raw.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})/);
    const timeMatch = raw.match(/(\d{1,2}:\d{2}\s*[ap]m)/i);
    if (dateMatch && timeMatch) {
      const naive = new Date(`${dateMatch[1]} ${timeMatch[1]}`);
      if (!isNaN(naive.getTime())) return new Date(naive.getTime() - IST_OFFSET_MS).toISOString();
    }

    // ── "Month DD, YYYY" or "DD Month YYYY" ─────────────────────────────
    const monthNameMatch = raw.match(/([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/);
    if (monthNameMatch) {
      const naive = new Date(monthNameMatch[1]);
      if (!isNaN(naive.getTime())) return new Date(naive.getTime() - IST_OFFSET_MS).toISOString();
    }

    // ── Fallback: strip day names and try native parse ────────────────────
    const cleaned = raw.replace(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*/gi, '');
    const d2 = new Date(cleaned);
    if (isNaN(d2.getTime())) return null;
    if (!hasTimezone(cleaned)) return new Date(d2.getTime() - IST_OFFSET_MS).toISOString();
    return d2.toISOString();
  } catch (e) {
    return null;
  }
}

/** Convert duration to seconds — handles plain numbers, HH:MM:SS strings,
 *  and Google Sheets time values serialized as JS Date (anchored to Dec 30 1899) */
function parseDuration(raw: any): number {
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'number') return Math.round(raw);
  const s = String(raw).trim();
  // Google Sheets time stored as JS Date string: "Sat Dec 30 1899 00:03:25 GMT+..."
  if (s.includes('1899') || s.includes('Dec 30')) {
    const t = s.match(/(\d{1,2}):(\d{2}):(\d{2})/);
    if (t) return Number(t[1]) * 3600 + Number(t[2]) * 60 + Number(t[3]);
  }
  // "H:MM:SS"
  const hms = s.match(/^(\d+):(\d{2}):(\d{2})$/);
  if (hms) return Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3]);
  // "MM:SS"
  const ms = s.match(/^(\d{1,2}):(\d{2})$/);
  if (ms) return Number(ms[1]) * 60 + Number(ms[2]);
  const n = Number(s);
  return isNaN(n) ? 0 : Math.round(n);
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
    let query = supabase.from(LEADS_TABLE).select('*', { count: 'exact' });
    if (q) query = query.or(`${COLS.leads.name}.ilike.%${q}%,${COLS.leads.summary}.ilike.%${q}%,${COLS.leads.phone}.ilike.%${q}%`);

    // No created_at column — fetch all, filter by parsed call_date_time in memory
    const { data, error } = await query;
    if (error) throw error;

    const allRows = (data || [])
      .map(row => {
        const callTimestamp = parseCallDateTime(row[COLS.leads.timestamp]) ?? null;
        const callTimestampDisplay = callTimestamp || '1970-01-01T00:00:00.000Z';
        return {
          ...row,
          "Phone Number": row[COLS.leads.phone],
          "User Name": row[COLS.leads.name],
          "Timestamp": row[COLS.leads.timestamp],
          "CallTimestamp": callTimestamp,
          "Session ID": String(row[COLS.leads.id]),
          "User Message": row[COLS.leads.summary] || 'No summary',
          "Bot Response": 'Voice Intercept',
          "Conversation Stage": row[COLS.leads.status],
          "recording_url": row[COLS.leads.recording] || null,
          "callDate": callTimestampDisplay.substring(0, 10)
        };
      })
      // Sort newest first by parsed call date then by Leadid desc
      .sort((a, b) => {
        const dateDiff = b.callDate.localeCompare(a.callDate);
        if (dateDiff !== 0) return dateDiff;
        return parseInt(b['Session ID']) - parseInt(a['Session ID']);
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
    const { data, error } = await supabase.from(LEADS_TABLE).select(`${COLS.leads.phone}, ${COLS.leads.name}, ${COLS.leads.status}`);
    if (error) throw error;
    const uniqueMap = new Map();
    (data || []).forEach((row: any) => {
      const phone = row[COLS.leads.phone];
      if (!uniqueMap.has(phone)) {
        uniqueMap.set(phone, { phone, name: row[COLS.leads.name], lastStage: row[COLS.leads.status], lastSeen: row[COLS.leads.timestamp] });
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
        "Timestamp": data[COLS.leads.timestamp],
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
          "sentiment": ['failed', 'error', 'no answer', 'no_answer'].includes(String(data[COLS.leads.status] || '').toLowerCase().trim())
            ? null
            : normalizeSentiment(data[COLS.leads.sentiment]),
          "Conversation Summary": data[COLS.leads.summary],
          "Action to be taken": null
      }
    };
  }
};

export const leadService = {
  getLeads: async (filters: any) => {
    const { stage, sentiment, q, lead_type } = filters;
    const page = safeInt(filters.page, 1);
    const limit = safeInt(filters.limit, 500);
    const date_from = isValidDate(filters.date_from) ? filters.date_from.trim() : null;
    const date_to = isValidDate(filters.date_to) ? filters.date_to.trim() : null;
    console.log('[leads] filters:', { stage, sentiment, q, date_from, date_to, page, limit });

    const from = (page - 1) * limit;
    let query = supabase.from(LEADS_TABLE).select('*', { count: 'exact' });

    if (q) query = query.or(`${COLS.leads.name}.ilike.%${q}%,${COLS.leads.phone}.ilike.%${q}%`);

    // Fetch outcomes — source of truth for Converted/Lost (no date filter — permanent)
    const { data: outcomesData, error: outcomesErr } = await supabase.from('crm_lead_outcomes').select('lead_id, outcome');
    if (outcomesErr) console.warn('[leads] outcomes query warning:', outcomesErr.message);
    const convertedLeadIds = new Set<string>();
    const lostLeadIds = new Set<string>();
    (outcomesData || []).forEach((o: any) => {
      if (o.outcome === 'Converted') convertedLeadIds.add(String(o.lead_id));
      else if (o.outcome === 'Lost') lostLeadIds.add(String(o.lead_id));
    });
    console.log('[leads] outcomes loaded — converted:', convertedLeadIds.size, 'lost:', lostLeadIds.size);

    // No created_at column — fetch all rows, filter by parsed call_date_time in memory
    // .limit(10000) overrides PostgREST's default 1000-row cap
    const { data, error } = await query.limit(10000);
    if (error) { console.error('[leads] Supabase error:', error.message); throw error; }

    const allRows = (data || [])
      .map(row => {
        const r = row as any;
        const leadId = String(r[COLS.leads.id]);
        const callTimestamp = parseCallDateTime(r[COLS.leads.timestamp]);
        const callDateStr = callTimestamp ? callTimestamp.substring(0, 10) : '1970-01-01';
        // Derive effective status from outcomes table (source of truth)
        const effectiveStatus = convertedLeadIds.has(leadId) ? CRM_CONVERTED
          : lostLeadIds.has(leadId) ? CRM_LOST
          : r[COLS.leads.status];
        const rawCallStatus = String(r[COLS.leads.status] || '').toLowerCase().trim();
        const isFailedCall = ['failed', 'error', 'no answer', 'no_answer'].includes(rawCallStatus);
        // Effective lead type: explicit DB value OR keyword detection on summary
        const rawLeadType = String(r[COLS.leads.lead_type] || '');
        const summary = String(r[COLS.leads.summary] || '');
        const effectiveLeadType = isNotInterestedLead(rawLeadType, summary)
          ? 'Not Interested'
          : rawLeadType || null;
        return {
          ...r,
          leadid: leadId,
          status: effectiveStatus,
          "Phone Number": r[COLS.leads.phone],
          "User Name": r[COLS.leads.name],
          "concern": r[COLS.leads.summary],
          "lead stage": effectiveStatus,
          "sentiment": isFailedCall ? null : normalizeSentiment(r[COLS.leads.sentiment]),
          "Conversation Summary": r[COLS.leads.summary],
          "recording_url": r[COLS.leads.recording] || null,
          "Timestamp": r[COLS.leads.timestamp],
          "CallTimestamp": callTimestamp,
          "created_at": callTimestamp,
          "duration": parseDuration(r[COLS.leads.duration]),
          "callDate": callDateStr,
          "lead_type": effectiveLeadType
        };
      })
      .sort((a, b) => {
        const dateDiff = b.callDate.localeCompare(a.callDate);
        if (dateDiff !== 0) return dateDiff;
        return parseInt(String(b[COLS.leads.id] || 0)) - parseInt(String(a[COLS.leads.id] || 0));
      });

    // 1. Filter by Date
    // Converted/Lost/Failed: date-agnostic — always show all regardless of range
    // Null-timestamp records get callDate='1970-01-01'; they are excluded from any range
    //   where date_from > '1970-01-01' (daily/weekly/monthly) but included in allTime
    //   (because allTime sends date_from='1970-01-01', so '1970-01-01' < '1970-01-01' is false)
    const isDateAgnosticBucket = stage === 'Converted' || stage === 'Lost' || stage === 'Failed';
    let filtered = isDateAgnosticBucket ? allRows : allRows.filter(row => {
      if (date_from && row.callDate < date_from) return false;
      if (date_to && row.callDate > date_to) return false;
      return true;
    });

    // 2. Filter by Stage — uses effectiveStatus derived from outcomes table
    if (stage && stage !== 'all') {
      if (stage === 'Converted') {
        filtered = filtered.filter(l => convertedLeadIds.has(l.leadid));
      } else if (stage === 'Lost') {
        filtered = filtered.filter(l => lostLeadIds.has(l.leadid));
      } else if (stage === 'Pending') {
        filtered = filtered.filter(l => !convertedLeadIds.has(l.leadid) && !lostLeadIds.has(l.leadid));
      } else if (['Hot', 'Warm', 'Cold'].includes(stage)) {
        filtered = filtered.filter(l => !convertedLeadIds.has(l.leadid) && !lostLeadIds.has(l.leadid) && l.sentiment === stage);
      } else if (stage === 'DemoBooked') {
        filtered = filtered.filter(l => !convertedLeadIds.has(l.leadid) && !lostLeadIds.has(l.leadid) && String(l[COLS.leads.status] || '').toLowerCase().trim() === 'demo_booked');
      } else if (stage === 'Callback') {
        filtered = filtered.filter(l => !convertedLeadIds.has(l.leadid) && !lostLeadIds.has(l.leadid) && ['call_back', 'callback'].includes(String(l[COLS.leads.status] || '').toLowerCase().trim()));
      } else if (stage === 'Failed') {
        filtered = filtered.filter(l => !convertedLeadIds.has(l.leadid) && !lostLeadIds.has(l.leadid) && ['failed', 'error', 'no answer', 'no_answer'].includes(String(l[COLS.leads.status] || '').toLowerCase().trim()));
      }
    }
    
    // 3. Filter by Sentiment
    if (sentiment && sentiment !== 'all') {
      filtered = filtered.filter(l => l.sentiment === sentiment);
    }

    // 4. Filter by Lead Type (Eligible / Non-Eligible / Not Interested)
    if (lead_type && lead_type !== 'all') {
      filtered = filtered.filter(l => {
        const lt = String(l.lead_type || '').toLowerCase().trim();
        if (lead_type === 'eligible') return lt === 'eligilble' || lt === 'eligible' || lt === 'eligble';
        if (lead_type === 'non-eligible') return (lt === 'non eligible' || lt === 'non-eligible' || lt === 'ineligible' || lt === 'non_eligible') && lt !== 'not interested';
        if (lead_type === 'not-interested') return lt === 'not interested';
        return true;
      });
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
    const isConverted = status === 'Converted';
    const dbStatus = isConverted ? CRM_CONVERTED : CRM_LOST;
    const outcomeLabel = isConverted ? 'Converted' : 'Lost';

    // 1. Fetch lead details before update (for outcome record)
    const { rows: leadRows } = await pool.query(
      `SELECT "Leadid", name, mobile_number, "Sentiment" FROM public.call_leads WHERE "Leadid"=$1`,
      [String(leadid)]
    );
    const lead = leadRows[0];
    const leadName = lead?.name || 'Unknown';
    const phone = lead?.mobile_number || '';
    const sentiment = normalizeSentiment(lead?.Sentiment);

    // 2. Update call_leads status via raw pg (guaranteed to work in serverless)
    await pool.query(
      `UPDATE public.call_leads SET status=$1 WHERE "Leadid"=$2`,
      [dbStatus, String(leadid)]
    );

    // 3. Upsert into crm_lead_outcomes (Supabase HTTP — fast in serverless)
    const today = new Date().toISOString().substring(0, 10);
    const { error: outcomeErr } = await supabase.from('crm_lead_outcomes').upsert({
      lead_id: String(leadid),
      phone_number: phone,
      lead_name: leadName,
      outcome: outcomeLabel,
      reason: reason || '',
      note: note || '',
      sentiment,
      outcome_date: today,
      created_by: 'Admin',
    }, { onConflict: 'lead_id' });
    if (outcomeErr) console.warn('[outcomes] upsert warning:', outcomeErr.message);

    return { success: true };
  }
};

export const dashboardService = {
  getStats: async (filters: any = {}) => {
    const date_from = isValidDate(filters.date_from) ? filters.date_from.trim() : null;
    const date_to = isValidDate(filters.date_to) ? filters.date_to.trim() : null;
    const lead_type = filters.lead_type || null;
    console.log('[metrics] filters:', { date_from, date_to, lead_type });

    // Fetch ALL outcomes — no date filter. Outcomes are permanent. A converted
    // lead is ALWAYS converted regardless of what date range the user is viewing.
    const { data: outcomesData, error: outcomesErr } = await supabase
      .from('crm_lead_outcomes')
      .select('lead_id, outcome');
    if (outcomesErr) console.warn('[metrics] outcomes query warning:', outcomesErr.message);
    const convertedIds = new Set<string>();
    const lostIds = new Set<string>();
    (outcomesData || []).forEach((o: any) => {
      if (o.outcome === 'Converted') convertedIds.add(String(o.lead_id));
      else if (o.outcome === 'Lost') lostIds.add(String(o.lead_id));
    });
    console.log('[metrics] outcomes loaded — converted:', convertedIds.size, 'lost:', lostIds.size);

    // Fetch all leads, filter by call date + lead_type in memory
    // .limit(10000) overrides PostgREST's default 1000-row cap
    const { data, error } = await supabase
      .from(LEADS_TABLE)
      .select(`${COLS.leads.id}, ${COLS.leads.status}, ${COLS.leads.sentiment}, ${COLS.leads.phone}, ${COLS.leads.timestamp}, "Type of Lead", ${COLS.leads.summary}`)
      .limit(10000);
    if (error) { console.error('[metrics] Supabase error:', error.message); throw error; }
    const db_total = (data || []).length; // raw DB row count — always 100% of leads, ignores date filter

    // stage_counts only tracks active (non-outcome) leads in the date range
    const stage_counts: any = { Hot: 0, Warm: 0, Cold: 0, DemoBooked: 0, Callback: 0, Failed: 0 };
    const phones = new Set();
    let convertedInRange = 0;
    let lostInRange = 0;

    const filteredData = (data || []).filter(row => {
      const r = row as any;
      if (date_from || date_to) {
        const callTs = parseCallDateTime(r[COLS.leads.timestamp]);
        const callDate = callTs ? callTs.substring(0, 10) : '1970-01-01';
        if (date_from && callDate < date_from) return false;
        if (date_to && callDate > date_to) return false;
      }
      if (lead_type && lead_type !== 'all') {
        const lt = String(r['Type of Lead'] || '').toLowerCase().trim();
        const summaryRaw = String(r[COLS.leads.summary] || '');
        const notInterested = isNotInterestedLead(lt, summaryRaw);
        if (lead_type === 'not-interested' && !notInterested) return false;
        if (lead_type === 'eligible' && (notInterested || (lt !== 'eligilble' && lt !== 'eligible' && lt !== 'eligble'))) return false;
        if (lead_type === 'non-eligible' && (notInterested || (lt !== 'non eligible' && lt !== 'non-eligible' && lt !== 'ineligible' && lt !== 'non_eligible'))) return false;
      }
      return true;
    });

    filteredData.forEach((row: any) => {
      const leadId = String(row[COLS.leads.id]);
      if (row[COLS.leads.phone]) phones.add(row[COLS.leads.phone]);
      // Converted/Lost leads are counted from outcomes table — skip stage_counts
      if (convertedIds.has(leadId)) { convertedInRange++; return; }
      if (lostIds.has(leadId)) { lostInRange++; return; }
      const rawSt = String(row[COLS.leads.status] || '').toLowerCase().trim();
      const isFailedSt = ['failed', 'error', 'no answer', 'no_answer'].includes(rawSt);
      if (rawSt === 'demo_booked') stage_counts.DemoBooked++;
      else if (rawSt === 'call_back' || rawSt === 'callback') stage_counts.Callback++;
      else if (isFailedSt) stage_counts.Failed++;
      // Sentiment only for calls that actually connected (done, demo_booked, callback)
      // Failed calls had no conversation — no meaningful sentiment to assign
      if (!isFailedSt) {
        const sent = normalizeSentiment(row[COLS.leads.sentiment]);
        stage_counts[sent] = (stage_counts[sent] || 0) + 1;
      }
    });

    const total = filteredData.length;
    // Converted/Lost come directly from outcomes table — permanent, date-agnostic
    const convertedCount = convertedIds.size;
    const lostCount = lostIds.size;
    // Pending = all leads in range that are not converted or lost
    const pendingCount = total - convertedInRange - lostInRange;
    const bucket_counts = {
      all: total,
      Hot: stage_counts.Hot,
      Warm: stage_counts.Warm,
      Cold: stage_counts.Cold,
      Converted: convertedCount,
      Lost: lostCount,
      DemoBooked: stage_counts.DemoBooked,
      Callback: stage_counts.Callback,
      Failed: stage_counts.Failed,
      Pending: pendingCount,
    };
    console.log('[metrics] db_total:', db_total, 'filtered_total:', total, 'bucket_counts:', JSON.stringify(bucket_counts));
    return {
      total_leads: db_total,   // always the full DB count — never filtered by date
      filtered_total: total,   // count within the selected date range
      unique_phones: phones.size,
      stage_counts: { ...stage_counts, Converted: convertedCount, Lost: lostCount },
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

function normalizeCallStatus(raw: any): 'queued' | 'calling' | 'completed' | 'failed' | 'demo_booked' | 'callback' {
  const s = String(raw || '').toLowerCase().trim();
  if (CALL_QUEUED_STATUSES.includes(s)) return 'queued';
  if (CALL_LIVE_STATUSES.includes(s)) return 'calling';
  if (['failed', 'error', 'no answer', 'no_answer'].includes(s)) return 'failed';
  if (s === 'demo_booked') return 'demo_booked';
  if (s === 'call_back' || s === 'callback') return 'callback';
  // 'done' is the Google Sheet status after call ends
  if (s === 'done' || s === 'completed' || s === 'answered') return 'completed';
  return 'completed';
}

export const liveCallService = {
  // Get current call activity — no created_at column, use parsed call_date_time for today filter
  getCallActivity: async () => {
    // Use IST date for "today" — server is UTC but calls are logged in IST
    const todayIST = new Date(Date.now() + IST_OFFSET_MS).toISOString().substring(0, 10);
    const { data, error } = await supabase
      .from(LEADS_TABLE)
      .select(`${COLS.leads.id}, ${COLS.leads.name}, ${COLS.leads.phone}, ${COLS.leads.status}, ${COLS.leads.sentiment}, ${COLS.leads.duration}, ${COLS.leads.timestamp}`)
      .limit(500);

    if (error) { console.error('[live] error:', error.message); throw error; }

    const allRows = (data || []).map((r: any) => {
      const callTs = parseCallDateTime(r[COLS.leads.timestamp]) || '1970-01-01T00:00:00.000Z';
      return {
        id: String(r[COLS.leads.id]),
        name: r[COLS.leads.name] || 'Unknown',
        phone: r[COLS.leads.phone],
        raw_status: r[COLS.leads.status],
        call_status: normalizeCallStatus(r[COLS.leads.status]),
        sentiment: normalizeSentiment(r[COLS.leads.sentiment]),
        duration: parseDuration(r[COLS.leads.duration]),
        created_at: callTs,
        callDate: callTs.substring(0, 10),
      };
    });

    // Only show today's rows in live monitor
    const rows = allRows.filter(r => r.callDate === todayIST);

    const queued = rows.filter(r => r.call_status === 'queued');
    const calling = rows.filter(r => r.call_status === 'calling');
    const completed = rows.filter(r => r.call_status === 'completed');
    const failed = rows.filter(r => r.call_status === 'failed');
    const demoBooked = rows.filter(r => r.call_status === 'demo_booked');
    const callback = rows.filter(r => r.call_status === 'callback');

    return {
      summary: {
        total_today: rows.length,
        queued: queued.length,
        calling: calling.length,
        completed: completed.length,
        failed: failed.length,
        demo_booked: demoBooked.length,
        callback: callback.length,
      },
      // Return active calls (queued + calling) in full; completed includes demo_booked + callback
      active_calls: [...calling, ...queued],
      recent_completed: [...completed, ...demoBooked, ...callback].slice(0, 50),
      recent_failed: failed.slice(0, 20),
      last_updated: new Date().toISOString(),
    };
  },
};

// ─── Debug Service ──────────────────────────────────────────────
export const debugService = {
  getTimestampDiagnosis: async () => {
    const IST_TODAY = new Date(Date.now() + IST_OFFSET_MS).toISOString().substring(0, 10);
    const { data, error } = await supabase
      .from(LEADS_TABLE)
      .select(`${COLS.leads.id}, ${COLS.leads.timestamp}, ${COLS.leads.status}`)
      .limit(10000);
    if (error) throw error;

    const dateDist: Record<string, number> = {};
    const todaySamples: any[] = [];
    const nullSamples: any[] = [];

    (data || []).forEach((r: any) => {
      const raw = r[COLS.leads.timestamp];
      const parsed = parseCallDateTime(raw);
      const callDate = parsed ? parsed.substring(0, 10) : '1970-01-01';
      dateDist[callDate] = (dateDist[callDate] || 0) + 1;
      if (callDate === IST_TODAY && todaySamples.length < 10) {
        todaySamples.push({ id: r[COLS.leads.id], raw, parsed, callDate });
      }
      if (!parsed && nullSamples.length < 10) {
        nullSamples.push({ id: r[COLS.leads.id], raw });
      }
    });

    const sortedDist = Object.entries(dateDist)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 30)
      .map(([date, count]) => ({ date, count }));

    return {
      ist_today: IST_TODAY,
      total_records: (data || []).length,
      date_distribution: sortedDist,
      today_sample_raw_timestamps: todaySamples,
      null_parse_sample: nullSamples,
    };
  }
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
      // Try without ordering first (avoids failures if table schema has no created_at)
      const { data, error } = await supabase
        .from(EMPLOYEES_TABLE)
        .select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        return data
          .map((e: any) => ({
            id: e.id,
            name: e.name,
            email: e.email || '',
            role: e.role || 'employee',
            phone: e.phone || '',
            department: e.department || '',
          }))
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
      }
      return DEFAULT_EMPLOYEES;
    } catch (e) {
      console.warn('[employees] Supabase fetch failed, using defaults:', (e as any)?.message);
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
    // Use raw pg to bypass PostgREST schema cache
    const { rows } = await pool.query(
      `INSERT INTO public.crm_employees (name, email, role, phone, department)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        employee.name,
        employee.email || '',
        employee.role || 'employee',
        employee.phone || '',
        employee.department || '',
      ]
    );
    return rows[0];
  },

  delete: async (id: string) => {
    await pool.query(`DELETE FROM public.crm_employees WHERE id=$1`, [id]);
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
    // Use raw pg to bypass PostgREST schema cache
    const { rows } = await pool.query(
      `INSERT INTO public.lead_tasks
         (phone_number, lead_name, lead_sentiment, lead_insights_id, task_type, notes,
          due_at, assigned_to, assigned_by, assignment_type, priority, done, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,$12)
       RETURNING *`,
      [
        task.phone_number || null,
        task.lead_name || 'Unknown',
        task.lead_sentiment || null,
        task.lead_insights_id || null,
        task.task_type || 'Follow-up Call',
        task.notes || '',
        task.due_at,
        task.assigned_to || null,
        task.assigned_by || 'Admin',
        task.assignment_type || 'specific',
        task.priority || 'medium',
        task.created_by || 'Admin',
      ]
    );
    return rows[0];
  },

  createBulkTasks: async (tasks: any[]) => {
    const results = [];
    for (const task of tasks) {
      const { rows } = await pool.query(
        `INSERT INTO public.lead_tasks
           (phone_number, lead_name, lead_sentiment, lead_insights_id, task_type, notes,
            due_at, assigned_to, assigned_by, assignment_type, priority, done, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,$12)
         RETURNING *`,
        [
          task.phone_number || null,
          task.lead_name || 'Unknown',
          task.lead_sentiment || null,
          task.lead_insights_id || null,
          task.task_type || 'Follow-up Call',
          task.notes || '',
          task.due_at,
          task.assigned_to || null,
          task.assigned_by || 'Admin',
          task.assignment_type || 'specific',
          task.priority || 'medium',
          task.created_by || 'Admin',
        ]
      );
      if (rows[0]) results.push(rows[0]);
    }
    return results;
  },

  updateTask: async (id: string, updates: any) => {
    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (updates.notes !== undefined)       { sets.push(`notes=$${i++}`);        vals.push(updates.notes); }
    if (updates.due_at !== undefined)      { sets.push(`due_at=$${i++}`);       vals.push(updates.due_at); }
    if (updates.assigned_to !== undefined) { sets.push(`assigned_to=$${i++}`);  vals.push(updates.assigned_to); }
    if (updates.task_type !== undefined)   { sets.push(`task_type=$${i++}`);    vals.push(updates.task_type); }
    if (updates.priority !== undefined)    { sets.push(`priority=$${i++}`);     vals.push(updates.priority); }
    if (updates.done !== undefined) {
      sets.push(`done=$${i++}`);         vals.push(updates.done);
      sets.push(`done_at=$${i++}`);      vals.push(updates.done ? new Date().toISOString() : null);
    }
    if (sets.length === 0) return { success: true };
    vals.push(id);
    await pool.query(`UPDATE public.lead_tasks SET ${sets.join(', ')} WHERE id=$${i}`, vals);
    return { success: true };
  },

  deleteTask: async (id: string) => {
    await pool.query(`DELETE FROM public.lead_tasks WHERE id=$1`, [id]);
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

// ─── Lead Outcomes (Converted / Lost permanent log) ─────────────
const OUTCOMES_TABLE = 'crm_lead_outcomes';

export const outcomeService = {
  getAll: async (filters: any = {}) => {
    const { outcome, q, date_from, date_to } = filters;
    let query = supabase
      .from(OUTCOMES_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (outcome && outcome !== 'all') query = query.eq('outcome', outcome);

    const { data, error } = await query;
    if (error) {
      console.error('[outcomes] fetch error:', error.message);
      return [];
    }

    let rows = data || [];

    if (q) {
      const lower = q.toLowerCase();
      rows = rows.filter((r: any) =>
        (r.lead_name || '').toLowerCase().includes(lower) ||
        (r.phone_number || '').includes(lower) ||
        (r.reason || '').toLowerCase().includes(lower)
      );
    }
    if (date_from) rows = rows.filter((r: any) => r.outcome_date >= date_from);
    if (date_to)   rows = rows.filter((r: any) => r.outcome_date <= date_to);

    return rows;
  },

  update: async (id: string, updates: { reason?: string; note?: string }) => {
    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (updates.reason !== undefined) { sets.push(`reason=$${i++}`); vals.push(updates.reason); }
    if (updates.note   !== undefined) { sets.push(`note=$${i++}`);   vals.push(updates.note); }
    if (sets.length === 0) return { success: true };
    vals.push(id);
    await pool.query(`UPDATE public.crm_lead_outcomes SET ${sets.join(', ')} WHERE id=$${i}`, vals);
    return { success: true };
  },

  delete: async (id: string) => {
    // Get the record first so we can revert the lead status
    const { data } = await supabase.from(OUTCOMES_TABLE).select('lead_id, outcome').eq('id', id).maybeSingle();
    await pool.query(`DELETE FROM public.crm_lead_outcomes WHERE id=$1`, [id]);

    // Revert call_leads status back to 'pending' — fire-and-forget
    if (data?.lead_id) {
      void (async () => {
        try {
          await supabase.from(LEADS_TABLE).update({ status: 'pending' }).eq(COLS.leads.id, data.lead_id);
        } catch (_) {}
      })();
    }
    return { success: true };
  },

  getTrend: async (filters: any = {}) => {
    const { outcome, date_from, date_to } = filters;
    // Fetch ALL outcomes without PostgREST date filter — in-memory filter avoids
    // timezone mismatches with DATE columns (same approach as getAll).
    let query = supabase
      .from(OUTCOMES_TABLE)
      .select('outcome, sentiment, outcome_date')
      .order('outcome_date', { ascending: true });

    if (outcome && outcome !== 'all') query = query.eq('outcome', outcome);

    const { data, error } = await query;
    if (error) { console.error('[outcomes] trend error:', error.message); return []; }

    // Apply date filter in memory on normalized date strings
    let rows = (data || []) as any[];
    if (date_from) rows = rows.filter((r: any) => {
      const d = (r.outcome_date || '').substring(0, 10);
      return d >= date_from;
    });
    if (date_to) rows = rows.filter((r: any) => {
      const d = (r.outcome_date || '').substring(0, 10);
      return d <= date_to;
    });

    // If outcomes table has data, return it directly
    if (rows.length > 0) return rows;

    // Fallback: synthesise from call_leads for leads converted/lost before outcomes table existed
    const isConverted = outcome === 'Converted';
    const isLost = outcome === 'Lost';
    const statusFilter = isConverted
      ? [CRM_CONVERTED, 'converted']
      : isLost
      ? [CRM_LOST, 'crm_lost', 'lost', ...LOST_STATUSES]
      : [CRM_CONVERTED, 'converted', CRM_LOST, 'crm_lost', 'lost', ...LOST_STATUSES];

    let leadsQuery = supabase
      .from(LEADS_TABLE)
      .select(`${COLS.leads.id}, ${COLS.leads.status}, ${COLS.leads.sentiment}, ${COLS.leads.timestamp}`)
      .in(COLS.leads.status, statusFilter);

    const { data: leads } = await leadsQuery;
    if (!leads || leads.length === 0) return [];

    return leads.map((r: any) => {
      const ts = parseCallDateTime(r[COLS.leads.timestamp]) || new Date().toISOString();
      const callDate = ts.substring(0, 10);
      const normalizedSentiment = normalizeSentiment(r[COLS.leads.sentiment]);
      const LOST_SET = new Set([CRM_LOST, 'crm_lost', 'lost', ...LOST_STATUSES]);
      const outcomeLabel = LOST_SET.has(String(r[COLS.leads.status]).toLowerCase()) ? 'Lost' : 'Converted';
      return {
        outcome: outcomeLabel,
        sentiment: normalizedSentiment,
        outcome_date: callDate,
      };
    });
  },
};

export const noteService = { getNotes: async () => [] };
export const tagService = { getTags: async () => [] };
export const proxyService = { 
  checkTable: async (table: string) => table === 'call_leads',
  getInsightByPhone: async (phone: string) => {
    const { data, error } = await supabase.from(LEADS_TABLE).select('*').eq(COLS.leads.phone, phone).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
        ...data,
        leadid: String(data[COLS.leads.id]),
        "Phone Number": data[COLS.leads.phone],
        "User Name": data[COLS.leads.name],
        "concern": data[COLS.leads.summary],
        "lead stage": data[COLS.leads.status],
        "sentiment": normalizeSentiment(data[COLS.leads.sentiment]),
        "Conversation Summary": data[COLS.leads.summary],
        "Action to be taken": null
    };
  }
};
