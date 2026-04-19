export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  const { getMessagesData } = await import('@/lib/server-fetchers')
  const messagesData = await getMessagesData(user.id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopNav />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MessagesPageClient userId={user.id} initialData={messagesData} />
      </div>
    </div>
  )
}
