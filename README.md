# Prompt SEO

Internal Bellaworks tool that runs the five-prompt SEO system for each client
site: an intake form fills the prompts' `[VARIABLES]`, Claude runs each prompt
section by section (with web search), earlier approved outputs chain into later
prompts, and approved runs turn into a page plan and a checklist.

| Prompt                           | What it does                                          | When                       |
| -------------------------------- | ----------------------------------------------------- | -------------------------- |
| 1. Demand Cartography            | Maps demand across Google and AI answers              | Setup; yearly              |
| 2. Topical Sovereignty Blueprint | Site architecture, page plan, 12-month build calendar | After each Prompt 1        |
| 3. Dual-Citation Content Forge   | Writes one page                                       | Per page, per the calendar |
| 4. Crawl-to-Citation Diagnostic  | Technical audit, 30-day sprint                        | Quarterly                  |
| 5. Authority Gravity Engine      | Off-site authority, 90-day plan                       | After Prompt 1; quarterly  |

The prompt text lives verbatim in `src/lib/prompts/text/`. `src/lib/prompts/registry.ts`
maps every bracket to a variable; `pnpm check:prompts` fails if one is unmapped.

## Setup

1. `pnpm install`
2. Copy `.env.example` to `.env.local`. The Supabase values are the same as WP Manager's.
3. Run the files in `supabase/migrations/` once each, in order, in Supabase → SQL
   Editor. They only create `pseo_*` tables (and link projects to `wpm_sites`, so
   WP Manager's migrations must already be in place).
4. `pnpm dev` → http://localhost:3001. Sign in with the WP Manager login.

On Vercel (Pro): set the same env vars, including `NEXT_PUBLIC_APP_URL`. A
deployment without `ANTHROPIC_API_KEY` still serves the admin and client plan
pages; it just can't start or resume a run.

## Client plan page

Pages → **Create client link** gives a read-only page at `/plan/<token>` with
no login. It shows only the pages and checklist items ticked "Client sees
this" (creating the link ticks build months 1 and 2 to start). **Turn off
link** kills the URL. If you work on localhost but clients open the live site,
set `CLIENT_PLAN_ORIGIN` locally to the live URL so the link points there.

## How a run works

- Starting a run renders the prompt, stores it, and creates one step per
  OUTPUT FORMAT section. The worker (`src/lib/runs/worker.ts`) runs the steps
  as one conversation with `claude-opus-5-5` (adaptive thinking, web search,
  server-side refusal fallback), streaming text into the database for the
  live view.
- Each function invocation works for about 4 minutes, then hands the run to a
  fresh one via `/api/worker/runs/[id]` (authorized with `CRON_SECRET`). A
  lease on the run keeps two workers off it; a stalled run shows a Resume button.
- When all sections are done, `claude-sonnet-5` extracts checklist items (and
  for Prompt 2, the page plan). Approving the run commits them and makes it
  the output later prompts chain from.
- A per-project monthly budget blocks new runs once Claude spend reaches it.

## Search Console

Settings → Connect Google account (read-only `webmasters.readonly` scope). The
refresh token is encrypted with `CREDENTIALS_KEY`, the same key and format WP
Manager uses. Each project picks its property on the Intake page; **Pull from
Search Console** fills the `gsc_queries` (Prompt 1) and `gsc_pages` (Prompt 4)
data sources. The page indexing report isn't in the API, so it's still pasted.

Google Cloud setup: enable the Search Console API, configure the OAuth consent
screen, and create a Web application OAuth client with the redirect URI
`<app URL>/api/google/callback` (Settings shows the exact value).

## Not built yet

- PageSpeed connection (numbers are pasted for now)
- Scheduled Search Console refreshes
- Reminder emails / Vercel cron
- The monthly AI-visibility test across ChatGPT, Perplexity, Gemini and AI Mode
