export const dynamic = 'force-dynamic';

import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import TopNav from "@/components/TopNav"
import FeedPageClient from "./FeedPageClient"

export default async function FeedPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { getFeedData } = await import('@/lib/server-fetchers');
  const feedData = await getFeedData(user.id);

  return (
    <>
      <TopNav />
      <FeedPageClient userId={user.id} initialData={feedData} />
    </>
  )
}
