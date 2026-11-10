-- The admin dashboard. Only accounts listed in public.admins can read visitors or the stats.
-- Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

-- security definer so it can look at admins without exposing that table to anyone.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Admins may read the visitor list; the public still only inserts.
grant select on public.visitors to authenticated;
drop policy if exists "admins read visitors" on public.visitors;
create policy "admins read visitors" on public.visitors
  for select to authenticated using (public.is_admin());

-- Counts that need auth.users, which no client may read directly. Returns nothing for non-admins.
create or replace function public.admin_stats()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised';
  end if;
  return json_build_object(
    'accounts', (select count(*) from auth.users),
    'accounts_week', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'confirmed_accounts', (select count(*) from auth.users where email_confirmed_at is not null),
    'progress_rows', (select count(*) from public.progress)
  );
end;
$$;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
