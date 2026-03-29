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

-- ============================================================
-- CONTENT QUEUE — AI agent drafts, human approves
-- ============================================================
create table if not exists content_queue (
  id uuid default gen_random_uuid() primary key,
  type text not null, -- 'blog_post' | 'social_instagram' | 'social_linkedin' | 'email_blast' | 'seo_article'
  status text default 'draft', -- 'draft' | 'approved' | 'published' | 'rejected'
  title text,
  body text,
  meta_description text,
  slug text,
  tags text[],
  source text, -- what triggered it: 'legislation_alert' | 'weekly_seo' | 'manual'
  source_id text, -- e.g. legislation alert id
  urgency text default 'LOW', -- 'HIGH' | 'MEDIUM' | 'LOW'
  created_at timestamptz default now(),
  approved_at timestamptz,
  published_at timestamptz,
  notes text
);

alter table content_queue enable row level security;
drop policy if exists "Block direct access queue" on content_queue;
create policy "Block direct access queue" on content_queue for all using (false);

-- ============================================================
-- EXPENSES TABLE
-- ============================================================
create table if not exists expenses (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  prop_id text not null,
  category text not null,
  amount numeric not null,
  date date,
  description text,
  receipt_url text,
  created_at timestamptz default now()
);
alter table expenses enable row level security;
drop policy if exists "Block direct access expenses" on expenses;
create policy "Block direct access expenses" on expenses for all using (false);

-- ============================================================
-- REFERRALS TABLE
-- ============================================================
create table if not exists referrals (
  id uuid default gen_random_uuid() primary key,
  referrer_id text not null,
  code text unique,
  referred_by text,
  credits integer default 0,
  created_at timestamptz default now()
);
alter table referrals enable row level security;
drop policy if exists "Block direct access referrals" on referrals;
create policy "Block direct access referrals" on referrals for all using (false);
