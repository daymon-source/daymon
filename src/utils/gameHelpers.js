import { DEFAULT_ELEMENT, ELEMENT_LABELS } from '../constants/elements'
import { GAUGE_MAX, HUNGER_DECAY_HOURS, HAPPINESS_DECAY_PER_DAY } from '../constants/gameConfig'

// 저장된 알에 element 없으면 기본값 적용 (레거시 호환)
export function normalizeEgg(egg) {
  if (!egg) return null
  const next = { ...egg }
  if (next.element == null) next.element = DEFAULT_ELEMENT
  return next
}

export function normalizeSlots(slots) {
  if (!Array.isArray(slots)) return slots
  return slots.map((egg) => normalizeEgg(egg))
}

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseDateStr(str) {
  if (!str || str.length !== 10) return null
  const [y, m, d] = str.split('-').map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null
  return new Date(y, m - 1, d)
}

export function daysBetween(aStr, bStr) {
  const a = parseDateStr(aStr)
  const b = parseDateStr(bStr)
  if (!a || !b) return 0
  return Math.max(0, Math.floor((b - a) / 86400000))
}

export function normalizeFieldMonster(m) {
  if (!m) return m
  const level = Math.max(1, m.level ?? 1)
  const exp = Math.max(0, m.exp ?? 0)
  const today = todayStr()
  const careDate = m.careDate ?? today
  const careSnack = careDate === today ? (m.careSnack ?? 0) : 0
  const carePlay = careDate === today ? (m.carePlay ?? 0) : 0
  const hunger = Math.max(0, Math.min(GAUGE_MAX, m.hunger ?? GAUGE_MAX))
  const lastHungerUpdatedAt = m.lastHungerUpdatedAt ?? Date.now()
  let happiness = Math.max(0, Math.min(GAUGE_MAX, m.happiness ?? GAUGE_MAX))
  const lastDecay = m.lastDecayDate ?? today
  const days = daysBetween(lastDecay, today)
  if (days > 0) {
    happiness = Math.max(0, happiness - days * HAPPINESS_DECAY_PER_DAY)
  }
  return { ...m, level, exp, careDate: today, careSnack, carePlay, hunger, lastHungerUpdatedAt, happiness, lastDecayDate: today }
}

/** 배고픔: 12시간이 지나면 0. 저장된 hunger 기준으로 경과 시간만큼 감소 */
export function getCurrentHunger(m) {
  if (!m) return 0
  const stored = m.hunger ?? GAUGE_MAX
  const updatedAt = m.lastHungerUpdatedAt ?? Date.now()
  const elapsedHours = (Date.now() - updatedAt) / 3600000
  const decay = (elapsedHours / HUNGER_DECAY_HOURS) * GAUGE_MAX
  return Math.max(0, Math.min(GAUGE_MAX, stored - decay))
}

/** 몬스터 표시 이름: 사용자 지정 name이 있으면 사용, 없으면 속성 기반 기본명 */
export function getDisplayName(m) {
  if (!m) return ''
  const custom = (m.name ?? '').trim()
  if (custom) return custom
  const label = ELEMENT_LABELS[m.element] ?? m.element ?? '데이몬'
  return `${label} 데이몬`
}

// 남은 ms → "HH:MM" (예: 23:59, 01:10)
export function formatRemainingTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// 슬롯에서 알 제거 후 왼쪽으로 당기기 (0~2번만 사용, 3~4 잠금)
export function compactSlots(slots, removedIndex) {
  const unlocked = [...(slots.slice(0, 3))]
  unlocked[removedIndex] = null
  const compacted = unlocked.filter((egg) => egg != null)
  return [...compacted, null, null, null, null].slice(0, 5)
}

export function getExpToNextLevel(level) {
  return 80 + level * 25 // Lv1→2: 105, Lv2→3: 130, ...
}
