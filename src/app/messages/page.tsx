import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import TopNav from "@/components/TopNav"
import MessagesPageClient from "./MessagesPageClient"

export default async function MessagesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopNav />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MessagesPageClient userId={user.id} />
      </div>
    </div>
  )
}
