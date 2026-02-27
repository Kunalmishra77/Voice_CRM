-- 1. Lead Session Map
CREATE TABLE IF NOT EXISTS public.lead_session_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_insights_id BIGINT,
    phone_number TEXT NOT NULL,
    session_id TEXT NOT NULL,
    batch_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lead_insights_id, session_id)
);
CREATE INDEX idx_lsm_phone ON public.lead_session_map(phone_number);
CREATE INDEX idx_lsm_session ON public.lead_session_map(session_id);

-- 2. CRM Lead State (Workflow)
CREATE TABLE IF NOT EXISTS public.crm_lead_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_insights_id BIGINT UNIQUE,
    phone_number TEXT NOT NULL,
    status_enum TEXT DEFAULT 'New' CHECK (status_enum IN ('New', 'InProgress', 'FollowUpScheduled', 'Converted', 'NotInterested', 'Closed')),
    worked_flag BOOLEAN DEFAULT false,
    worked_at TIMESTAMPTZ,
    owner_user_id TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(phone_number)
);
CREATE INDEX idx_cls_status ON public.crm_lead_state(status_enum);
CREATE INDEX idx_cls_worked ON public.crm_lead_state(worked_flag);

-- 3. Lead Comments
CREATE TABLE IF NOT EXISTS public.lead_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_insights_id BIGINT,
    phone_number TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    created_by TEXT DEFAULT 'System',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_lc_phone ON public.lead_comments(phone_number, created_at DESC);

-- 4. Lead Tasks
CREATE TABLE IF NOT EXISTS public.lead_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_insights_id BIGINT,
    phone_number TEXT NOT NULL,
    due_at TIMESTAMPTZ NOT NULL,
    task_type TEXT NOT NULL,
    notes TEXT,
    created_by TEXT,
    done BOOLEAN DEFAULT false,
    done_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_lt_due ON public.lead_tasks(due_at) WHERE done = false;

-- 5. Lead Extracted Fields
CREATE TABLE IF NOT EXISTS public.lead_extracted_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_insights_id BIGINT UNIQUE,
    phone_number TEXT NOT NULL UNIQUE,
    state_value TEXT,
    state_confidence FLOAT,
    district_value TEXT,
    district_confidence FLOAT,
    capacity_tph_value TEXT,
    capacity_confidence FLOAT,
    product_interest_value TEXT,
    product_interest_confidence FLOAT,
    urgency_value TEXT,
    urgency_confidence FLOAT,
    missing_state BOOLEAN DEFAULT true,
    missing_district BOOLEAN DEFAULT true,
    missing_capacity_tph BOOLEAN DEFAULT true,
    extracted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Lead Scoring
CREATE TABLE IF NOT EXISTS public.lead_scoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_insights_id BIGINT UNIQUE,
    phone_number TEXT NOT NULL UNIQUE,
    score_0_100 INT DEFAULT 0,
    stage_label TEXT,
    reason_codes JSONB DEFAULT '[]'::jsonb,
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    scoring_version TEXT DEFAULT '1.0'
);
CREATE INDEX idx_ls_score ON public.lead_scoring(score_0_100 DESC);

-- 7. Suggested Replies
CREATE TABLE IF NOT EXISTS public.suggested_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_insights_id BIGINT,
    phone_number TEXT NOT NULL,
    variant TEXT NOT NULL,
    message_text TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    model_version TEXT
);

-- 8. Audit Log
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    lead_insights_id BIGINT,
    actor_id TEXT,
    action_type TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE RLS (Open for development, restrict in production)
ALTER TABLE public.lead_session_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_extracted_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_scoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggested_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow All" ON public.lead_session_map FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.crm_lead_state FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.lead_comments FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.lead_tasks FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.lead_extracted_fields FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.lead_scoring FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.suggested_replies FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.audit_log FOR ALL USING (true);