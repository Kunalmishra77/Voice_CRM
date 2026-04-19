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
  Employee,
  ReportsData,
  ExportHistoryItem,
  FetchLeadsParams,
  UpdateLeadStatusParams,
  UpdateLeadStatusResult,
  LiveCallActivity,
  LeadOutcome
} from './types';

export interface IDataProvider {
  getDashboardKPIs(range: DateRange, leadType?: string): Promise<KPIStats>;
  getLeads(params: FetchLeadsParams): Promise<LeadInsightRow[]>;
  getLeadsTrend(range: DateRange, preset: DatePreset, bucket?: string, leadType?: string): Promise<TrendPoint[]>;
  getStageDistribution(range: DateRange, bucket?: string, leadType?: string): Promise<StagePoint[]>;
  getTopFollowUps(range: DateRange, bucket?: string): Promise<FollowUpLead[]>;
  getFunnel(range: DateRange, bucket?: string, leadType?: string): Promise<FunnelStep[]>;
  getAgentPerformance(range: DateRange): Promise<AgentPerformance[]>;
  getVoicePulse(range: DateRange): Promise<VoicePulse>;
  getVoiceTrend(range: DateRange, preset: DatePreset, leadType?: string): Promise<VoiceTrendPoint[]>;
  getSessions(range: DateRange): Promise<ChatSession[]>;
  getConversation(sessionId: string): Promise<ChatMessage[]>;
  getLeadInsightByPhone(phone: string): Promise<LeadInsightRow | null>;
  getLeadInsightsSummary(range: DateRange, leadType?: string): Promise<LeadInsightsSummary>;
  getTasks(range: DateRange, filters?: Record<string, any>): Promise<LeadTask[]>;
  createTask(task: Partial<LeadTask>): Promise<boolean>;
  createBulkTasks(tasks: Partial<LeadTask>[]): Promise<{ success: boolean; created: number }>;
  updateTaskById(id: string, updates: Partial<LeadTask>): Promise<boolean>;
  deleteTaskById(id: string): Promise<boolean>;
  toggleTaskDone(id: string, currentStatus: boolean): Promise<boolean>;
  getEmployees(): Promise<Employee[]>;
  getTaskStats(filters?: Record<string, any>): Promise<any>;
  getReportsData(range: DateRange): Promise<ReportsData>;
  getExportHistory(range: DateRange): Promise<ExportHistoryItem[]>;
  logExportAction(fmt: string, count: number, range: DateRange): Promise<boolean>;
  updateLeadStatus(params: UpdateLeadStatusParams): Promise<UpdateLeadStatusResult>;
  toggleWorkedStatus(leadId: string, phone: string, currentStatus: boolean): Promise<boolean>;
  getLiveCallActivity(): Promise<LiveCallActivity>;
  getOutcomes(filters?: Record<string, any>): Promise<LeadOutcome[]>;
  getOutcomesTrend(filters?: Record<string, any>): Promise<any[]>;
  updateOutcome(id: string, updates: { reason?: string; note?: string }): Promise<boolean>;
  deleteOutcome(id: string): Promise<boolean>;
}
