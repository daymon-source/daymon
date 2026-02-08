-- Supabase에서 실행할 SQL
-- egg_types 테이블: 알 속성별 게임 밸런스 수치 (부화 시간, 깨짐 시점 등)

-- 1. egg_types 테이블 생성
CREATE TABLE IF NOT EXISTS egg_types (
  element TEXT PRIMARY KEY,           -- 속성 ID (fire, water, wood, metal, earth, light, dark)
  label TEXT NOT NULL,                -- 표시 이름 (불, 물, 나무, ...)
  hatch_hours INTEGER NOT NULL DEFAULT 24,      -- 부화까지 걸리는 총 시간
  crack_at_hours INTEGER NOT NULL DEFAULT 19,   -- 이 시간부터 알 금 가기 시작
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 초기 데이터 삽입 (7속성)
INSERT INTO egg_types (element, label, hatch_hours, crack_at_hours) VALUES
  ('fire',  '불',   24, 19),
  ('water', '물',   24, 19),
  ('wood',  '나무', 24, 19),
  ('metal', '금속', 24, 19),
  ('earth', '땅',   24, 19),
  ('light', '빛',   24, 19),
  ('dark',  '어둠', 24, 19)
ON CONFLICT (element) DO NOTHING;

-- 3. RLS 정책: 모든 인증된 유저가 읽기 가능 (게임 설정이므로)
ALTER TABLE egg_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "egg_types_read_all" ON egg_types
  FOR SELECT
  USING (true);

-- 나중에 관리자만 수정할 수 있게 하려면:
-- CREATE POLICY "egg_types_admin_update" ON egg_types
--   FOR UPDATE
--   USING (auth.uid() IN (SELECT id FROM users WHERE is_admin = true));
