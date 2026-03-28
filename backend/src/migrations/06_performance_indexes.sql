-- 06_performance_indexes.sql
-- Performance indexes for call_leads table (10K+ rows/day)
-- Run this in Supabase SQL editor

-- Index on created_at for date-range filtering (most critical)
CREATE INDEX IF NOT EXISTS idx_call_leads_created_at
  ON call_leads (created_at DESC);

-- Index on status for live call monitoring (to call / calling / done)
CREATE INDEX IF NOT EXISTS idx_call_leads_status
  ON call_leads (status);

-- Index on sentiment for bucket filtering (Hot / Warm / Cold)
CREATE INDEX IF NOT EXISTS idx_call_leads_sentiment
  ON call_leads (sentiment);

-- Composite index for common dashboard query pattern: date range + sentiment
CREATE INDEX IF NOT EXISTS idx_call_leads_created_sentiment
  ON call_leads (created_at DESC, sentiment);

-- Index on mobile_number for phone lookups
CREATE INDEX IF NOT EXISTS idx_call_leads_phone
  ON call_leads (mobile_number);

-- Index for tasks table if it exists
CREATE INDEX IF NOT EXISTS idx_lead_tasks_due_at
  ON lead_tasks (due_at);

CREATE INDEX IF NOT EXISTS idx_lead_tasks_assigned_to
  ON lead_tasks (assigned_to);

CREATE INDEX IF NOT EXISTS idx_lead_tasks_done
  ON lead_tasks (done);
