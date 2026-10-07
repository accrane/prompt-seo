import "server-only";

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { addUsage, claude, emptyUsage, EXTRACT_MODEL, type UsageTotals } from "@/lib/claude";
import type { Extracted, Run, RunStep } from "@/lib/db/types";
import { stepText } from "@/lib/projects";
import { PROMPTS, type PromptId } from "@/lib/prompts/registry";

const TaskSchema = z.object({
  title: z.string().describe("Imperative, specific, under 90 characters."),
  detail: z
    .string()
    .describe("One or two sentences: what exactly to do and how to know it's done."),
  owner: z.enum(["developer", "content", "seo", "operator"]),
  due_in_days: z
    .number()
    .int()
    .nullable()
    .describe(
      "Days from today it should be done, from the plan's own timing; null if the output gives none.",
    ),
});

const PageSchema = z.object({
  url: z.string().describe("Path or full URL exactly as in the Cluster Map."),
  page_type: z.string(),
  canonical_query: z.string(),
  supporting_queries: z.array(z.string()),
  intent: z.string(),
  journey_stage: z.string(),
  job: z.string(),
  conversion_point: z.string(),
  build_month: z
    .number()
    .int()
    .nullable()
    .describe("Month 1-12 from the 12-Month Build Calendar; null if the page isn't scheduled."),
  action: z.enum(["new", "rewrite", "merge", "redirect"]),
});

/** Which sections feed extraction, and what to pull from them. */
const PLANS: Record<PromptId, { sections: string[]; tasks: string; pages?: boolean }> = {
  p1: {
    sections: ["The Ten Battles", "Assumptions Log"],
    tasks:
      "Checklist items for the operator: one task to review and correct the Assumptions Log, plus any concrete preparation the Ten Battles call for (data to gather, pages to prioritise). At most 8 tasks. No tasks that merely restate a battle.",
  },
  p2: {
    sections: ["Cluster Map", "12-Month Build Calendar", "Cannibalization Report"],
    tasks:
      "One task per merge, redirect, prune, consolidate or noindex action in the Cannibalization Report. Do not create tasks for writing new pages; those come from the pages list.",
    pages: true,
  },
  p3: {
    sections: [
      "On-page package",
      "Corroboration targets",
      "Anything you need from me before this can publish",
    ],
    tasks:
      "One task per item the page still needs before publishing (placeholders to fill, data or quotes to get, approvals), plus one task per corroboration target to place the page's claims there.",
  },
  p4: {
    sections: ["30-Day Sprint", "Findings Register"],
    tasks:
      "One task per fix in the 30-Day Sprint, in order, with due dates spread across the 30 days as the sprint orders them. Add the highest-ranked remaining Findings Register items only if the sprint omits them. At most 20 tasks.",
  },
  p5: {
    sections: ["90-Day Plan"],
    tasks:
      "One task per week of the 90-Day Plan: the week's single most important action, due at the end of that week (week n → 7n days).",
  },
};

/**
 * Turns a finished run's prose into structured rows: checklist tasks for
 * every prompt, and the page plan for Prompt 2. Failures don't fail the
 * run; the operator can still read and approve it.
 */
export async function extractRun(
  run: Run,
  steps: RunStep[],
): Promise<{ extracted: Extracted; usage: UsageTotals }> {
  const plan = PLANS[run.prompt];
  const source = steps
    .filter((s) => plan.sections.includes(s.section))
    .map(stepText)
    .join("\n\n");

  const schema = plan.pages
    ? z.object({ tasks: z.array(TaskSchema), pages: z.array(PageSchema) })
    : z.object({ tasks: z.array(TaskSchema) });

  const instructions = [
    `Below is part of the output of "${PROMPTS[run.prompt].name}", an SEO deliverable.`,
    `Tasks: ${plan.tasks}`,
    plan.pages
      ? "Pages: one entry per row of the Cluster Map, every row, in order. Take build_month and action (New/Rewrite/Merge/Redirect) from the 12-Month Build Calendar."
      : "",
    "Use only what the output says. Do not invent pages, tasks, or dates.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await claude().messages.parse({
      model: EXTRACT_MODEL,
      max_tokens: 20000,
      output_config: { effort: "low", format: zodOutputFormat(schema) },
      messages: [
        {
          role: "user",
          content: `${instructions}\n\n<output>\n${source}\n</output>`,
        },
      ],
    });
    const usage = addUsage(emptyUsage(), EXTRACT_MODEL, response.usage);
    if (!response.parsed_output) {
      return {
        extracted: { tasks: [], error: "Could not read pages and tasks from the output." },
        usage,
      };
    }
    return { extracted: response.parsed_output as Extracted, usage };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      extracted: { tasks: [], error: `Extraction failed: ${message}` },
      usage: emptyUsage(),
    };
  }
}
