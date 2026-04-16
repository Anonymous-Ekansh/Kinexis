import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  const { data: users } = await supabase.from('users').select('id').limit(1);
  const uid = users?.[0]?.id;
  if (!uid) return console.log('no user');
  
  console.log('Testing with uid:', uid);
  const { data, error } = await supabase.rpc('get_user_activity', { p_user_id: uid });
  console.log('Error:', error);
  console.log('Data:', data);
}

main();
