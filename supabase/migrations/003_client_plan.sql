-- ============================================================
-- Prompt SEO — client plan page (migration 003)
-- Run once in Supabase → SQL Editor after 002. Safe to re-run.
-- ============================================================

-- Unguessable token for the read-only plan page at /plan/<token>. Null means
-- the project has no client link (never shared, or turned off).
alter table public.pseo_projects
  add column if not exists share_token text unique;

-- Only pages ticked here appear on the client plan page.
alter table public.pseo_pages
  add column if not exists client_visible boolean not null default false;
