-- Ohrly accounts: one row of progress per user, readable and writable only by that user.
-- Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

drop policy if exists "read own progress" on public.progress;
create policy "read own progress" on public.progress
  for select using (auth.uid() = user_id);

drop policy if exists "insert own progress" on public.progress;
create policy "insert own progress" on public.progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own progress" on public.progress;
create policy "update own progress" on public.progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own progress" on public.progress;
create policy "delete own progress" on public.progress
  for delete using (auth.uid() = user_id);

-- A learner can delete their own account, and with it their progress (on delete cascade).
-- security definer lets it reach auth.users; it only ever deletes the caller.
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
