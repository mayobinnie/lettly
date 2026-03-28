-- ============================================================
-- SECURITY FIX - Run this in Supabase SQL Editor immediately
-- ============================================================

-- 1. Lock down portfolios - block all direct anon access
drop policy if exists "Anon full access portfolios" on portfolios;
drop policy if exists "Block direct access" on portfolios;
create policy "Block direct access" on portfolios for all using (false);

-- 2. Lock down legislation alerts
drop policy if exists "Anon read alerts" on legislation_alerts;
drop policy if exists "Anon write alerts" on legislation_alerts;
drop policy if exists "Block direct access alerts" on legislation_alerts;
create policy "Block direct access alerts" on legislation_alerts for all using (false);

-- 3. Lock down newsletter subscribers
drop policy if exists "Anon manages subscribers" on newsletter_subscribers;
drop policy if exists "Service role manages subscribers" on newsletter_subscribers;
drop policy if exists "Block direct access newsletter" on newsletter_subscribers;
create policy "Block direct access newsletter" on newsletter_subscribers for all using (false);

-- Verify RLS is enabled on all tables
alter table portfolios enable row level security;
alter table legislation_alerts enable row level security;
alter table newsletter_subscribers enable row level security;

-- Check result (should show 0 rows accessible via anon key)
-- select count(*) from portfolios; -- run this after as the anon role to confirm it returns 0
