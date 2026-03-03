import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Supabase URL or Key is missing from .env');
}

// Create client with custom fetch to handle potential Node.js network timeouts/DNS issues
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  },
  global: {
    headers: { 'x-application-name': 'whatsapp-crm' }
  }
});

// Immediate Connectivity Test
supabase.from('whatsapp_conversations').select('count', { count: 'exact', head: true }).limit(1)
  .then(({ error }) => {
    if (error) {
      console.error('❌ Supabase Connection Test Failed:', error.message);
      if (error.message.includes('fetch failed')) {
        console.warn('💡 HINT: Your Node.js version might be struggling with DNS. Try running with: NODE_OPTIONS="--dns-result-order=ipv4first"');
      }
    } else {
      console.log('✅ Supabase Connection Successful');
    }
  });
