import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { withError, withFlash } from "@/components/app/flash";
import { getOperator } from "@/lib/auth";
import { saveConnectionFromCode, STATE_COOKIE } from "@/lib/google/oauth";
import { appOrigin } from "@/lib/request";

/** Google redirects here after consent. Verifies state, stores the refresh token. */
export async function GET(request: Request) {
  const origin = await appOrigin();
  const operator = await getOperator();
  if (!operator) return NextResponse.redirect(`${origin}/login`);

  const url = new URL(request.url);
  const jar = await cookies();
  const saved = jar.get(STATE_COOKIE)?.value;
  jar.delete({ name: STATE_COOKIE, path: "/api/google" });

  let next = "/settings";
  let expected: string | null = null;
  try {
    const parsed = JSON.parse(saved ?? "{}") as { state?: string; next?: string };
    expected = parsed.state ?? null;
    if (parsed.next?.startsWith("/") && !parsed.next.startsWith("//")) next = parsed.next;
  } catch {
    expected = null;
  }

  const fail = (message: string) => NextResponse.redirect(`${origin}${withError(next, message)}`);
  if (url.searchParams.get("error")) return fail(`Google: ${url.searchParams.get("error")}`);
  if (!expected || url.searchParams.get("state") !== expected) {
    return fail("The Google sign-in expired or didn't match. Try connecting again.");
  }
  const code = url.searchParams.get("code");
  if (!code) return fail("Google didn't return an authorization code.");

  try {
    const connection = await saveConnectionFromCode(code, origin, operator.email);
    return NextResponse.redirect(
      `${origin}${withFlash(next, `Connected ${connection.email} to Search Console.`)}`,
    );
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}
