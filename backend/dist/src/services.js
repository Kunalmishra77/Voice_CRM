import { supabase } from './lib/supabase.js';
// Table Names (Exact match from Supabase public schema)
const CONVERSATIONS_TABLE = 'whatsapp_conversations';
const INSIGHTS_TABLE = 'lead_insights';
// Column Mappings (Prompt specific)
const COLS = {
    conv: {
        timestamp: 'Timestamp',
        date: 'Date',
        time: 'Time',
        phone: 'Phone Number',
        name: 'User Name',
        message: 'User Message',
        response: 'Bot Response',
        stage: 'Conversation Stage',
        sessionId: 'Session ID',
        flag: 'Flag',
        summary: 'summery'
    },
    insight: {
        timestamp: 'Timestamp',
        date: 'Date',
        time: 'Time',
        phone: 'Phone Number',
        name: 'User Name',
        concern: 'concern',
        stage: 'lead stage',
        summary: 'Conversation Summary',
        sentiment: 'sentiment',
        action: 'Action to be taken'
    }
};
export const conversationService = {
    getConversations: async (filters) => {
        const { page = 1, limit = 20, q } = filters;
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        let query = supabase
            .from(CONVERSATIONS_TABLE)
            .select('*', { count: 'exact' });
        if (q) {
            query = query.or(`"${COLS.conv.name}".ilike.%${q}%,"${COLS.conv.message}".ilike.%${q}%,"${COLS.conv.phone}".ilike.%${q}%`);
        }
        const { data, count, error } = await query
            .order(COLS.conv.timestamp, { ascending: false })
            .range(from, to);
        if (error)
            throw error;
        if (data && data.length > 0) {
            console.log('📡 Sample Conversation Row:', data[0]);
        }
        // Post-process to group by Session ID for the "Inbox" feel
        // In a real production app, this would be a View or RPC in Supabase
        const grouped = [];
        const seenSessions = new Set();
        (data || []).forEach(row => {
            const sId = row[COLS.conv.sessionId] || row[COLS.conv.phone];
            if (!seenSessions.has(sId)) {
                seenSessions.add(sId);
                grouped.push(row);
            }
        });
        return {
            data: grouped,
            meta: {
                total: count || 0,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil((count || 0) / limit)
            }
        };
    },
    getContacts: async (filters) => {
        const { q } = filters;
        // Fetch unique contacts by selecting phone and name
        // Since we want unique ones, we fetch all and filter in JS for now (Supabase REST doesn't support distinct)
        const { data, error } = await supabase
            .from(CONVERSATIONS_TABLE)
            .select(`"${COLS.conv.phone}","${COLS.conv.name}","${COLS.conv.stage}","${COLS.conv.timestamp}"`)
            .order(COLS.conv.timestamp, { ascending: false });
        if (error)
            throw error;
        const uniqueMap = new Map();
        (data || []).forEach(row => {
            const phone = row[COLS.conv.phone];
            if (!uniqueMap.has(phone)) {
                uniqueMap.set(phone, {
                    phone,
                    name: row[COLS.conv.name],
                    lastStage: row[COLS.conv.stage],
                    lastSeen: row[COLS.conv.timestamp]
                });
            }
        });
        let result = Array.from(uniqueMap.values());
        if (q) {
            const term = q.toLowerCase();
            result = result.filter(c => c.phone.includes(term) ||
                (c.name && c.name.toLowerCase().includes(term)));
        }
        return result;
    },
    getBySessionId: async (sessionId) => {
        // If sessionId looks like a phone number, search by phone too as fallback
        const isPhone = /^\d+$/.test(sessionId);
        let query = supabase
            .from(CONVERSATIONS_TABLE)
            .select('*');
        if (isPhone) {
            query = query.or(`"${COLS.conv.sessionId}".eq."${sessionId}","${COLS.conv.phone}".eq."${sessionId}"`);
        }
        else {
            query = query.eq(COLS.conv.sessionId, sessionId);
        }
        const { data: messages, error: msgError } = await query
            .order(COLS.conv.timestamp, { ascending: true });
        if (msgError)
            throw msgError;
        // Get latest insight for the phone associated with this session
        const phone = messages?.[0]?.[COLS.conv.phone];
        let insight = null;
        if (phone) {
            const { data: insData } = await supabase
                .from(INSIGHTS_TABLE)
                .select('*')
                .eq(COLS.insight.phone, phone)
                .order(COLS.insight.timestamp, { ascending: false })
                .limit(1)
                .maybeSingle();
            insight = insData;
        }
        return {
            sessionId,
            phone,
            messages: messages || [],
            insight
        };
    }
};
export const leadService = {
    getLeads: async (filters) => {
        const { page = 1, limit = 10, stage, q } = filters;
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        let query = supabase
            .from(INSIGHTS_TABLE)
            .select('*', { count: 'exact' });
        if (q) {
            query = query.or(`"${COLS.insight.name}".ilike.%${q}%,"${COLS.insight.phone}".ilike.%${q}%`);
        }
        if (stage && stage !== 'all') {
            query = query.eq(COLS.insight.stage, stage);
        }
        const { data, count, error } = await query
            .order(COLS.insight.timestamp, { ascending: false })
            .range(from, to);
        if (error)
            throw error;
        return {
            data: data || [],
            meta: {
                total: count || 0,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil((count || 0) / limit)
            }
        };
    }
};
export const dashboardService = {
    getStats: async () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const [qTotalConvs, qTotalLeads, qTodaysConvs, qTodaysLeads, qUniquePhones] = await Promise.all([
            supabase.from(CONVERSATIONS_TABLE).select('*', { count: 'exact', head: true }),
            supabase.from(INSIGHTS_TABLE).select('*', { count: 'exact', head: true }),
            supabase.from(CONVERSATIONS_TABLE).select('*', { count: 'exact', head: true }).gte(COLS.conv.date, todayStr),
            supabase.from(INSIGHTS_TABLE).select('*', { count: 'exact', head: true }).gte(COLS.insight.date, todayStr),
            supabase.from(CONVERSATIONS_TABLE).select(`"${COLS.conv.phone}"`)
        ]);
        if (qUniquePhones.error)
            console.error('📡 Unique Phones Error:', qUniquePhones.error);
        const uniquePhonesData = qUniquePhones.data || [];
        if (uniquePhonesData.length > 0) {
            console.log('📡 Sample Row for Phone Mapping:', uniquePhonesData[0]);
        }
        const uniquePhones = new Set(uniquePhonesData.map(item => {
            const val = item[COLS.conv.phone];
            return val ? String(val).trim() : null;
        }).filter(Boolean)).size;
        // Stage distribution
        const { data: stages, error: stageError } = await supabase.from(INSIGHTS_TABLE).select(`"${COLS.insight.stage}"`);
        if (stageError)
            console.error('📡 Stage Distro Error:', stageError);
        const stage_counts = (stages || []).reduce((acc, curr) => {
            const s = curr[COLS.insight.stage] || 'Unknown';
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {});
        return {
            total_leads: qTotalLeads.count || 0,
            total_conversations: qTotalConvs.count || 0,
            todays_conversations: qTodaysConvs.count || 0,
            todays_leads: qTodaysLeads.count || 0,
            unique_phones: uniquePhones || 0,
            stage_counts
        };
    }
};
export const taskService = {
    getTasks: async (filters) => {
        let query = supabase.from('tasks').select('*');
        if (filters.contact_phone)
            query = query.eq('contact_phone', filters.contact_phone);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error)
            throw error;
        return data;
    },
    createTask: async (task) => {
        const { data, error } = await supabase.from('tasks').insert([task]).select().single();
        if (error)
            throw error;
        return data;
    },
    updateTask: async (id, updates) => {
        const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single();
        if (error)
            throw error;
        return data;
    }
};
export const noteService = {
    getNotes: async (phone) => {
        const { data, error } = await supabase.from('notes').select('*').eq('contact_phone', phone).order('created_at', { ascending: false });
        if (error)
            throw error;
        return data;
    },
    createNote: async (note) => {
        const { data, error } = await supabase.from('notes').insert([note]).select().single();
        if (error)
            throw error;
        return data;
    }
};
export const tagService = {
    getTags: async (phone) => {
        const { data, error } = await supabase.from('contact_tags').select('tag').eq('contact_phone', phone);
        if (error)
            throw error;
        return data.map(d => d.tag);
    },
    addTag: async (phone, tag) => {
        const { error } = await supabase.from('contact_tags').insert([{ contact_phone: phone, tag }]);
        if (error)
            throw error;
        return true;
    },
    removeTag: async (phone, tag) => {
        const { error } = await supabase.from('contact_tags').delete().eq('contact_phone', phone).eq('tag', tag);
        if (error)
            throw error;
        return true;
    }
};
