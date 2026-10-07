-- ============================================================
-- Prompt SEO — Google Business Profile items (migration 007)
-- Run once in Supabase → SQL Editor after 006. Safe to re-run.
-- ============================================================

-- A third checklist category, shown on its own tab of the client plan page.
alter table public.pseo_tasks
  drop constraint if exists pseo_tasks_category_check;
alter table public.pseo_tasks
  add constraint pseo_tasks_category_check
  check (category in ('checklist', 'technical', 'gbp'));
