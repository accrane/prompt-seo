import { getOperator } from "@/lib/auth";
import { getRun, listSteps } from "@/lib/projects";

/** Live progress for the run page: status, cost, and each section's text so far. */
export async function GET(_request: Request, ctx: RouteContext<"/api/runs/[id]">) {
  if (!(await getOperator())) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const [run, steps] = await Promise.all([getRun(id), listSteps(id)]);
  return Response.json({
    status: run.status,
    error: run.error,
    cost_usd: Number(run.cost_usd),
    lease_until: run.lease_until,
    steps: steps.map((s) => ({
      id: s.id,
      idx: s.idx,
      section: s.section,
      status: s.status,
      output_md: s.output_md,
    })),
  });
}
