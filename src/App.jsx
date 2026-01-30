import { useEffect, useRef, useState } from 'react'
import Monster from './components/Monster'
import LoginScreen from './components/LoginScreen'
import GaugeBar from './components/GaugeBar'
import { getCurrentUserId, getUserData, setCurrentUserId, updateUserData } from './utils/userStorage'
import egg1Img from './assets/egg1.png'
import egg2Img from './assets/egg2.png'
import './App.css'

const HATCH_MAX = 24 // 부화 게이지 총 24칸 (0~24)
const HATCH_EGG2_AT = 19 // 19번째 칸이 되는 순간 egg2로 전환
const EGG_SLOT_COUNT = 5 // 알 슬롯 5칸
const EGG_SLOT_LOCKED_FROM = 3 // 4번째·5번째 슬롯(인덱스 3,4) 잠금 — 나중에 잠금해제

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
  const [note, setNote] = useState('')
  const [tab, setTab] = useState('egg')
  const [hatchDismissed, setHatchDismissed] = useState(false)
  const [confirmHatchOpen, setConfirmHatchOpen] = useState(false) // '알을 부화하시겠습니까?' 다이얼로그
  const [slotToHatch, setSlotToHatch] = useState(null) // 부화 확인 시 선택한 슬롯 인덱스
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
          setCenterEgg(userData.centerEgg ?? null)
          setSlots(userData.slots)
        } else {
          const a = Math.max(0, Math.min(HATCH_MAX, userData.affection ?? 0))
          const bs = userData.bondStage === 2 && a < HATCH_EGG2_AT ? 2 : a >= HATCH_EGG2_AT ? 2 : 1
          setCenterEgg({ affection: a, bondStage: bs })
          setSlots([null, null, null, null, null])
        }
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
        affection: centerEgg?.affection ?? 0,
        bondStage: bond,
      })
    }
  }, [mood, centerEgg, slots, user])

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

  // 부화 1시간마다 1씩 자동 증가 (가운데 알이 있을 때만)
  useEffect(() => {
    if (!user || !centerEgg) return
    nextTickAtRef.current = Date.now() + 3600000
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
      setCenterEgg(userData.centerEgg ?? null)
      setSlots(userData.slots)
    } else {
      const a = Math.max(0, Math.min(HATCH_MAX, userData.affection ?? 0))
      const bs = userData.bondStage === 2 && a < HATCH_EGG2_AT ? 2 : a >= HATCH_EGG2_AT ? 2 : 1
      setCenterEgg({ affection: a, bondStage: bs })
      setSlots([null, null, null, null, null])
    }
    setHatchDismissed(false)
  }

  const handleLogout = () => {
    setCurrentUserId(null)
    setUser(null)
    setMood('평온')
    setCenterEgg(null)
    setSlots([null, null, null, null, null])
    setNote('')
    setHatchDismissed(false)
    setConfirmHatchOpen(false)
    setSlotToHatch(null)
  }

  const handleMonsterTouch = () => {
    if (!user) return
  }

  // 부화 완료 후 화면 닫을 때: 가운데 알 제거(슬롯에서 다시 선택 가능하게)
  const handleHatchDismiss = () => {
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

  // 초기화: 슬롯에 알 3개 채우기 (0~2번)
  const handleResetSlots = () => {
    const defaultEgg = () => ({ affection: 0, bondStage: 1 })
    setSlots([defaultEgg(), defaultEgg(), defaultEgg(), null, null])
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

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <div className={`app ${tab === 'egg' ? 'app--bg-egg' : ''}`}>
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
                  aria-label="슬롯에 알 3개 채우기 (개발용)"
                >
                  초기화
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
                            src={slotBondStage >= 2 ? egg2Img : egg1Img}
                            alt={slotBondStage >= 2 ? 'egg2' : 'egg1'}
                            className="egg-slot-img"
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
            <div className="tab-screen tab-screen--field">
              <h2 className="tab-screen-title">필드</h2>
              <p className="tab-screen-desc">메인 몬스터가 있는 곳</p>
            </div>
          )}

          {tab === 'sanctuary' && (
            <div className="tab-screen tab-screen--sanctuary">
              <h2 className="tab-screen-title">안식처</h2>
              <p className="tab-screen-desc">수집된 몬스터들이 휴식을 취하는 곳</p>
            </div>
          )}
        </main>

        {tab === 'egg' && centerEgg != null && !hatchDismissed && (
          <Monster
            mood={mood}
            bondStage={bondStage}
            affection={affection}
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
          onClick={() => setTab('egg')}
          aria-current={tab === 'egg' ? 'page' : undefined}
        >
          알
        </button>
        <button
          type="button"
          className={`bottom-nav-btn ${tab === 'field' ? 'bottom-nav-btn--active' : ''}`}
          onClick={() => setTab('field')}
          aria-current={tab === 'field' ? 'page' : undefined}
        >
          필드
        </button>
        <button
          type="button"
          className={`bottom-nav-btn ${tab === 'sanctuary' ? 'bottom-nav-btn--active' : ''}`}
          onClick={() => setTab('sanctuary')}
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
      </div>
    </div>
  )
}

export default App
