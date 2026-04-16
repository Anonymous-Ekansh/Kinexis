const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLocal = fs.readFileSync(".env.local", "utf-8");
let supiUrl = "";
let supiKey = "";
for (const line of envLocal.split("\n")) {
  if (line.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) supiUrl = line.split("=")[1].replace(/"/g, "").trim();
  if (line.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")) supiKey = line.split("=")[1].replace(/"/g, "").trim();
}

const supabase = createClient(supiUrl, supiKey);

async function main() {
  const { data, error } = await supabase.from('follows').select('*').limit(1);
  console.log(data);
  console.log(error);
}
main();
