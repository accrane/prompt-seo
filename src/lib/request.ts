import "server-only";

import { headers } from "next/headers";

import { env } from "@/lib/env";

/** This app's public origin, for the worker's hand-off calls. */
export async function appOrigin(): Promise<string> {
  if (env.NEXT_PUBLIC_APP_URL) return env.NEXT_PUBLIC_APP_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3001";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Origin for client plan links. Set CLIENT_PLAN_ORIGIN when the admin work
 * happens on one copy (e.g. localhost) but clients open the live site.
 */
export async function clientPlanOrigin(): Promise<string> {
  return env.CLIENT_PLAN_ORIGIN ?? (await appOrigin());
}
