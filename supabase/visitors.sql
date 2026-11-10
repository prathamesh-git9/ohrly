-- Names visitors choose to share, so Ohrly's creator can see who is learning.
-- Insert-only for the public: nobody can read this table through the app, only the owner in the
-- Supabase dashboard. Safe to re-run.

create table if not exists public.visitors (
  device_id uuid not null,
  name text not null check (char_length(name) between 1 and 30),
  course text check (course is null or char_length(course) <= 10),
  created_at timestamptz not null default now(),
  primary key (device_id, name)
);

alter table public.visitors enable row level security;

revoke all on public.visitors from anon, authenticated;
grant insert on public.visitors to anon, authenticated;

drop policy if exists "anyone can add their name" on public.visitors;
create policy "anyone can add their name" on public.visitors
  for insert to anon, authenticated with check (true);

-- A visitor removes their own names with the random device id only their browser knows.
create or replace function public.forget_visitor(p_device uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.visitors where device_id = p_device;
$$;

revoke all on function public.forget_visitor(uuid) from public;
grant execute on function public.forget_visitor(uuid) to anon, authenticated;
