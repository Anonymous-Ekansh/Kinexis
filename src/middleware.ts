import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname.startsWith("/auth/callback");

  if (!user && !isAuthRoute && request.nextUrl.pathname !== "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    const hasProfileCookie = request.cookies.get("has_profile")?.value === "true";
    let profileExists = hasProfileCookie;

    if (!hasProfileCookie) {
      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      
      profileExists = !!profile;
      
      if (profileExists) {
        // Cache the result in a cookie to avoid querying the database on every subsequent request
        supabaseResponse.cookies.set("has_profile", "true", { path: "/", maxAge: 60 * 60 * 24 * 30 }); // 30 days
      }
    }

    if (!profileExists && request.nextUrl.pathname !== "/onboarding" && !isAuthRoute) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    if (profileExists && request.nextUrl.pathname === "/onboarding") {
      return NextResponse.redirect(new URL("/discover", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
