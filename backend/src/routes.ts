import { Router } from 'express';
import { conversationService, leadService, dashboardService, proxyService, taskService, employeeService, liveCallService, outcomeService } from './services.js';

const router = Router();

// Health check
router.get('/health', async (req, res) => {
  res.json({ ok: true, database: 'connected', signal: 'green' });
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

// ─── Lead Outcomes (Converted / Lost) ───────────────────────────
router.get('/outcomes', async (req, res) => {
  try {
    const data = await outcomeService.getAll(req.query);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/outcomes/trend', async (req, res) => {
  try {
    const data = await outcomeService.getTrend(req.query);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/outcomes/:id', async (req, res) => {
  try {
    const data = await outcomeService.update(req.params.id, req.body);
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/outcomes/:id', async (req, res) => {
  try {
    const data = await outcomeService.delete(req.params.id);
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

// ─── Recording Proxy Download ────────────────────────────────────
// Fetches the remote audio file server-side (no CORS) and streams
// it back to the browser as an attachment download.
router.get('/recordings/download', async (req, res) => {
  try {
    const { url, filename } = req.query as { url?: string; filename?: string };
    if (!url) return res.status(400).json({ error: 'url is required' });

    const remoteRes = await fetch(url);
    if (!remoteRes.ok) return res.status(502).json({ error: 'Failed to fetch recording' });

    const contentType = remoteRes.headers.get('content-type') || 'audio/mpeg';
    const safeFilename = (filename || 'recording.mp3').replace(/[^\w\-_.]/g, '_');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Cache-Control', 'no-store');

    // Stream the body directly to the response
    const reader = remoteRes.body?.getReader();
    if (!reader) return res.status(502).json({ error: 'No body' });

    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        res.write(Buffer.from(value));
      }
    };
    await pump();
  } catch (e: any) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

export default router;
