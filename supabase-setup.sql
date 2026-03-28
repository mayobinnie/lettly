-- Run this in your Supabase SQL editor

-- Main portfolios table
create table if not exists portfolios (
  user_id text primary key,
  data jsonb,
  updated_at timestamptz default now()
);

-- IMPORTANT: Lettly uses Clerk auth, not Supabase auth
-- auth.uid() is always null so we use the anon key with open RLS
-- Security is handled at the API layer (Clerk protects all dashboard routes)
alter table portfolios enable row level security;

-- Drop old policy if exists
drop policy if exists "Users own portfolios" on portfolios;

-- All access goes through service key in API routes (verified Clerk auth)
-- Block direct anon access entirely
drop policy if exists "Anon full access portfolios" on portfolios;
create policy "Block direct access" on portfolios for all using (false);

-- Legislation alerts
create table if not exists legislation_alerts (
  id uuid default gen_random_uuid() primary key,
  topic text,
  topic_id text,
  status text,
  summary text,
  urgency text,
  source text,
  checked_at timestamptz default now(),
  actioned boolean default false
);

-- Add columns if table already exists
alter table legislation_alerts add column if not exists topic_id text;
alter table legislation_alerts add column if not exists source text;

alter table legislation_alerts enable row level security;
drop policy if exists "Authenticated users read alerts" on legislation_alerts;
-- Legislation alerts: only accessible via service key in API routes
drop policy if exists "Anon read alerts" on legislation_alerts;
drop policy if exists "Anon write alerts" on legislation_alerts;
create policy "Block direct access alerts" on legislation_alerts for all using (false);

-- Newsletter subscribers
create table if not exists newsletter_subscribers (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  name text,
  signed_up_at timestamptz default now(),
  unsubscribed boolean default false,
  source text default 'signup'
);

alter table newsletter_subscribers enable row level security;
drop policy if exists "Service role manages subscribers" on newsletter_subscribers;
drop policy if exists "Anon manages subscribers" on newsletter_subscribers;
create policy "Block direct access newsletter" on newsletter_subscribers for all using (false);
