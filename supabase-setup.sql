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

-- Newsletter subscribers table
create table if not exists newsletter_subscribers (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  name text,
  signed_up_at timestamptz default now(),
  unsubscribed boolean default false,
  source text default 'signup'
);

alter table newsletter_subscribers enable row level security;
create policy "Service role manages subscribers"
  on newsletter_subscribers for all using (true);
