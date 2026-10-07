import "server-only";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * The staff allowlist is shared with WP Manager: its Settings page stores the
 * team under wpm_settings.key = "team". Reading it here means one place to
 * add or remove a teammate for both tools.
 */
type TeamMember = { email: string };

async function listTeam(): Promise<TeamMember[]> {
  const { data, error } = await db()
    .from("wpm_settings")
    .select("value")
    .eq("key", "team")
    .maybeSingle();
  // WP Manager's tables may not exist in a fresh database; the owner can still sign in.
  if (error) return [];
  const value = (data as { value?: unknown } | null)?.value;
  return Array.isArray(value) ? (value as TeamMember[]) : [];
}

/** The owner is ALLOWED_EMAIL; with no allowlist configured, everyone is. */
export function isOwner(email: string): boolean {
  if (!env.ALLOWED_EMAIL) return true;
  return email.toLowerCase() === env.ALLOWED_EMAIL.toLowerCase();
}

/** Owner, or anyone on the WP Manager team. */
export async function isAllowedEmail(email: string | undefined): Promise<boolean> {
  if (!email) return false;
  if (isOwner(email)) return true;
  const needle = email.toLowerCase();
  return (await listTeam()).some((m) => m.email?.toLowerCase() === needle);
}
