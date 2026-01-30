import { useEffect, useRef, useState } from 'react'
import Monster from './components/Monster'
import LoginScreen from './components/LoginScreen'
import GaugeBar from './components/GaugeBar'
import { getCurrentUserId, getUserData, setCurrentUserId, updateUserData, getUserNumber } from './utils/userStorage'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [mood, setMood] = useState('평온')
  const [moodValue, setMoodValue] = useState(50) // 기분 수치 (50~100)
  const [affection, setAffection] = useState(0)
  const [bondStage, setBondStage] = useState(1) // 1 = egg1, 2 = egg2 (유대 12 되면 0으로 초기화 후 단계 상승)
  const [note, setNote] = useState('')
  const [tab, setTab] = useState('egg') // 'egg' | 'field' | 'sanctuary'
  const [devCoords, setDevCoords] = useState({ x: 0, y: 0 })
  const [devViewport, setDevViewport] = useState({ w: 0, h: 0 })
  const noteTimerRef = useRef(null)
  const affectionRef = useRef(affection)
  const bondStageRef = useRef(bondStage)
  affectionRef.current = affection
  bondStageRef.current = bondStage

  // 기분 수치를 텍스트로 변환
  const valueToMood = (value) => {
    if (value >= 85) return '활기'
    if (value >= 75) return '만족'
    if (value >= 60) return '따뜻'
    return '평온'
  }

  // 로그인 상태 확인
  useEffect(() => {
    const userId = getCurrentUserId()
    if (userId) {
      const userData = getUserData(userId)
      if (userData) {
        setUser(userData)
        const savedMood = userData.mood || '평온'
        setMood(savedMood)
        const savedValue = moodToValue(savedMood)
        setMoodValue(savedValue)
        setAffection(Math.min(12, userData.affection ?? 0))
        setBondStage(userData.bondStage ?? 1)
      } else {
        // 세션은 있는데 데이터가 없으면 로그아웃
        setCurrentUserId(null)
      }
    }
  }, [])

  // 기분 수치가 변경되면 텍스트도 업데이트
  useEffect(() => {
    const newMood = valueToMood(moodValue)
    if (newMood !== mood) {
      setMood(newMood)
    }
  }, [moodValue])

  // 사용자 데이터 저장 (mood, affection, bondStage 변경 시)
  useEffect(() => {
    if (user) {
      updateUserData(user.userId, { mood, affection, bondStage })
    }
  }, [mood, affection, bondStage, user])

  // 시간에 따라 기분 감소 (30초마다 1씩 감소)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      setMoodValue((prev) => {
        const newValue = Math.max(50, prev - 1) // 최소 50 (평온)
        return newValue
      })
    }, 30000) // 30초마다

    return () => clearInterval(interval)
  }, [user])

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

  // 유대 1시간마다 1씩 자동 증가 (1단계에서 12 되면 2단계로 전환)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      const currentAffection = affectionRef.current
      const currentStage = bondStageRef.current
      if (currentStage === 1 && currentAffection >= 11) {
        setAffection(0)
        setBondStage(2)
        setUser((prev) => (prev ? { ...prev, affection: 0, bondStage: 2 } : prev))
        updateUserData(user.userId, { affection: 0, bondStage: 2 })
      } else if (currentStage === 1) {
        setAffection((a) => Math.min(12, a + 1))
      }
    }, 3600000) // 1시간

    return () => clearInterval(interval)
  }, [user])

  const handleLogin = (userData) => {
    setUser(userData)
    const savedMood = userData.mood || '평온'
    setMood(savedMood)
    setMoodValue(moodToValue(savedMood))
    setAffection(Math.min(12, userData.affection ?? 0))
    setBondStage(userData.bondStage ?? 1)
  }

  const handleLogout = () => {
    setCurrentUserId(null)
    setUser(null)
    setMood('평온')
    setMoodValue(50)
    setAffection(0)
    setBondStage(1)
    setNote('')
  }

  // 기분을 숫자로 변환 (게이지용)
  const moodToValue = (mood) => {
    if (mood === '활기') return 90
    if (mood === '만족') return 80
    if (mood === '따뜻') return 70
    return 50 // 평온
  }

  const handleMonsterTouch = () => {
    if (!user) return
    setMoodValue((v) => Math.min(v + 8, 100))
    // 유대 단계: 1단계(egg1)에서 유대 12가 되면 유대 0으로 초기화하고 2단계(egg2)로 전환
    if (bondStage === 1 && affection >= 11) {
      setAffection(0)
      setBondStage(2)
      setUser((prev) => (prev ? { ...prev, affection: 0, bondStage: 2 } : prev))
      updateUserData(user.userId, { affection: 0, bondStage: 2 })
    } else {
      setAffection((a) => Math.min(a + 1, 12))
    }
    setNote('...')
    window.clearTimeout(noteTimerRef.current)
    noteTimerRef.current = window.setTimeout(() => setNote(''), 1500)
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />
  }

  const userNumber = getUserNumber(user.userId)

  return (
    <div className={`app ${tab === 'egg' ? 'app--bg-egg' : ''}`}>
      <div className="dev-coords" aria-hidden="true">
        <div>x: {devCoords.x} · y: {devCoords.y}</div>
        <div>viewport: {devViewport.w}×{devViewport.h}</div>
      </div>
      <div className="app-frame">
        <main className="main">
          {tab === 'egg' && (
            <div className="hud">
              <div className="hud-gauges">
                <GaugeBar label="기분" value={moodValue} maxValue={100} color="mood" />
                <GaugeBar label="유대" value={affection} maxValue={12} color="affection" />
              </div>
              <button type="button" className="hud-chip hud-chip--logout" onClick={handleLogout} title="로그아웃">
                유저 #{userNumber} · {user.userId}
              </button>
            </div>
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

        {tab === 'egg' && (
          <Monster mood={mood} bondStage={bondStage} affection={affection} note={note} onTouch={handleMonsterTouch} />
        )}
        {tab === 'egg' && (
          <>
            <div className="dev-affection" aria-label="유대 조절 (개발용)">
              <button
                type="button"
                className="dev-affection-btn"
                onClick={() => {
                  if (bondStage === 2) {
                    setBondStage(1)
                    setAffection(11)
                    setUser((prev) => (prev ? { ...prev, bondStage: 1, affection: 11 } : prev))
                    updateUserData(user.userId, { bondStage: 1, affection: 11 })
                  } else {
                    setAffection((a) => Math.max(0, a - 1))
                  }
                }}
                title="유대 -1 (2단계에서는 1단계로)"
              >
                −
              </button>
              <span className="dev-affection-label">유대</span>
              <button
                type="button"
                className="dev-affection-btn"
                onClick={() => {
                  if (bondStage === 1 && affection >= 11) {
                    setAffection(0)
                    setBondStage(2)
                    setUser((prev) => (prev ? { ...prev, affection: 0, bondStage: 2 } : prev))
                    updateUserData(user.userId, { affection: 0, bondStage: 2 })
                  } else {
                    setAffection((a) => Math.min(12, a + 1))
                  }
                }}
                title="유대 +1 (꽉 차면 2단계로)"
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
      </div>
    </div>
  )
}

export default App
