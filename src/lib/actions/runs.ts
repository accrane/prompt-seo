"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";

import { withError, withFlash } from "@/components/app/flash";
import { requireOperator } from "@/lib/auth";
import { DEFAULT_EFFORT, EFFORT_LEVELS, RUN_MODEL } from "@/lib/claude";
import { runBlocker } from "@/lib/config-check";
import { db, must } from "@/lib/db";
import type { Page } from "@/lib/db/types";
import { getProject, getRun, listPages, monthSpend } from "@/lib/projects";
import { PROMPT_IDS, PROMPTS, type PromptId } from "@/lib/prompts/registry";
import { appOrigin } from "@/lib/request";
import { prepareRun } from "@/lib/runs/inputs";
import { runWorker } from "@/lib/runs/worker";

function runPath(projectId: string, runId: string) {
  return `/projects/${projectId}/runs/${runId}`;
}

export async function startRun(projectId: string, formData: FormData): Promise<void> {
  await requireOperator();
  const prompt = String(formData.get("prompt")) as PromptId;
  if (!PROMPT_IDS.includes(prompt))
    redirect(withError(`/projects/${projectId}`, "Unknown prompt."));

  const pageId = String(formData.get("page_id") ?? "") || undefined;
  const back = `/projects/${projectId}/runs/new?prompt=${prompt}${pageId ? `&page=${pageId}` : ""}`;
  const blocker = runBlocker();
  if (blocker) redirect(withError(back, blocker));
  const effortValue = String(formData.get("effort") ?? DEFAULT_EFFORT);
  const effort = (EFFORT_LEVELS as readonly string[]).includes(effortValue)
    ? effortValue
    : DEFAULT_EFFORT;

  const project = await getProject(projectId);
  const spent = await monthSpend(projectId);
  if (spent >= Number(project.monthly_budget_usd)) {
    redirect(
      withError(
        back,
        `This month's Claude spend ($${spent.toFixed(2)}) has reached the $${Number(project.monthly_budget_usd).toFixed(2)} budget. Raise it on the intake page to keep going.`,
      ),
    );
  }

  const prepared = await prepareRun(project, prompt, {
    pageId,
    proprietary_material: String(formData.get("proprietary_material") ?? ""),
    current_top_results: String(formData.get("current_top_results") ?? ""),
  });
  if (prepared.blockers.length || prepared.missing.length) {
    redirect(
      withError(
        back,
        [...prepared.blockers, ...prepared.missing.map((m) => `Missing: ${m}`)].join(" "),
      ),
    );
  }

  const sections = PROMPTS[prompt].sections;
  const [run] = must(
    await db()
      .from("pseo_runs")
      .insert({
        project_id: projectId,
        prompt,
        page_id: prepared.page?.id ?? null,
        model: RUN_MODEL,
        effort,
        prompt_text: prepared.promptText,
        inputs: Object.fromEntries(prepared.inputs.map((i) => [i.key, i.value ?? ""])),
        total_steps: sections.length,
      })
      .select("id"),
    "Create run",
  ) as { id: string }[];

  must(
    await db()
      .from("pseo_run_steps")
      .insert(sections.map((s, idx) => ({ run_id: run.id, idx, section: s.name })))
      .select("id"),
    "Create run steps",
  );

  if (prepared.page) {
    must(
      await db()
        .from("pseo_pages")
        .update({ status: "drafting" })
        .eq("id", prepared.page.id)
        .select("id"),
      "Mark page drafting",
    );
  }

  const origin = await appOrigin();
  after(() => runWorker(run.id, origin));
  redirect(runPath(projectId, run.id));
}

/** Restarts a stalled or failed run from the first unfinished section. */
export async function resumeRun(runId: string): Promise<void> {
  await requireOperator();
  const run = await getRun(runId);
  const blocker = runBlocker();
  if (blocker) redirect(withError(runPath(run.project_id, runId), blocker));
  must(
    await db()
      .from("pseo_runs")
      .update({ status: "running", error: null, lease_until: null })
      .eq("id", runId)
      .in("status", ["queued", "running", "failed"])
      .select("id"),
    "Resume run",
  );
  must(
    await db()
      .from("pseo_run_steps")
      .update({ status: "pending" })
      .eq("run_id", runId)
      .neq("status", "done")
      .select("id"),
    "Reset unfinished steps",
  );
  const origin = await appOrigin();
  after(() => runWorker(runId, origin));
  redirect(withFlash(runPath(run.project_id, runId), "Resumed."));
}

export async function cancelRun(runId: string): Promise<void> {
  await requireOperator();
  const run = await getRun(runId);
  must(
    await db()
      .from("pseo_runs")
      .update({ status: "canceled", lease_until: null })
      .eq("id", runId)
      .in("status", ["queued", "running", "failed", "review"])
      .select("id"),
    "Cancel run",
  );
  if (run.page_id) await resetPageIfDrafting(run.page_id);
  redirect(withFlash(runPath(run.project_id, runId), "Run canceled."));
}

async function resetPageIfDrafting(pageId: string) {
  must(
    await db()
      .from("pseo_pages")
      .update({ status: "planned" })
      .eq("id", pageId)
      .eq("status", "drafting")
      .select("id"),
    "Reset page",
  );
}

export async function saveSectionEdit(
  runId: string,
  stepId: string,
  formData: FormData,
): Promise<void> {
  await requireOperator();
  const run = await getRun(runId);
  const text = String(formData.get("markdown") ?? "");
  must(
    await db()
      .from("pseo_run_steps")
      .update({ edited_md: text.trim() ? text : null })
      .eq("id", stepId)
      .eq("run_id", runId)
      .select("id"),
    "Save edit",
  );
  redirect(withFlash(`${runPath(run.project_id, runId)}#step-${stepId}`, "Section saved."));
}

export async function revertSectionEdit(runId: string, stepId: string): Promise<void> {
  await requireOperator();
  const run = await getRun(runId);
  must(
    await db()
      .from("pseo_run_steps")
      .update({ edited_md: null })
      .eq("id", stepId)
      .eq("run_id", runId)
      .select("id"),
    "Revert edit",
  );
  redirect(
    withFlash(`${runPath(run.project_id, runId)}#step-${stepId}`, "Reverted to Claude's version."),
  );
}

function dueDate(days: number | null): string | null {
  if (days === null || !Number.isFinite(days)) return null;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + Math.max(0, Math.round(days)));
  return d.toISOString().slice(0, 10);
}

/**
 * Approving makes the run the one later prompts chain from, and commits
 * what was extracted: checklist tasks for every prompt, the page plan for
 * Prompt 2, and the drafted status for Prompt 3's page.
 */
export async function approveRun(runId: string, formData: FormData): Promise<void> {
  await requireOperator();
  const run = await getRun(runId);
  const path = runPath(run.project_id, runId);
  if (run.status !== "review")
    redirect(withError(path, "Only a finished run waiting for review can be approved."));

  const includeTasks = formData.get("include_tasks") === "on";
  const extracted = run.extracted;

  if (includeTasks && extracted?.tasks.length) {
    must(
      await db()
        .from("pseo_tasks")
        .insert(
          extracted.tasks.map((t, i) => ({
            project_id: run.project_id,
            source_run_id: run.id,
            title: t.title,
            detail: t.detail,
            owner: t.owner,
            due_on: dueDate(t.due_in_days),
            sort: i,
          })),
        )
        .select("id"),
      "Add tasks",
    );
  }

  if (run.prompt === "p2" && extracted?.pages?.length) {
    // Replace the untouched part of the old plan; keep pages already in progress.
    const existing = await listPages(run.project_id);
    const keep = existing.filter((p) => p.status !== "planned");
    const keepUrls = new Set(keep.map((p) => p.url));
    must(
      await db()
        .from("pseo_pages")
        .delete()
        .eq("project_id", run.project_id)
        .eq("status", "planned")
        .select("id"),
      "Clear old plan",
    );
    const rows: Partial<Page>[] = extracted.pages
      .filter((p) => !keepUrls.has(p.url))
      .map((p) => ({
        project_id: run.project_id,
        source_run_id: run.id,
        url: p.url,
        page_type: p.page_type,
        canonical_query: p.canonical_query,
        supporting_queries: p.supporting_queries,
        intent: p.intent,
        journey_stage: p.journey_stage,
        job: p.job,
        conversion_point: p.conversion_point,
        build_month: p.build_month,
        action: p.action,
      }));
    if (rows.length)
      must(await db().from("pseo_pages").insert(rows).select("id"), "Save site plan");
  }

  if (run.prompt === "p3" && run.page_id) {
    must(
      await db()
        .from("pseo_pages")
        .update({ status: "drafted", draft_run_id: run.id })
        .eq("id", run.page_id)
        .select("id"),
      "Mark page drafted",
    );
  }

  must(
    await db()
      .from("pseo_runs")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", runId)
      .select("id"),
    "Approve run",
  );

  revalidatePath(`/projects/${run.project_id}`, "layout");
  const name = PROMPTS[run.prompt].name;
  redirect(withFlash(path, `${name} approved. Later prompts will use this output.`));
}
