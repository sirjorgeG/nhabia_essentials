-- Run in Supabase SQL editor after replacing OWNER_USER_UUID with the owner's auth.users UUID.
create table if not exists public.site_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.site_admins enable row level security;
revoke all on public.site_admins from anon, authenticated;
grant select on public.site_admins to authenticated;
drop policy if exists "owner can identify self" on public.site_admins;
create policy "owner can identify self" on public.site_admins for select to authenticated using (user_id=auth.uid());
-- MANUAL STEP: insert into public.site_admins(user_id) values ('OWNER_USER_UUID') on conflict do nothing;
create table if not exists public.reviews (
 id bigint generated always as identity primary key,
 product_id bigint not null references public.products(id) on delete cascade,
 display_name text not null check(char_length(display_name) between 2 and 60),
 rating integer not null check(rating between 1 and 5),
 body text not null check(char_length(body) between 15 and 1000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now()
);
create index if not exists reviews_public_idx on public.reviews(product_id,created_at desc) where status='approved';
alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;
grant select on public.reviews to anon,authenticated;
grant update on public.reviews to authenticated;
drop policy if exists "approved public" on public.reviews;
create policy "approved public" on public.reviews for select to anon using (status='approved');
drop policy if exists "owner reads reviews" on public.reviews;
create policy "owner reads reviews" on public.reviews for select to authenticated using (exists(select 1 from public.site_admins a where a.user_id=auth.uid()));
drop policy if exists "owner moderates reviews" on public.reviews;
create policy "owner moderates reviews" on public.reviews for update to authenticated using (exists(select 1 from public.site_admins a where a.user_id=auth.uid())) with check (exists(select 1 from public.site_admins a where a.user_id=auth.uid()));
-- Limit authenticated admin updates to status only (existing rows cannot be edited via browser).
revoke update on public.reviews from authenticated;
grant update(status) on public.reviews to authenticated;
create table if not exists public.review_rate_limits (ip_hash text primary key, window_start timestamptz not null default now(), count integer not null default 0);
alter table public.review_rate_limits enable row level security;
revoke all on public.review_rate_limits from anon,authenticated;
create or replace function public.claim_review_slot(p_ip_hash text) returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
 if p_ip_hash !~ '^[a-f0-9]{64}$' then return false; end if;
 insert into public.review_rate_limits(ip_hash,window_start,count) values(p_ip_hash,now(),1)
 on conflict(ip_hash) do update set count=case when public.review_rate_limits.window_start < now()-interval '1 hour' then 1 else public.review_rate_limits.count+1 end,
 window_start=case when public.review_rate_limits.window_start < now()-interval '1 hour' then now() else public.review_rate_limits.window_start end
 returning count into n;
 return n<=3;
end $$;
revoke all on function public.claim_review_slot(text) from public,anon,authenticated;
grant execute on function public.claim_review_slot(text) to service_role;
-- IMPORTANT: Existing products table and Storage bucket need their own RLS review.
