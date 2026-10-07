-- ============================================================
-- Prompt SEO — checklist on the client plan page (migration 004)
-- Run once in Supabase → SQL Editor after 003. Safe to re-run.
-- ============================================================

-- Only checklist items ticked here appear on the client plan page.
alter table public.pseo_tasks
  add column if not exists client_visible boolean not null default false;
