-- ============================================================
-- Prompt SEO — technical issues on the checklist (migration 005)
-- Run once in Supabase → SQL Editor after 004. Safe to re-run.
-- ============================================================

-- Technical audit findings live beside the checklist as their own category:
-- one row per affected URL, with `title` the issue and `detail` how to fix it.
alter table public.pseo_tasks
  add column if not exists category text not null default 'checklist',
  -- The page the issue is on (technical items only).
  add column if not exists url text,
  -- What the audit measured on that page, e.g. "6 H1 headings".
  add column if not exists note text;

alter table public.pseo_tasks
  drop constraint if exists pseo_tasks_category_check;
alter table public.pseo_tasks
  add constraint pseo_tasks_category_check check (category in ('checklist', 'technical'));
