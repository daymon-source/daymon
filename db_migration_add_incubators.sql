-- Supabase에서 실행할 SQL
-- monsters 테이블의 location constraint를 업데이트하여 incubator_0~4 추가

-- 1. 기존 constraint 제거
ALTER TABLE monsters DROP CONSTRAINT IF EXISTS valid_location;

-- 2. 새로운 constraint 추가 (incubator_0~4 포함)
ALTER TABLE monsters ADD CONSTRAINT valid_location 
CHECK (location IN (
  'slot_0', 'slot_1', 'slot_2', 'slot_3', 'slot_4',
  'incubator_0', 'incubator_1', 'incubator_2', 'incubator_3', 'incubator_4',
  'field',
  'sanctuary_0', 'sanctuary_1', 'sanctuary_2', 'sanctuary_3', 'sanctuary_4', 'sanctuary_5'
));

-- 3. 기존 center_egg 데이터를 incubator_0으로 마이그레이션 (선택사항)
-- UPDATE monsters SET location = 'incubator_0' WHERE location = 'center_egg';
