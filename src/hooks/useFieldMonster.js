import { useEffect, useRef, useState } from 'react'
import {
  CARE_EXP_PER_SNACK, CARE_EXP_PER_PLAY,
  CARE_SNACK_MAX_PER_DAY, CARE_PLAY_MAX_PER_DAY,
  GAUGE_MAX, HUNGER_PER_SNACK, HAPPINESS_PER_PLAY,
} from '../constants/gameConfig'
import { getCurrentHunger, getExpToNextLevel, todayStr } from '../utils/gameHelpers'

export function useFieldMonster({ fieldMonster, setFieldMonster, tab }) {
  const [fieldMonsterPos, setFieldMonsterPos] = useState({ x: 50, y: 50 })
  const [fieldMonsterMaxWidthPx, setFieldMonsterMaxWidthPx] = useState(null)
  const [fieldLikeHearts, setFieldLikeHearts] = useState([])
  const [fieldMonsterLiking, setFieldMonsterLiking] = useState(false)
  const [fieldCareExpFlash, setFieldCareExpFlash] = useState(0)
  const [fieldHungerTick, setFieldHungerTick] = useState(0)

  const fieldAreaRef = useRef(null)
  const fieldLikeTimeoutRef = useRef(null)
  const fieldMonsterTouchStartedRef = useRef(false)
  const fieldMonsterClickSkipRef = useRef(false)
  const fieldMonsterPointerDownRef = useRef(false)
  const fieldTabShownAtRef = useRef(0)
  const fieldMonsterDivRef = useRef(null)
  const fieldMonsterPointerIdRef = useRef(null)
  const fieldPointerReleasedAtRef = useRef(0)

  // 필드 탭을 벗어날 때 몬스터 포인터 캡처 해제
  const releaseFieldMonsterPointer = () => {
    const el = fieldMonsterDivRef.current
    const pid = fieldMonsterPointerIdRef.current
    if (el && pid != null) {
      try {
        el.releasePointerCapture(pid)
      } catch (_) { /* 이미 해제됐을 수 있음 */ }
      fieldMonsterPointerIdRef.current = null
    }
    fieldMonsterTouchStartedRef.current = false
    fieldMonsterPointerDownRef.current = false
    fieldMonsterClickSkipRef.current = false
    fieldPointerReleasedAtRef.current = Date.now()
  }

  useEffect(() => {
    if (tab === 'field') return
    releaseFieldMonsterPointer()
  }, [tab])

  // 필드 몬스터: 크기 + 이동 애니메이션
  useEffect(() => {
    if (tab !== 'field' || !fieldMonster) return
    const el = fieldAreaRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      const w = rect.width || 300
      setFieldMonsterMaxWidthPx(Math.floor(w * 1.5))
    }
    const tick = () => {
      setFieldMonsterPos({
        x: 38 + Math.random() * 24,
        y: 48 + Math.random() * 10,
      })
    }
    const t1 = setTimeout(tick, 100)
    const t2 = setInterval(tick, 3000)
    return () => { clearTimeout(t1); clearInterval(t2) }
  }, [tab, fieldMonster])

  // 배고픔 실시간 감소 표시: 필드 탭에서 60초마다 리렌더
  useEffect(() => {
    if (tab !== 'field' || !fieldMonster) return
    const id = setInterval(() => setFieldHungerTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [tab, fieldMonster])

  const handleFieldReset = () => {
    setFieldMonster(null)
  }

  // 게이지 조정
  const handleGaugeAdjust = (type, delta) => {
    if (!fieldMonster) return
    const m = fieldMonster
    if (type === 'hunger') {
      const current = getCurrentHunger(m)
      const next = Math.max(0, Math.min(GAUGE_MAX, current + delta))
      setFieldMonster({ ...m, hunger: next, lastHungerUpdatedAt: Date.now() })
    } else if (type === 'happiness') {
      const next = Math.max(0, Math.min(GAUGE_MAX, (m.happiness ?? 0) + delta))
      setFieldMonster({ ...m, happiness: next })
    } else if (type === 'exp') {
      const maxExp = getExpToNextLevel(m.level ?? 1)
      const next = Math.max(0, Math.min(maxExp - 1, (m.exp ?? 0) + delta))
      setFieldMonster({ ...m, exp: next })
    }
  }

  // 필드 몬스터 터치 시 하트 이펙트
  const handleFieldMonsterTouch = () => {
    if (!fieldMonster) return
    const now = Date.now()
    if (now - fieldTabShownAtRef.current < 600) return
    if (now - fieldPointerReleasedAtRef.current < 550) return
    const batchId = Date.now()
    setFieldLikeHearts((prev) => [
      ...prev,
      ...Array.from({ length: 5 }, (_, i) => ({
        id: batchId + i,
        batchId,
        dx: (Math.random() - 0.5) * 70,
        dy: (Math.random() - 0.5) * 20,
      })),
    ])
    setFieldMonsterLiking(true)
    if (fieldLikeTimeoutRef.current) clearTimeout(fieldLikeTimeoutRef.current)
    fieldLikeTimeoutRef.current = setTimeout(() => {
      setFieldLikeHearts((prev) => prev.filter((h) => h.batchId !== batchId))
      fieldLikeTimeoutRef.current = null
    }, 1300)
    setTimeout(() => setFieldMonsterLiking(false), 220)
  }

  // 간식주기
  const handleCareSnack = () => {
    if (!fieldMonster) return
    const today = todayStr()
    let m = { ...fieldMonster }
    if (m.careDate !== today) {
      m = { ...m, careDate: today, careSnack: 0, carePlay: 0 }
    }
    if (m.careSnack >= CARE_SNACK_MAX_PER_DAY) return
    const currentHunger = getCurrentHunger(m)
    const hunger = Math.min(GAUGE_MAX, currentHunger + HUNGER_PER_SNACK)
    m = { ...m, hunger, lastHungerUpdatedAt: Date.now() }
    let exp = (m.exp ?? 0) + CARE_EXP_PER_SNACK
    let level = m.level ?? 1
    while (exp >= getExpToNextLevel(level)) {
      exp -= getExpToNextLevel(level)
      level++
    }
    setFieldMonster({ ...m, exp, level, careSnack: m.careSnack + 1 })
    setFieldCareExpFlash(CARE_EXP_PER_SNACK)
    setTimeout(() => setFieldCareExpFlash(0), 1500)
  }

  // 놀아주기
  const handleCarePlay = () => {
    if (!fieldMonster) return
    const today = todayStr()
    let m = { ...fieldMonster }
    if (m.careDate !== today) {
      m = { ...m, careDate: today, careSnack: 0, carePlay: 0 }
    }
    if (m.carePlay >= CARE_PLAY_MAX_PER_DAY) return
    const happiness = Math.min(GAUGE_MAX, (m.happiness ?? 0) + HAPPINESS_PER_PLAY)
    let exp = (m.exp ?? 0) + CARE_EXP_PER_PLAY
    let level = m.level ?? 1
    while (exp >= getExpToNextLevel(level)) {
      exp -= getExpToNextLevel(level)
      level++
    }
    setFieldMonster({ ...m, happiness, exp, level, carePlay: m.carePlay + 1 })
    setFieldCareExpFlash(CARE_EXP_PER_PLAY)
    setTimeout(() => setFieldCareExpFlash(0), 1500)
  }

  // 포인터 이벤트 핸들러들
  const onPointerDown = (e) => {
    fieldMonsterPointerDownRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    fieldMonsterPointerIdRef.current = e.pointerId
  }

  const onPointerUp = (e) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch (_) { }
    fieldMonsterPointerIdRef.current = null
    setTimeout(() => { fieldMonsterPointerDownRef.current = false }, 0)
  }

  const onPointerLeave = (e) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch (_) { }
    fieldMonsterPointerIdRef.current = null
    setTimeout(() => { fieldMonsterPointerDownRef.current = false }, 0)
  }

  const onPointerCancel = (e) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch (_) { }
    fieldMonsterPointerIdRef.current = null
    setTimeout(() => { fieldMonsterPointerDownRef.current = false }, 0)
  }

  const onTouchStart = () => { fieldMonsterTouchStartedRef.current = true }

  const onTouchEnd = (e) => {
    e.preventDefault()
    if (fieldMonsterTouchStartedRef.current) {
      handleFieldMonsterTouch()
      fieldMonsterClickSkipRef.current = true
      setTimeout(() => { fieldMonsterClickSkipRef.current = false }, 350)
    }
    fieldMonsterTouchStartedRef.current = false
  }

  const onClick = () => {
    if (fieldMonsterClickSkipRef.current) return
    if (!fieldMonsterPointerDownRef.current) return
    fieldMonsterPointerDownRef.current = false
    handleFieldMonsterTouch()
  }

  return {
    fieldMonsterPos,
    fieldMonsterMaxWidthPx,
    fieldLikeHearts,
    fieldMonsterLiking,
    fieldCareExpFlash,
    fieldHungerTick,
    fieldAreaRef,
    fieldMonsterDivRef,
    fieldTabShownAtRef,
    releaseFieldMonsterPointer,
    handleFieldReset,
    handleGaugeAdjust,
    handleFieldMonsterTouch,
    handleCareSnack,
    handleCarePlay,
    // 포인터 이벤트 핸들러
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onTouchStart,
    onTouchEnd,
    onClick,
  }
}
