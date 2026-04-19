import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  const cookieStore = await cookies()
  const cookiesToApply: Array<{
    name: string
    value: string
    options?: Parameters<typeof cookieStore.set>[2]
  }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(nextCookies) {
          nextCookies.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
            cookiesToApply.push({ name, value, options })
          })
        },
      },
    }
  )

  if (code) {
    const {
      data: { user },
      error,
    } = await supabase.auth.exchangeCodeForSession(code)

    if (user && !error) {
      const { data: profile } = await supabase
        .from("users")
        .select("id, stream")
        .eq("id", user.id)
        .single()

      const redirectPath = profile && profile.stream ? "/discover" : "/onboarding"
      const response = NextResponse.redirect(new URL(redirectPath, origin))

      cookiesToApply.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })

      return response
    }
  }

  return NextResponse.redirect(new URL("/", origin))
}
