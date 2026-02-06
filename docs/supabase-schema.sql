-- Daymon: Supabase 스키마 (계정 + 몬스터/게임 데이터)
-- Supabase 대시보드 → SQL Editor에서 이 파일 내용을 붙여넣고 실행하세요.
-- 비밀번호는 Supabase Auth가 해시(bcrypt 등)해서 저장합니다. 평문 저장 없음.

-- 1) 프로필: 표시용 userId (auth.users와 1:1)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id text unique not null check (char_length(user_id) >= 3 and char_length(user_id) <= 12),
  created_at timestamptz default now()
);

-- 2) 게임 데이터: 유저당 1행 (알/몬스터/필드/안식처/채팅 등)
create table if not exists public.game_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  mood text default '평온',
  affection int default 0,
  bond_stage int default 1,
  center_egg jsonb default '{"affection":0,"bondStage":1,"element":"fire","eggType":"classic"}',
  slots jsonb default '[null,null,null,null,null]',
  field_monster jsonb,
  sanctuary jsonb default '[null,null,null,null,null,null]',
  chat_history jsonb default '[]',
  next_tick_at bigint,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS 활성화
alter table public.profiles enable row level security;
alter table public.game_data enable row level security;

-- 프로필: 본인만 읽기/수정
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- 게임 데이터: 본인만 읽기/수정/삽입
create policy "game_data_select_own" on public.game_data for select using (auth.uid() = user_id);
create policy "game_data_insert_own" on public.game_data for insert with check (auth.uid() = user_id);
create policy "game_data_update_own" on public.game_data for update using (auth.uid() = user_id);

-- 가입 시 프로필 + 게임 데이터 자동 생성 (auth.users insert 트리거)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, user_id)
  values (new.id, coalesce(new.raw_user_meta_data->>'userId', 'user'));
  insert into public.game_data (user_id)
  values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists game_data_updated_at on public.game_data;
create trigger game_data_updated_at
  before update on public.game_data
  for each row execute function public.set_updated_at();
