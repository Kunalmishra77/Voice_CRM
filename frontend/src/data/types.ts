import type { DateRange, DatePreset } from '../utils/dateRange';

export interface KPIStats {
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  avgLeads: number;
  converted: number;
  unconverted: number;
  pendingDecisions: number;
  avgScore: number;
  bucketCounts?: Record<string, number>;
}

export interface ScoringResult {
  score: number;
  bucket: 'Hot' | 'Warm' | 'Average' | 'Cold';
  reasons: string[];
}

export interface LeadInsightRow {
  id: string;
  created_at: string;
  'User Name': string;
  'Phone Number': string;
  concern: string;
  'lead stage': string;
  'Conversation Summary': string;
  sentiment: string;
  'Action to be taken': string;
  scoring: ScoringResult;
  status?: 'Converted' | 'Unconverted' | 'Pending' | 'InProgress' | 'FollowUpScheduled';
  worked?: boolean;
  owner?: string;
}

export interface TrendPoint {
  name: string;
  hot: number;
  warm: number;
  cold: number;
  converted: number;
  from: string;
  to: string;
}

export interface StagePoint {
  name: string;
  value: number;
  color: string;
}

export interface FollowUpLead {
  id: string;
  name: string;
  phone: string;
  time: string;
  status: string;
  score: number;
  scoring: ScoringResult;
  missingCount: number;
}

export interface VoicePulse {
  incomingChats: number;
  activeSessions: number;
  newContacts: number;
  preInsightSessions: number;
  insightReadySessions: number;
  lastUpdatedAt?: string;
}

export interface VoiceTrendPoint {
  name: string;
  messages: number;
  sessions: number;
  contacts: number;
  from: string;
  to: string;
}

export interface ChatMessage {
  id: string;
  timestamp: string;
  user_msg: string;
  bot_msg: string;
  stage: string;
}

export interface ChatSession {
  sessionId: string;
  phone: string;
  name: string;
  lastMessage: string;
  lastTimestamp: string;
  status: 'NA' | 'Done';
  leadId?: string;
}

export interface LeadInsightsSummary {
  sentimentTrend: { name: string; pos: number; neu: number; neg: number }[];
  topConcerns: { name: string; count: number }[];
  highIntentLeads: LeadInsightRow[];
}

export interface LeadTask {
  id: string;
  lead_insights_id?: number | null;
  phone_number: string;
  due_at: string;
  task_type: string;
  notes: string;
  created_by: string;
  done: boolean;
  done_at?: string;
  created_at: string;
  lead_name?: string;
}

export interface ReportsData {
  conversionRatio: { name: string; value: number }[];
  sentimentSplit: { name: string; value: number; color: string }[];
  engagementMetrics: { label: string; value: string; delta: string; isUp: boolean }[];
  performanceTrend: { name: string; leads: number; conversions: number }[];
}

export interface ExportHistoryItem {
  id: string;
  created_at: string;
  action_type: string;
  actor_id: string;
  payload: any;
}

export interface FetchLeadsParams {
  range: DateRange;
  bucket?: string;
  status?: string;
  search?: string;
  sentiment?: string;
  limit?: number;
  worked?: 'yes' | 'no' | 'all';
  agent?: string | null;
  stage?: string | null;
}

export interface UpdateLeadStatusParams {
  lead: LeadInsightRow;
  status: 'Converted' | 'NotInterested' | 'Closed';
  reason: string;
  note: string;
  range: DateRange & { preset: DatePreset };
}

export interface UpdateLeadStatusResult {
  success: boolean;
  message?: string;
}

export interface FunnelStep {
  label: string;
  val: string;
  color: string;
}

export interface AgentPerformance {
  name: string;
  leads: number;
  conv: string;
  color: string;
}
