-- ============================================================
-- Prompt SEO — schema (migration 001)
-- Lives in the shared Site in a Day / WP Manager Supabase project. Every
-- object is prefixed pseo_ so it never collides with the other apps' tables.
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

-- 1. Projects: one per client site ---------------------------------------
create table if not exists public.pseo_projects (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  name               text not null,
  website_url        text not null,
  -- Optional link to the same site in WP Manager.
  wpm_site_id        uuid references public.wpm_sites(id) on delete set null,
  -- Intake answers keyed by variable (business_name, ideal_customer, ...).
  profile            jsonb not null default '{}'::jsonb,
  -- New runs are refused once this month's Claude spend reaches the cap.
  monthly_budget_usd numeric(10,2) not null default 50,
  status             text not null default 'active'
                     check (status in ('active', 'archived'))
);

-- 2. Data sources: exports and fetched files, latest one per kind ---------
create table if not exists public.pseo_data_sources (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  project_id  uuid not null references public.pseo_projects(id) on delete cascade,
  kind        text not null,            -- gsc_queries, site_urls, robots_txt, ...
  content     text not null,
  source      text not null default 'paste'
              check (source in ('paste', 'upload', 'fetch', 'gsc', 'pagespeed')),
  filename    text,
  unique (project_id, kind)
);

-- 3. Runs: one execution of one prompt -----------------------------------
create table if not exists public.pseo_runs (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  project_id          uuid not null references public.pseo_projects(id) on delete cascade,
  prompt              text not null check (prompt in ('p1', 'p2', 'p3', 'p4', 'p5')),
  -- Prompt 3 builds one page from the plan.
  page_id             uuid,
  status              text not null default 'queued'
                      check (status in ('queued', 'running', 'review', 'approved', 'failed', 'canceled')),
  model               text not null,
  effort              text not null,
  -- The exact prompt sent (variables filled in) and the values used.
  prompt_text         text not null,
  inputs              jsonb not null default '{}'::jsonb,
  total_steps         integer not null,
  -- Worker lease: a run is being executed while lease_until is in the future.
  lease_until         timestamptz,
  error               text,
  -- Structured pieces pulled from the output (pages, tasks, ...).
  extracted           jsonb,
  cost_usd            numeric(10,4) not null default 0,
  input_tokens        bigint not null default 0,
  output_tokens       bigint not null default 0,
  cache_read_tokens   bigint not null default 0,
  cache_write_tokens  bigint not null default 0,
  web_searches        integer not null default 0,
  started_at          timestamptz,
  completed_at        timestamptz,
  approved_at         timestamptz
);

create index if not exists pseo_runs_project_idx on public.pseo_runs (project_id, created_at desc);

-- 4. Run steps: one OUTPUT FORMAT section per step -----------------------
create table if not exists public.pseo_run_steps (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  run_id        uuid not null references public.pseo_runs(id) on delete cascade,
  idx           integer not null,
  section       text not null,
  status        text not null default 'pending'
                check (status in ('pending', 'running', 'done', 'failed')),
  -- Conversation turns added by this step (user instruction + assistant
  -- content blocks, verbatim) so later steps can replay the conversation.
  messages      jsonb not null default '[]'::jsonb,
  -- The section as the model wrote it (streamed in while running).
  output_md     text not null default '',
  -- Operator's edited version; used instead of output_md when set.
  edited_md     text,
  started_at    timestamptz,
  completed_at  timestamptz,
  unique (run_id, idx)
);

-- 5. Pages: the site plan from Prompt 2 ----------------------------------
create table if not exists public.pseo_pages (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  project_id         uuid not null references public.pseo_projects(id) on delete cascade,
  source_run_id      uuid references public.pseo_runs(id) on delete set null,
  url                text not null,
  page_type          text,
  canonical_query    text,
  supporting_queries text[] not null default '{}',
  intent             text,
  journey_stage      text,
  job                text,
  conversion_point   text,
  build_month        integer,
  action             text not null default 'new'
                     check (action in ('new', 'rewrite', 'merge', 'redirect')),
  status             text not null default 'planned'
                     check (status in ('planned', 'drafting', 'drafted', 'published', 'skipped')),
  draft_run_id       uuid references public.pseo_runs(id) on delete set null
);

create index if not exists pseo_pages_project_idx on public.pseo_pages (project_id, build_month);

alter table public.pseo_runs
  drop constraint if exists pseo_runs_page_fk;
alter table public.pseo_runs
  add constraint pseo_runs_page_fk foreign key (page_id)
  references public.pseo_pages(id) on delete set null;

-- 6. Tasks: the checklist ------------------------------------------------
create table if not exists public.pseo_tasks (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  project_id     uuid not null references public.pseo_projects(id) on delete cascade,
  source_run_id  uuid references public.pseo_runs(id) on delete set null,
  title          text not null,
  detail         text,
  owner          text,                  -- developer, content, seo, ...
  due_on         date,
  done_at        timestamptz,
  sort           integer not null default 0
);

create index if not exists pseo_tasks_project_idx on public.pseo_tasks (project_id, done_at, due_on);

-- 7. updated_at trigger --------------------------------------------------
create or replace function public.pseo_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['pseo_projects','pseo_data_sources','pseo_runs','pseo_run_steps','pseo_pages','pseo_tasks']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.pseo_touch_updated_at()',
      t || '_touch', t
    );
  end loop;
end $$;

-- 8. Row Level Security --------------------------------------------------
-- The app talks to these tables server-side with the service role (which
-- bypasses RLS) after verifying the operator. RLS stays on so the anon key
-- can never touch them from a browser.
do $$
declare
  t text;
begin
  foreach t in array array['pseo_projects','pseo_data_sources','pseo_runs','pseo_run_steps','pseo_pages','pseo_tasks']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "authenticated full access" on public.%I', t);
    execute format(
      'create policy "authenticated full access" on public.%I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;
