import type { DateRange, DatePreset } from '../../utils/dateRange';
import { mockCalls, mockLeads, mockTranscripts, getLeadsArray, selectors, type LeadProfile } from '../../mock/voiceMock';
import { parseISO, format, isBefore } from 'date-fns';
import type { IDataProvider } from '../IDataProvider';
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

const mapLeadToRow = (l: LeadProfile): LeadInsightRow => {
  return {
    id: l.id,
    created_at: l.last_call,
    'User Name': l.customer_name,
    'Phone Number': l.phone_number,
    concern: l.concern,
    'lead stage': l.status,
    'Conversation Summary': l.summary,
    sentiment: l.sentiment,
    'Action to be taken': l.action_to_take,
    scoring: { score: l.best_score, bucket: l.bucket, reasons: [] },
    status: (l.status === 'Converted' ? 'Converted' : l.status === 'NotInterested' || l.status === 'Closed' ? 'Unconverted' : l.status === 'InProgress' ? 'InProgress' : l.status === 'FollowUpScheduled' ? 'FollowUpScheduled' : 'Pending'),
    worked: l.worked_flag,
    owner: l.owner?.name
  };
};

let exportHistoryMock: ExportHistoryItem[] = [];
let tasksMock: LeadTask[] = [];

export class MockProvider implements IDataProvider {
  async getDashboardKPIs(range: DateRange): Promise<KPIStats> {
    return new Promise(resolve => setTimeout(() => {
      const filteredLeads = selectors.filterByDateRange(getLeadsArray(), range);
      resolve(selectors.computeKPIs(filteredLeads));
    }, 100));
  }

  async getLeads(params: FetchLeadsParams): Promise<LeadInsightRow[]> {
    return new Promise(resolve => setTimeout(() => {
      let leads = selectors.filterByDateRange(getLeadsArray(), params.range);
      
      if (params.search) {
        leads = selectors.searchAcross(leads, params.search);
      }
      if (params.bucket && params.bucket !== 'all') {
        if (['Converted', 'Unconverted', 'Pending'].includes(params.bucket)) {
          leads = leads.filter(l => {
            const st = (l.status === 'Converted' ? 'Converted' : l.status === 'NotInterested' || l.status === 'Closed' ? 'Unconverted' : 'Pending');
            return st === params.bucket;
          });
        } else {
          leads = leads.filter(l => l.bucket.toLowerCase() === params.bucket!.toLowerCase());
        }
      }
      if (params.status && params.status !== 'all') {
        leads = leads.filter(l => {
          if (params.status === 'Converted') return l.status === 'Converted';
          if (params.status === 'Unconverted') return l.status === 'NotInterested' || l.status === 'Closed';
          if (params.status === 'Pending') return !['Converted', 'NotInterested', 'Closed'].includes(l.status);
          return l.status.toLowerCase() === params.status!.toLowerCase();
        });
      }
      if (params.sentiment && params.sentiment !== 'all') {
        leads = leads.filter(l => l.sentiment.toLowerCase() === params.sentiment!.toLowerCase());
      }
      if (params.worked && params.worked !== 'all') {
        leads = leads.filter(l => params.worked === 'yes' ? l.worked_flag : !l.worked_flag);
      }
      
      resolve(leads.map(mapLeadToRow));
    }, 150));
  }

  async getLeadsTrend(range: DateRange, preset: DatePreset, bucketFilter?: string): Promise<TrendPoint[]> {
    return new Promise(resolve => setTimeout(() => {
      let calls = selectors.filterByDateRange(mockCalls, range);
      if (bucketFilter && bucketFilter !== 'all') {
        calls = calls.filter(c => c.lead_stage_bucket.toLowerCase() === bucketFilter.toLowerCase());
      }
      resolve(selectors.computeTrends(calls, preset));
    }, 100));
  }

  async getStageDistribution(range: DateRange, bucketFilter?: string): Promise<StagePoint[]> {
    return new Promise(resolve => setTimeout(() => {
      let leads = selectors.filterByDateRange(getLeadsArray(), range);
      if (bucketFilter && bucketFilter !== 'all') {
        leads = leads.filter(l => l.bucket.toLowerCase() === bucketFilter.toLowerCase());
      }
      resolve(selectors.computeStageSplit(leads));
    }, 100));
  }

  async getTopFollowUps(range: DateRange, bucketFilter?: string): Promise<FollowUpLead[]> {
    return new Promise(resolve => setTimeout(() => {
      let leads = selectors.filterByDateRange(getLeadsArray(), range);
      if (bucketFilter && bucketFilter !== 'all') {
        leads = leads.filter(l => l.bucket.toLowerCase() === bucketFilter.toLowerCase());
      }
      const top = selectors.priorityQueue(leads);
      resolve(top.map(l => ({
        id: l.id,
        name: l.customer_name,
        phone: l.phone_number,
        time: format(parseISO(l.last_call), 'hh:mm a'),
        status: l.bucket,
        score: l.best_score,
        scoring: { score: l.best_score, bucket: l.bucket, reasons: [] },
        missingCount: 0
      })));
    }, 100));
  }

  async getFunnel(range: DateRange, bucketFilter?: string): Promise<FunnelStep[]> {
    return new Promise(resolve => setTimeout(() => {
      let leads = selectors.filterByDateRange(getLeadsArray(), range);
      if (bucketFilter && bucketFilter !== 'all') {
        leads = leads.filter(l => l.bucket.toLowerCase() === bucketFilter.toLowerCase());
      }
      const total = leads.length || 1;
      const converted = leads.filter(l => l.status === 'Converted').length;
      const progress = leads.filter(l => ['InProgress', 'FollowUpScheduled', 'Converted'].includes(l.status)).length;
      const followup = leads.filter(l => l.status === 'FollowUpScheduled').length;

      resolve([
        { label: 'New', val: '100%', color: 'bg-teal-500' },
        { label: 'Progress', val: `${Math.round((progress / total) * 100)}%`, color: 'bg-emerald-500' },
        { label: 'Followup', val: `${Math.round((followup / total) * 100)}%`, color: 'bg-amber-500' },
        { label: 'Converted', val: `${Math.round((converted / total) * 100)}%`, color: 'bg-rose-500' },
      ]);
    }, 100));
  }

  async getAgentPerformance(range: DateRange): Promise<AgentPerformance[]> {
    return new Promise(resolve => setTimeout(() => {
      const leads = selectors.filterByDateRange(getLeadsArray(), range);
      resolve(selectors.computeAgentPerformance(leads));
    }, 100));
  }

  async getVoicePulse(range: DateRange): Promise<VoicePulse> {
    return new Promise(resolve => setTimeout(() => {
      const calls = selectors.filterByDateRange(mockCalls, range);
      const incomingChats = calls.length;
      const activeSessions = new Set(calls.filter(c => c.status === 'active').map(c => c.call_id)).size;
      const newContacts = new Set(calls.map(c => c.phone_number)).size;
      const preInsightSessions = calls.filter(c => c.status === 'active').length;
      const insightReadySessions = calls.filter(c => c.status === 'ended').length;

      resolve({
        incomingChats,
        activeSessions,
        newContacts,
        preInsightSessions,
        insightReadySessions,
        lastUpdatedAt: new Date().toISOString()
      });
    }, 100));
  }

  async getVoiceTrend(range: DateRange, preset: DatePreset): Promise<VoiceTrendPoint[]> {
    return new Promise(resolve => setTimeout(() => {
      const calls = selectors.filterByDateRange(mockCalls, range);
      const map = new Map<string, any>();
      calls.forEach(c => {
        const d = c.started_at.split('T')[0];
        if (!map.has(d)) {
          map.set(d, { name: format(parseISO(d), 'MMM dd'), messages: 0, sessions: 0, contacts: new Set(), from: d, to: d, sessionSet: new Set() });
        }
        const entry = map.get(d);
        entry.messages += (mockTranscripts[c.call_id]?.length || 0);
        entry.sessionSet.add(c.call_id);
        entry.contacts.add(c.phone_number);
        entry.sessions = entry.sessionSet.size;
      });
      const res = Array.from(map.values()).map(v => ({...v, contacts: v.contacts.size})).sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime());
      resolve(res);
    }, 100));
  }

  async getSessions(range: DateRange): Promise<ChatSession[]> {
    return new Promise(resolve => setTimeout(() => {
      const calls = selectors.filterByDateRange(mockCalls, range);
      const sessions = calls.map(c => {
        const tr = mockTranscripts[c.call_id];
        const lastMsg = tr && tr.length > 0 ? tr[tr.length - 1].text : 'Connecting...';
        return {
          sessionId: c.call_id,
          phone: c.phone_number,
          name: c.customer_name,
          lastMessage: lastMsg,
          lastTimestamp: c.last_activity_at,
          status: c.status === 'active' ? 'NA' : 'Done' as 'NA'|'Done'
        };
      });
      resolve(sessions);
    }, 100));
  }

  async getConversation(sessionId: string): Promise<ChatMessage[]> {
    return new Promise(resolve => setTimeout(() => {
      const segments = mockTranscripts[sessionId] || [];
      const msgs = segments.map(s => ({
        id: s.id,
        timestamp: s.ts,
        user_msg: s.speaker === 'customer' ? s.text : '',
        bot_msg: s.speaker !== 'customer' ? s.text : '',
        stage: 'Active'
      }));
      resolve(msgs);
    }, 100));
  }

  async getLeadInsightByPhone(phone: string): Promise<LeadInsightRow | null> {
    return new Promise(resolve => setTimeout(() => {
      const l = mockLeads[phone];
      if (!l) resolve(null);
      else resolve(mapLeadToRow(l));
    }, 100));
  }

  async getLeadInsightsSummary(range: DateRange): Promise<LeadInsightsSummary> {
    return new Promise(resolve => setTimeout(() => {
      const leads = selectors.filterByDateRange(getLeadsArray(), range);
      
      const map = new Map<string, any>();
      leads.forEach(l => {
        const d = l.last_call.split('T')[0];
        if (!map.has(d)) map.set(d, { name: format(parseISO(d), 'MMM dd'), pos: 0, neu: 0, neg: 0 });
        const entry = map.get(d);
        if (l.sentiment === 'Positive') entry.pos++;
        else if (l.sentiment === 'Negative') entry.neg++;
        else entry.neu++;
      });
      const sentimentTrend = Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
      
      const concernsMap = new Map<string, number>();
      leads.forEach(l => {
        concernsMap.set(l.concern, (concernsMap.get(l.concern) || 0) + 1);
      });
      const topConcerns = Array.from(concernsMap.entries()).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 10);

      const highIntentLeads = leads.filter(l => l.bucket === 'Hot' || l.best_score > 80).sort((a,b) => b.best_score - a.best_score).slice(0, 10).map(mapLeadToRow);

      resolve({ sentimentTrend, topConcerns, highIntentLeads });
    }, 100));
  }

  async getTasks(_range: DateRange): Promise<LeadTask[]> {
    return new Promise(resolve => setTimeout(() => {
      if (tasksMock.length === 0) {
        const hot = getLeadsArray().filter(l => l.bucket === 'Hot').slice(0, 5);
        tasksMock = hot.map((l, i) => ({
          id: `task_${i}`,
          phone_number: l.phone_number,
          due_at: new Date(Date.now() + 86400000 * i).toISOString(),
          task_type: 'Follow-up Call',
          notes: `Follow up on ${l.concern}`,
          created_by: 'System',
          done: false,
          created_at: new Date().toISOString(),
          lead_name: l.customer_name
        }));
      }
      resolve(tasksMock);
    }, 100));
  }

  async createTask(task: Partial<LeadTask>): Promise<boolean> {
    return new Promise(resolve => setTimeout(() => {
      tasksMock.push({
        id: `task_${Date.now()}`,
        phone_number: task.phone_number || '',
        due_at: task.due_at || new Date().toISOString(),
        task_type: task.task_type || 'Other',
        notes: task.notes || '',
        created_by: task.created_by || 'Agent',
        done: false,
        created_at: new Date().toISOString(),
        lead_name: task.lead_name || 'Unknown'
      });
      resolve(true);
    }, 100));
  }

  async toggleTaskDone(id: string, currentStatus: boolean): Promise<boolean> {
    return new Promise(resolve => setTimeout(() => {
      const t = tasksMock.find(x => x.id === id);
      if (t) t.done = !currentStatus;
      resolve(true);
    }, 100));
  }

  async getReportsData(range: DateRange): Promise<ReportsData> {
    return new Promise(resolve => setTimeout(() => {
      const leads = selectors.filterByDateRange(getLeadsArray(), range);
      const total = leads.length || 1;
      const converted = leads.filter(l => l.status === 'Converted').length;
      const lost = leads.filter(l => l.status === 'NotInterested' || l.status === 'Closed').length;

      const conversionRatio = [
        { name: 'Converted', value: converted },
        { name: 'Lost', value: lost },
        { name: 'In Pipeline', value: total - converted - lost }
      ];

      const sentimentSplit = [
        { name: 'Positive', value: leads.filter(l => l.sentiment === 'Positive').length, color: '#10b981' },
        { name: 'Neutral', value: leads.filter(l => l.sentiment === 'Neutral').length, color: '#71717a' },
        { name: 'Negative', value: leads.filter(l => l.sentiment === 'Negative').length, color: '#f43f5e' }
      ];

      const engagementMetrics = [
        { label: 'Total Messages', value: '14.2k', delta: '+12%', isUp: true },
        { label: 'Avg Resp Time', value: '14m', delta: '-2m', isUp: true },
        { label: 'Agent Handover', value: '84%', delta: '+5%', isUp: true },
        { label: 'Lead Velocity', value: '2.4/day', delta: '+0.2', isUp: true },
      ];

      const performanceTrend = [
        { name: 'Week 1', leads: 120, conversions: 12 },
        { name: 'Week 2', leads: 150, conversions: 18 },
        { name: 'Week 3', leads: 180, conversions: 24 },
        { name: 'Week 4', leads: 160, conversions: 22 }
      ];

      resolve({ conversionRatio, sentimentSplit, engagementMetrics, performanceTrend });
    }, 100));
  }

  async getExportHistory(range: DateRange): Promise<ExportHistoryItem[]> {
    return new Promise(resolve => setTimeout(() => {
      resolve(exportHistoryMock);
    }, 100));
  }

  async logExportAction(fmt: string, count: number, range: DateRange): Promise<boolean> {
    return new Promise(resolve => setTimeout(() => {
      exportHistoryMock.unshift({
        id: `exp_${Date.now()}`,
        created_at: new Date().toISOString(),
        action_type: 'LEAD_EXPORT',
        actor_id: 'Agent',
        payload: { format: fmt, count }
      });
      resolve(true);
    }, 100));
  }

  async updateLeadStatus(params: UpdateLeadStatusParams): Promise<UpdateLeadStatusResult> {
    return new Promise(resolve => setTimeout(() => {
      const p = mockLeads[params.lead['Phone Number']];
      if (p) {
        p.status = params.status;
        p.worked_flag = true;
      }
      resolve({ success: true });
    }, 300));
  }

  async toggleWorkedStatus(leadId: string, phone: string, currentStatus: boolean): Promise<boolean> {
    return new Promise(resolve => setTimeout(() => {
      if (mockLeads[phone]) {
        mockLeads[phone].worked_flag = !currentStatus;
      }
      resolve(true);
    }, 200));
  }
}
