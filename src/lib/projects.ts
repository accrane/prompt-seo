import "server-only";

import { notFound } from "next/navigation";

import { db, must } from "@/lib/db";
import type { DataSource, Page, Project, Run, RunStep, Task } from "@/lib/db/types";
import type { PromptId } from "@/lib/prompts/registry";

export async function listProjects(): Promise<Project[]> {
  return must(
    await db().from("pseo_projects").select("*").eq("status", "active").order("name"),
    "Load projects",
  ) as Project[];
}

export async function getProject(id: string): Promise<Project> {
  const { data, error } = await db().from("pseo_projects").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Load project: ${error.message}`);
  if (!data) notFound();
  return data as Project;
}

export async function listDataSources(projectId: string): Promise<DataSource[]> {
  return must(
    await db().from("pseo_data_sources").select("*").eq("project_id", projectId),
    "Load data sources",
  ) as DataSource[];
}

export async function listRuns(projectId: string): Promise<Run[]> {
  return must(
    await db()
      .from("pseo_runs")
      .select(
        "id, created_at, updated_at, project_id, prompt, page_id, status, model, effort, total_steps, lease_until, error, cost_usd, started_at, completed_at, approved_at",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    "Load runs",
  ) as Run[];
}

export async function getRun(runId: string): Promise<Run> {
  const { data, error } = await db().from("pseo_runs").select("*").eq("id", runId).maybeSingle();
  if (error) throw new Error(`Load run: ${error.message}`);
  if (!data) notFound();
  return data as Run;
}

export async function listSteps(runId: string, withMessages = false): Promise<RunStep[]> {
  const columns = withMessages
    ? "*"
    : "id, created_at, updated_at, run_id, idx, section, status, output_md, edited_md, started_at, completed_at";
  return must(
    await db().from("pseo_run_steps").select(columns).eq("run_id", runId).order("idx"),
    "Load run steps",
  ) as unknown as RunStep[];
}

/** The newest approved run of a prompt (for Prompt 3: of that page). */
export async function latestApprovedRun(projectId: string, prompt: PromptId): Promise<Run | null> {
  const { data, error } = await db()
    .from("pseo_runs")
    .select("*")
    .eq("project_id", projectId)
    .eq("prompt", prompt)
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Load approved run: ${error.message}`);
  return (data as Run | null) ?? null;
}

export async function listPages(projectId: string): Promise<Page[]> {
  return must(
    await db()
      .from("pseo_pages")
      .select("*")
      .eq("project_id", projectId)
      .order("build_month", { ascending: true, nullsFirst: false })
      .order("created_at"),
    "Load pages",
  ) as Page[];
}

export async function getPage(pageId: string): Promise<Page | null> {
  const { data, error } = await db().from("pseo_pages").select("*").eq("id", pageId).maybeSingle();
  if (error) throw new Error(`Load page: ${error.message}`);
  return (data as Page | null) ?? null;
}

export async function listTasks(projectId?: string): Promise<(Task & { project_name?: string })[]> {
  let query = db()
    .from("pseo_tasks")
    .select("*, pseo_projects(name)")
    .order("done_at", { ascending: true, nullsFirst: true })
    .order("due_on", { ascending: true, nullsFirst: false })
    .order("sort");
  if (projectId) query = query.eq("project_id", projectId);
  const rows = must(await query, "Load tasks") as (Task & {
    pseo_projects: { name: string } | null;
  })[];
  return rows.map(({ pseo_projects, ...t }) => ({ ...t, project_name: pseo_projects?.name }));
}

/** Claude spend for runs started this calendar month (UTC). */
export async function monthSpend(projectId: string): Promise<number> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const rows = must(
    await db()
      .from("pseo_runs")
      .select("cost_usd")
      .eq("project_id", projectId)
      .gte("created_at", start.toISOString()),
    "Load spend",
  ) as { cost_usd: number }[];
  return rows.reduce((sum, r) => sum + Number(r.cost_usd), 0);
}

/** Section text as it should be read and chained: the operator's edit wins. */
export function stepText(step: Pick<RunStep, "output_md" | "edited_md">): string {
  return (step.edited_md ?? step.output_md).trim();
}

export function runMarkdown(steps: Pick<RunStep, "output_md" | "edited_md">[]): string {
  return steps.map(stepText).filter(Boolean).join("\n\n");
}
