-- Supabase SQL Editor에서 실행
-- users 테이블에 unlocked_incubator_slots 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS unlocked_incubator_slots integer[] DEFAULT '{}';

-- 원자적 잠금 해제 RPC 함수
CREATE OR REPLACE FUNCTION unlock_incubator_slot(
  p_user_id uuid,
  p_slot_index integer,
  p_cost integer DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gold integer;
  v_unlocked integer[];
  v_result jsonb;
BEGIN
  -- 1. 유저 데이터 잠금 (FOR UPDATE = 동시 접근 방지)
  SELECT gold, COALESCE(unlocked_incubator_slots, '{}')
  INTO v_gold, v_unlocked
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  -- 유저가 없으면 에러
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  -- 2. 이미 해제된 슬롯인지 확인
  IF p_slot_index = ANY(v_unlocked) THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_unlocked', true,
      'gold', v_gold,
      'unlocked_slots', v_unlocked
    );
  END IF;

  -- 3. 골드 부족 확인
  IF v_gold < p_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_gold', 'gold', v_gold);
  END IF;

  -- 4. 원자적으로 골드 차감 + 슬롯 해제
  UPDATE users
  SET
    gold = gold - p_cost,
    unlocked_incubator_slots = array_append(COALESCE(unlocked_incubator_slots, '{}'), p_slot_index),
    updated_at = extract(epoch from now()) * 1000
  WHERE id = p_user_id;

  -- 5. 업데이트된 값 반환
  SELECT gold, unlocked_incubator_slots
  INTO v_gold, v_unlocked
  FROM users
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'gold', v_gold,
    'unlocked_slots', v_unlocked
  );
END;
$$;
