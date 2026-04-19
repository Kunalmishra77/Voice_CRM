import type { DateRange, DatePreset } from '../../utils/dateRange';
import { bGet, bPost, bPatch, bDelete } from '../backendApi';
import type { IDataProvider } from '../IDataProvider';
import { eachDayOfInterval, isSameDay, parseISO, subDays } from 'date-fns';
import { safeFormat, safeParseISO } from '../../lib/utils';
import type { 
  KPIStats, 
  LeadInsightRow, 
  TrendPoint, 
  StagePoint, 
  FollowUpLead, 
  FunnelStep, 
  AgentPerformance, 
  VoicePulse, 
  VoiceTrendPoint, 
  ChatSession, 
  ChatMessage, 
  LeadInsightsSummary, 
  LeadTask, 
  ReportsData, 
  ExportHistoryItem,
  FetchLeadsParams,
  UpdateLeadStatusParams,
  UpdateLeadStatusResult,
  LiveCallActivity
} from '../types';

/** Robust date parser for trend grouping */
function parseAnyDate(dateStr: any): Date {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  try {
    // 1. Try standard ISO
    const d = parseISO(dateStr);
    if (!isNaN(d.getTime())) return d;

    // 2. Try parsing custom format "2:00 pmThursday, 12 March 2026"
    if (typeof dateStr === 'string') {
      const dateMatch = dateStr.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})/);
      if (dateMatch) {
        const d2 = new Date(dateMatch[1]);
        if (!isNaN(d2.getTime())) return d2;
      }
    }

    // 3. Fallback
    const d3 = new Date(dateStr);
    return isNaN(d3.getTime()) ? new Date() : d3;
  } catch (e) {
    return new Date();
  }
}

/** Normalize lead status to stable buckets (Converted/Lost/Pending) */
function normalizeStatus(raw: any): 'Converted' | 'Lost' | 'Pending' {
  const status = String(raw || '').toLowerCase().trim();
  if (status === 'crm_converted' || status === 'converted') return 'Converted';
  if (status === 'crm_lost' || status === 'lost' || ['not interested', 'wrong number', 'busy', 'voicemail'].includes(status)) return 'Lost';
  return 'Pending';
}

export class BackendProvider implements IDataProvider {
  async getDashboardKPIs(range: DateRange, leadType?: string): Promise<KPIStats> {
    const stats = await bGet('/metrics', {
      date_from: range.from,
      date_to: range.to,
      lead_type: !leadType || leadType === 'all' ? undefined : leadType,
    });
    const dbTotal = stats.total_leads;           // full DB count — never date-filtered
    const filteredTotal = stats.filtered_total ?? dbTotal; // count in selected range
    return {
      totalLeads: filteredTotal,
      hotLeads: stats.bucket_counts?.['Hot'] || 0,
      warmLeads: stats.bucket_counts?.['Warm'] || 0,
      coldLeads: stats.bucket_counts?.['Cold'] || 0,
      avgLeads: Math.round(filteredTotal / 7) || 0,
      converted: stats.bucket_counts?.['Converted'] || 0,
      unconverted: stats.bucket_counts?.['Lost'] || 0,
      pendingDecisions: stats.bucket_counts?.['Pending'] || 0,
      avgScore: (() => {
        const h = stats.bucket_counts?.['Hot'] || 0;
        const w = stats.bucket_counts?.['Warm'] || 0;
        const c = stats.bucket_counts?.['Cold'] || 0;
        const denom = h + w + c;
        return denom > 0 ? Math.round((h * 90 + w * 60 + c * 30) / denom) : 0;
      })(),
      demoBooked: stats.bucket_counts?.['DemoBooked'] || 0,
      callbacks: stats.bucket_counts?.['Callback'] || 0,
      failedCalls: stats.bucket_counts?.['Failed'] || 0,
      bucketCounts: stats.bucket_counts
    };
  }

  async getLeads(params: FetchLeadsParams): Promise<LeadInsightRow[]> {
    const stage = params.bucket && params.bucket !== 'all' ? params.bucket : params.status;
    const res = await bGet('/leads', {
        q: params.search,
        stage: stage,
        sentiment: params.sentiment === 'all' ? undefined : params.sentiment,
        date_from: params.range?.from,
        date_to: params.range?.to,
        lead_type: !params.leadType || params.leadType === 'all' ? undefined : params.leadType,
    });
    return res.data.map((l: any) => ({
        ...l,
        id: l.leadid.toString(),
        // Use backend CallTimestamp if available, otherwise parse call_date_time on frontend
        CallTimestamp: l.CallTimestamp || (() => {
          if (l.call_date_time) {
            const parsed = parseAnyDate(l.call_date_time);
            return parsed.toISOString();
          }
          return l.created_at;
        })(),
        recording_url: l.recording_url || null,
        scoring: {
            score: l.sentiment === 'Hot' ? 92 : l.sentiment === 'Warm' ? 68 : l.sentiment === 'Cold' ? 34 : 0,
            bucket: l.sentiment || null,
            reasons: []
        }
    }));
  }

  async getLeadsTrend(range: DateRange, _preset: DatePreset, bucket?: string, leadType?: string): Promise<TrendPoint[]> {
    const isLostBucket = bucket?.toLowerCase() === 'lost';
    const isConvertedBucket = bucket?.toLowerCase() === 'converted';

    // For Converted/Lost: use the dedicated outcomes table — reliable, no cache issues
    if (isConvertedBucket || isLostBucket) {
      const outcomeRows = await this.getOutcomesTrend({
        outcome: isConvertedBucket ? 'Converted' : 'Lost',
        date_from: range.from,
        date_to: range.to,
      });

      // Group by outcome_date
      const byDate: Record<string, any[]> = {};
      outcomeRows.forEach((r: any) => {
        const d = r.outcome_date?.substring(0, 10) || '';
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push(r);
      });

      if (Object.keys(byDate).length === 0) return [];

      const dates = Object.keys(byDate).sort();
      let start = safeParseISO(dates[0]);
      let end = safeParseISO(dates[dates.length - 1]);
      // Ensure at least a 7-day window for visual context
      if (Math.ceil((end.getTime() - start.getTime()) / 86400000) < 6) {
        start = subDays(end, 6);
      }

      const interval = eachDayOfInterval({ start, end });
      return interval.map(day => {
        const dayStr = safeFormat(day, 'yyyy-MM-dd');
        const rows = byDate[dayStr] || [];
        if (isConvertedBucket) {
          return { name: safeFormat(day, 'MMM dd'), hot: 0, warm: 0, cold: 0, converted: rows.length, lost: 0, failed: 0, from: dayStr, to: dayStr };
        }
        return {
          name: safeFormat(day, 'MMM dd'),
          hot:  rows.filter((r: any) => r.sentiment === 'Hot').length,
          warm: rows.filter((r: any) => r.sentiment === 'Warm').length,
          cold: rows.filter((r: any) => r.sentiment === 'Cold').length,
          converted: 0,
          lost: rows.length,
          failed: 0,
          from: dayStr,
          to: dayStr
        };
      });
    }

    const leads = await this.getLeads({ range, bucket, leadType });

    // Determine interval range
    let start = safeParseISO(range.from);
    let end = safeParseISO(range.to);
    const requestedSpan = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // For large spans (Yearly, All-time, Global Range), bound by actual data to avoid huge sparse graphs
    if (requestedSpan > 31 && leads.length > 0) {
      const now = new Date();
      const leadDates = leads.map(l => parseAnyDate(l.CallTimestamp || l.created_at));
      let discoveredStart = leadDates[0];
      let discoveredEnd = leadDates[0];
      leadDates.forEach(d => {
        if (d < discoveredStart) discoveredStart = d;
        if (d > discoveredEnd) discoveredEnd = d;
      });
      
      // CAP to today to avoid future date outliers (like Nov 03) stretching the graph
      if (discoveredEnd > now) discoveredEnd = now;
      
      const discoveredSpan = Math.ceil((discoveredEnd.getTime() - discoveredStart.getTime()) / (1000 * 60 * 60 * 24));
      
      if (requestedSpan > 90) {
        start = discoveredSpan > 180 ? subDays(discoveredEnd, 179) : discoveredStart;
        end = discoveredEnd;
        
        // Visual consistency: at least 7 days
        if (Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) < 7) {
          start = subDays(end, 6);
        }
      }
    }

    const interval = eachDayOfInterval({ start, end });
    
    // Group by CallTimestamp (the actual call date) to match user expectations
    const leadsWithDayStrings = leads.map(l => {
      const ts = l.CallTimestamp || l.created_at || '';
      const dayStr = typeof ts === 'string' && ts.includes('T') 
        ? ts.split('T')[0] 
        : safeFormat(parseAnyDate(ts), 'yyyy-MM-dd');
      
      return {
        ...l,
        dayString: dayStr
      };
    });

    return interval.map(day => {
      const dayStr = safeFormat(day, 'yyyy-MM-dd');
      const dayLeads = leadsWithDayStrings.filter(l => l.dayString === dayStr);

      const FAILED_STATUSES = ['failed', 'error', 'no answer', 'no_answer'];
      const pending = dayLeads.filter(l => normalizeStatus(l.status) === 'Pending');
      return {
        name: safeFormat(day, 'MMM dd'),
        hot: pending.filter(l => (l.sentiment || '').toLowerCase() === 'hot').length,
        warm: pending.filter(l => { const s = (l.sentiment || '').toLowerCase(); return s === 'warm' || s === 'average'; }).length,
        cold: pending.filter(l => (l.sentiment || '').toLowerCase() === 'cold').length,
        converted: dayLeads.filter(l => normalizeStatus(l.status) === 'Converted').length,
        lost: dayLeads.filter(l => normalizeStatus(l.status) === 'Lost').length,
        failed: dayLeads.filter(l => FAILED_STATUSES.includes((l.status || l['lead stage'] || '').toLowerCase())).length,
        from: dayStr,
        to: dayStr
      };
    });
  }

  async getStageDistribution(range: DateRange, bucket?: string, leadType?: string): Promise<StagePoint[]> {
    const stats = await bGet('/metrics', {
      date_from: range.from,
      date_to: range.to,
      lead_type: !leadType || leadType === 'all' ? undefined : leadType,
    });
    const colors: Record<string, string> = {
      'Hot': '#ef4444',
      'Warm': '#f59e0b',
      'Cold': '#3b82f6',
      'Converted': '#06b6d4',
      'Lost': '#64748b'
    };
    // Use bucket_counts which properly categorizes all leads
    const bc = stats.bucket_counts || {};
    const total = bc.all || Object.values(stats.stage_counts || {}).reduce((a: any, b: any) => a + b, 0) as number || 1;
    const categories = ['Hot', 'Warm', 'Cold', 'Converted', 'Lost'];

    return categories
      .map(name => ({
        name,
        value: Math.round(((bc[name] || 0) / total) * 100),
        color: colors[name] || '#cbd5e1'
      }))
      .filter(item => item.value > 0);
  }

  async getTopFollowUps(range: DateRange, bucket?: string): Promise<FollowUpLead[]> {
    const res = await bGet('/leads', { stage: 'Pending', limit: 15 });
    return res.data.map((l: any) => ({
        id: l.leadid.toString(),
        name: l['User Name'],
        phone: l['Phone Number'],
        time: safeFormat(l.Timestamp, 'hh:mm a'),
        status: l.sentiment || 'New',
        score: l.sentiment === 'Hot' ? 95 : 70,
        scoring: { score: 90, bucket: l.sentiment || 'Warm', reasons: [] },
        missingCount: 0
    }));
  }

  async getFunnel(range: DateRange, bucket?: string, leadType?: string): Promise<FunnelStep[]> {
    const stats = await bGet('/metrics', {
      date_from: range.from,
      date_to: range.to,
      lead_type: !leadType || leadType === 'all' ? undefined : leadType,
    });
    const total = stats.total_leads || 0;
    const bCounts = stats.bucket_counts || {};
    const denom = total || 1;
    return [
        { label: 'Total Intercepts', val: `${total} leads`, color: 'bg-teal-500' },
        { label: 'High Intent (Hot)', val: Math.round(((bCounts['Hot'] || 0)/denom)*100) + '%', color: 'bg-emerald-500' },
        { label: 'Pending Action', val: Math.round(((bCounts['Pending'] || 0)/denom)*100) + '%', color: 'bg-amber-500' },
        { label: 'Converted', val: Math.round(((bCounts['Converted'] || 0)/denom)*100) + '%', color: 'bg-rose-500' },
    ];
  }

  async getAgentPerformance(range: DateRange): Promise<AgentPerformance[]> {
    const leads = await this.getLeads({ range });
    const agentsMap: Record<string, { total: number, done: number }> = {};
    leads.forEach(l => {
        const owner = l.owner || 'Unassigned';
        if (!agentsMap[owner]) agentsMap[owner] = { total: 0, done: 0 };
        agentsMap[owner].total++;
        if ((l.status as any) === 'crm_converted') agentsMap[owner].done++;
    });
    return Object.entries(agentsMap).map(([name, stats]) => ({
        name,
        leads: stats.total,
        conv: Math.round((stats.done / stats.total) * 100) + '%',
        color: 'bg-teal-500'
    }));
  }

  async getVoicePulse(range: DateRange): Promise<VoicePulse> {
    const stats = await bGet('/metrics', { date_from: range.from, date_to: range.to });
    return {
        incomingChats: stats.total_leads,
        activeSessions: 0,
        newContacts: stats.unique_phones,
        preInsightSessions: stats.bucket_counts?.['Pending'] || 0,
        insightReadySessions: stats.total_leads,
        lastUpdatedAt: new Date().toISOString()
    };
  }

  async getVoiceTrend(range: DateRange, _preset: DatePreset, leadType?: string): Promise<VoiceTrendPoint[]> {
    const leads = await this.getLeads({ range, leadType });

    // Determine interval range
    let start = safeParseISO(range.from);
    let end = safeParseISO(range.to);
    const requestedSpan = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // For Global/All Time (large spans), use discovery
    if (requestedSpan > 31 && leads.length > 0) {
      const now = new Date();
      const leadDates = leads.map(l => parseAnyDate(l.CallTimestamp || l.created_at));
      let discoveredStart = leadDates[0];
      let discoveredEnd = leadDates[0];
      leadDates.forEach(d => {
        if (d < discoveredStart) discoveredStart = d;
        if (d > discoveredEnd) discoveredEnd = d;
      });

      // CAP to today to avoid future date outliers stretching the graph
      if (discoveredEnd > now) discoveredEnd = now;

      const discoveredSpan = Math.ceil((discoveredEnd.getTime() - discoveredStart.getTime()) / (1000 * 60 * 60 * 24));
      
      if (requestedSpan > 90) {
        start = discoveredSpan > 180 ? subDays(discoveredEnd, 179) : discoveredStart;
        end = discoveredEnd;
        if (Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) < 7) {
          start = subDays(end, 6);
        }
      }
    }

    const interval = eachDayOfInterval({ start, end });
    
    // Group by call date (CallTimestamp)
    const leadsWithDayStrings = leads.map(l => {
      const ts = l.CallTimestamp || l.created_at || '';
      const dayStr = typeof ts === 'string' && ts.includes('T') 
        ? ts.split('T')[0] 
        : safeFormat(parseAnyDate(ts), 'yyyy-MM-dd');
      
      return {
        ...l,
        dayString: dayStr
      };
    });

    return interval.map(day => {
        const dayStr = safeFormat(day, 'yyyy-MM-dd');
        const dayLeads = leadsWithDayStrings.filter(l => l.dayString === dayStr);
        return {
          name: safeFormat(day, 'MMM dd'),
          messages: dayLeads.length,
          sessions: dayLeads.length,
          contacts: new Set(dayLeads.map(l => l['Phone Number'])).size,
          from: dayStr,
          to: dayStr
        };
    });
  }

  async getSessions(range: DateRange): Promise<ChatSession[]> {
    const res = await bGet('/conversations', { date_from: range.from, date_to: range.to });
    return res.data.map((c: any) => ({
        sessionId: c['Session ID'],
        phone: c['Phone Number'],
        name: c['User Name'],
        lastMessage: c['User Message'],
        // Use CallTimestamp (ISO-parsed) so date-fns parseISO works correctly in the UI
        lastTimestamp: c['CallTimestamp'] || c['created_at'] || c['Timestamp'],
        status: 'Done',
        recording_url: c.recording_url || null
    }));
  }

  async getConversation(sessionId: string): Promise<ChatMessage[]> {
    const res = await bGet(`/conversations/${sessionId}`);
    return res.messages.map((m: any) => ({
        id: m.id,
        timestamp: m.Timestamp,
        user_msg: m['User Message'],
        bot_msg: m['Bot Response'],
        stage: 'Voice'
    }));
  }

  async getLeadInsightByPhone(phone: string): Promise<LeadInsightRow | null> {
    const res = await bGet(`/leads/by-phone/${phone}`);

    if (!res) return null;
    return {
        ...res,
        id: res.leadid?.toString() || '0',
        scoring: {
            score: res.sentiment === 'Hot' ? 95 : res.sentiment === 'Warm' ? 70 : 40,
            bucket: res.sentiment || 'Warm',
            reasons: []
        }
    };
  }

  async getLeadInsightsSummary(range: DateRange, leadType?: string): Promise<LeadInsightsSummary> {
    const leads = await this.getLeads({ range, leadType });
    const concernMap: Record<string, number> = {};
    leads.forEach(l => {
        // Use the full concern string — trim and cap at 80 chars for grouping key
        const raw = (l.concern || '').trim();
        if (raw && raw.length > 3) {
            const key = raw.length > 80 ? raw.substring(0, 80) : raw;
            concernMap[key] = (concernMap[key] || 0) + 1;
        }
    });
    const topConcerns = Object.entries(concernMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    // Count sentiment directly from leads array — reliable, independent of date grouping
    const hotCount  = leads.filter(l => l.sentiment === 'Hot').length;
    const warmCount = leads.filter(l => l.sentiment === 'Warm').length;
    const coldCount = leads.filter(l => l.sentiment === 'Cold').length;
    const durValues = leads.map(l => Number(l.duration || 0)).filter(d => d > 0);
    const avgDuration = durValues.length > 0 ? Math.round(durValues.reduce((a, b) => a + b, 0) / durValues.length) : 0;
    if (leads.length === 0) return { totalLeads: 0, hotCount: 0, warmCount: 0, coldCount: 0, avgDuration: 0, sentimentTrend: [], topConcerns, highIntentLeads: [] };

    // Build date range from actual call dates (capped at today to avoid future-date outliers)
    const now = new Date();
    const sDates = leads.map(l => {
      const d = parseAnyDate(l.CallTimestamp || l.created_at);
      return d > now ? now : d;  // cap future dates to today
    });
    let sStart = sDates[0];
    let sEnd = sDates[0];
    sDates.forEach(d => { if (d < sStart) sStart = d; if (d > sEnd) sEnd = d; });
    const sSpan = Math.ceil((sEnd.getTime() - sStart.getTime()) / (1000 * 60 * 60 * 24));
    if (sSpan > 180) sStart = subDays(sEnd, 179);
    const interval = eachDayOfInterval({ start: sStart, end: sEnd });
    const sentimentTrend = interval.map(day => {
        const dayLeads = leads.filter(l => {
          const d = parseAnyDate(l.CallTimestamp || l.created_at);
          const capped = d > now ? now : d;
          return isSameDay(capped, day);
        });
        return {
            name: safeFormat(day, 'MMM dd'),
            pos: dayLeads.filter(l => l.sentiment === 'Hot').length,
            neu: dayLeads.filter(l => l.sentiment === 'Warm').length,
            neg: dayLeads.filter(l => l.sentiment === 'Cold').length
        };
    });
    return { totalLeads: leads.length, hotCount, warmCount, coldCount, avgDuration, sentimentTrend, topConcerns, highIntentLeads: leads.filter(l => l.sentiment === 'Hot').slice(0, 10) };
  }

  async getTasks(_range: DateRange, filters?: Record<string, any>): Promise<LeadTask[]> {
    try {
      const data = await bGet('/tasks', filters);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('[BackendProvider] getTasks error:', e);
      return [];
    }
  }

  async createTask(task: Partial<LeadTask>): Promise<boolean> {
    try {
      await bPost('/tasks', task);
      return true;
    } catch (e) {
      console.error('[BackendProvider] createTask error:', e);
      return false;
    }
  }

  async createBulkTasks(tasks: Partial<LeadTask>[]): Promise<{ success: boolean; created: number }> {
    try {
      const res = await bPost('/tasks/bulk', { tasks });
      return { success: true, created: res.created || 0 };
    } catch (e) {
      console.error('[BackendProvider] createBulkTasks error:', e);
      return { success: false, created: 0 };
    }
  }

  async updateTaskById(id: string, updates: Partial<LeadTask>): Promise<boolean> {
    try {
      await bPatch(`/tasks/${id}`, updates);
      return true;
    } catch (e) {
      console.error('[BackendProvider] updateTask error:', e);
      return false;
    }
  }

  async deleteTaskById(id: string): Promise<boolean> {
    try {
      await bDelete(`/tasks/${id}`);
      return true;
    } catch (e) {
      console.error('[BackendProvider] deleteTask error:', e);
      return false;
    }
  }

  async getEmployees(): Promise<any[]> {
    try {
      return await bGet('/employees');
    } catch (e) {
      console.error('[BackendProvider] getEmployees error:', e);
      return [];
    }
  }

  async getTaskStats(filters?: Record<string, any>): Promise<any> {
    try {
      return await bGet('/tasks/stats', filters);
    } catch (e) {
      console.error('[BackendProvider] getTaskStats error:', e);
      return { total: 0, pending: 0, overdue: 0, completed: 0, byEmployee: {} };
    }
  }

  async toggleTaskDone(id: string, currentStatus: boolean): Promise<boolean> {
    return this.updateTaskById(id, { done: !currentStatus });
  }
  async getReportsData(_range: DateRange): Promise<ReportsData> { return { conversionRatio: [], sentimentSplit: [], engagementMetrics: [], performanceTrend: [] }; }
  async getExportHistory(_range: DateRange): Promise<ExportHistoryItem[]> { return []; }
  async logExportAction(_fmt: string, _count: number, _range: DateRange): Promise<boolean> { return true; }
  
  async updateLeadStatus(params: UpdateLeadStatusParams): Promise<UpdateLeadStatusResult> {
    const res = await bPatch(`/leads/${params.lead.id}/status`, {
        status: params.status,
        reason: params.reason,
        note: params.note
    });
    return { success: res.success };
  }

  async toggleWorkedStatus(_leadId: string, phone: string, currentStatus: boolean): Promise<boolean> {
    await bPatch(`/proxy/states/by-phone/${phone}`, { worked_flag: !currentStatus });
    return true;
  }

  async getLiveCallActivity(): Promise<LiveCallActivity> {
    return bGet('/live/activity');
  }

  async getOutcomes(filters?: Record<string, any>): Promise<any[]> {
    try {
      return await bGet('/outcomes', filters);
    } catch (e) {
      console.error('[BackendProvider] getOutcomes error:', e);
      return [];
    }
  }

  async getOutcomesTrend(filters?: Record<string, any>): Promise<any[]> {
    try {
      return await bGet('/outcomes/trend', filters);
    } catch (e) {
      console.error('[BackendProvider] getOutcomesTrend error:', e);
      return [];
    }
  }

  async updateOutcome(id: string, updates: { reason?: string; note?: string }): Promise<boolean> {
    try {
      await bPatch(`/outcomes/${id}`, updates);
      return true;
    } catch (e) {
      console.error('[BackendProvider] updateOutcome error:', e);
      return false;
    }
  }

  async deleteOutcome(id: string): Promise<boolean> {
    try {
      await bDelete(`/outcomes/${id}`);
      return true;
    } catch (e) {
      console.error('[BackendProvider] deleteOutcome error:', e);
      return false;
    }
  }
}
