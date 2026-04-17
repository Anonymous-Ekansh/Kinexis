export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  const { getChannelsData } = await import('@/lib/server-fetchers');
  const channelsData = await getChannelsData(user.id);

  return (
    <>
      <TopNav />
      <ChannelsPageClient initialData={channelsData} userId={user.id} />
    </>
  );
}
