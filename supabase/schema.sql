-- ============================================
-- Quran App — Supabase Database Schema
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query)
-- ============================================

-- 1. PROFILES TABLE
-- Stores user profile data (private stats)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default '',
  total_minutes integer not null default 0,
  streak integer not null default 0,
  completed_surahs integer not null default 0,
  privacy boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. LISTENING LOGS TABLE
-- Tracks individual listening sessions
create table if not exists public.listening_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  surah text not null,
  ayah integer not null default 1,
  seconds_listened integer not null default 0,
  created_at timestamptz not null default now()
);

-- 3. REFLECTIONS TABLE
-- Public reflections/sharing feed
create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null default 'Anonymous',
  message text not null,
  surah text,
  created_at timestamptz not null default now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.listening_logs enable row level security;
alter table public.reflections enable row level security;

-- PROFILES: Users can read and update their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- LISTENING LOGS: Users can read/write their own logs
create policy "Users can read own logs"
  on public.listening_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own logs"
  on public.listening_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own logs"
  on public.listening_logs for delete
  using (auth.uid() = user_id);

-- REFLECTIONS: Public read, only owner can insert/delete
create policy "Anyone can read reflections"
  on public.reflections for select
  using (true);

create policy "Authenticated users can insert reflections"
  on public.reflections for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own reflections"
  on public.reflections for delete
  using (auth.uid() = user_id);

-- ============================================
-- INDEXES (Performance)
-- ============================================
create index if not exists idx_listening_logs_user on public.listening_logs(user_id);
create index if not exists idx_listening_logs_created on public.listening_logs(created_at desc);
create index if not exists idx_reflections_created on public.reflections(created_at desc);

-- ============================================
-- REALTIME (Enable for reflections feed)
-- ============================================
alter publication supabase_realtime add table public.reflections;

-- ============================================
-- SURAH TIMELINES TABLE
-- ============================================
-- Caches timeline durations (metadata) for gapless playback
-- Global cache shared across all users
create table if not exists public.surah_timelines (
  surah_no integer not null,
  reciter_id integer not null,
  durations jsonb not null,
  created_at timestamptz not null default now(),
  primary key (surah_no, reciter_id)
);

-- Enable RLS
alter table public.surah_timelines enable row level security;

-- Anyone can read timelines
create policy "Anyone can read timelines"
  on public.surah_timelines for select
  using (true);

-- Authenticated users can insert/update timelines if they don't exist
create policy "Authenticated users can insert timelines"
  on public.surah_timelines for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update timelines"
  on public.surah_timelines for update
  using (auth.role() = 'authenticated');
  
