import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './backend/.env.production' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeadsTable() {
  console.log('Checking call_leads table...');
  const { data, error } = await supabase.from('call_leads').select('*').limit(1);
  
  if (error) {
    console.error('Error fetching from call_leads:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]));
    console.log('Sample row:', data[0]);
  } else {
    console.log('No data found in call_leads');
  }
}

checkLeadsTable();
