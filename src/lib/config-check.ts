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

  // Dev-only stand-in mode (see src/lib/runs/stand-in.ts) needs no key.
  const standIn = process.env.NODE_ENV !== "production" && process.env.CLAUDE_STAND_IN_DIR;
  if (!env.ANTHROPIC_API_KEY && !standIn) {
    problems.push({
      name: "ANTHROPIC_API_KEY",
      problem: "Missing. console.anthropic.com → API keys.",
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
