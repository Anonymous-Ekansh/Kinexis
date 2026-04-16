import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation";
import TopNav from "@/components/TopNav";
import ChannelsPageClient from "./ChannelsPageClient";
import "@/app/profile/profile.css";

export default async function ChannelsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <TopNav />
      <ChannelsPageClient />
    </>
  );
}
