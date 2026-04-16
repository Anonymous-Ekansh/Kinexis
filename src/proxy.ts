import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options: _options }) => {
            // If the cookie is updated, update the cookies for the request and response
            request.cookies.set(name, value)
            supabaseResponse.cookies.set({
              name,
              value,
              ..._options,
            })
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname;

  // Not logged in → redirect to login
  if (!user && (path.startsWith('/discover') || path.startsWith('/onboarding'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged in + has profile → skip onboarding
  if (user && path.startsWith('/onboarding')) {
    const { data: profile } = await supabase
      .from('users').select('id, stream').eq('id', user.id).single()
    if (profile && profile.stream) return NextResponse.redirect(new URL('/discover', request.url))
  }

  // Without profile, restrict access from discover
  if (user && path.startsWith('/discover')) {
    const { data: profile } = await supabase
      .from('users').select('id, stream').eq('id', user.id).single()
    if (!profile || !profile.stream) return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // If already logged in, redirect away from auth pages
  if (user && (path === '/login' || path === '/signup')) {
    return NextResponse.redirect(new URL('/discover', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
