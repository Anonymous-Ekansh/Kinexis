import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "/Users/anant/Downloads/KinexisProject/.env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching from clubs...");
  const { data, error } = await supabase.from("clubs").select("*");
  console.log("Error:", error);
  console.log("Data length:", data ? data.length : "null");
  if (data && data.length > 0) console.log("First club:", data[0]);
}
main();
