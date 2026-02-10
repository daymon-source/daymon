export const DEFAULT_HATCH_HOURS = 24 // 기본 부화 시간 (EGG_CONFIG에 없을 때 폴백)
export const DEFAULT_CRACK_AT_HOURS = 19 // 기본 깨짐 시작 시간 (EGG_CONFIG에 없을 때 폴백)
export const EGG_SLOT_COUNT = 5 // 알 슬롯 5칸
export const EGG_SLOT_LOCKED_FROM = 3 // 4번째·5번째 슬롯(인덱스 3,4) 잠금 — 나중에 잠금해제
export const INCUBATOR_LOCKED_FROM = 3 // 3번, 4번 부화장치는 잠금
export const SANCTUARY_SLOT_COUNT = 6 // 안식처 슬롯 6칸 (3열 2행, 화면에 다 들어오게)

// 필드 몬스터: 레벨/경험치, 배고픔/행복 게이지
export const CARE_EXP_PER_SNACK = 12
export const CARE_EXP_PER_PLAY = 18
export const CARE_SNACK_MAX_PER_DAY = 5
export const CARE_PLAY_MAX_PER_DAY = 5
export const GAUGE_MAX = 100
export const HUNGER_PER_SNACK = 25
export const HAPPINESS_PER_PLAY = 20
export const HUNGER_DECAY_HOURS = 12 // 12시간이 지나면 배고픔 0
export const HAPPINESS_DECAY_PER_DAY = 8

// 속성별 부화 골드 보상
export const HATCH_GOLD_REWARDS = {
  fire: 100, water: 100, wood: 100, metal: 120,
  earth: 120, light: 150, dark: 150,
}
