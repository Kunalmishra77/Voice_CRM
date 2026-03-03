import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const check = async () => {
  const tables = ['whatsapp_conversations', 'lead_insights', 'crm_lead_state', 'lead_tasks', 'tasks'];
  
  for (const table of tables) {
    console.log(`\n--- Table: ${table} ---`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`Error for ${table}:`, error.message);
    } else {
      console.log(`${table} exists!`);
      if (data && data.length > 0) {
        console.log(`Sample row keys:`, Object.keys(data[0]));
      } else {
        console.log(`Table is empty.`);
      }
    }
  }
};

check();
