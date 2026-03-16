-- Katha Kalpana DB patch
-- Run this in Supabase SQL Editor after your base table creation.
-- It aligns schema + RPC + RLS with the current frontend and Edge Functions.

create extension if not exists pgcrypto;

-- -----------------------------
-- 1) Ensure tables/columns align
-- -----------------------------

alter table if exists public.stories
  alter column type set default 'story';

alter table if exists public.stories
  alter column type set not null;

create index if not exists stories_user_id_created_at_idx
  on public.stories (user_id, created_at desc);

alter table if exists public.pet_stats
  alter column evolution_stage set default 'egg';

-- Optional: enforce allowed pet stages used by frontend
alter table if exists public.pet_stats
  drop constraint if exists pet_stats_evolution_stage_check;

alter table if exists public.pet_stats
  add constraint pet_stats_evolution_stage_check
  check (evolution_stage in ('egg', 'hatching', 'adult'));

-- -----------------------------
-- 2) Auto-create profile/pet rows for new users
-- -----------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.pet_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- Backfill existing users safely
insert into public.profiles (id)
select u.id
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

insert into public.pet_stats (user_id)
select u.id
from auth.users u
left join public.pet_stats ps on ps.user_id = u.id
where ps.user_id is null;

-- -----------------------------
-- 3) RPCs used by Edge Functions
-- -----------------------------

create or replace function public.increment_streak(u_id uuid)
returns void
language plpgsql
as $$
begin
  insert into public.profiles (id, streak_count, last_read_date)
  values (u_id, 1, current_date)
  on conflict (id)
  do update
  set streak_count = public.profiles.streak_count + 1,
      last_read_date = current_date;
end;
$$;

create or replace function public.add_pet_xp(u_id uuid, xp_to_add int)
returns void
language plpgsql
as $$
begin
  insert into public.pet_stats (user_id, xp, level, evolution_stage)
  values (u_id, greatest(xp_to_add, 0), floor(greatest(xp_to_add, 0) / 100.0) + 1,
    case
      when floor(greatest(xp_to_add, 0) / 100.0) + 1 >= 10 then 'adult'
      when floor(greatest(xp_to_add, 0) / 100.0) + 1 >= 5 then 'hatching'
      else 'egg'
    end
  )
  on conflict (user_id)
  do update
  set xp = public.pet_stats.xp + greatest(xp_to_add, 0),
      level = floor((public.pet_stats.xp + greatest(xp_to_add, 0)) / 100.0) + 1,
      evolution_stage = case
        when floor((public.pet_stats.xp + greatest(xp_to_add, 0)) / 100.0) + 1 >= 10 then 'adult'
        when floor((public.pet_stats.xp + greatest(xp_to_add, 0)) / 100.0) + 1 >= 5 then 'hatching'
        else 'egg'
      end;
end;
$$;

-- -----------------------------
-- 4) RLS policies for app tables
-- -----------------------------

alter table if exists public.profiles enable row level security;
alter table if exists public.stories enable row level security;
alter table if exists public.pet_stats enable row level security;

-- Profiles
-- Drop old policy names if they exist
 drop policy if exists "profiles_select_own" on public.profiles;
 drop policy if exists "profiles_insert_own" on public.profiles;
 drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Stories
 drop policy if exists "stories_select_own" on public.stories;
 drop policy if exists "stories_insert_own" on public.stories;
 drop policy if exists "stories_update_own" on public.stories;
 drop policy if exists "stories_delete_own" on public.stories;

create policy "stories_select_own"
on public.stories
for select
to authenticated
using (user_id = auth.uid());

create policy "stories_insert_own"
on public.stories
for insert
to authenticated
with check (user_id = auth.uid());

create policy "stories_update_own"
on public.stories
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "stories_delete_own"
on public.stories
for delete
to authenticated
using (user_id = auth.uid());

-- Pet stats
 drop policy if exists "pet_stats_select_own" on public.pet_stats;
 drop policy if exists "pet_stats_insert_own" on public.pet_stats;
 drop policy if exists "pet_stats_update_own" on public.pet_stats;

create policy "pet_stats_select_own"
on public.pet_stats
for select
to authenticated
using (user_id = auth.uid());

create policy "pet_stats_insert_own"
on public.pet_stats
for insert
to authenticated
with check (user_id = auth.uid());

create policy "pet_stats_update_own"
on public.pet_stats
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- -----------------------------
-- 5) Story generation access control
-- -----------------------------

create table if not exists public.story_generation_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  reviewed_by text,
  notes text,
  updated_at timestamptz not null default now(),
  constraint story_generation_access_status_check check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists story_generation_access_status_idx
  on public.story_generation_access (status, requested_at desc);

alter table if exists public.story_generation_access enable row level security;

drop policy if exists "story_generation_access_select_own" on public.story_generation_access;
drop policy if exists "story_generation_access_insert_own" on public.story_generation_access;
drop policy if exists "story_generation_access_update_own_pending" on public.story_generation_access;

create policy "story_generation_access_select_own"
on public.story_generation_access
for select
to authenticated
using (user_id = auth.uid());

create policy "story_generation_access_insert_own"
on public.story_generation_access
for insert
to authenticated
with check (user_id = auth.uid() and email = auth.email());

create policy "story_generation_access_update_own_pending"
on public.story_generation_access
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and status = 'pending' and email = auth.email());
