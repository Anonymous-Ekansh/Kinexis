import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import TopNav from "@/components/TopNav"
import DiscoverClient from "@/components/discover/DiscoverClient"
import "@/app/profile/profile.css"
import "./discover.css"

export default async function DiscoverPage() {
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
    redirect('/login')
  }

  return (
    <div className="disc-page">
      <TopNav />
      <DiscoverClient />
      <footer className="disc-footer">
        <span className="disc-foot-l">© 2025 Kinexis</span>
        <span className="disc-foot-r">kinexis.in</span>
      </footer>
    </div>
  )
}

