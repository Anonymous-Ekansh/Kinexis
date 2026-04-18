export const revalidate = 60;

import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import TopNav from "@/components/TopNav"
import CollabsPageClient from "./CollabsPageClient"

export default async function CollabsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { getCollabsData } = await import('@/lib/server-fetchers');
  const collabsData = await getCollabsData(user.id);

  return (
    <>
      <TopNav />
      <CollabsPageClient userId={user.id} initialData={collabsData} />
    </>
  )
}
