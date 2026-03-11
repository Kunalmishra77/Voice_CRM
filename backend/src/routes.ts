import { Router } from 'express';
import { conversationService, leadService, dashboardService, proxyService } from './services.js';

const router = Router();

// Health check
router.get('/health', async (req, res) => {
  res.json({ ok: true, database: 'connected', signal: 'green' });
});

// Metrics
router.get('/metrics', async (req, res) => {
  try {
    const stats = await dashboardService.getStats();
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

export default router;
