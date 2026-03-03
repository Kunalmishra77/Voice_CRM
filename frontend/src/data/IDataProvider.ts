import type { DateRange, DatePreset } from '../utils/dateRange';
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
} from './types';

export interface IDataProvider {
  getDashboardKPIs(range: DateRange): Promise<KPIStats>;
  getLeads(params: FetchLeadsParams): Promise<LeadInsightRow[]>;
  getLeadsTrend(range: DateRange, preset: DatePreset, bucket?: string): Promise<TrendPoint[]>;
  getStageDistribution(range: DateRange, bucket?: string): Promise<StagePoint[]>;
  getTopFollowUps(range: DateRange, bucket?: string): Promise<FollowUpLead[]>;
  getFunnel(range: DateRange, bucket?: string): Promise<FunnelStep[]>;
  getAgentPerformance(range: DateRange): Promise<AgentPerformance[]>;
  getVoicePulse(range: DateRange): Promise<VoicePulse>;
  getVoiceTrend(range: DateRange, preset: DatePreset): Promise<VoiceTrendPoint[]>;
  getSessions(range: DateRange): Promise<ChatSession[]>;
  getConversation(sessionId: string): Promise<ChatMessage[]>;
  getLeadInsightByPhone(phone: string): Promise<LeadInsightRow | null>;
  getLeadInsightsSummary(range: DateRange): Promise<LeadInsightsSummary>;
  getTasks(range: DateRange): Promise<LeadTask[]>;
  createTask(task: Partial<LeadTask>): Promise<boolean>;
  toggleTaskDone(id: string, currentStatus: boolean): Promise<boolean>;
  getReportsData(range: DateRange): Promise<ReportsData>;
  getExportHistory(range: DateRange): Promise<ExportHistoryItem[]>;
  logExportAction(fmt: string, count: number, range: DateRange): Promise<boolean>;
  updateLeadStatus(params: UpdateLeadStatusParams): Promise<UpdateLeadStatusResult>;
  toggleWorkedStatus(leadId: string, phone: string, currentStatus: boolean): Promise<boolean>;
}
