import { env } from "@/lib/env";

export type ConfigProblem = { name: string; problem: string };

/**
 * Server-side configuration the app cannot run without. Pure and cheap so
 * the proxy can call it on every request and route to /setup instead of
 * letting pages throw an opaque production error.
 */
export function configProblems(): ConfigProblem[] {
  const problems: ConfigProblem[] = [];

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    problems.push({
      name: "SUPABASE_SERVICE_ROLE_KEY",
      problem: "Missing. Supabase → Settings → API → service_role.",
    });
  } else if (!/^(ey|sb_secret_)/.test(env.SUPABASE_SERVICE_ROLE_KEY)) {
    problems.push({
      name: "SUPABASE_SERVICE_ROLE_KEY",
      problem:
        "Does not look like a Supabase secret key (should start with “sb_secret_” or “ey”). Check for stray quotes or spaces.",
    });
  }

  if (!env.CRON_SECRET) {
    problems.push({
      name: "CRON_SECRET",
      problem: "Missing. Any long random string (openssl rand -base64 32).",
    });
  }

  return problems;
}

/**
 * Why this deployment can't run prompts, or null when it can. Kept out of
 * `configProblems()` on purpose: a deployment without a Claude key (one that
 * only serves the admin and client plan pages) still works for everything
 * except starting or resuming a run.
 */
export function runBlocker(): string | null {
  // Dev-only stand-in mode (see src/lib/runs/stand-in.ts) needs no key.
  const standIn = process.env.NODE_ENV !== "production" && process.env.CLAUDE_STAND_IN_DIR;
  if (env.ANTHROPIC_API_KEY || standIn) return null;
  return "This deployment has no ANTHROPIC_API_KEY, so it can't run prompts. Add one (console.anthropic.com → API keys), or run prompts from a copy that has one.";
}
