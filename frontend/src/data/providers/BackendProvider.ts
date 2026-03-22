import type { DateRange, DatePreset } from '../../utils/dateRange';
import { bGet, bPost, bPatch } from '../backendApi';
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
  UpdateLeadStatusResult
} from '../types';

export class BackendProvider implements IDataProvider {
  async getDashboardKPIs(range: DateRange): Promise<KPIStats> {
    const stats = await bGet('/metrics', { date_from: range.from, date_to: range.to });
    return {
      totalLeads: stats.total_leads,
      hotLeads: stats.bucket_counts?.['Hot'] || 0,
      warmLeads: stats.bucket_counts?.['Warm'] || 0,
      coldLeads: stats.bucket_counts?.['Cold'] || 0,
      avgLeads: Math.round(stats.total_leads / 7) || 0,
      converted: stats.bucket_counts?.['Converted'] || 0,
      unconverted: stats.bucket_counts?.['Lost'] || 0,
      pendingDecisions: stats.bucket_counts?.['Pending'] || 0,
      avgScore: stats.total_leads > 0 ? Math.round(((stats.bucket_counts?.['Hot'] || 0) * 90 + (stats.bucket_counts?.['Warm'] || 0) * 60 + (stats.bucket_counts?.['Cold'] || 0) * 30) / stats.total_leads) : 0,
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
        date_to: params.range?.to
    });
    return res.data.map((l: any) => ({
        ...l,
        id: l.leadid.toString(),
        created_at: l.Timestamp,
        scoring: { 
            score: l.sentiment === 'Hot' ? 92 : l.sentiment === 'Warm' ? 68 : 34, 
            bucket: l.sentiment || 'Average', 
            reasons: [] 
        }
    }));
  }

  async getLeadsTrend(range: DateRange, _preset: DatePreset, bucket?: string): Promise<TrendPoint[]> {
    const leads = await this.getLeads({ range, bucket });
    
    // Safety check: Cap daily interval to prevent browser hang on large ranges (like All-time)
    let startDate = safeParseISO(range.from);
    const endDate = safeParseISO(range.to);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 90) {
      // If range is too large, only show the last 90 days in the trend chart
      startDate = subDays(endDate, 89);
    }

    const interval = eachDayOfInterval({ start: startDate, end: endDate });
    return interval.map(day => {
      const dayLeads = leads.filter(l => isSameDay(safeParseISO(l.created_at), day));
      return {
        name: safeFormat(day, 'MMM dd'),
        hot: dayLeads.filter(l => l.sentiment === 'Hot').length,
        warm: dayLeads.filter(l => l.sentiment === 'Warm').length,
        cold: dayLeads.filter(l => l.sentiment === 'Cold').length,
        converted: dayLeads.filter(l => (l.status as any) === 'crm_converted').length,
        from: safeFormat(day, 'yyyy-MM-dd'),
        to: safeFormat(day, 'yyyy-MM-dd')
      };
    });
  }

  async getStageDistribution(range: DateRange, bucket?: string): Promise<StagePoint[]> {
    const stats = await bGet('/metrics', { date_from: range.from, date_to: range.to });
    const colors: Record<string, string> = { 'Hot': '#ef4444', 'Warm': '#f59e0b', 'Cold': '#3b82f6', 'null': '#10b981', 'Average': '#10b981' };
    const distData = stats.stage_counts || {};
    const total = Object.values(distData).reduce((a: any, b: any) => a + b, 0) as number || 1;
    
    return Object.entries(distData)
      .map(([name, value]) => ({
        name: name === 'null' ? 'Average' : name,
        value: Math.round(((value as number) / total) * 100),
        color: colors[name] || '#64748b'
    }));
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
        scoring: { score: 90, bucket: l.sentiment || 'Average', reasons: [] },
        missingCount: 0
    }));
  }

  async getFunnel(range: DateRange, bucket?: string): Promise<FunnelStep[]> {
    const stats = await bGet('/metrics', { date_from: range.from, date_to: range.to });
    const total = stats.total_leads || 1;
    const bCounts = stats.bucket_counts || {};
    return [
        { label: 'Total Intercepts', val: '100%', color: 'bg-teal-500' },
        { label: 'High Intent (Hot)', val: Math.round(((bCounts['Hot'] || 0)/total)*100) + '%', color: 'bg-emerald-500' },
        { label: 'Pending Action', val: Math.round(((bCounts['Pending'] || 0)/total)*100) + '%', color: 'bg-amber-500' },
        { label: 'Converted', val: Math.round(((bCounts['Converted'] || 0)/total)*100) + '%', color: 'bg-rose-500' },
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

  async getVoiceTrend(range: DateRange, _preset: DatePreset): Promise<VoiceTrendPoint[]> {
    const leads = await this.getLeads({ range });

    // Safety check: Cap daily interval
    let startDate = safeParseISO(range.from);
    const endDate = safeParseISO(range.to);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 90) {
      startDate = subDays(endDate, 89);
    }

    const interval = eachDayOfInterval({ start: startDate, end: endDate });
    return interval.map(day => {
        const dayLeads = leads.filter(l => isSameDay(safeParseISO(l.created_at), day));
        return {
          name: safeFormat(day, 'MMM dd'),
          messages: dayLeads.length,
          sessions: dayLeads.length,
          contacts: new Set(dayLeads.map(l => l['Phone Number'])).size,
          from: safeFormat(day, 'yyyy-MM-dd'),
          to: safeFormat(day, 'yyyy-MM-dd')
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
        lastTimestamp: c['Timestamp'],
        status: 'Done'
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
            bucket: res.sentiment || 'Average', 
            reasons: [] 
        }
    };
  }

  async getLeadInsightsSummary(range: DateRange): Promise<LeadInsightsSummary> {
    const leads = await this.getLeads({ range });
    const concernMap: Record<string, number> = {};
    leads.forEach(l => {
        if (l.concern) {
            const c = l.concern.split(' ')[0];
            concernMap[c] = (concernMap[c] || 0) + 1;
        }
    });
    const topConcerns = Object.entries(concernMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8);
    const interval = eachDayOfInterval({ start: safeParseISO(range.from), end: safeParseISO(range.to) });
    const sentimentTrend = interval.map(day => {
        const dayLeads = leads.filter(l => isSameDay(safeParseISO(l.created_at), day));
        return {
            name: safeFormat(day, 'MMM dd'),
            pos: dayLeads.filter(l => l.sentiment === 'Hot').length,
            neu: dayLeads.filter(l => l.sentiment === 'Warm').length,
            neg: dayLeads.filter(l => l.sentiment === 'Cold').length
        };
    });
    return { sentimentTrend, topConcerns, highIntentLeads: leads.filter(l => l.sentiment === 'Hot').slice(0, 10) };
  }

  async getTasks(_range: DateRange): Promise<LeadTask[]> { return []; }
  async createTask(_task: Partial<LeadTask>): Promise<boolean> { return true; }
  async toggleTaskDone(_id: string, _currentStatus: boolean): Promise<boolean> { return true; }
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
}
