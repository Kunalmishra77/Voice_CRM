-- Migration: Add assignment columns to lead_tasks
-- Run this in your Supabase SQL editor

-- New columns for task assignment system
ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS lead_name TEXT DEFAULT 'Unknown';
ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS lead_sentiment TEXT;
ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS assigned_by TEXT DEFAULT 'Admin';
ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS assignment_type TEXT DEFAULT 'specific';
ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

-- Index for employee task lookups
CREATE INDEX IF NOT EXISTS idx_lt_assigned ON public.lead_tasks(assigned_to) WHERE done = false;
CREATE INDEX IF NOT EXISTS idx_lt_sentiment ON public.lead_tasks(lead_sentiment);
