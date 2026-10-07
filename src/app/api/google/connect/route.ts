import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { withError } from "@/components/app/flash";
import { getOperator } from "@/lib/auth";
import { authorizationUrl, googleConfigured, STATE_COOKIE } from "@/lib/google/oauth";
import { appOrigin } from "@/lib/request";

/** Starts the Google consent flow. `?next=` is where to land afterwards. */
export async function GET(request: Request) {
  const origin = await appOrigin();
  if (!(await getOperator())) return NextResponse.redirect(`${origin}/login`);
  if (!googleConfigured()) {
    return NextResponse.redirect(
      `${origin}${withError("/settings", "Google isn't configured yet (see Settings).")}`,
    );
  }

  const next = new URL(request.url).searchParams.get("next") ?? "/settings";
  const state = randomBytes(24).toString("base64url");
  (await cookies()).set(STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https"),
    maxAge: 10 * 60,
    path: "/api/google",
  });
  return NextResponse.redirect(authorizationUrl(origin, state));
}
