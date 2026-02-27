import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

/** 
 * ERROR FIX TOGGLE:
 * Set this to TRUE only AFTER you run the SQL script to create the new tables.
 * While this is FALSE, the app will only use your 2 existing tables.
 */
const ENABLE_EXTENDED_CRM_FEATURES = false;

// Source Tables (Existing)
const T_CONVERSATIONS = 'whatsapp_conversations';
const T_INSIGHTS = 'lead_insights';

// CRM Workflow Tables (New)
const T_STATE = 'crm_lead_state';
const T_COMMENTS = 'lead_comments';
const T_TASKS = 'lead_tasks';
const T_EXTRACTED = 'lead_extracted_fields';
const T_SCORING = 'lead_scoring';

export type LeadStatus = 'New' | 'InProgress' | 'FollowUpScheduled' | 'Converted' | 'NotInterested' | 'Closed';

const getVal = (row: any, keys: string[]) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return null;
};

const normalizeInsight = (row: any) => {
  const ts = getVal(row, ['Timestamp', 'timestamp', 'ts_i']) || new Date().toISOString();
  const phone = String(getVal(row, ['Phone Number', 'phone']) || '');
  
  return {
    id: row.id || `${phone}-${ts}`,
    lead_insights_id: row.id,
    ts_i: ts,
    phone,
    name: getVal(row, ['User Name', 'name']) || 'Unknown',
    concern: getVal(row, ['concern', 'Concern']) || '',
    lead_stage: getVal(row, ['lead stage', 'stage', 'lead_stage']) || 'Unknown',
    summary: getVal(row, ['Conversation Summary', 'summary', 'summery']) || '',
    sentiment: getVal(row, ['sentiment', 'Sentiment']) || 'Neutral',
    next_action: getVal(row, ['Action to be taken', 'next_action']) || '',
    
    // Fallbacks if CRM features are disabled
    status: row.crm_lead_state?.[0]?.status_enum || 'New',
    worked_flag: row.crm_lead_state?.[0]?.worked_flag || false,
    worked_at: row.crm_lead_state?.[0]?.worked_at || null,
    owner_user_id: row.crm_lead_state?.[0]?.owner_user_id || 'Unassigned',
    missing_state: row.lead_extracted_fields?.[0]?.missing_state ?? true,
    missing_district: row.lead_extracted_fields?.[0]?.missing_district ?? true,
    missing_capacity_tph: row.lead_extracted_fields?.[0]?.missing_capacity_tph ?? true,
    lead_score: row.lead_scoring?.[0]?.score_0_100 || 0,
    score_reasons: row.lead_scoring?.[0]?.reason_codes || [],
    comments_count: row.lead_comments?.length || 0,
  };
};

const normalizeConv = (row: any) => {
  const ts = getVal(row, ['Timestamp', 'timestamp', 'ts']) || new Date().toISOString();
  const phone = String(getVal(row, ['Phone Number', 'phone']) || '');
  return {
    id: row.id || `${phone}-${ts}`,
    ts,
    phone,
    name: getVal(row, ['User Name', 'name']) || 'Unknown',
    user_msg: getVal(row, ['User Message', 'message', 'user_msg']) || '',
    bot_msg: getVal(row, ['Bot Response', 'response', 'bot_msg']) || '',
    stage: getVal(row, ['Conversation Stage', 'stage']) || 'Idle',
    session_id: getVal(row, ['Session ID', 'session', 'session_id']) || phone,
    summery: getVal(row, ['summery']) || 'NA',
  };
};

export const dataApi = {
  fetchDashboardKPIs: async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: insightsData } = await supabase.from(T_INSIGHTS).select('*');
      
      let states: any[] = [];
      if (ENABLE_EXTENDED_CRM_FEATURES) {
        const { data } = await supabase.from(T_STATE).select('*');
        states = data || [];
      }

      const insights = (insightsData || []).map(normalizeInsight);
      return {
        totalLeads: insights.length,
        newLeadsToday: insights.filter(i => i.ts_i.includes(todayStr)).length,
        unworkedWarmLeads: insights.filter(i => i.lead_stage.toLowerCase() === 'warm' && !i.worked_flag).length,
        followUpsToday: states.filter((s: any) => s.status_enum === 'FollowUpScheduled').length,
        converted: states.filter((s: any) => s.status_enum === 'Converted').length,
        stageDistro: Object.entries(insights.reduce((acc: any, i) => {
          acc[i.lead_stage] = (acc[i.lead_stage] || 0) + 1;
          return acc;
        }, {})).map(([name, value]) => ({ name, value }))
      };
    } catch (e) {
      return { totalLeads: 0, newLeadsToday: 0, unworkedWarmLeads: 0, followUpsToday: 0, converted: 0, stageDistro: [] };
    }
  },

  fetchLeads: async ({ search = '', status = 'all', worked = 'all', limit = 100 }) => {
    try {
      const { data: qInsights } = await supabase.from(T_INSIGHTS).select('*').limit(limit);
      
      let stateMap = new Map();
      let extMap = new Map();
      let scoreMap = new Map();
      let commentCounts: any = {};

      if (ENABLE_EXTENDED_CRM_FEATURES) {
        const [resState, resExt, resScore, resComments] = await Promise.all([
          supabase.from(T_STATE).select('*'),
          supabase.from(T_EXTRACTED).select('*'),
          supabase.from(T_SCORING).select('*'),
          supabase.from(T_COMMENTS).select('phone_number')
        ]);
        stateMap = new Map((resState.data || []).map((s: any) => [s.phone_number, s]));
        extMap = new Map((resExt.data || []).map((e: any) => [e.phone_number, e]));
        scoreMap = new Map((resScore.data || []).map((s: any) => [s.phone_number, s]));
        commentCounts = (resComments.data || []).reduce((acc: any, c: any) => {
          acc[c.phone_number] = (acc[c.phone_number] || 0) + 1;
          return acc;
        }, {});
      }

      let leads = (qInsights || []).map(row => {
        const phone = String(getVal(row, ['Phone Number', 'phone']) || '');
        return normalizeInsight({
          ...row,
          crm_lead_state: stateMap.has(phone) ? [stateMap.get(phone)] : [],
          lead_extracted_fields: extMap.has(phone) ? [extMap.get(phone)] : [],
          lead_scoring: scoreMap.has(phone) ? [scoreMap.get(phone)] : [],
          lead_comments: { length: commentCounts[phone] || 0 }
        });
      });

      if (search) {
        const s = search.toLowerCase();
        leads = leads.filter(l => l.name.toLowerCase().includes(s) || l.phone.includes(s) || l.concern.toLowerCase().includes(s));
      }
      if (status !== 'all') leads = leads.filter(l => l.status === status);
      if (worked === 'true') leads = leads.filter(l => l.worked_flag);
      if (worked === 'false') leads = leads.filter(l => !l.worked_flag);

      const unique = new Map();
      leads.sort((a, b) => new Date(b.ts_i).getTime() - new Date(a.ts_i).getTime()).forEach(l => {
        if (!unique.has(l.phone)) unique.set(l.phone, l);
      });

      return Array.from(unique.values());
    } catch (e) {
      return [];
    }
  },

  fetchLeadDetail: async (phone: string) => {
    try {
      const [resInsight, resConvs] = await Promise.all([
        supabase.from(T_INSIGHTS).select('*').eq('Phone Number', phone).order('Timestamp', { ascending: false }).limit(1),
        supabase.from(T_CONVERSATIONS).select('*').eq('Phone Number', phone).order('Timestamp', { ascending: true })
      ]);

      let stateData = null, extData = null, scoreData = null, commentsData = [];

      if (ENABLE_EXTENDED_CRM_FEATURES) {
        const [resState, resExt, resScore, resComments] = await Promise.all([
          supabase.from(T_STATE).select('*').eq('phone_number', phone).maybeSingle(),
          supabase.from(T_EXTRACTED).select('*').eq('phone_number', phone).maybeSingle(),
          supabase.from(T_SCORING).select('*').eq('phone_number', phone).maybeSingle(),
          supabase.from(T_COMMENTS).select('*').eq('phone_number', phone).order('created_at', { ascending: false })
        ]);
        stateData = resState.data;
        extData = resExt.data;
        scoreData = resScore.data;
        commentsData = resComments.data || [];
      }

      const insight = resInsight.data?.[0] ? normalizeInsight({
        ...resInsight.data[0],
        crm_lead_state: stateData ? [stateData] : [],
        lead_extracted_fields: extData ? [extData] : [],
        lead_scoring: scoreData ? [scoreData] : [],
      }) : null;

      return {
        phone,
        insight,
        messages: (resConvs.data || []).map(normalizeConv),
        state: stateData || { status_enum: 'New', worked_flag: false, owner_user_id: null },
        extracted: extData || { missing_state: true, missing_district: true, missing_capacity_tph: true },
        score: scoreData || { score_0_100: 0, reason_codes: [] },
        comments: commentsData
      };
    } catch (e) {
      return null;
    }
  },

  fetchLiveInbox: async () => {
    const { data } = await supabase.from(T_CONVERSATIONS).select('*').or('summery.eq.NA,summery.is.null').limit(100);
    return (data || []).map(normalizeConv).sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  },

  setStatus: async (phone: string, status: LeadStatus) => {
    if (!ENABLE_EXTENDED_CRM_FEATURES) return;
    return supabase.from(T_STATE).upsert({ phone_number: phone, status_enum: status, updated_at: new Date().toISOString() }, { onConflict: 'phone_number' });
  },

  setWorked: async (phone: string, worked_flag: boolean) => {
    if (!ENABLE_EXTENDED_CRM_FEATURES) return;
    return supabase.from(T_STATE).upsert({ phone_number: phone, worked_flag, worked_at: worked_flag ? new Date().toISOString() : null, updated_at: new Date().toISOString() }, { onConflict: 'phone_number' });
  },

  addComment: async (phone: string, comment_text: string) => {
    if (!ENABLE_EXTENDED_CRM_FEATURES) return;
    return supabase.from(T_COMMENTS).insert({ phone_number: phone, comment_text, created_by: 'Agent' });
  },

  exportToExcel: (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Export');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  },
  
  exportToCSV: (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  }
};
