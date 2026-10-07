-- ============================================================
-- Prompt SEO — client answers on checklist items (migration 006)
-- Run once in Supabase → SQL Editor after 005. Safe to re-run.
-- ============================================================

alter table public.pseo_tasks
  -- Show an answer box for this item on the client plan page.
  add column if not exists asks_answer boolean not null default false,
  -- What the client typed there, and when they last saved it.
  add column if not exists client_answer text,
  add column if not exists client_answered_at timestamptz;
