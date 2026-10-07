import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { addUsage, claude, emptyUsage, FALLBACK_BETA, type UsageTotals } from "@/lib/claude";
import { db, must } from "@/lib/db";
import type { Run, RunStep } from "@/lib/db/types";
import { env } from "@/lib/env";
import { getRun, listSteps } from "@/lib/projects";
import { RUN_SYSTEM_PROMPT, sectionInstruction } from "@/lib/prompts/render";
import { extractRun } from "@/lib/runs/extract";
import {
  standInDir,
  standInExtraction,
  standInSection,
  StandInWaitExpired,
} from "@/lib/runs/stand-in";

type Message = Anthropic.Beta.BetaMessageParam;

/** How long one invocation holds a run before another may take it over. */
const LEASE_MS = 15 * 60 * 1000;
/**
 * Don't start a new section after this long in one invocation; hand off to a
 * fresh function instead. A section can take several minutes with search,
 * and Vercel Pro stops a function at 800s.
 */
const HANDOFF_AFTER_MS = 4 * 60 * 1000;
/** Guards against a runaway continue/pause loop inside one section. */
const MAX_CALLS_PER_STEP = 8;
/** How often streamed text is written to the database for the live view. */
const FLUSH_MS = 1500;

const CONTINUE_PROMPT =
  "Your reply was cut off by the length limit. Continue exactly where you stopped, without repeating anything.";

export class RefusalError extends Error {}
/** The operator canceled the run while a section was in progress. */
class CanceledError extends Error {}

/**
 * Takes the run's lease if nobody holds it. Returns false when another
 * invocation is already working on this run.
 */
async function claimLease(runId: string): Promise<boolean> {
  const now = new Date();
  const { data, error } = await db()
    .from("pseo_runs")
    .update({ lease_until: new Date(now.getTime() + LEASE_MS).toISOString() })
    .eq("id", runId)
    .in("status", ["queued", "running"])
    .or(`lease_until.is.null,lease_until.lt.${now.toISOString()}`)
    .select("id");
  if (error) throw new Error(`Claim run: ${error.message}`);
  return (data ?? []).length > 0;
}

async function updateRun(runId: string, patch: Partial<Run>) {
  const { error } = await db().from("pseo_runs").update(patch).eq("id", runId);
  if (error) throw new Error(`Update run: ${error.message}`);
}

async function updateStep(stepId: string, patch: Partial<RunStep>) {
  const { error } = await db().from("pseo_run_steps").update(patch).eq("id", stepId);
  if (error) throw new Error(`Update step: ${error.message}`);
}

/** Asks this app to continue the run in a fresh function invocation. */
export async function kickWorker(runId: string, origin: string): Promise<void> {
  const res = await fetch(`${env.NEXT_PUBLIC_APP_URL ?? origin}/api/worker/runs/${runId}`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.CRON_SECRET}` },
  });
  if (!res.ok) throw new Error(`Hand-off failed: HTTP ${res.status}`);
}

/**
 * Executes a run's remaining sections, in order. Safe to call repeatedly:
 * the lease keeps two invocations from working the same run, and each
 * section's conversation turns are saved, so a crash loses at most the
 * section in progress.
 */
export async function runWorker(runId: string, origin: string): Promise<void> {
  if (!(await claimLease(runId))) return;
  const startedAt = Date.now();

  try {
    for (;;) {
      const run = await getRun(runId);
      if (run.status !== "queued" && run.status !== "running") return;

      const steps = await listSteps(runId, true);
      const next = steps.find((s) => s.status !== "done");
      if (!next) {
        await finishRun(run, steps);
        return;
      }

      if (Date.now() - startedAt > HANDOFF_AFTER_MS) {
        await updateRun(runId, { lease_until: null });
        await kickWorker(runId, origin);
        return;
      }

      if (run.status === "queued") {
        await updateRun(runId, { status: "running", started_at: new Date().toISOString() });
      }
      await updateRun(runId, { lease_until: new Date(Date.now() + LEASE_MS).toISOString() });

      const usage = await executeStep(run, steps, next);
      const fresh = await getRun(runId);
      await updateRun(runId, {
        cost_usd: Number(fresh.cost_usd) + usage.cost_usd,
        input_tokens: Number(fresh.input_tokens) + usage.input_tokens,
        output_tokens: Number(fresh.output_tokens) + usage.output_tokens,
        cache_read_tokens: Number(fresh.cache_read_tokens) + usage.cache_read_tokens,
        cache_write_tokens: Number(fresh.cache_write_tokens) + usage.cache_write_tokens,
        web_searches: Number(fresh.web_searches) + usage.web_searches,
      });
    }
  } catch (err) {
    if (err instanceof CanceledError) return;
    if (err instanceof StandInWaitExpired) {
      // Still waiting for a hand-written reply: continue in a fresh function.
      await updateRun(runId, { lease_until: null });
      await kickWorker(runId, origin);
      return;
    }
    const message =
      err instanceof RefusalError
        ? err.message
        : err instanceof Anthropic.APIError
          ? `Claude API error ${err.status ?? ""}: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err);
    await updateRun(runId, { status: "failed", error: message, lease_until: null });
  }
}

/** Runs one section to completion; returns what it cost. */
async function executeStep(run: Run, steps: RunStep[], step: RunStep): Promise<UsageTotals> {
  // Replay the conversation so far: every finished section's turns, verbatim
  // (thinking and search blocks included, as the API requires).
  const history: Message[] = steps
    .filter((s) => s.idx < step.idx && s.status === "done")
    .flatMap((s) => s.messages as Message[]);

  const instruction = sectionInstruction(run.prompt, step.idx);
  const firstTurn =
    step.idx === 0 ? `${run.prompt_text.trimEnd()}\n\n---\n\n${instruction}` : instruction;

  // A section interrupted mid-way restarts from its instruction.
  const turns: Message[] = [{ role: "user", content: firstTurn }];
  await updateStep(step.id, {
    status: "running",
    started_at: new Date().toISOString(),
    output_md: "",
    edited_md: null,
    messages: turns,
  });

  const standIn = standInDir();
  if (standIn) {
    const request = [
      `# System\n\n${RUN_SYSTEM_PROMPT}`,
      ...[...history, ...turns]
        .filter((m) => typeof m.content === "string")
        .map((m) => `# ${m.role}\n\n${m.content as string}`),
    ].join("\n\n");
    const reply = await standInSection(
      standIn,
      run.id,
      step.idx,
      request,
      (textSoFar) => updateStep(step.id, { output_md: textSoFar }),
      async () => {
        const current = await getRun(run.id);
        if (current.status !== "running" && current.status !== "queued") {
          throw new CanceledError();
        }
        await updateRun(run.id, { lease_until: new Date(Date.now() + LEASE_MS).toISOString() });
      },
    );
    // Store a plain text turn so later sections replay a valid conversation.
    turns.push({ role: "assistant", content: reply });
    await updateStep(step.id, {
      status: "done",
      output_md: reply,
      messages: turns,
      completed_at: new Date().toISOString(),
    });
    return emptyUsage();
  }

  const client = claude();
  let usage = emptyUsage();
  let text = "";

  for (let call = 0; call < MAX_CALLS_PER_STEP; call++) {
    let lastFlush = 0;
    let streamed = "";

    const stream = client.beta.messages.stream({
      model: run.model,
      max_tokens: 64000,
      system: RUN_SYSTEM_PROMPT,
      messages: [...history, ...turns],
      thinking: { type: "adaptive" },
      output_config: { effort: run.effort as "low" | "medium" | "high" | "xhigh" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 8 }],
      cache_control: { type: "ephemeral" },
      betas: [FALLBACK_BETA],
      fallbacks: "default",
    });

    stream.on("text", (delta) => {
      streamed += delta;
      const now = Date.now();
      if (now - lastFlush > FLUSH_MS) {
        lastFlush = now;
        // Fire-and-forget: the live view only needs a recent snapshot.
        void updateStep(step.id, { output_md: text + streamed }).catch(() => {});
      }
    });

    const message = await stream.finalMessage();
    usage = addUsage(usage, run.model, message.usage);

    const blocks = message.content as Anthropic.Beta.BetaContentBlockParam[];
    turns.push({ role: "assistant", content: blocks });
    text += message.content.map((b) => (b.type === "text" ? b.text : "")).join("");

    await updateStep(step.id, { output_md: text, messages: turns });

    if (message.stop_reason === "refusal") {
      const details = message.stop_details;
      throw new RefusalError(
        `Claude declined this section (${details?.category ?? "no category"}). ${details?.explanation ?? ""}`.trim(),
      );
    }
    if (message.stop_reason === "model_context_window_exceeded") {
      throw new Error(
        "The conversation outgrew Claude's context window. Trim the pasted exports and re-run.",
      );
    }
    if (message.stop_reason === "pause_turn") {
      // Server-side search loop paused; resend as-is and it resumes.
      continue;
    }
    if (message.stop_reason === "max_tokens") {
      turns.push({ role: "user", content: CONTINUE_PROMPT });
      continue;
    }

    await updateStep(step.id, {
      status: "done",
      output_md: text.trim(),
      messages: turns,
      completed_at: new Date().toISOString(),
    });
    return usage;
  }

  throw new Error(`Section "${step.section}" did not finish after ${MAX_CALLS_PER_STEP} calls.`);
}

/** All sections done: pull out pages and tasks, then hand to the operator. */
async function finishRun(run: Run, steps: RunStep[]): Promise<void> {
  const standIn = standInDir();
  const { extracted, usage } = standIn
    ? { extracted: await standInExtraction(standIn, run.id), usage: emptyUsage() }
    : await extractRun(run, steps);
  const fresh = await getRun(run.id);
  must(
    await db()
      .from("pseo_runs")
      .update({
        status: "review",
        extracted,
        completed_at: new Date().toISOString(),
        lease_until: null,
        cost_usd: Number(fresh.cost_usd) + usage.cost_usd,
        input_tokens: Number(fresh.input_tokens) + usage.input_tokens,
        output_tokens: Number(fresh.output_tokens) + usage.output_tokens,
      })
      .eq("id", run.id)
      .select("id"),
    "Finish run",
  );
}
