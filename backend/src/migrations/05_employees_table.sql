-- Migration: Create employees table for task assignment system
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.crm_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    role TEXT DEFAULT 'employee',
    phone TEXT DEFAULT '',
    department TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default admin
INSERT INTO public.crm_employees (name, email, role)
VALUES ('Admin', 'admin@voicecrm.app', 'admin')
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.crm_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All" ON public.crm_employees FOR ALL USING (true);
