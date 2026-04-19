export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import TopNav from "@/components/TopNav"
import EventsPageClient from "./EventsPageClient"

export default async function EventsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { getEventsData } = await import('@/lib/server-fetchers');
  const eventsData = await getEventsData(user.id);

  return (
    <>
      <TopNav />
      <EventsPageClient userId={user.id} initialData={eventsData} />
    </>
  )
}
