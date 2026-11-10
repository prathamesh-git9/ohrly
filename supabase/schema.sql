-- Ohrly accounts: one row of progress per user, readable and writable only by that user.
-- Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

-- New tables are not exposed to the API automatically in this project, so grant exactly what the app
-- needs: signed-in users may use their own row (row-level security below enforces "own"). Visitors who
-- are not signed in get nothing.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.progress to authenticated;
revoke all on public.progress from anon;
-- Default privileges also hand out these; TRUNCATE would bypass row-level security, so none of them.
revoke truncate, references, trigger on public.progress from authenticated;

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
