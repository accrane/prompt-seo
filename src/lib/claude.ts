import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/env";

/** Model for the prompts themselves (the strategy and writing work). */
export const RUN_MODEL = "claude-opus-5-5";
/**
 * Opus 5.5 defaults to medium effort; the five prompts are long, multi-phase
 * analyses, so they run at high. Page drafts (Prompt 3) can be switched per run.
 */
export const DEFAULT_EFFORT = "high";
export const EFFORT_LEVELS = ["low", "medium", "high", "xhigh"] as const;
export type Effort = (typeof EFFORT_LEVELS)[number];

/** Cheaper model that turns finished output into pages and checklist items. */
export const EXTRACT_MODEL = "claude-sonnet-5";

/**
 * Server-side refusal fallback: if a safety classifier declines a request,
 * the API re-runs it on Anthropic's recommended fallback model instead of
 * failing the run. SEO work should never trip one, but a false positive
 * mid-run would otherwise waste every step before it.
 */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export function claude(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set (see .env.example).");
  }
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

/** USD per million tokens. Cache writes use the 5-minute rate. */
const PRICES: Record<
  string,
  { input: number; output: number; cacheWrite: number; cacheRead: number }
> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 },
  "claude-sonnet-5": { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
};
const WEB_SEARCH_USD = 10 / 1000;

export type UsageTotals = {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  web_searches: number;
  cost_usd: number;
};

export function emptyUsage(): UsageTotals {
  return {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    web_searches: 0,
    cost_usd: 0,
  };
}

type ApiUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
};

/** Adds one response's usage (priced at `model`) onto running totals. */
export function addUsage(totals: UsageTotals, model: string, usage: ApiUsage): UsageTotals {
  const price = PRICES[model] ?? PRICES[RUN_MODEL];
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const searches = usage.server_tool_use?.web_search_requests ?? 0;
  const cost =
    (usage.input_tokens * price.input +
      usage.output_tokens * price.output +
      cacheWrite * price.cacheWrite +
      cacheRead * price.cacheRead) /
      1_000_000 +
    searches * WEB_SEARCH_USD;

  return {
    input_tokens: totals.input_tokens + usage.input_tokens,
    output_tokens: totals.output_tokens + usage.output_tokens,
    cache_read_tokens: totals.cache_read_tokens + cacheRead,
    cache_write_tokens: totals.cache_write_tokens + cacheWrite,
    web_searches: totals.web_searches + searches,
    cost_usd: totals.cost_usd + cost,
  };
}
