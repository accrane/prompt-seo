import { after } from "next/server";

import { env } from "@/lib/env";
import { runWorker } from "@/lib/runs/worker";

// One run section can take several minutes with web search; each invocation
// works for up to ~4 minutes, then hands off to a fresh one.
export const maxDuration = 800;

/** Continues a run in a fresh function. Called by the worker itself. */
export async function POST(request: Request, ctx: RouteContext<"/api/worker/runs/[id]">) {
  if (!env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await ctx.params;
  const origin = new URL(request.url).origin;
  after(() => runWorker(id, origin));
  return Response.json({ accepted: true }, { status: 202 });
}
