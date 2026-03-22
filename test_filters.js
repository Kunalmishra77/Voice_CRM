import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env.production' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFilters() {
  console.log('--- Testing Date Filters ---');
  
  // Test 1: No filter
  const { count: total } = await supabase.from('call_leads').select('*', { count: 'exact', head: true });
  console.log('Total leads (no filter):', total);

  // Test 2: Filter with T00:00:00Z
  const date = '2026-03-13';
  const { count: count1 } = await supabase.from('call_leads')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${date}T00:00:00Z`)
    .lte('created_at', `${date}T23:59:59Z`);
  console.log(`Filter ${date} (with T...Z):`, count1);

  // Test 3: Filter with simple date
  const { count: count2 } = await supabase.from('call_leads')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', date)
    .lt('created_at', '2026-03-14');
  console.log(`Filter ${date} (simple date range):`, count2);

  console.log('\n--- Testing Sentiment Filters ---');
  const { count: hotCount } = await supabase.from('call_leads')
    .select('*', { count: 'exact', head: true })
    .eq('sentiment', 'Hot');
  console.log('Hot leads:', hotCount);

  const { count: coldCount } = await supabase.from('call_leads')
    .select('*', { count: 'exact', head: true })
    .eq('sentiment', 'Cold');
  console.log('Cold leads:', coldCount);
}

testFilters();
