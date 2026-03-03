import { Router } from 'express';
import { conversationService, leadService, dashboardService, taskService, noteService, tagService, proxyService } from './services.js';

const router = Router();

// ... existing routes ...

// Tasks
router.get('/tasks', async (req, res) => {
  try {
    const data = await taskService.getTasks(req.query);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const data = await taskService.createTask(req.body);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/tasks/:id', async (req, res) => {
  try {
    const data = await taskService.updateTask(req.params.id, req.body);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Notes
router.get('/notes/:phone', async (req, res) => {
  try {
    const data = await noteService.getNotes(req.params.phone);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/notes', async (req, res) => {
  try {
    const data = await noteService.createNote(req.body);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Tags
router.get('/tags/:phone', async (req, res) => {
  try {
    const data = await tagService.getTags(req.params.phone);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tags', async (req, res) => {
  try {
    const { phone, tag } = req.body;
    await tagService.addTag(phone, tag);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/tags', async (req, res) => {
  try {
    const { phone, tag } = req.query as any;
    await tagService.removeTag(phone, tag);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Health Check with Supabase connectivity
router.get('/health', async (req, res) => {
  try {
    const { supabase } = await import('./lib/supabase.js');
    const { data, error } = await supabase.from('whatsapp_conversations').select('count', { count: 'exact', head: true }).limit(1);

    if (error) throw error;

    res.json({
      ok: true,
      database: 'connected',
      timestamp: new Date().toISOString(),
      signal: 'green'
    });
  } catch (error: any) {
    res.status(503).json({
      ok: false,
      database: 'disconnected',
      error: error.message,
      signal: 'red'
    });
  }
});

// User Profile (Mock for UI layout consistency)
router.get('/me', (req, res) => {
  res.json({
    id: 'u1',
    name: 'CRM Admin',
    email: 'admin@whatsapp-crm.local',
    initials: 'AD',
    role: 'Administrator'
  });
});

// Metrics Stats
router.get('/metrics', async (req, res) => {
  try {
    const data = await dashboardService.getStats();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Conversations (Grouped list for Inbox)
router.get('/conversations', async (req, res) => {
  try {
    const data = await conversationService.getConversations(req.query);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Contacts (Unique phone numbers)
router.get('/contacts', async (req, res) => {
  try {
    const data = await conversationService.getContacts(req.query);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Conversation Thread by Session ID
router.get('/conversations/:sessionId', async (req, res) => {
  try {
    const data = await conversationService.getBySessionId(req.params.sessionId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Leads (Lead Insights)
router.get('/leads', async (req, res) => {
  try {
    const data = await leadService.getLeads(req.query);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PROXY ROUTES — Serve as CORS-safe bridge between frontend
// and Supabase. Frontend calls /api/proxy/* instead of hitting
// Supabase REST directly from the browser.
// ============================================================

// ── Lead Insights ───────────────────────────────────────────
router.get('/proxy/insights', async (req, res) => {
  try {
    const data = await proxyService.getInsights(req.query as any);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/proxy/insights/by-phone/:phone', async (req, res) => {
  try {
    const data = await proxyService.getInsightByPhone(req.params.phone);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/proxy/insights/by-ids', async (req, res) => {
  try {
    const ids = req.query.ids ? String(req.query.ids).split(',').map(Number) : [];
    const data = await proxyService.getInsightsByIds(ids);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── CRM Lead State ──────────────────────────────────────────
router.get('/proxy/states', async (req, res) => {
  try {
    const ids = req.query.ids ? String(req.query.ids).split(',').map(Number) : undefined;
    const data = await proxyService.getStates(ids);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/proxy/states/upsert', async (req, res) => {
  try {
    const data = await proxyService.upsertState(req.body);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/proxy/states/by-phone/:phone', async (req, res) => {
  try {
    const data = await proxyService.updateStateByPhone(req.params.phone, req.body);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/proxy/states/insert', async (req, res) => {
  try {
    const data = await proxyService.insertState(req.body);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── WhatsApp Conversations ──────────────────────────────────
router.get('/proxy/conversations/range', async (req, res) => {
  try {
    const data = await proxyService.getConversationsRange(req.query as any);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/proxy/conversations/session/:sessionId', async (req, res) => {
  try {
    const data = await proxyService.getConversationBySessionId(req.params.sessionId);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Lead Tasks ──────────────────────────────────────────────
router.get('/proxy/tasks', async (req, res) => {
  try {
    const data = await proxyService.getTasks();
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/proxy/tasks', async (req, res) => {
  try {
    const data = await proxyService.createTask(req.body);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/proxy/tasks/:id', async (req, res) => {
  try {
    const data = await proxyService.updateTask(req.params.id, req.body);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Lead Comments ───────────────────────────────────────────
router.post('/proxy/comments', async (req, res) => {
  try {
    const data = await proxyService.insertComment(req.body);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/proxy/comments', async (req, res) => {
  try {
    const data = await proxyService.getComments(req.query as any);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Optional Tables (safe upsert, won't fail on missing table)
router.post('/proxy/optional/:table', async (req, res) => {
  try {
    const data = await proxyService.insertOptional(req.params.table, req.body);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Table / Column Existence Check ─────────────────────────
router.get('/proxy/check-table', async (req, res) => {
  try {
    const { table, columns } = req.query as { table: string; columns: string };
    const exists = await proxyService.checkTable(table, columns);
    res.json({ exists });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;

