-- Phase 2: Advanced CRM Minimal Write Features

-- Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_phone TEXT NOT NULL,
    session_id TEXT,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_phone TEXT NOT NULL,
    session_id TEXT,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Tags Table (for persistent tags)
CREATE TABLE IF NOT EXISTS public.contact_tags (
    contact_phone TEXT NOT NULL,
    tag TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (contact_phone, tag)
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

-- Allow public access for dev (Since we use anon key)
-- In production, these should be authenticated.
CREATE POLICY "Allow anon select on tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Allow anon insert on tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update on tasks" ON public.tasks FOR UPDATE USING (true);

CREATE POLICY "Allow anon select on notes" ON public.notes FOR SELECT USING (true);
CREATE POLICY "Allow anon insert on notes" ON public.notes FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon select on contact_tags" ON public.contact_tags FOR SELECT USING (true);
CREATE POLICY "Allow anon insert on contact_tags" ON public.contact_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon delete on contact_tags" ON public.contact_tags FOR DELETE USING (true);
