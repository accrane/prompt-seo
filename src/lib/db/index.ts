import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Data access for Prompt SEO tables (pseo_*). Always the service-role client: every
 * caller has already passed `requireOperator()`. Keeping one entry point
 * makes that contract easy to audit.
 */
export function db() {
  return createAdminClient();
}

/** Throws a readable error when a Supabase query fails. */
export function must<T>(
  result: { data: T | null; error: { message: string } | null },
  what: string,
): T {
  if (result.error) {
    throw new Error(`${what}: ${result.error.message}`);
  }
  if (result.data === null) {
    throw new Error(`${what}: no data returned`);
  }
  return result.data;
}
