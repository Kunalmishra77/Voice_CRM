import { Router } from 'express';
import { conversationService, leadService, dashboardService, proxyService, taskService, employeeService, liveCallService } from './services.js';

const router = Router();

// Health check
router.get('/health', async (req, res) => {
  res.json({ ok: true, database: 'connected', signal: 'green' });
});

// Debug endpoint — echoes received query params (useful for Vercel diagnostics)
router.get('/debug/echo', async (req, res) => {
  res.json({
    query: req.query,
    url: req.url,
    originalUrl: req.originalUrl,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

// Metrics
router.get('/metrics', async (req, res) => {
  try {
    const stats = await dashboardService.getStats(req.query);
    res.json(stats);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Leads
router.get('/leads', async (req, res) => {
  try {
    const data = await leadService.getLeads(req.query);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Get lead by phone (For Intelligence Panel)
router.get('/leads/by-phone/:phone', async (req, res) => {
  try {
    const data = await proxyService.getInsightByPhone(req.params.phone);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Update Lead Status
router.patch('/leads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await leadService.updateStatus({ leadid: id, ...req.body });
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Conversations
router.get('/conversations', async (req, res) => {
  try {
    const data = await conversationService.getConversations(req.query);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/conversations/:sessionId', async (req, res) => {
  try {
    const data = await conversationService.getBySessionId(req.params.sessionId);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Employees ──────────────────────────────────────────────────
router.get('/employees', async (req, res) => {
  try {
    const data = await employeeService.getAll();
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/employees', async (req, res) => {
  try {
    const data = await employeeService.create(req.body);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/employees/:id', async (req, res) => {
  try {
    const data = await employeeService.delete(req.params.id);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Tasks ──────────────────────────────────────────────────────
router.get('/tasks', async (req, res) => {
  try {
    const data = await taskService.getTasks(req.query);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/tasks/stats', async (req, res) => {
  try {
    const data = await taskService.getTaskStats(req.query);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/tasks', async (req, res) => {
  try {
    const data = await taskService.createTask(req.body);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/tasks/bulk', async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'tasks array is required' });
    }
    const data = await taskService.createBulkTasks(tasks);
    res.json({ success: true, created: data.length, data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/tasks/:id', async (req, res) => {
  try {
    const data = await taskService.updateTask(req.params.id, req.body);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    const data = await taskService.deleteTask(req.params.id);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Live Call Monitor ──────────────────────────────────────────
router.get('/live/activity', async (req, res) => {
  try {
    const data = await liveCallService.getCallActivity();
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
