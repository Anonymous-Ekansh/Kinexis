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

  return (
    <>
      <TopNav />
      <EventsPageClient userId={user.id} />
    </>
  )
}
