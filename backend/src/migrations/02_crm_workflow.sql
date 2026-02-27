-- Migration: CRM Lead Workflow & Metrics
-- Creates tables for lead states, comments, and computed metrics.

-- 1. Lead State (Status & Worked Flag)
CREATE TABLE IF NOT EXISTS public.crm_lead_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'InProgress', 'FollowUpScheduled', 'Converted', 'NotInterested', 'Closed')),
    worked_flag BOOLEAN NOT NULL DEFAULT false,
    worked_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_lead_state_phone ON public.crm_lead_state(phone);
CREATE INDEX IF NOT EXISTS idx_crm_lead_state_status ON public.crm_lead_state(status);
CREATE INDEX IF NOT EXISTS idx_crm_lead_state_worked ON public.crm_lead_state(worked_flag);

-- 2. Lead Comments
CREATE TABLE IF NOT EXISTS public.lead_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    created_by TEXT DEFAULT 'Agent',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_comments_phone ON public.lead_comments(phone);
CREATE INDEX IF NOT EXISTS idx_lead_comments_created_at ON public.lead_comments(created_at DESC);

-- 3. Lead Metrics (Computed Rules)
CREATE TABLE IF NOT EXISTS public.lead_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL UNIQUE,
    lead_score INT DEFAULT 0,
    score_reasons JSONB DEFAULT '[]'::jsonb,
    missing_state BOOLEAN DEFAULT true,
    missing_district BOOLEAN DEFAULT true,
    missing_capacity_tph BOOLEAN DEFAULT true,
    computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_metrics_phone ON public.lead_metrics(phone);
CREATE INDEX IF NOT EXISTS idx_lead_metrics_score ON public.lead_metrics(lead_score DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.crm_lead_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_metrics ENABLE ROW LEVEL SECURITY;

-- Anonymous Access Policies (for development via anon key)
-- In production, restrict to authenticated users.

-- CRM Lead State Policies
CREATE POLICY "Allow anon select on crm_lead_state" ON public.crm_lead_state FOR SELECT USING (true);
CREATE POLICY "Allow anon insert on crm_lead_state" ON public.crm_lead_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update on crm_lead_state" ON public.crm_lead_state FOR UPDATE USING (true);

-- Lead Comments Policies
CREATE POLICY "Allow anon select on lead_comments" ON public.lead_comments FOR SELECT USING (true);
CREATE POLICY "Allow anon insert on lead_comments" ON public.lead_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update on lead_comments" ON public.lead_comments FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete on lead_comments" ON public.lead_comments FOR DELETE USING (true);

-- Lead Metrics Policies
CREATE POLICY "Allow anon select on lead_metrics" ON public.lead_metrics FOR SELECT USING (true);
CREATE POLICY "Allow anon insert on lead_metrics" ON public.lead_metrics FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update on lead_metrics" ON public.lead_metrics FOR UPDATE USING (true);
