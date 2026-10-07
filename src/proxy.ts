import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { configProblems } from "@/lib/config-check";
import { env } from "@/lib/env";

// /api/cron/* and /api/worker/* are called without a session (Vercel Cron, the
// run worker handing off to itself); those routes check CRON_SECRET themselves.
const PUBLIC_PATHS = ["/login", "/auth", "/api/cron", "/api/worker"];

/**
 * Refreshes the Supabase session on every request and bounces signed-out
 * visitors to /login. Real authorization happens in `requireUser()`; this is
 * only the optimistic redirect.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not remove: getUser() performs the actual token refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const wanted = `${pathname}${request.nextUrl.search}`;
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(wanted)}`;
    return NextResponse.redirect(url);
  }

  // Signed in but the deployment is missing server config: explain instead
  // of letting every page throw.
  if (user && pathname !== "/setup" && configProblems().length) {
    const url = request.nextUrl.clone();
    url.pathname = "/setup";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
