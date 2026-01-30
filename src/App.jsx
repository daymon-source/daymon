import { useEffect, useRef, useState } from 'react'
import Monster from './components/Monster'
import LoginScreen from './components/LoginScreen'
import GaugeBar from './components/GaugeBar'
import { getCurrentUserId, getUserData, setCurrentUserId, updateUserData } from './utils/userStorage'
import { DEFAULT_ELEMENT, getMonsterImage } from './constants/elements'
import { EGG_TYPES, getEggImage, getElementByEggType, getEggTypeByElement, getEggConfig } from './constants/eggs'
import './App.css'

// 저장된 알에 element/eggType 없으면 기본값 적용 (레거시 호환)
function normalizeEgg(egg) {
  if (!egg) return egg
  const next = { ...egg }
  if (next.element == null) next.element = DEFAULT_ELEMENT
  if (next.eggType == null || !EGG_TYPES.includes(next.eggType)) {
    next.eggType = getEggTypeByElement(next.element)
  }
  return next
}
function normalizeSlots(slots) {
  if (!Array.isArray(slots)) return slots
  return slots.map((egg) => normalizeEgg(egg))
}

const HATCH_MAX = 24 // 부화 게이지 총 24칸 (0~24)
const HATCH_EGG2_AT = 19 // 19번째 칸이 되는 순간 egg2로 전환
const EGG_SLOT_COUNT = 5 // 알 슬롯 5칸
const EGG_SLOT_LOCKED_FROM = 3 // 4번째·5번째 슬롯(인덱스 3,4) 잠금 — 나중에 잠금해제
const SANCTUARY_SLOT_COUNT = 6 // 안식처 슬롯 6칸 (3열 2행, 화면에 다 들어오게)

// 남은 ms → "HH:MM" (예: 23:59, 01:10)
function formatRemainingTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// 슬롯에서 알 제거 후 왼쪽으로 당기기 (0~2번만 사용, 3~4 잠금)
function compactSlots(slots, removedIndex) {
  const unlocked = [...(slots.slice(0, 3))]
  unlocked[removedIndex] = null
  const compacted = unlocked.filter((egg) => egg != null)
  return [...compacted, null, null, null, null].slice(0, 5)
}

function App() {
  const [user, setUser] = useState(null)
  const [mood, setMood] = useState('평온')
  const [centerEgg, setCenterEgg] = useState(null) // 가운데 알. null이면 부화할 알 없음(슬롯에서 선택 가능)
  const [slots, setSlots] = useState([null, null, null, null, null]) // 슬롯 5칸. 0~2 사용, 3~4 잠금
  const [fieldMonster, setFieldMonster] = useState(null) // 필드 메인 몬스터. null이면 없음
  const [fieldMonsterPos, setFieldMonsterPos] = useState({ x: 50, y: 50 }) // 필드 몬스터: 화면 정중앙(50%, 50%)
  const [fieldMonsterMaxWidthPx, setFieldMonsterMaxWidthPx] = useState(null) // field-area 기준 몬스터 최대 너비(px)
  const [fieldLikeHearts, setFieldLikeHearts] = useState([]) // 터치 시 하트 이펙트 [{ id, batchId }]
  const [fieldMonsterLiking, setFieldMonsterLiking] = useState(false) // 터치 시 몬스터 살짝 커졌다 작아짐
  const [sanctuary, setSanctuary] = useState([null, null, null, null, null, null]) // 안식처 슬롯 6칸
  const fieldAreaRef = useRef(null)
  const fieldLikeTimeoutRef = useRef(null)
  const fieldMonsterTouchStartedRef = useRef(false) // 터치가 몬스터 위에서 시작했을 때만 true
  const fieldMonsterClickSkipRef = useRef(false) // 터치 후 나오는 클릭은 무시
  const fieldMonsterPointerDownRef = useRef(false) // 포인터/마우스가 몬스터 위에서 down 됐을 때만 true
  const fieldTabShownAtRef = useRef(0) // 필드 탭이 마지막으로 표시된 시각(ms). 이 시각 직후 짧은 동안 몬스터 터치 무시
  const fieldMonsterDivRef = useRef(null) // 몬스터 div (탭 이탈 시 포인터 캡처 해제용)
  const fieldMonsterPointerIdRef = useRef(null) // 몬스터가 캡처 중인 pointerId
  const fieldPointerReleasedAtRef = useRef(0) // 포인터 해제한 시각(ms). 해제 직후 짧은 동안 터치 무시(빠른 탭 전환 대비)
  const [note, setNote] = useState('')
  const [tab, setTab] = useState('egg')
  const [hatchDismissed, setHatchDismissed] = useState(false)
  const [confirmHatchOpen, setConfirmHatchOpen] = useState(false) // '알을 부화하시겠습니까?' 다이얼로그
  const [slotToHatch, setSlotToHatch] = useState(null) // 부화 확인 시 선택한 슬롯 인덱스
  const [sanctuaryToFieldOpen, setSanctuaryToFieldOpen] = useState(false) // '데이몬을 필드로 내보내시겠습니까?' 다이얼로그
  const [sanctuarySlotToField, setSanctuarySlotToField] = useState(null) // 필드로 내보낼 안식처 슬롯 인덱스
  const [devCoords, setDevCoords] = useState({ x: 0, y: 0 })
  const [devViewport, setDevViewport] = useState({ w: 0, h: 0 })
  const noteTimerRef = useRef(null)
  const holdTimeoutRef = useRef(null)
  const holdIntervalRef = useRef(null)
  const nextTickAtRef = useRef(0) // 다음 부화 게이지 +1 시각(ms)
  const [remainingMs, setRemainingMs] = useState(0) // 부화까지 남은 ms (표시용)
  const [gaugeProgress, setGaugeProgress] = useState(0) // 현재 1시간 구간 내 진행률 0~1 (실시간 채움)

  const affection = centerEgg ? centerEgg.affection : 0
  const bondStage = centerEgg ? (centerEgg.affection >= HATCH_EGG2_AT ? 2 : 1) : 1

  // 로그인 상태 확인
  useEffect(() => {
    const userId = getCurrentUserId()
    if (userId) {
      const userData = getUserData(userId)
      if (userData) {
        setUser(userData)
        setMood(userData.mood || '평온')
        if (Array.isArray(userData.slots)) {
          setCenterEgg(normalizeEgg(userData.centerEgg ?? null))
          setSlots(normalizeSlots(userData.slots))
        } else {
          const a = Math.max(0, Math.min(HATCH_MAX, userData.affection ?? 0))
          const bs = userData.bondStage === 2 && a < HATCH_EGG2_AT ? 2 : a >= HATCH_EGG2_AT ? 2 : 1
          setCenterEgg({ affection: a, bondStage: bs, element: DEFAULT_ELEMENT })
          setSlots([null, null, null, null, null])
        }
        setFieldMonster(userData.fieldMonster ?? null)
        const s = Array.isArray(userData.sanctuary) ? userData.sanctuary : []
        const pad = [...s]
        while (pad.length < SANCTUARY_SLOT_COUNT) pad.push(null)
        setSanctuary(pad.slice(0, SANCTUARY_SLOT_COUNT))
        nextTickAtRef.current = (userData.nextTickAt != null && userData.nextTickAt > 0) ? userData.nextTickAt : Date.now() + 3600000
      } else {
        setCurrentUserId(null)
      }
    }
  }, [])

  // 사용자 데이터 저장
  useEffect(() => {
    if (user) {
      const bond = centerEgg ? (centerEgg.affection >= HATCH_EGG2_AT ? 2 : 1) : 1
      updateUserData(user.userId, {
        mood,
        centerEgg,
        slots,
        fieldMonster,
        sanctuary,
        affection: centerEgg?.affection ?? 0,
        bondStage: bond,
        nextTickAt: nextTickAtRef.current,
      })
    }
  }, [mood, centerEgg, slots, fieldMonster, sanctuary, user])

  // 개발용: 마우스/터치 좌표 표시
  useEffect(() => {
    const update = (e) => {
      const x = e.touches ? e.touches[0].clientX : e.clientX
      const y = e.touches ? e.touches[0].clientY : e.clientY
      setDevCoords({ x, y })
    }
    window.addEventListener('mousemove', update)
    window.addEventListener('touchmove', update, { passive: true })
    return () => {
      window.removeEventListener('mousemove', update)
      window.removeEventListener('touchmove', update)
    }
  }, [])

  // 개발용: 뷰포트 크기 (화면 너비×높이)
  useEffect(() => {
    const update = () => setDevViewport({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // 부화 1시간마다 1씩 자동 증가 (가운데 알이 있을 때만). nextTickAt은 로드 시 복원되므로 여기서 덮어쓰지 않음
  useEffect(() => {
    if (!user || !centerEgg) return
    if (nextTickAtRef.current <= 0) nextTickAtRef.current = Date.now() + 3600000
    const interval = setInterval(() => {
      setCenterEgg((prev) =>
        prev ? { ...prev, affection: Math.min(HATCH_MAX, prev.affection + 1) } : prev
      )
      nextTickAtRef.current = Date.now() + 3600000
    }, 3600000)
    return () => clearInterval(interval)
  }, [user, centerEgg])

  // 부화까지 남은 시간 표시(1초마다 갱신) — 게이지에 따라: 다음 틱까지 + 그 다음 남은 시간
  useEffect(() => {
    if (!centerEgg || affection >= HATCH_MAX) return
    const update = () => {
      const untilNextTick = Math.max(0, nextTickAtRef.current - Date.now())
      const fullHoursAfter = Math.max(0, (HATCH_MAX - affection - 1) * 3600000)
      setRemainingMs(untilNextTick + fullHoursAfter)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [centerEgg, affection])

  // 게이지 실시간 채움: 현재 1시간 구간 진행률을 자주 갱신 (부드럽게 차오르게)
  useEffect(() => {
    if (!centerEgg) {
      setGaugeProgress(0)
      return
    }
    if (affection >= HATCH_MAX) {
      setGaugeProgress(1)
      return
    }
    const update = () => {
      const msUntilNext = nextTickAtRef.current - Date.now()
      const progress = Math.min(1, Math.max(0, 1 - msUntilNext / 3600000))
      setGaugeProgress(progress)
    }
    update()
    const interval = setInterval(update, 200)
    return () => clearInterval(interval)
  }, [centerEgg, affection])

  // 언마운트 시 증감 버튼 누름 타이머 정리
  useEffect(() => {
    return () => clearHold()
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    setMood(userData.mood || '평온')
    if (Array.isArray(userData.slots)) {
      setCenterEgg(normalizeEgg(userData.centerEgg ?? null))
      setSlots(normalizeSlots(userData.slots))
    } else {
      const a = Math.max(0, Math.min(HATCH_MAX, userData.affection ?? 0))
      const bs = userData.bondStage === 2 && a < HATCH_EGG2_AT ? 2 : a >= HATCH_EGG2_AT ? 2 : 1
      setCenterEgg({ affection: a, bondStage: bs, element: DEFAULT_ELEMENT })
      setSlots([null, null, null, null, null])
    }
    setFieldMonster(userData.fieldMonster ?? null)
    const s = Array.isArray(userData.sanctuary) ? userData.sanctuary : []
    const pad = [...s]
    while (pad.length < SANCTUARY_SLOT_COUNT) pad.push(null)
    setSanctuary(pad.slice(0, SANCTUARY_SLOT_COUNT))
    nextTickAtRef.current = (userData.nextTickAt != null && userData.nextTickAt > 0) ? userData.nextTickAt : Date.now() + 3600000
    setHatchDismissed(false)
  }

  const handleLogout = () => {
    setCurrentUserId(null)
    setUser(null)
    setMood('평온')
    setCenterEgg(null)
    setSlots([null, null, null, null, null])
    setFieldMonster(null)
    setSanctuary([null, null, null, null, null, null])
    setNote('')
    setHatchDismissed(false)
    setConfirmHatchOpen(false)
    setSlotToHatch(null)
  }

  const handleMonsterTouch = () => {
    if (!user) return
  }

  // 부화 완료 후 화면 닫을 때: 몬스터는 필드(비어 있으면) 또는 안식처로, 가운데는 빈 상태
  // 부화 완료 후: 필드 비었으면 필드로, 필드에 몬스터 있으면 안식처 첫 빈 슬롯으로
  const handleHatchDismiss = () => {
    const monster = { element: centerEgg?.element ?? DEFAULT_ELEMENT, id: Date.now() }
    if (fieldMonster == null) {
      setFieldMonster(monster)
    } else {
      setSanctuary((prev) => {
        const base = prev.length >= SANCTUARY_SLOT_COUNT ? prev : [...prev, ...Array(SANCTUARY_SLOT_COUNT).fill(null)].slice(0, SANCTUARY_SLOT_COUNT)
        const i = base.findIndex((m) => m == null)
        if (i === -1) return base
        const next = [...base]
        next[i] = monster
        return next
      })
    }
    setHatchDismissed(true)
    setCenterEgg(null)
  }

  // 슬롯 알 클릭: 가운데에 알이 없을 때만 '알을 부화하시겠습니까?' 표시
  const handleSlotClick = (index) => {
    if (centerEgg != null) return // 가운데에 알 있으면 슬롯 부화 불가
    if (index >= EGG_SLOT_LOCKED_FROM) return
    const egg = slots[index]
    if (!egg) return
    setSlotToHatch(index)
    setConfirmHatchOpen(true)
  }

  // '알을 부화하시겠습니까?' 수락 → 알을 가운데로, 슬롯에서 제거, 왼쪽으로 당기기
  const handleConfirmHatchAccept = () => {
    if (slotToHatch == null) {
      setConfirmHatchOpen(false)
      return
    }
    const egg = slots[slotToHatch]
    if (!egg) {
      setConfirmHatchOpen(false)
      setSlotToHatch(null)
      return
    }
    setCenterEgg(egg)
    setSlots((prev) => compactSlots(prev, slotToHatch))
    setHatchDismissed(false)
    setConfirmHatchOpen(false)
    setSlotToHatch(null)
  }

  const handleConfirmHatchReject = () => {
    setConfirmHatchOpen(false)
    setSlotToHatch(null)
  }

  const createEgg = (eggType) => ({
    affection: 0,
    bondStage: 1,
    element: getElementByEggType(eggType),
    eggType,
  })

  // 초기화: 슬롯에 알 3개 — 불속성·물속성 둘 다 나오게 (1 classic, 1 glow, 1 랜덤)
  const handleResetSlots = () => {
    const third = EGG_TYPES[Math.floor(Math.random() * EGG_TYPES.length)]
    const three = [
      createEgg('classic'),
      createEgg('glow'),
      createEgg(third),
    ]
    for (let i = three.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [three[i], three[j]] = [three[j], three[i]]
    }
    setSlots([...three, null, null])
  }

  // 알 삭제: 모든 슬롯 알 제거
  const handleDeleteAllSlots = () => {
    setSlots([null, null, null, null, null])
  }

  // 증감 버튼 누르고 있으면 연속 증감 — 대기 후 반복
  const clearHold = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
  }

  const startHoldDecrease = () => {
    if (!centerEgg) return
    clearHold()
    holdTimeoutRef.current = setTimeout(() => {
      holdTimeoutRef.current = null
      holdIntervalRef.current = setInterval(() => {
        setCenterEgg((e) => (e ? { ...e, affection: Math.max(0, e.affection - 1) } : e))
        nextTickAtRef.current = Date.now() + 3600000
      }, 80)
    }, 400)
  }

  const startHoldIncrease = () => {
    if (!centerEgg) return
    clearHold()
    holdTimeoutRef.current = setTimeout(() => {
      holdTimeoutRef.current = null
      holdIntervalRef.current = setInterval(() => {
        setCenterEgg((e) => (e ? { ...e, affection: Math.min(HATCH_MAX, e.affection + 1) } : e))
        nextTickAtRef.current = Date.now() + 3600000
      }, 80)
    }, 400)
  }

  // 필드 탭을 벗어날 때 몬스터 포인터 캡처 해제 + 상태 초기화 (탭 전환 후 오인 이벤트 방지)
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

  // 필드 몬스터: 지금보다 1.5배 크기, 좌우·위아래로 이동
  useEffect(() => {
    if (tab !== 'field' || !fieldMonster) return
    const el = fieldAreaRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      const w = rect.width || 300
      setFieldMonsterMaxWidthPx(Math.floor(w * 1.5)) // 1.5배
    }
    const tick = () => {
      setFieldMonsterPos({
        x: 38 + Math.random() * 24, // 좌우 38%~62%
        y: 48 + Math.random() * 10, // 위아래 48%~58%
      })
    }
    const t1 = setTimeout(tick, 100)
    const t2 = setInterval(tick, 3000)
    return () => { clearTimeout(t1); clearInterval(t2) }
  }, [tab, fieldMonster])

  const handleFieldReset = () => {
    setFieldMonster(null)
  }

  const handleSanctuaryReset = () => {
    setSanctuary(Array(SANCTUARY_SLOT_COUNT).fill(null))
  }

  // 안식처 몬스터 터치 → '데이몬을 필드로 내보내시겠습니까?' 다이얼로그 열기
  const handleSanctuarySlotClick = (index) => {
    if (!sanctuary[index]) return
    setSanctuarySlotToField(index)
    setSanctuaryToFieldOpen(true)
  }

  const handleSanctuaryToFieldAccept = () => {
    if (sanctuarySlotToField == null) {
      setSanctuaryToFieldOpen(false)
      setSanctuarySlotToField(null)
      return
    }
    const sanctuaryMonster = sanctuary[sanctuarySlotToField]
    if (!sanctuaryMonster) {
      setSanctuaryToFieldOpen(false)
      setSanctuarySlotToField(null)
      return
    }
    if (fieldMonster) {
      setFieldMonster(sanctuaryMonster)
      setSanctuary((prev) => {
        const next = [...prev]
        next[sanctuarySlotToField] = fieldMonster
        return next
      })
    } else {
      setFieldMonster(sanctuaryMonster)
      setSanctuary((prev) => {
        const next = [...prev]
        next[sanctuarySlotToField] = null
        return next
      })
    }
    setSanctuaryToFieldOpen(false)
    setSanctuarySlotToField(null)
  }

  const handleSanctuaryToFieldReject = () => {
    setSanctuaryToFieldOpen(false)
    setSanctuarySlotToField(null)
  }

  // 필드 몬스터 터치 시 좋아하는 느낌: 하트가 좌·우·위로 랜덤하게 떠오름
  const handleFieldMonsterTouch = () => {
    if (!fieldMonster) return
    const now = Date.now()
    // 필드 탭으로 전환 직후(600ms) 동안은 오인 터치 무시
    if (now - fieldTabShownAtRef.current < 600) return
    // 포인터 해제 직후(550ms) 동안도 무시 — 빠른 탭 왔다갔다 시 오인 방지
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

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <div className={`app ${tab === 'egg' ? 'app--bg-egg' : ''} ${tab === 'field' ? 'app--bg-field' : ''} ${tab === 'sanctuary' ? 'app--bg-sanctuary' : ''}`}>
      <div className="dev-coords" aria-hidden="true">
        <div>x: {devCoords.x} · y: {devCoords.y}</div>
        <div>viewport: {devViewport.w}×{devViewport.h}</div>
      </div>
      <div className="app-frame">
        <main className="main">
          {tab === 'egg' && (
            <>
              <div className="user-area">
                <div className="user-name" title="로그아웃하려면 클릭">
                  <button type="button" className="user-name-btn" onClick={handleLogout} aria-label="유저 이름 · 로그아웃">
                    {user.userId}
                  </button>
                </div>
                <button
                  type="button"
                  className="user-reset-btn"
                  onClick={handleResetSlots}
                  aria-label="슬롯에 알 3개 채우기 (불·물 포함)"
                >
                  초기화
                </button>
                <button
                  type="button"
                  className="user-reset-btn"
                  onClick={handleDeleteAllSlots}
                  aria-label="모든 슬롯 알 삭제"
                >
                  알 삭제
                </button>
              </div>
              {centerEgg && (
                <div className="hud-time-corner" aria-label="부화까지 남은 시간">
                  {affection >= HATCH_MAX ? '00:00' : formatRemainingTime(remainingMs)}
                </div>
              )}
              <div className="hud-area">
                <div className="hud">
                  <GaugeBar
                    label=""
                    value={centerEgg == null ? 0 : Math.min(HATCH_MAX, affection + gaugeProgress)}
                    maxValue={HATCH_MAX}
                    color="affection"
                  />
                </div>
                <div className="egg-slots" role="list" aria-label="알 슬롯">
                  {Array.from({ length: EGG_SLOT_COUNT }, (_, i) => {
                    const locked = i >= EGG_SLOT_LOCKED_FROM
                    const egg = slots[i]
                    const hasEgg = !locked && egg != null
                    const canSelect = !centerEgg && hasEgg
                    const slotBondStage = egg ? (egg.affection >= HATCH_EGG2_AT ? 2 : 1) : 1
                    return (
                      <button
                        key={i}
                        type="button"
                        role="listitem"
                        className={`egg-slot ${hasEgg ? 'egg-slot--has-egg' : 'egg-slot--empty'} ${locked ? 'egg-slot--locked' : ''}`}
                        aria-label={locked ? `슬롯 ${i + 1} 잠금` : hasEgg ? '알 있음 · 부화하려면 탭' : '빈 슬롯'}
                        onClick={() => handleSlotClick(i)}
                        disabled={!canSelect && !locked}
                        tabIndex={hasEgg || locked ? 0 : -1}
                      >
                        {locked ? (
                          <span className="egg-slot-lock" aria-hidden="true">🔒</span>
                        ) : hasEgg ? (
                          <img
                            src={getEggImage(egg.eggType)}
                            alt="알"
                            className={`egg-slot-img ${getEggConfig(egg.eggType).slotClass ? getEggConfig(egg.eggType).slotClass : ''}`}
                            draggable={false}
                          />
                        ) : (
                          <span className="egg-slot-empty" aria-hidden="true" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {tab === 'field' && (
            <div className="tab-screen tab-screen--field" aria-label="필드">
              <div className="field-area" ref={fieldAreaRef}>
                {fieldMonster ? (
                  <>
                    <div
                      ref={fieldMonsterDivRef}
                      className={`field-monster ${fieldMonsterLiking ? 'field-monster--liking' : ''}`}
                      style={{
                        left: `${fieldMonsterPos.x}%`,
                        top: `${fieldMonsterPos.y}%`,
                      }}
                      onPointerDown={(e) => {
                        fieldMonsterPointerDownRef.current = true
                        e.currentTarget.setPointerCapture(e.pointerId)
                        fieldMonsterPointerIdRef.current = e.pointerId
                      }}
                      onPointerUp={(e) => {
                        try { e.currentTarget.releasePointerCapture(e.pointerId) } catch (_) {}
                        fieldMonsterPointerIdRef.current = null
                        setTimeout(() => { fieldMonsterPointerDownRef.current = false }, 0)
                      }}
                      onPointerLeave={(e) => {
                        try { e.currentTarget.releasePointerCapture(e.pointerId) } catch (_) {}
                        fieldMonsterPointerIdRef.current = null
                        setTimeout(() => { fieldMonsterPointerDownRef.current = false }, 0)
                      }}
                      onPointerCancel={(e) => {
                        try { e.currentTarget.releasePointerCapture(e.pointerId) } catch (_) {}
                        fieldMonsterPointerIdRef.current = null
                        setTimeout(() => { fieldMonsterPointerDownRef.current = false }, 0)
                      }}
                      onTouchStart={() => { fieldMonsterTouchStartedRef.current = true }}
                      onTouchEnd={(e) => {
                        e.preventDefault()
                        if (fieldMonsterTouchStartedRef.current) {
                          handleFieldMonsterTouch()
                          fieldMonsterClickSkipRef.current = true
                          setTimeout(() => { fieldMonsterClickSkipRef.current = false }, 350)
                        }
                        fieldMonsterTouchStartedRef.current = false
                      }}
                      onClick={() => {
                        if (fieldMonsterClickSkipRef.current) return
                        if (!fieldMonsterPointerDownRef.current) return
                        fieldMonsterPointerDownRef.current = false
                        handleFieldMonsterTouch()
                      }}
                      role="button"
                      aria-label="몬스터 터치"
                    >
                      <img
                        src={getMonsterImage(fieldMonster.element)}
                        alt="필드 몬스터"
                        className="field-monster-img"
                        style={fieldMonsterMaxWidthPx != null ? { maxWidth: `${fieldMonsterMaxWidthPx}px` } : undefined}
                        draggable={false}
                      />
                      {fieldLikeHearts.map((h) => (
                        <span
                          key={h.id}
                          className="field-like-heart"
                          style={{ '--dx': `${h.dx ?? 0}px`, '--dy': `${h.dy ?? 0}px` }}
                          aria-hidden="true"
                        >
                          ♥
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="field-reset-btn"
                      onClick={handleFieldReset}
                      aria-label="필드 초기화"
                    >
                      필드 초기화
                    </button>
                  </>
                ) : (
                  <p className="field-empty">필드에 몬스터가 없어요. 알을 부화시키면 여기로 와요.</p>
                )}
              </div>
            </div>
          )}

          {tab === 'sanctuary' && (
            <div className="tab-screen tab-screen--sanctuary">
              <button
                type="button"
                className="sanctuary-reset-btn"
                onClick={handleSanctuaryReset}
                aria-label="안식처 초기화"
              >
                안식처 초기화
              </button>
              <div className="sanctuary-slots" role="list" aria-label="안식처 몬스터 슬롯">
                {Array.from({ length: SANCTUARY_SLOT_COUNT }, (_, i) => {
                  const m = sanctuary[i]
                  return (
                    <div
                      key={m ? m.id : `empty-${i}`}
                      className={`sanctuary-slot ${m ? 'sanctuary-slot--has-monster' : 'sanctuary-slot--empty'}`}
                      role="listitem"
                      onClick={m ? () => handleSanctuarySlotClick(i) : undefined}
                      onKeyDown={m ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSanctuarySlotClick(i); } } : undefined}
                      tabIndex={m ? 0 : -1}
                      role={m ? 'button' : 'listitem'}
                      aria-label={m ? '필드로 내보내기' : undefined}
                    >
                      {m ? (
                        <img
                          src={getMonsterImage(m.element)}
                          alt={`${m.element} 몬스터`}
                          className="sanctuary-slot-img"
                          draggable={false}
                        />
                      ) : (
                        <span className="sanctuary-slot-empty" aria-hidden="true" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </main>

        {tab === 'egg' && centerEgg != null && !hatchDismissed && (
          <Monster
            mood={mood}
            bondStage={bondStage}
            affection={affection}
            element={centerEgg.element ?? DEFAULT_ELEMENT}
            eggType={centerEgg.eggType ?? getEggTypeByElement(centerEgg.element)}
            note={note}
            onTouch={handleMonsterTouch}
            onHatch={() => {}}
            onHatchDismiss={handleHatchDismiss}
            readyToHatch={affection >= HATCH_MAX}
          />
        )}
        {tab === 'egg' && centerEgg && (
          <>
            <div className="dev-affection" aria-label="부화 조절 (개발용)">
              <button
                type="button"
                className="dev-affection-btn"
                title="부화 -1 (누르고 있으면 연속 감소)"
                onClick={() => {
                  setCenterEgg((e) => (e ? { ...e, affection: Math.max(0, e.affection - 1) } : e))
                  nextTickAtRef.current = Date.now() + 3600000
                }}
                onMouseDown={startHoldDecrease}
                onMouseUp={clearHold}
                onMouseLeave={clearHold}
                onTouchStart={(e) => {
                  e.preventDefault()
                  startHoldDecrease()
                }}
                onTouchEnd={clearHold}
                onTouchCancel={clearHold}
              >
                −
              </button>
              <span className="dev-affection-label">부화</span>
              <button
                type="button"
                className="dev-affection-btn"
                title="부화 +1 (누르고 있으면 연속 증가)"
                onClick={() => {
                  setCenterEgg((e) => (e ? { ...e, affection: Math.min(HATCH_MAX, e.affection + 1) } : e))
                  nextTickAtRef.current = Date.now() + 3600000
                }}
                onMouseDown={startHoldIncrease}
                onMouseUp={clearHold}
                onMouseLeave={clearHold}
                onTouchStart={(e) => {
                  e.preventDefault()
                  startHoldIncrease()
                }}
                onTouchEnd={clearHold}
                onTouchCancel={clearHold}
              >
                ＋
              </button>
            </div>
          </>
        )}

        <nav className="bottom-nav" aria-label="메인 메뉴">
        <button
          type="button"
          className={`bottom-nav-btn ${tab === 'egg' ? 'bottom-nav-btn--active' : ''}`}
          onClick={() => {
            releaseFieldMonsterPointer()
            setTab('egg')
          }}
          aria-current={tab === 'egg' ? 'page' : undefined}
        >
          알
        </button>
        <button
          type="button"
          className={`bottom-nav-btn ${tab === 'field' ? 'bottom-nav-btn--active' : ''}`}
          onClick={() => {
            fieldTabShownAtRef.current = Date.now()
            setTab('field')
          }}
          aria-current={tab === 'field' ? 'page' : undefined}
        >
          필드
        </button>
        <button
          type="button"
          className={`bottom-nav-btn ${tab === 'sanctuary' ? 'bottom-nav-btn--active' : ''}`}
          onClick={() => {
            releaseFieldMonsterPointer()
            setTab('sanctuary')
          }}
          aria-current={tab === 'sanctuary' ? 'page' : undefined}
        >
          안식처
        </button>
        </nav>

        {/* 부화 확인 다이얼로그: 슬롯 알 → 가운데로 */}
        {confirmHatchOpen && (
          <div className="modal-overlay confirm-hatch-overlay" role="alertdialog" aria-modal="true" aria-labelledby="confirm-hatch-title">
            <div className="confirm-hatch-dialog">
              <p id="confirm-hatch-title" className="confirm-hatch-text">알을 부화하시겠습니까?</p>
              <div className="confirm-hatch-actions">
                <button type="button" className="confirm-hatch-btn confirm-hatch-btn--reject" onClick={handleConfirmHatchReject}>
                  거절
                </button>
                <button type="button" className="confirm-hatch-btn confirm-hatch-btn--accept" onClick={handleConfirmHatchAccept}>
                  수락
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 안식처 → 필드 확인 다이얼로그: 데이몬을 필드로 내보내기 (필드 몬스터와 교체) */}
        {sanctuaryToFieldOpen && (
          <div className="modal-overlay confirm-hatch-overlay" role="alertdialog" aria-modal="true" aria-labelledby="sanctuary-to-field-title">
            <div className="confirm-hatch-dialog">
              <p id="sanctuary-to-field-title" className="confirm-hatch-text">데이몬을 필드로 내보내시겠습니까?</p>
              <div className="confirm-hatch-actions">
                <button type="button" className="confirm-hatch-btn confirm-hatch-btn--reject" onClick={handleSanctuaryToFieldReject}>
                  거절
                </button>
                <button type="button" className="confirm-hatch-btn confirm-hatch-btn--accept" onClick={handleSanctuaryToFieldAccept}>
                  수락
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
