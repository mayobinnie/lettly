-- Run this in your Supabase SQL editor

-- Main portfolios table (if not already created)
create table if not exists portfolios (
  user_id text primary key,
  data jsonb,
  updated_at timestamptz default now()
);

-- Legislation alerts from weekly monitor
create table if not exists legislation_alerts (
  id uuid default gen_random_uuid() primary key,
  topic text,
  status text,
  summary text,
  urgency text,
  checked_at timestamptz default now(),
  actioned boolean default false
);

-- Row level security
alter table portfolios enable row level security;
create policy if not exists "Users own portfolios"
  on portfolios for all using (user_id = auth.uid()::text);

-- Legislation alerts are readable by all authenticated users
alter table legislation_alerts enable row level security;
create policy if not exists "Authenticated users read alerts"
  on legislation_alerts for select using (auth.role() = 'authenticated');
