import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import TopNav from "@/components/TopNav"
import ClubsPageClient from "./ClubsPageClient"
import "./clubs.css"

export default async function ClubsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch clubs server-side — single query, no waterfall
  const { data: clubsData } = await supabase
    .from("clubs")
    .select("*")
    .order("follower_count", { ascending: false })

  // Fetch user's followed clubs in parallel
  const { data: followData } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", user.id)

  const followedIds = (followData || []).map(f => f.club_id)

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
