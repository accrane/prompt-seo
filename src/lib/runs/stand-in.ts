import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Extracted } from "@/lib/db/types";

/**
 * Development-only stand-in for the Claude API. With CLAUDE_STAND_IN_DIR set
 * (and never in production), the worker doesn't call Anthropic: it writes
 * each section's full request to disk and waits for a reply file, then
 * streams that reply into the run like a live response. Lets the whole run
 * flow be exercised before an API key exists.
 *
 *   <dir>/<runId>/<idx>.request.md   written by the app (system + prompt + instruction)
 *   <dir>/<runId>/<idx>.md           the section, written by whoever stands in
 *   <dir>/<runId>/extracted.json     optional; checklist items / pages
 */
export function standInDir(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  const dir = process.env.CLAUDE_STAND_IN_DIR?.trim();
  return dir ? path.resolve(dir) : null;
}

const POLL_MS = 2000;
/**
 * Stop waiting well before the function's 800s limit; the worker hands the
 * run to a fresh invocation, which starts waiting again.
 */
const WAIT_PER_INVOCATION_MS = 10 * 60 * 1000;

/** No reply yet and this invocation's time is nearly up. */
export class StandInWaitExpired extends Error {}

async function readIfExists(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch {
    return null;
  }
}

/**
 * Waits for the section reply, then feeds it to `onText` in chunks so the
 * live view streams. `heartbeat` runs every ~10s while waiting: the worker
 * renews its lease there, and throws to stop waiting when the run is canceled.
 */
export async function standInSection(
  dir: string,
  runId: string,
  idx: number,
  request: string,
  onText: (textSoFar: string) => Promise<void>,
  heartbeat: () => Promise<void>,
): Promise<string> {
  const runDir = path.join(dir, runId);
  await mkdir(runDir, { recursive: true });
  await writeFile(path.join(runDir, `${idx}.request.md`), request);

  const deadline = Date.now() + WAIT_PER_INVOCATION_MS;
  let reply: string | null = null;
  let beats = 0;
  while (!(reply = await readIfExists(path.join(runDir, `${idx}.md`)))) {
    if (Date.now() > deadline)
      throw new Error(`Stand-in: no reply for section ${idx + 1} within an hour.`);
    await new Promise((r) => setTimeout(r, POLL_MS));
    if (++beats % 5 === 0) await heartbeat();
  }

  // Stream it in over ~10 seconds, a line-aligned chunk at a time.
  const lines = reply.split("\n");
  const chunk = Math.max(1, Math.ceil(lines.length / 20));
  for (let i = chunk; i < lines.length; i += chunk) {
    await onText(lines.slice(0, i).join("\n"));
    await new Promise((r) => setTimeout(r, 500));
  }
  return reply.trim();
}

export async function standInExtraction(dir: string, runId: string): Promise<Extracted> {
  const raw = await readIfExists(path.join(dir, runId, "extracted.json"));
  if (!raw) return { tasks: [], error: "Stand-in mode: no extracted.json was provided." };
  try {
    return JSON.parse(raw) as Extracted;
  } catch {
    return { tasks: [], error: "Stand-in mode: extracted.json is not valid JSON." };
  }
}
