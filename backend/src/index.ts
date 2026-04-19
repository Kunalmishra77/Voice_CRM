import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import routes from './routes.js';
import net from 'net';
import pg from 'pg';

dotenv.config();

// ─── Auto-create tables if they don't exist ──────────────────────
async function runMigrations() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn('[migration] DATABASE_URL not set, skipping table creation');
    return;
  }
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.crm_employees (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        TEXT NOT NULL,
        email       TEXT DEFAULT '',
        role        TEXT DEFAULT 'employee',
        phone       TEXT DEFAULT '',
        department  TEXT DEFAULT '',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.lead_tasks (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number     TEXT,
        lead_name        TEXT DEFAULT 'Unknown',
        lead_sentiment   TEXT,
        lead_insights_id BIGINT,
        task_type        TEXT DEFAULT 'Follow-up Call',
        notes            TEXT DEFAULT '',
        due_at           TIMESTAMPTZ NOT NULL,
        assigned_to      TEXT,
        assigned_by      TEXT DEFAULT 'Admin',
        assignment_type  TEXT DEFAULT 'specific',
        priority         TEXT DEFAULT 'medium',
        done             BOOLEAN DEFAULT FALSE,
        done_at          TIMESTAMPTZ,
        created_by       TEXT DEFAULT 'Admin',
        created_at       TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add ALL required columns to lead_tasks (safe — IF NOT EXISTS ignores existing ones)
    const alterTaskCols = [
      `ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS phone_number     TEXT`,
      `ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS lead_name        TEXT DEFAULT 'Unknown'`,
      `ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS lead_sentiment   TEXT`,
      `ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS lead_insights_id BIGINT`,
      `ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS task_type        TEXT DEFAULT 'Follow-up Call'`,
      `ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS notes            TEXT DEFAULT ''`,
      `ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS due_at           TIMESTAMPTZ`,
      `ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS assigned_to      TEXT`,
      `ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS assigned_by      TEXT DEFAULT 'Admin'`,
      `ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS assignment_type  TEXT DEFAULT 'specific'`,
      `ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS priority         TEXT DEFAULT 'medium'`,
      `ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS done             BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS done_at          TIMESTAMPTZ`,
      `ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS created_by       TEXT DEFAULT 'Admin'`,
      `ALTER TABLE public.lead_tasks ADD COLUMN IF NOT EXISTS created_at       TIMESTAMPTZ DEFAULT NOW()`,
    ];
    for (const sql of alterTaskCols) {
      await client.query(sql).catch(() => {});
    }

    // Add ALL required columns to crm_employees
    const alterEmpCols = [
      `ALTER TABLE public.crm_employees ADD COLUMN IF NOT EXISTS name        TEXT`,
      `ALTER TABLE public.crm_employees ADD COLUMN IF NOT EXISTS email       TEXT DEFAULT ''`,
      `ALTER TABLE public.crm_employees ADD COLUMN IF NOT EXISTS role        TEXT DEFAULT 'employee'`,
      `ALTER TABLE public.crm_employees ADD COLUMN IF NOT EXISTS phone       TEXT DEFAULT ''`,
      `ALTER TABLE public.crm_employees ADD COLUMN IF NOT EXISTS department  TEXT DEFAULT ''`,
      `ALTER TABLE public.crm_employees ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW()`,
    ];
    for (const sql of alterEmpCols) {
      await client.query(sql).catch(() => {});
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.crm_lead_outcomes (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id      TEXT NOT NULL,
        phone_number TEXT DEFAULT '',
        lead_name    TEXT DEFAULT 'Unknown',
        outcome      TEXT NOT NULL CHECK (outcome IN ('Converted', 'Lost')),
        reason       TEXT DEFAULT '',
        note         TEXT DEFAULT '',
        sentiment    TEXT DEFAULT '',
        outcome_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_by   TEXT DEFAULT 'Admin',
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const alterOutcomeCols = [
      `ALTER TABLE public.crm_lead_outcomes ADD COLUMN IF NOT EXISTS lead_id      TEXT`,
      `ALTER TABLE public.crm_lead_outcomes ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT ''`,
      `ALTER TABLE public.crm_lead_outcomes ADD COLUMN IF NOT EXISTS lead_name    TEXT DEFAULT 'Unknown'`,
      `ALTER TABLE public.crm_lead_outcomes ADD COLUMN IF NOT EXISTS outcome      TEXT`,
      `ALTER TABLE public.crm_lead_outcomes ADD COLUMN IF NOT EXISTS reason       TEXT DEFAULT ''`,
      `ALTER TABLE public.crm_lead_outcomes ADD COLUMN IF NOT EXISTS note         TEXT DEFAULT ''`,
      `ALTER TABLE public.crm_lead_outcomes ADD COLUMN IF NOT EXISTS sentiment    TEXT DEFAULT ''`,
      `ALTER TABLE public.crm_lead_outcomes ADD COLUMN IF NOT EXISTS outcome_date DATE`,
      `ALTER TABLE public.crm_lead_outcomes ADD COLUMN IF NOT EXISTS created_by   TEXT DEFAULT 'Admin'`,
      `ALTER TABLE public.crm_lead_outcomes ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT NOW()`,
    ];
    for (const sql of alterOutcomeCols) {
      await client.query(sql).catch(() => {});
    }

    // Reload PostgREST schema cache so new columns are immediately visible
    await client.query(`NOTIFY pgrst, 'reload schema'`).catch(() => {});

    console.log('[migration] ✅ Tables ready: crm_employees, lead_tasks, crm_lead_outcomes');
  } catch (err: any) {
    console.error('[migration] ❌ Failed:', err.message);
  } finally {
    await client.end();
  }
}

runMigrations();

const app = express();
const INITIAL_PORT = Number(process.env.PORT) || 3010;
const API_KEY = process.env.API_KEY || 'dev_key_2026';
const DISABLE_AUTH = process.env.DISABLE_AUTH === 'true';

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

// Auth Middleware
const authGuard = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (DISABLE_AUTH) return next();
  // Accept key via header OR query param (query needed for direct browser download links)
  const apiKey = req.headers['x-api-key'] || req.query['x-api-key'];
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  }
  next();
};

// Root & Health
app.get('/', (req, res) => res.json({ ok: true, service: 'whatsapp-crm-supabase' }));
app.get('/health', (req, res) => res.json({ ok: true }));

// Protected Routes
app.use('/api', authGuard, routes);

// Port Auto-Increment Logic
function startServer(port: number) {
  if (process.env.VERCEL) {
    console.log('Running on Vercel, skipping app.listen');
    return;
  }
  const server = app.listen(port, () => {
    console.log(`
🚀 Backend is running!
📡 URL: http://localhost:${port}
🔐 Auth: ${DISABLE_AUTH ? 'DISABLED (Local Dev)' : 'ENABLED'}
    `);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${port} is in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Server error:', err);
    }
  });
}

startServer(INITIAL_PORT);

export default app;
