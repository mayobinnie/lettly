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

-- Allow anon key to read/write (Clerk handles auth at the app layer)
create policy "Anon full access portfolios"
  on portfolios for all
  using (true)
  with check (true);

-- Legislation alerts
create table if not exists legislation_alerts (
  id uuid default gen_random_uuid() primary key,
  topic text,
  status text,
  summary text,
  urgency text,
  checked_at timestamptz default now(),
  actioned boolean default false
);

alter table legislation_alerts enable row level security;
drop policy if exists "Authenticated users read alerts" on legislation_alerts;
create policy "Anon read alerts"
  on legislation_alerts for select using (true);
create policy "Anon write alerts"
  on legislation_alerts for all using (true) with check (true);

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
create policy "Anon manages subscribers"
  on newsletter_subscribers for all using (true) with check (true);
