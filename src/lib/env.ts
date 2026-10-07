import { z } from "zod";

/** Every environment variable the app reads, validated once. */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    error: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL (see .env.example)",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    error: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required (see .env.example)",
  }),
  // Server-only. Undefined in the browser bundle; features that need them
  // fail with a targeted message instead of a mysterious one.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  ALLOWED_EMAIL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  // Shared secret for the run worker calling itself between steps (and for
  // Vercel Cron once reminders land).
  CRON_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  // Where clients open their plan link, when that isn't this copy of the app.
  CLIENT_PLAN_ORIGIN: z.string().optional(),
  // Encrypts stored Google refresh tokens; same value as WP Manager's.
  CREDENTIALS_KEY: z.string().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}

/** Blank values in .env files count as unset. */
function opt(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

// NEXT_PUBLIC_* vars are inlined at build time, so they must be referenced
// explicitly rather than through a dynamic process.env lookup.
export const env: Env = parseEnv({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: opt(process.env.SUPABASE_SERVICE_ROLE_KEY),
  ALLOWED_EMAIL: opt(process.env.ALLOWED_EMAIL),
  ANTHROPIC_API_KEY: opt(process.env.ANTHROPIC_API_KEY),
  CRON_SECRET: opt(process.env.CRON_SECRET),
  NEXT_PUBLIC_APP_URL: opt(process.env.NEXT_PUBLIC_APP_URL)?.replace(/\/$/, ""),
  CLIENT_PLAN_ORIGIN: opt(process.env.CLIENT_PLAN_ORIGIN)?.replace(/\/$/, ""),
  CREDENTIALS_KEY: opt(process.env.CREDENTIALS_KEY),
  GOOGLE_CLIENT_ID: opt(process.env.GOOGLE_CLIENT_ID),
  GOOGLE_CLIENT_SECRET: opt(process.env.GOOGLE_CLIENT_SECRET),
});
