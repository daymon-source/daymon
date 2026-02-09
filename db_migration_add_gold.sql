-- Daymon: users 테이블에 골드 컬럼 추가
-- Supabase 대시보드 → SQL Editor에서 실행

-- 1) gold 컬럼 추가 (기본값 500, 신규 유저 시작 골드)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gold integer DEFAULT 500 NOT NULL;

-- 2) 기존 유저에게도 기본 골드 지급 (이미 0인 경우만)
UPDATE public.users SET gold = 500 WHERE gold = 0 OR gold IS NULL;
