import { useEffect, useRef, useState } from 'react'
import Monster from './components/Monster'
import ActionBar from './components/ActionBar'
import ChatModal from './components/ChatModal'
import LoginScreen from './components/LoginScreen'
import GaugeBar from './components/GaugeBar'
import { getCurrentUserId, getUserData, setCurrentUserId, updateUserData } from './utils/userStorage'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [mood, setMood] = useState('평온')
  const [moodValue, setMoodValue] = useState(50) // 기분 수치 (50~100)
  const [affection, setAffection] = useState(0)
  const [note, setNote] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const noteTimerRef = useRef(null)

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
        // 저장된 기분을 수치로 변환
        const savedValue = moodToValue(savedMood)
        setMoodValue(savedValue)
        setAffection(userData.affection || 0)
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

  // 사용자 데이터 저장 (mood, affection 변경 시)
  useEffect(() => {
    if (user) {
      updateUserData(user.userId, { mood, affection })
    }
  }, [mood, affection, user])

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

  const handleLogin = (userData) => {
    setUser(userData)
    const savedMood = userData.mood || '평온'
    setMood(savedMood)
    setMoodValue(moodToValue(savedMood))
    setAffection(userData.affection || 0)
  }

  const handleLogout = () => {
    setCurrentUserId(null)
    setUser(null)
    setMood('평온')
    setMoodValue(50)
    setAffection(0)
    setNote('')
  }

  // 기분을 숫자로 변환 (게이지용)
  const moodToValue = (mood) => {
    if (mood === '활기') return 90
    if (mood === '만족') return 80
    if (mood === '따뜻') return 70
    return 50 // 평온
  }

  const handleAction = (actionId) => {
    if (!user) return

    if (actionId === 'pet') {
      setMoodValue((v) => Math.min(v + 15, 100)) // 따뜻하게
      setAffection((a) => Math.min(a + 1, 100))
      setNote('쓰다듬어 줘서 기분이 좋아졌어.')
    } else if (actionId === 'snack') {
      setMoodValue((v) => Math.min(v + 25, 100)) // 만족하게
      setAffection((a) => Math.min(a + 2, 100))
      setNote('간식! 고마워. 힘이 나는 느낌이야.')
    } else if (actionId === 'play') {
      setMoodValue((v) => Math.min(v + 30, 100)) // 활기차게
      setAffection((a) => Math.min(a + 1, 100))
      setNote('놀자! 조금 더 같이 있어줘.')
    } else if (actionId === 'rest') {
      setMoodValue(50) // 평온하게
      setNote('잠깐 숨 고르자. 오늘 어땠어?')
    }

    window.clearTimeout(noteTimerRef.current)
    noteTimerRef.current = window.setTimeout(() => setNote(''), 2500)
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <div className="app">
      <main className="main">
        <div className="hud">
          <div className="hud-gauges">
            <GaugeBar label="기분" value={moodValue} maxValue={100} color="mood" />
            <GaugeBar label="유대" value={affection} maxValue={100} color="affection" />
          </div>
          <button type="button" className="hud-chip hud-chip--logout" onClick={handleLogout} title="로그아웃">
            {user.userId}
          </button>
        </div>

        <Monster mood={mood} affection={affection} note={note} />

        <div className="bottom-panel">
          <ActionBar onAction={handleAction} />
        </div>

        <button type="button" className="chat-fab" onClick={() => setChatOpen(true)} aria-label="대화하기">
          대화
        </button>
      </main>

      <ChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} userId={user.userId} />
    </div>
  )
}

export default App
