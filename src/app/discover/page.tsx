export const dynamic = 'force-dynamic';

import { createClient } from "@/lib/supabase-server"
import { redirect } from 'next/navigation'
import TopNav from "@/components/TopNav"
import DiscoverClient from "@/components/discover/DiscoverClient"
import "@/app/profile/profile.css"
import "./discover.css"

export default async function DiscoverPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { getDiscoverData } = await import('@/lib/server-fetchers');
  const discoverData = await getDiscoverData(user.id);

  return (
    <div className="disc-page">
      <TopNav />
      <DiscoverClient initialData={discoverData} userId={user.id} />
      <footer className="disc-footer">
        <span className="disc-foot-l">© 2026 Kinexis</span>
        <span className="disc-foot-r">kinexis.in</span>
      </footer>
    </div>
  )
}

