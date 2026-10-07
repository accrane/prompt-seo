import "server-only";

import { db, must } from "@/lib/db";
import type { Page, Project } from "@/lib/db/types";
import {
  getPage,
  latestApprovedRun,
  listDataSources,
  listSteps,
  runMarkdown,
  stepText,
} from "@/lib/projects";
import { PROMPTS, promptVariables, type PromptId } from "@/lib/prompts/registry";
import { renderPrompt, resolveInputs, type InputValues } from "@/lib/prompts/render";

export type RuntimeInputs = {
  pageId?: string;
  proprietary_material?: string;
  current_top_results?: string;
};

/** A plan row formatted the way the doc asks for it in Prompt 3. */
export function formatPageRow(page: Page): string {
  return [
    `URL: ${page.url}`,
    `Page type: ${page.page_type ?? ""}`,
    `Canonical query: ${page.canonical_query ?? ""}`,
    `Supporting queries: ${page.supporting_queries.join("; ")}`,
    `Intent: ${page.intent ?? ""}`,
    `Journey stage: ${page.journey_stage ?? ""}`,
    `Job: ${page.job ?? ""}`,
    `Conversion point: ${page.conversion_point ?? ""}`,
  ].join("\n");
}

async function sectionOf(runId: string, section: string): Promise<string | null> {
  const steps = await listSteps(runId);
  const step = steps.find((s) => s.section === section);
  return step ? stepText(step) : null;
}

/**
 * Gathers every value a prompt needs: intake answers, data sources, approved
 * earlier outputs, and per-run inputs. Only loads what the prompt uses.
 */
export async function gatherInputs(
  project: Project,
  prompt: PromptId,
  runtime: RuntimeInputs = {},
): Promise<{ raw: InputValues; page: Page | null; blockers: string[] }> {
  const keys = new Set(promptVariables(prompt).map((v) => v.key));
  const raw: InputValues = { ...project.profile, website_url: project.website_url };
  const blockers: string[] = [];

  // Earlier prompts must be approved before their output can be chained.
  for (const required of PROMPTS[prompt].requires) {
    if (!(await latestApprovedRun(project.id, required))) {
      blockers.push(
        `Approve a Prompt ${PROMPTS[required].number} (${PROMPTS[required].name}) run first.`,
      );
    }
  }

  const sources = await listDataSources(project.id);
  const byKind = new Map(sources.map((s) => [s.kind, s.content]));
  for (const key of keys) {
    const content = byKind.get(key);
    if (content) raw[key] = content;
  }
  // "OR PASTE YOUR SITEMAP AND I WILL WORK FROM THAT"
  if (keys.has("crawl_export") && !raw.crawl_export && byKind.get("site_urls")) {
    raw.crawl_export = `No crawl export. Sitemap / URL list instead:\n${byKind.get("site_urls")}`;
  }

  if (keys.has("p1_output") || keys.has("p1_gatekeepers")) {
    const p1 = await latestApprovedRun(project.id, "p1");
    if (p1) {
      if (keys.has("p1_output")) raw.p1_output = runMarkdown(await listSteps(p1.id));
      if (keys.has("p1_gatekeepers")) {
        raw.p1_gatekeepers = (await sectionOf(p1.id, "SERP and AI-Source Landscape")) ?? "";
      }
    }
  }

  if (keys.has("p2_cluster_map")) {
    const p2 = await latestApprovedRun(project.id, "p2");
    if (p2) raw.p2_cluster_map = (await sectionOf(p2.id, "Cluster Map")) ?? "";
  }

  if (keys.has("p3_corroboration")) {
    const p3Runs = must(
      await db()
        .from("pseo_runs")
        .select("id, page_id, pseo_pages!pseo_runs_page_fk(url)")
        .eq("project_id", project.id)
        .eq("prompt", "p3")
        .eq("status", "approved")
        .order("approved_at"),
      "Load built pages",
    ) as unknown as { id: string; pseo_pages: { url: string } | null }[];
    const parts: string[] = [];
    for (const run of p3Runs) {
      const text = await sectionOf(run.id, "Corroboration targets");
      if (text) parts.push(`### ${run.pseo_pages?.url ?? "Page"}\n${text}`);
    }
    if (parts.length) raw.p3_corroboration = parts.join("\n\n");
  }

  let page: Page | null = null;
  if (prompt === "p3") {
    page = runtime.pageId ? await getPage(runtime.pageId) : null;
    if (!page) blockers.push("Pick a page from the site plan to build.");
    else raw.page_row = formatPageRow(page);
    raw.proprietary_material = runtime.proprietary_material ?? "";
    raw.current_top_results = runtime.current_top_results ?? "";
  }

  return { raw, page, blockers };
}

/** Everything the run page needs to preview and start a run. */
export async function prepareRun(project: Project, prompt: PromptId, runtime: RuntimeInputs = {}) {
  const { raw, page, blockers } = await gatherInputs(project, prompt, runtime);
  const { inputs, missing } = resolveInputs(prompt, raw);
  return {
    inputs,
    missing,
    blockers,
    page,
    promptText: renderPrompt(prompt, inputs),
  };
}

export type PreparedRun = Awaited<ReturnType<typeof prepareRun>>;
