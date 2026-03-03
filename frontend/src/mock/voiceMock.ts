import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';

// --- Deterministic RNG ---
class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
  boolean(chance: number = 0.5): boolean {
    return this.next() < chance;
  }
}

const rng = new SeededRandom(12345);

// --- Types ---
export type VoiceCall = {
  call_id: string;
  phone_number: string;
  customer_name: string;
  started_at: string;
  ended_at: string | null;
  duration_sec: number;
  status: 'active' | 'ended' | 'missed' | 'failed';
  agent: { id: string; name: string } | null;
  stage: 'New' | 'InProgress' | 'FollowUpScheduled' | 'Converted' | 'NotInterested' | 'Closed';
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  lead_stage_bucket: 'Hot' | 'Warm' | 'Average' | 'Cold';
  lead_score: number;
  concern: string;
  outcome: 'Converted' | 'Unconverted' | 'Pending';
  outcome_reason: string | null;
  recording_url: string | null;
  last_activity_at: string;
};

export type TranscriptSegment = {
  id: string;
  ts: string;
  speaker: 'customer' | 'agent' | 'bot';
  text: string;
  confidence: number;
};

export type CallInsight = {
  call_id: string;
  summary: string;
  action_to_take: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  missing_info: string[];
};

export type LeadProfile = {
  id: string;
  phone_number: string;
  customer_name: string;
  calls: VoiceCall[];
  last_call: string;
  avg_score: number;
  best_score: number;
  status: VoiceCall['stage'];
  owner: { id: string; name: string } | null;
  worked_flag: boolean;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  bucket: 'Hot' | 'Warm' | 'Average' | 'Cold';
  concern: string;
  action_to_take: string;
  summary: string;
};

// --- Data Generation ---
const firstNames = ['Aarav', 'Vihaan', 'Aditya', 'Sai', 'Arjun', 'Siddharth', 'Rohan', 'Krishna', 'Ishaan', 'Shaurya', 'Diya', 'Sanya', 'Priya', 'Kavya', 'Ananya', 'Neha', 'Riya', 'Anjali', 'Sneha', 'Tara'];
const lastNames = ['Sharma', 'Verma', 'Gupta', 'Malhotra', 'Singh', 'Patel', 'Rao', 'Das', 'Kumar', 'Joshi'];
const agents = [
  { id: 'a1', name: 'Rahul S.' },
  { id: 'a2', name: 'Sanya M.' },
  { id: 'a3', name: 'Arjun K.' },
  { id: 'a4', name: 'Priya T.' }
];

const concerns = ['Pricing too high', 'Wants a demo', 'Needs integration features', 'Security compliance', 'Looking for specific ROI', 'Competitor comparison', 'Implementation timeline'];
const stages = ['New', 'InProgress', 'FollowUpScheduled', 'Converted', 'NotInterested', 'Closed'];

export const mockCalls: VoiceCall[] = [];
export const mockTranscripts: Record<string, TranscriptSegment[]> = {};
export const mockInsights: Record<string, CallInsight> = {};

const TODAY = new Date('2026-03-03T12:00:00Z'); // Fixed anchor for deterministic dates if needed, or just today. Let's use anchor.

// generate specific pool of phones
const phones = Array.from({ length: 80 }).map(() => `+9198${rng.int(10000000, 99999999)}`);

for (let i = 0; i < 200; i++) {
  const daysAgo = rng.int(0, 90);
  const hour = rng.int(8, 20);
  const minute = rng.int(0, 59);
  
  const startedAtDate = new Date(TODAY);
  startedAtDate.setDate(startedAtDate.getDate() - daysAgo);
  startedAtDate.setHours(hour, minute, 0, 0);

  const durationSec = rng.int(30, 900); // 30s to 15m
  const endedAtDate = new Date(startedAtDate.getTime() + durationSec * 1000);
  
  const isActive = daysAgo === 0 && rng.boolean(0.05); 

  const call_id = `call_${10000 + i}`;
  const phone_number = rng.pick(phones); // Re-use phones to build leads
  const customer_name = `${rng.pick(firstNames)} ${rng.pick(lastNames)}`;
  
  const score = rng.int(10, 98);
  let bucket: 'Hot' | 'Warm' | 'Average' | 'Cold' = 'Average';
  if (score > 80) bucket = 'Hot';
  else if (score > 60) bucket = 'Warm';
  else if (score < 30) bucket = 'Cold';

  const status = (isActive ? 'active' : rng.pick(['ended', 'ended', 'ended', 'missed', 'failed'])) as 'active' | 'ended' | 'missed' | 'failed';
  const agent = rng.boolean(0.8) ? rng.pick(agents) : null;
  const stage = ((status === 'missed' || status === 'failed') ? 'New' : rng.pick(stages as any)) as 'New' | 'InProgress' | 'FollowUpScheduled' | 'Converted' | 'NotInterested' | 'Closed';
  
  let outcome: 'Converted' | 'Unconverted' | 'Pending' = 'Pending';
  if (stage === 'Converted') outcome = 'Converted';
  else if (stage === 'NotInterested' || stage === 'Closed') outcome = 'Unconverted';
  else if (rng.boolean(0.2)) outcome = rng.pick(['Converted', 'Unconverted']) as 'Converted' | 'Unconverted';

  const sentiment = rng.pick(['Positive', 'Neutral', 'Negative'] as any) as 'Positive' | 'Neutral' | 'Negative';
  const concern = rng.pick(concerns);
  
  const call: VoiceCall = {
    call_id,
    phone_number,
    customer_name,
    started_at: startedAtDate.toISOString(),
    ended_at: isActive ? null : endedAtDate.toISOString(),
    duration_sec: durationSec,
    status,
    agent,
    stage,
    sentiment,
    lead_stage_bucket: bucket,
    lead_score: score,
    concern,
    outcome,
    outcome_reason: outcome === 'Unconverted' ? rng.pick(['Too expensive', 'No response', 'Chose competitor']) : null,
    recording_url: status === 'ended' ? `https://storage.voicecrm.local/rec/${call_id}.mp3` : null,
    last_activity_at: (isActive ? startedAtDate : endedAtDate).toISOString(),
  };

  mockCalls.push(call);

  // Transcripts
  const segments: TranscriptSegment[] = [];
  const numSegments = rng.int(15, 60);
  let currentTs = startedAtDate.getTime();
  
  for (let j = 0; j < numSegments; j++) {
    currentTs += rng.int(2000, 15000); // 2-15s between messages
    segments.push({
      id: `msg_${call_id}_${j}`,
      ts: new Date(currentTs).toISOString(),
      speaker: rng.pick(['customer', 'bot', 'agent', 'bot', 'customer']),
      text: `Mock transcript message ${j+1} for ${call_id}`,
      confidence: rng.range(0.8, 0.99)
    });
  }
  mockTranscripts[call_id] = segments;

  // Insights
  if (status === 'ended') {
    mockInsights[call_id] = {
      call_id,
      summary: `Customer discussed ${concern.toLowerCase()} and ended with a ${sentiment.toLowerCase()} sentiment.`,
      action_to_take: stage === 'Converted' ? 'Send onboarding email' : rng.pick(['Follow up tomorrow', 'Send pricing PDF', 'Schedule demo']),
      sentiment,
      missing_info: rng.boolean(0.3) ? [rng.pick(['Location', 'Capacity', 'Budget'])] : []
    };
  }
}

mockCalls.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

// --- Derived Leads ---
export const mockLeads: Record<string, LeadProfile> = {};

mockCalls.forEach(call => {
  if (!mockLeads[call.phone_number]) {
    mockLeads[call.phone_number] = {
      id: `lead_${call.phone_number.replace('+', '')}`,
      phone_number: call.phone_number,
      customer_name: call.customer_name,
      calls: [],
      last_call: call.started_at,
      avg_score: 0,
      best_score: 0,
      status: call.stage,
      owner: call.agent,
      worked_flag: rng.boolean(0.4),
      sentiment: call.sentiment,
      bucket: call.lead_stage_bucket,
      concern: call.concern,
      action_to_take: mockInsights[call.call_id]?.action_to_take || 'Follow up',
      summary: mockInsights[call.call_id]?.summary || 'No summary available'
    };
  }
  const lead = mockLeads[call.phone_number];
  lead.calls.push(call);
  
  if (new Date(call.started_at) > new Date(lead.last_call)) {
    lead.last_call = call.started_at;
    lead.status = call.stage;
    if (call.agent) lead.owner = call.agent;
    lead.sentiment = call.sentiment;
    lead.bucket = call.lead_stage_bucket;
    lead.concern = call.concern;
    lead.action_to_take = mockInsights[call.call_id]?.action_to_take || lead.action_to_take;
    lead.summary = mockInsights[call.call_id]?.summary || lead.summary;
  }
  if (call.lead_score > lead.best_score) {
    lead.best_score = call.lead_score;
  }
});

Object.values(mockLeads).forEach(lead => {
  const totalScore = lead.calls.reduce((sum, c) => sum + c.lead_score, 0);
  lead.avg_score = Math.round(totalScore / lead.calls.length);
});

export const getLeadsArray = () => Object.values(mockLeads).sort((a, b) => new Date(b.last_call).getTime() - new Date(a.last_call).getTime());

// --- Selectors ---
export const selectors = {
  filterByDateRange: <T extends { started_at?: string; last_call?: string; timestamp?: string }>(data: T[], range: { from: string; to: string }): T[] => {
    const fromTime = startOfDay(parseISO(range.from)).getTime();
    const toTime = endOfDay(parseISO(range.to)).getTime();
    
    return data.filter(item => {
      const dateStr = item.started_at || item.last_call || item.timestamp;
      if (!dateStr) return true;
      const t = parseISO(dateStr).getTime();
      return t >= fromTime && t <= toTime;
    });
  },

  searchAcross: <T extends { customer_name?: string; phone_number?: string; concern?: string }>(data: T[], query: string): T[] => {
    if (!query || query.trim() === '') return data;
    const lowerQ = query.toLowerCase();
    return data.filter(item => {
      return (
        (item.customer_name && item.customer_name.toLowerCase().includes(lowerQ)) ||
        (item.phone_number && item.phone_number.includes(lowerQ)) ||
        (item.concern && item.concern.toLowerCase().includes(lowerQ))
      );
    });
  },

  computeKPIs: (leads: LeadProfile[]) => {
    const totalLeads = leads.length;
    const hotLeads = leads.filter(l => l.bucket === 'Hot').length;
    const warmLeads = leads.filter(l => l.bucket === 'Warm').length;
    const coldLeads = leads.filter(l => l.bucket === 'Cold').length;
    const avgLeads = leads.filter(l => l.bucket === 'Average').length;
    
    const converted = leads.filter(l => l.status === 'Converted').length;
    const unconverted = leads.filter(l => l.status === 'NotInterested' || l.status === 'Closed').length;
    const pendingDecisions = totalLeads - converted - unconverted;

    const avgScore = totalLeads > 0 ? Math.round(leads.reduce((acc, l) => acc + l.avg_score, 0) / totalLeads) : 0;

    return { totalLeads, hotLeads, warmLeads, coldLeads, avgLeads, converted, unconverted, pendingDecisions, avgScore };
  },

  computeTrends: (calls: VoiceCall[], preset: string) => {
    const map = new Map<string, any>();
    calls.forEach(c => {
      const d = c.started_at.split('T')[0];
      if (!map.has(d)) {
        map.set(d, { name: format(parseISO(d), 'MMM dd'), hot: 0, warm: 0, cold: 0, converted: 0, from: d, to: d });
      }
      const entry = map.get(d);
      if (c.lead_stage_bucket === 'Hot') entry.hot++;
      else if (c.lead_stage_bucket === 'Warm') entry.warm++;
      else if (c.lead_stage_bucket === 'Cold') entry.cold++;
      if (c.status === 'ended' && c.stage === 'Converted') entry.converted++;
    });
    return Array.from(map.values()).sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime());
  },

  computeStageSplit: (leads: LeadProfile[]) => {
    const total = leads.length || 1;
    const buckets = ['Hot', 'Warm', 'Average', 'Cold'] as const;
    return buckets.map(b => {
      const count = leads.filter(l => l.bucket === b).length;
      return {
        name: b,
        value: Math.round((count / total) * 100),
        color: b === 'Hot' ? '#f43f5e' : b === 'Warm' ? '#f59e0b' : b === 'Average' ? '#10b981' : '#0ea5e9'
      };
    });
  },

  computeAgentPerformance: (leads: LeadProfile[]) => {
    const agentMap = new Map<string, { leads: number; converted: number }>();
    leads.filter(l => l.owner).forEach(l => {
      const name = l.owner!.name;
      if (!agentMap.has(name)) agentMap.set(name, { leads: 0, converted: 0 });
      const stats = agentMap.get(name)!;
      stats.leads++;
      if (l.status === 'Converted') stats.converted++;
    });
    return Array.from(agentMap.entries()).map(([name, stats]) => ({
      name,
      leads: stats.leads,
      conv: stats.leads > 0 ? `${Math.round((stats.converted / stats.leads) * 100)}%` : '0%',
      color: stats.converted / stats.leads > 0.1 ? 'bg-teal-500' : 'bg-blue-500'
    })).sort((a, b) => b.leads - a.leads).slice(0, 5);
  },

  priorityQueue: (leads: LeadProfile[]) => {
    return leads
      .filter(l => !l.worked_flag && !['Converted', 'Closed', 'NotInterested'].includes(l.status))
      .sort((a, b) => {
        if (b.best_score !== a.best_score) return b.best_score - a.best_score;
        return new Date(b.last_call).getTime() - new Date(a.last_call).getTime();
      })
      .slice(0, 10);
  }
};
