import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { playReward } from '../utils/sounds'

export function useAttendance({ session, setGold, setGoldFlash, assetsReady }) {
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [attendanceData, setAttendanceData] = useState(null)
  const attendanceAutoShownRef = useRef(false)

  function getWeekStartDate() {
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? 6 : day - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - diff)
    return monday.toISOString().slice(0, 10)
  }

  function loadAttendanceData(userData) {
    const weekStart = getWeekStartDate()
    const saved = userData?.attendance || {}

    if (saved.weekStartDate !== weekStart) {
      setAttendanceData({
        currentDay: 0,
        claimedDays: [false, false, false, false, false, false, false],
        weekStartDate: weekStart,
        lastClaimDate: null,
      })
      return
    }

    const data = {
      currentDay: saved.currentDay ?? 0,
      claimedDays: saved.claimedDays ?? [false, false, false, false, false, false, false],
      weekStartDate: saved.weekStartDate,
      lastClaimDate: saved.lastClaimDate ?? null,
    }

    setAttendanceData(data)
  }

  // 자동 팝업: 로딩 완료 후 + 오늘 아직 출석 안 했으면
  useEffect(() => {
    if (!assetsReady || !attendanceData || attendanceAutoShownRef.current) return
    attendanceAutoShownRef.current = true
    const todayDate = new Date().toISOString().slice(0, 10)
    if (attendanceData.lastClaimDate !== todayDate && attendanceData.currentDay < 7) {
      const timer = setTimeout(() => {
        setAttendanceOpen(true)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [assetsReady, attendanceData])

  const handleAttendanceClaim = async (day, reward) => {
    if (!session?.user?.id || !attendanceData) return

    const todayDate = new Date().toISOString().slice(0, 10)
    const newClaimedDays = [...attendanceData.claimedDays]
    newClaimedDays[day] = true
    const newData = {
      ...attendanceData,
      claimedDays: newClaimedDays,
      currentDay: day + 1,
      lastClaimDate: todayDate,
    }
    setAttendanceData(newData)

    playReward()
    setGold(prev => prev + reward)
    setGoldFlash(reward)
    setTimeout(() => setGoldFlash(0), 2000)

    try {
      await supabase.from('users').update({
        attendance: {
          currentDay: newData.currentDay,
          claimedDays: newData.claimedDays,
          weekStartDate: newData.weekStartDate,
          lastClaimDate: newData.lastClaimDate,
        }
      }).eq('id', session.user.id)
      console.log('✅ 출석체크 완료:', { day: day + 1, reward })
    } catch (err) {
      console.error('❌ 출석 저장 실패:', err)
    }
  }

  return {
    attendanceOpen, setAttendanceOpen,
    attendanceData,
    loadAttendanceData,
    handleAttendanceClaim,
  }
}
