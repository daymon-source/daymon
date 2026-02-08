-- Supabase에서 실행할 SQL
-- breeding_recipes 테이블: 부모 속성 조합별 결과 알 확률표
-- 
-- 사용법 (나중에 교배 구현 시):
--   SELECT result_element, probability
--   FROM breeding_recipes
--   WHERE parent_element_1 = '정렬된_속성1' AND parent_element_2 = '정렬된_속성2'
--
-- 규칙:
--   - parent_element_1은 항상 알파벳 순서가 앞 (dark < earth < fire < light < metal < water < wood)
--   - 같은 부모 조합의 probability 합은 반드시 1.00
--   - fire+water 와 water+fire 는 동일한 레시피 (중복 방지)

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS breeding_recipes (
  id SERIAL PRIMARY KEY,
  parent_element_1 TEXT NOT NULL,    -- 부모1 속성 (알파벳 순 앞)
  parent_element_2 TEXT NOT NULL,    -- 부모2 속성 (알파벳 순 뒤 또는 같음)
  result_element TEXT NOT NULL,      -- 결과 알 속성
  probability DECIMAL(4,2) NOT NULL, -- 확률 (0.00 ~ 1.00)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- parent_element_1이 항상 알파벳 순으로 앞에 오도록 강제
  CONSTRAINT parent_order CHECK (parent_element_1 <= parent_element_2),
  -- 같은 조합+결과 중복 방지
  CONSTRAINT unique_recipe UNIQUE (parent_element_1, parent_element_2, result_element),
  -- 확률 범위 체크
  CONSTRAINT valid_probability CHECK (probability > 0 AND probability <= 1)
);

-- 2. RLS 정책: 모든 인증된 유저가 읽기 가능 (게임 규칙이므로)
ALTER TABLE breeding_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "breeding_recipes_read_all" ON breeding_recipes
  FOR SELECT
  USING (true);

-- 3. 인덱스: 부모 조합으로 빠르게 검색
CREATE INDEX IF NOT EXISTS idx_breeding_parents 
  ON breeding_recipes (parent_element_1, parent_element_2);

-- ============================================================
-- 4. 기본 확률 데이터 (7속성 × 7속성 = 28개 조합)
-- ============================================================
-- 
-- 설계 원칙:
--   같은 속성 교배: 같은 속성 75%, 관련 속성 15%, 희귀 10%
--   다른 속성 교배: 부모A 30%, 부모B 30%, 파생 속성 25%, 희귀 15%
--
-- 속성 관계 (오행 + 빛/어둠):
--   木(나무) → 火(불) → 土(땅) → 金(금속) → 水(물) → 木
--   光(빛) ↔ 暗(어둠) 은 특수 관계
-- ============================================================

-- ── 같은 속성 교배 (7개) ──────────────────────────────────────

-- 🌑 dark + dark
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('dark', 'dark', 'dark',  0.75),
  ('dark', 'dark', 'light', 0.15),
  ('dark', 'dark', 'fire',  0.10);

-- 🪨 earth + earth
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('earth', 'earth', 'earth', 0.75),
  ('earth', 'earth', 'metal', 0.15),
  ('earth', 'earth', 'wood',  0.10);

-- 🔥 fire + fire
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('fire', 'fire', 'fire',  0.75),
  ('fire', 'fire', 'light', 0.15),
  ('fire', 'fire', 'earth', 0.10);

-- ☀️ light + light
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('light', 'light', 'light', 0.75),
  ('light', 'light', 'fire',  0.15),
  ('light', 'light', 'water', 0.10);

-- ⚙️ metal + metal
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('metal', 'metal', 'metal', 0.75),
  ('metal', 'metal', 'earth', 0.15),
  ('metal', 'metal', 'dark',  0.10);

-- 💧 water + water
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('water', 'water', 'water', 0.75),
  ('water', 'water', 'wood',  0.15),
  ('water', 'water', 'earth', 0.10);

-- 🌿 wood + wood
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('wood', 'wood', 'wood',  0.75),
  ('wood', 'wood', 'water', 0.15),
  ('wood', 'wood', 'earth', 0.10);


-- ── 다른 속성 교배 (21개) ─────────────────────────────────────

-- 🌑+🪨 dark + earth
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('dark', 'earth', 'dark',  0.30),
  ('dark', 'earth', 'earth', 0.30),
  ('dark', 'earth', 'metal', 0.25),
  ('dark', 'earth', 'fire',  0.15);

-- 🌑+🔥 dark + fire
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('dark', 'fire', 'dark',  0.30),
  ('dark', 'fire', 'fire',  0.30),
  ('dark', 'fire', 'earth', 0.25),
  ('dark', 'fire', 'metal', 0.15);

-- 🌑+☀️ dark + light (특수 조합!)
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('dark', 'light', 'dark',  0.30),
  ('dark', 'light', 'light', 0.30),
  ('dark', 'light', 'fire',  0.20),
  ('dark', 'light', 'water', 0.20);

-- 🌑+⚙️ dark + metal
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('dark', 'metal', 'dark',  0.30),
  ('dark', 'metal', 'metal', 0.30),
  ('dark', 'metal', 'earth', 0.25),
  ('dark', 'metal', 'water', 0.15);

-- 🌑+💧 dark + water
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('dark', 'water', 'dark',  0.30),
  ('dark', 'water', 'water', 0.30),
  ('dark', 'water', 'wood',  0.25),
  ('dark', 'water', 'earth', 0.15);

-- 🌑+🌿 dark + wood
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('dark', 'wood', 'dark',  0.30),
  ('dark', 'wood', 'wood',  0.30),
  ('dark', 'wood', 'earth', 0.25),
  ('dark', 'wood', 'water', 0.15);

-- 🪨+🔥 earth + fire (땅에서 불 = 용암/금속)
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('earth', 'fire', 'earth', 0.30),
  ('earth', 'fire', 'fire',  0.30),
  ('earth', 'fire', 'metal', 0.25),
  ('earth', 'fire', 'light', 0.15);

-- 🪨+☀️ earth + light
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('earth', 'light', 'earth', 0.30),
  ('earth', 'light', 'light', 0.30),
  ('earth', 'light', 'fire',  0.25),
  ('earth', 'light', 'wood',  0.15);

-- 🪨+⚙️ earth + metal (광산/채굴)
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('earth', 'metal', 'earth', 0.30),
  ('earth', 'metal', 'metal', 0.30),
  ('earth', 'metal', 'fire',  0.25),
  ('earth', 'metal', 'dark',  0.15);

-- 🪨+💧 earth + water (진흙/생명)
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('earth', 'water', 'earth', 0.30),
  ('earth', 'water', 'water', 0.30),
  ('earth', 'water', 'wood',  0.25),
  ('earth', 'water', 'metal', 0.15);

-- 🪨+🌿 earth + wood (뿌리/대지)
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('earth', 'wood', 'earth', 0.30),
  ('earth', 'wood', 'wood',  0.30),
  ('earth', 'wood', 'water', 0.25),
  ('earth', 'wood', 'fire',  0.15);

-- 🔥+☀️ fire + light (태양/열)
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('fire', 'light', 'fire',  0.30),
  ('fire', 'light', 'light', 0.30),
  ('fire', 'light', 'earth', 0.25),
  ('fire', 'light', 'dark',  0.15);

-- 🔥+⚙️ fire + metal (대장간/단조)
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('fire', 'metal', 'fire',  0.30),
  ('fire', 'metal', 'metal', 0.30),
  ('fire', 'metal', 'earth', 0.25),
  ('fire', 'metal', 'light', 0.15);

-- 🔥+💧 fire + water (증기/온천)
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('fire', 'water', 'fire',  0.30),
  ('fire', 'water', 'water', 0.30),
  ('fire', 'water', 'earth', 0.25),
  ('fire', 'water', 'light', 0.15);

-- 🔥+🌿 fire + wood (연소/재)
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('fire', 'wood', 'fire',  0.30),
  ('fire', 'wood', 'wood',  0.30),
  ('fire', 'wood', 'earth', 0.25),
  ('fire', 'wood', 'light', 0.15);

-- ☀️+⚙️ light + metal (반사/광택)
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('light', 'metal', 'light', 0.30),
  ('light', 'metal', 'metal', 0.30),
  ('light', 'metal', 'fire',  0.25),
  ('light', 'metal', 'earth', 0.15);

-- ☀️+💧 light + water (무지개/반사)
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('light', 'water', 'light', 0.30),
  ('light', 'water', 'water', 0.30),
  ('light', 'water', 'wood',  0.25),
  ('light', 'water', 'fire',  0.15);

-- ☀️+🌿 light + wood (광합성/생장)
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('light', 'wood', 'light', 0.30),
  ('light', 'wood', 'wood',  0.30),
  ('light', 'wood', 'fire',  0.25),
  ('light', 'wood', 'earth', 0.15);

-- ⚙️+💧 metal + water (녹/정련)
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('metal', 'water', 'metal', 0.30),
  ('metal', 'water', 'water', 0.30),
  ('metal', 'water', 'earth', 0.25),
  ('metal', 'water', 'dark',  0.15);

-- ⚙️+🌿 metal + wood (자연 vs 문명)
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('metal', 'wood', 'metal', 0.30),
  ('metal', 'wood', 'wood',  0.30),
  ('metal', 'wood', 'earth', 0.25),
  ('metal', 'wood', 'fire',  0.15);

-- 💧+🌿 water + wood (성장/숲)
INSERT INTO breeding_recipes (parent_element_1, parent_element_2, result_element, probability) VALUES
  ('water', 'wood', 'water', 0.30),
  ('water', 'wood', 'wood',  0.30),
  ('water', 'wood', 'earth', 0.25),
  ('water', 'wood', 'light', 0.15);
