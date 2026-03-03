import { Router } from 'express';
import { conversationService, leadService, dashboardService, taskService, noteService, tagService } from './services.js';
const router = Router();
// ... existing routes ...
// Tasks
router.get('/tasks', async (req, res) => {
    try {
        const data = await taskService.getTasks(req.query);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/tasks', async (req, res) => {
    try {
        const data = await taskService.createTask(req.body);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.patch('/tasks/:id', async (req, res) => {
    try {
        const data = await taskService.updateTask(req.params.id, req.body);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Notes
router.get('/notes/:phone', async (req, res) => {
    try {
        const data = await noteService.getNotes(req.params.phone);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/notes', async (req, res) => {
    try {
        const data = await noteService.createNote(req.body);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Tags
router.get('/tags/:phone', async (req, res) => {
    try {
        const data = await tagService.getTags(req.params.phone);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/tags', async (req, res) => {
    try {
        const { phone, tag } = req.body;
        await tagService.addTag(phone, tag);
        res.json({ ok: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.delete('/tags', async (req, res) => {
    try {
        const { phone, tag } = req.query;
        await tagService.removeTag(phone, tag);
        res.json({ ok: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Health Check with Supabase connectivity
router.get('/health', async (req, res) => {
    try {
        const { supabase } = await import('./lib/supabase.js');
        const { data, error } = await supabase.from('whatsapp_conversations').select('count', { count: 'exact', head: true }).limit(1);
        if (error)
            throw error;
        res.json({
            ok: true,
            database: 'connected',
            timestamp: new Date().toISOString(),
            signal: 'green'
        });
    }
    catch (error) {
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
