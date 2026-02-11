export const BADGE_CATEGORIES = {
  collection: { label: '수집', icon: '📦' },
  hatch: { label: '부화', icon: '🥚' },
  adventure: { label: '탐험', icon: '🧭' },
  economy: { label: '경제', icon: '🌙' },
  social: { label: '소셜', icon: '👥' },
}

export const BADGES = [
  // 수집 계열
  { id: 'collector_10', category: 'collection', name: '초보 콜렉터', desc: '몬스터 10마리 수집', icon: '📦', tier: 'common' },
  { id: 'collector_100', category: 'collection', name: '커먼 콜렉터', desc: '몬스터 100마리 수집', icon: '📦', tier: 'rare' },
  { id: 'collector_500', category: 'collection', name: '에픽 콜렉터', desc: '몬스터 500마리 수집', icon: '📦', tier: 'epic' },
  { id: 'collector_1000', category: 'collection', name: '레전더리 콜렉터', desc: '몬스터 1000마리 수집', icon: '📦', tier: 'legendary' },

  // 부화 계열
  { id: 'first_hatch', category: 'hatch', name: '첫 생명', desc: '첫 번째 알 부화', icon: '🐣', tier: 'common' },
  { id: 'hatch_50', category: 'hatch', name: '부화 장인', desc: '50회 부화', icon: '🐣', tier: 'rare' },
  { id: 'hatch_all_elements', category: 'hatch', name: '속성 마스터', desc: '모든 속성 알 부화', icon: '🌈', tier: 'epic' },

  // 탐험/활동 계열
  { id: 'trailblazer', category: 'adventure', name: '트레일블레이저', desc: '첫 로그인', icon: '🧭', tier: 'common' },
  { id: 'attendance_7', category: 'adventure', name: '개근상', desc: '출석 7일 연속', icon: '📅', tier: 'common' },
  { id: 'attendance_30', category: 'adventure', name: '한 달의 기적', desc: '출석 30일 달성', icon: '📅', tier: 'rare' },
  { id: 'attendance_100', category: 'adventure', name: '백일의 약속', desc: '출석 100일 달성', icon: '📅', tier: 'epic' },

  // 경제 계열
  { id: 'rich_10k', category: 'economy', name: '루나 부자', desc: '루나 10,000 보유', icon: '💰', tier: 'common' },
  { id: 'rich_100k', category: 'economy', name: '루나 재벌', desc: '루나 100,000 보유', icon: '💰', tier: 'rare' },

  // 희귀도 계열 (향후 확장)
  { id: 'first_rare', category: 'collection', name: '행운의 시작', desc: '레어 몬스터 첫 획득', icon: '✨', tier: 'rare' },
  { id: 'first_legendary', category: 'collection', name: '전설의 조우', desc: '레전더리 몬스터 첫 획득', icon: '🌟', tier: 'legendary' },
]

// 티어별 색상 (CSS에서도 사용)
export const BADGE_TIERS = {
  common: { label: '커먼', color: '#a0a0a0' },
  rare: { label: '레어', color: '#6ea8fe' },
  epic: { label: '에픽', color: '#b388ff' },
  legendary: { label: '레전더리', color: '#ffd54f' },
}
