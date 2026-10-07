-- ============================================================
-- Prompt SEO — Google Search Console connection (migration 002)
-- Run once in Supabase → SQL Editor after 001. Safe to re-run.
-- ============================================================

-- A connected Google account. One is usually enough: an agency login that
-- can see every client's Search Console property.
create table if not exists public.pseo_google_connections (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  email              text not null unique,
  -- AES-256-GCM with CREDENTIALS_KEY (same key and format as WP Manager).
  refresh_token_enc  text not null,
  scopes             text not null,
  connected_by       text
);

alter table public.pseo_projects
  add column if not exists google_connection_id uuid
    references public.pseo_google_connections(id) on delete set null,
  -- Search Console property, e.g. "sc-domain:example.com" or "https://example.com/".
  add column if not exists gsc_property text,
  add column if not exists gsc_pulled_at timestamptz;

drop trigger if exists pseo_google_connections_touch on public.pseo_google_connections;
create trigger pseo_google_connections_touch
  before update on public.pseo_google_connections
  for each row execute function public.pseo_touch_updated_at();

alter table public.pseo_google_connections enable row level security;
drop policy if exists "authenticated full access" on public.pseo_google_connections;
create policy "authenticated full access" on public.pseo_google_connections
  for all to authenticated using (true) with check (true);
