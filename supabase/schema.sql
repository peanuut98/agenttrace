-- AgentTrace · Day 2 schema
-- Projects table + Row Level Security so users only see/edit their own rows.
--
-- Run this once in the Supabase SQL editor for your project. It is safe to
-- re-run because every statement uses CREATE … IF NOT EXISTS where possible.

-- 1. Make sure pgcrypto is available so gen_random_uuid() works.
create extension if not exists "pgcrypto";

-- 2. Projects table.
create table if not exists public.projects (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  description     text,
  github_url      text,
  demo_url        text,
  wallet_address  text,
  chain           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists projects_user_created_idx
  on public.projects (user_id, created_at desc);

-- 3. Keep updated_at fresh on UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- 4. Row Level Security.
alter table public.projects enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own"
  on public.projects
  for select
  using (auth.uid() = user_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
  on public.projects
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
  on public.projects
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
  on public.projects
  for delete
  using (auth.uid() = user_id);
