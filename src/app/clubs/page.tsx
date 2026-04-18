export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import TopNav from "@/components/TopNav"
import ClubsPageClient from "./ClubsPageClient"
import "./clubs.css"

export default async function ClubsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch clubs and followed IDs in parallel for better performance and consistency
  const [clubsRes, followRes] = await Promise.all([
    supabase.from("clubs").select("id, name, initials, accent_color, description, follower_count, category, tags").order("follower_count", { ascending: false }),
    supabase.from("club_members").select("club_id").eq("user_id", user.id)
  ]);

  if (clubsRes.error) console.error("[ClubsPage] Error fetching clubs:", clubsRes.error.message);
  if (followRes.error) console.error("[ClubsPage] Error fetching follows:", followRes.error.message);

  const clubsData = clubsRes.data || [];
  const followedIds = (followRes.data || []).map(f => f.club_id);

  return (
    <div className="clubs-page">
      <TopNav />
      <ClubsPageClient
        initialClubs={clubsData || []}
        initialFollowedIds={followedIds}
        userId={user.id}
      />
    </div>
  )
}
