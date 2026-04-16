import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  const { data, error } = await supabase.rpc('get_user_activity', { p_user_id: 'ba2397dd-d3ef-4b48-9da3-0ae4c47b5930' });
  console.log(error || data);
}

main();
