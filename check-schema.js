const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('events').select('*, event_tags(*), event_actions(*)').limit(1);
  console.log('With event_actions:', error ? error.message : 'Success');
  
  if (error) {
    const { data: d2, error: e2 } = await supabase.from('events').select('*, event_tags(*), event_interest(*)').limit(1);
    console.log('With event_interest:', e2 ? e2.message : 'Success');
  }
}
run();
