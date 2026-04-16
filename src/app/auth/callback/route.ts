import { createClient } from "@/lib/supabase-server"
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    
    // exchangeCodeForSession returns the user directly. Use this instead of getUser 
    // to avoid a double fetch while cookies aren't set in the incoming request yet.
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (user && !error) {
      const { data: profile } = await supabase
        .from('users')
        .select('id, stream')
        .eq('id', user.id)
        .single()
        
      if (profile && profile.stream) {
        return NextResponse.redirect(`${origin}/discover`)
      }
      return NextResponse.redirect(`${origin}/onboarding`)
    }
  }
  return NextResponse.redirect(`${origin}/`)
}
