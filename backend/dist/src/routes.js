import { Router } from 'express';
import { conversationService, leadService, dashboardService } from './services.js';
const router = Router();
// Health Check
router.get('/health', (req, res) => res.json({ ok: true }));
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
// Dashboard Stats
router.get('/dashboard', async (req, res) => {
    try {
        const data = await dashboardService.getStats();
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Conversations (Grouped list for Inbox)
router.get('/conversations', async (req, res) => {
    try {
        const data = await conversationService.getConversations(req.query);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Contacts (Unique phone numbers)
router.get('/contacts', async (req, res) => {
    try {
        const data = await conversationService.getContacts(req.query);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Conversation Thread by Session ID
router.get('/conversations/:sessionId', async (req, res) => {
    try {
        const data = await conversationService.getBySessionId(req.params.sessionId);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Leads (Lead Insights)
router.get('/leads', async (req, res) => {
    try {
        const data = await leadService.getLeads(req.query);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
export default router;
