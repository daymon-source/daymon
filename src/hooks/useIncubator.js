import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { playClick, playCancel, playEggPlace, playReward, playSwipe } from '../utils/sounds'
import { DEFAULT_HATCH_HOURS, DEFAULT_CRACK_AT_HOURS, EGG_SLOT_LOCKED_FROM, INCUBATOR_LOCKED_FROM, SANCTUARY_SLOT_COUNT, HATCH_GOLD_REWARDS } from '../constants/gameConfig'
import { DEFAULT_ELEMENT } from '../constants/elements'
import { EGG_TYPES, getEggConfig } from '../constants/eggs'
import { normalizeFieldMonster, compactSlots, todayStr } from '../utils/gameHelpers'

export function useIncubator({
  session,
  incubatorEggs, setIncubatorEggs,
  slots, setSlots,
  fieldMonster, setFieldMonster,
  sanctuary, setSanctuary,
  gold, setGold, setGoldFlash,
  unlockedIncubatorSlots, setUnlockedIncubatorSlots,
}) {
  const [currentIncubatorIndex, setCurrentIncubatorIndex] = useState(0)
  const [remainingMs, setRemainingMs] = useState(0)
  const [gaugeProgress, setGaugeProgress] = useState(0)
  const [hatchDismissed, setHatchDismissed] = useState(false)
  const [confirmHatchOpen, setConfirmHatchOpen] = useState(false)
  const [slotToHatch, setSlotToHatch] = useState(null)
  const [slotLockedAlertOpen, setSlotLockedAlertOpen] = useState(false)
  const [slotFullAlertOpen, setSlotFullAlertOpen] = useState(false)
  const [incubatorLockedAlertOpen, setIncubatorLockedAlertOpen] = useState(false)

  const holdTimeoutRef = useRef(null)
  const holdIntervalRef = useRef(null)

  // 알의 실시간 affection 계산
  const calculateAffection = (egg) => {
    if (!egg || !egg.hatching_started_at) return 0
    const config = getEggConfig(egg.element)
    const hatchMax = config.hatchHours || DEFAULT_HATCH_HOURS
    const elapsed = Date.now() - egg.hatching_started_at
    const totalRequired = hatchMax * 3600000
    const progress = (elapsed / totalRequired) * hatchMax
    return Math.min(hatchMax, Math.max(0, progress))
  }

  const currentEgg = incubatorEggs[currentIncubatorIndex]
  const currentEggConfig = currentEgg ? getEggConfig(currentEgg.element) : null
  const currentHatchMax = currentEggConfig?.hatchHours || DEFAULT_HATCH_HOURS
  const currentCrackAt = currentEggConfig?.crackAtHours || DEFAULT_CRACK_AT_HOURS
  const affection = currentEgg ? calculateAffection(currentEgg) : 0
  const bondStage = currentEgg ? (affection >= currentCrackAt ? 2 : 1) : 1

  // 부화까지 남은 시간 표시(1초마다 갱신)
  useEffect(() => {
    if (!currentEgg || !currentEgg.hatching_started_at) return
    const hatchMax = getEggConfig(currentEgg.element)?.hatchHours || DEFAULT_HATCH_HOURS
    const update = () => {
      const elapsed = Date.now() - currentEgg.hatching_started_at
      const totalRequired = hatchMax * 3600000
      const remaining = Math.max(0, totalRequired - elapsed)
      setRemainingMs(remaining)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [currentEgg?.hatching_started_at, currentEgg?.element])

  // 게이지 실시간 채움
  useEffect(() => {
    if (!currentEgg || !currentEgg.hatching_started_at) {
      setGaugeProgress(0)
      return
    }
    const hatchMax = getEggConfig(currentEgg.element)?.hatchHours || DEFAULT_HATCH_HOURS
    const update = () => {
      const aff = calculateAffection(currentEgg)
      if (aff >= hatchMax) {
        setGaugeProgress(0)
        return
      }
      const progress = aff - Math.floor(aff)
      setGaugeProgress(progress)
    }
    update()
    const interval = setInterval(update, 200)
    return () => clearInterval(interval)
  }, [currentEgg?.hatching_started_at, currentEgg?.element])

  // 증감 버튼 hold 로직
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

  useEffect(() => {
    return () => clearHold()
  }, [])

  const startHoldDecrease = () => {
    if (!currentEgg) return
    clearHold()
    holdTimeoutRef.current = setTimeout(() => {
      holdTimeoutRef.current = null
      holdIntervalRef.current = setInterval(() => {
        setIncubatorEggs((prev) => {
          const next = [...prev]
          if (next[currentIncubatorIndex]) {
            const currentStartedAt = next[currentIncubatorIndex].hatching_started_at || Date.now()
            next[currentIncubatorIndex] = {
              ...next[currentIncubatorIndex],
              hatching_started_at: currentStartedAt + 3600000
            }
          }
          return next
        })
      }, 80)
    }, 400)
  }

  const startHoldIncrease = () => {
    if (!currentEgg) return
    clearHold()
    holdTimeoutRef.current = setTimeout(() => {
      holdTimeoutRef.current = null
      holdIntervalRef.current = setInterval(() => {
        setIncubatorEggs((prev) => {
          const next = [...prev]
          if (next[currentIncubatorIndex]) {
            const currentStartedAt = next[currentIncubatorIndex].hatching_started_at || Date.now()
            next[currentIncubatorIndex] = {
              ...next[currentIncubatorIndex],
              hatching_started_at: currentStartedAt - 3600000
            }
          }
          return next
        })
      }, 80)
    }, 400)
  }

  // 슬롯 알 클릭
  const handleSlotClick = (index) => {
    if (index >= EGG_SLOT_LOCKED_FROM) {
      setSlotLockedAlertOpen(true)
      return
    }

    const egg = slots[index]
    if (!egg) return

    if (currentIncubatorIndex >= INCUBATOR_LOCKED_FROM && !unlockedIncubatorSlots.includes(currentIncubatorIndex)) {
      setIncubatorLockedAlertOpen(true)
      return
    }

    if (currentEgg != null) {
      setSlotFullAlertOpen(true)
      return
    }

    playClick()
    setSlotToHatch(index)
    setConfirmHatchOpen(true)
  }

  // 부화 수락
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
    playEggPlace()
    setIncubatorEggs(prev => {
      const next = [...prev]
      next[currentIncubatorIndex] = {
        ...egg,
        hatching_started_at: Date.now()
      }
      return next
    })
    setSlots(prevSlots => compactSlots(prevSlots, slotToHatch))
    setHatchDismissed(false)
    setConfirmHatchOpen(false)
    setSlotToHatch(null)
  }

  const handleConfirmHatchReject = () => {
    playCancel()
    setConfirmHatchOpen(false)
    setSlotToHatch(null)
  }

  // 부화 완료 후 화면 닫기
  const handleHatchDismiss = () => {
    const element = currentEgg?.element ?? DEFAULT_ELEMENT
    const monster = normalizeFieldMonster({
      element,
      id: crypto.randomUUID(),
      name: '',
      level: 1,
      exp: 0,
      careDate: todayStr(),
      careSnack: 0,
      carePlay: 0,
      hunger: 80,
      lastHungerUpdatedAt: Date.now(),
      happiness: 80,
      lastDecayDate: todayStr(),
    })
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
    // 부화 골드 보상
    const reward = HATCH_GOLD_REWARDS[element] || 100
    setGold(prev => prev + reward)
    setGoldFlash(reward)
    setTimeout(() => setGoldFlash(0), 2000)

    setHatchDismissed(true)
    setIncubatorEggs(prev => {
      const next = [...prev]
      next[currentIncubatorIndex] = null
      return next
    })
  }

  const createEgg = (element) => ({
    id: crypto.randomUUID(),
    element,
    created_at: Date.now(),
  })

  // 초기화: 슬롯에 알 3개
  const handleResetSlots = async () => {
    if (!session?.user?.id) return

    try {
      const three = [
        createEgg(EGG_TYPES[Math.floor(Math.random() * EGG_TYPES.length)]),
        createEgg(EGG_TYPES[Math.floor(Math.random() * EGG_TYPES.length)]),
        createEgg(EGG_TYPES[Math.floor(Math.random() * EGG_TYPES.length)]),
      ]

      for (let i = three.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [three[i], three[j]] = [three[j], three[i]]
      }

      const now = Date.now()
      const newEggsData = three.map((egg, index) => ({
        id: egg.id,
        user_id: session.user.id,
        location: `slot_${index}`,
        element: egg.element,
        egg_type: egg.element,
        affection: 0,
        bond_stage: 1,
        is_hatched: false,
        created_at: now,
        updated_at: now,
      }))

      // UPSERT: 새 알 먼저 안전하게 저장
      const { error: upsertError } = await supabase
        .from('monsters')
        .upsert(newEggsData)

      if (upsertError) {
        console.error('❌ Failed to upsert new eggs:', upsertError)
        return
      }

      // 이전 슬롯 알 정리 (실패해도 새 알은 이미 저장됨)
      const oldIds = slots.filter(egg => egg != null).map(egg => egg.id).filter(id => id)
      if (oldIds.length > 0) {
        const { error: cleanupError } = await supabase
          .from('monsters')
          .delete()
          .in('id', oldIds)

        if (cleanupError) {
          console.warn('⚠️ 이전 알 정리 실패 (새 알은 저장됨):', cleanupError)
        }
      }

      console.log('✅ 슬롯 초기화 완료:', newEggsData.length, '개')
      setSlots([...three, null, null])
    } catch (error) {
      console.error('❌ Failed to reset slots:', error)
    }
  }

  // 알 삭제: 모든 슬롯 알 제거
  const handleDeleteAllSlots = async () => {
    if (!session?.user?.id) return

    try {
      const slotsToDelete = slots.filter(egg => egg != null).map(egg => egg.id).filter(id => id)

      if (slotsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('monsters')
          .delete()
          .in('id', slotsToDelete)

        if (deleteError) {
          console.error('❌ Failed to delete slot eggs:', deleteError)
          return
        }
        console.log('🗑️ Deleted all slot eggs:', slotsToDelete.length)
      }

      setSlots([null, null, null, null, null])
    } catch (error) {
      console.error('❌ Failed to delete all slots:', error)
    }
  }

  // 부화장치 초기화
  const handleResetIncubator = async () => {
    if (!session?.user?.id) return
    try {
      const eggsToDelete = [3, 4]
        .map(i => incubatorEggs[i])
        .filter(egg => egg != null && egg.id)
        .map(egg => egg.id)

      if (eggsToDelete.length > 0) {
        const { error } = await supabase.from('monsters').delete().in('id', eggsToDelete)
        if (error) {
          console.error('❌ 부화장치 알 삭제 실패:', error)
          return
        }
        console.log('🗑️ 부화장치 슬롯 3,4 알 삭제:', eggsToDelete.length)
      }

      setIncubatorEggs(prev => {
        const next = [...prev]
        next[3] = null
        next[4] = null
        return next
      })

      setUnlockedIncubatorSlots([])
      setCurrentIncubatorIndex(prev => prev >= 3 ? 0 : prev)

      await supabase.from('users').update({
        unlocked_incubator_slots: []
      }).eq('id', session.user.id)

      console.log('✅ 부화장치 초기화 완료 (슬롯 3,4 잠금)')
    } catch (error) {
      console.error('❌ 부화장치 초기화 실패:', error)
    }
  }

  // 부화장치 잠금해제
  const handleUnlockIncubator = async (slotIndex, cost) => {
    if (gold < cost) return
    const prevGold = gold
    const prevSlots = [...unlockedIncubatorSlots]
    setGold(prev => prev - cost)
    setUnlockedIncubatorSlots(prev => [...prev, slotIndex])

    try {
      const { data, error } = await supabase.rpc('unlock_incubator_slot', {
        p_user_id: session.user.id,
        p_slot_index: slotIndex,
        p_cost: cost,
      })

      if (error) throw error

      if (!data?.success) {
        console.error('Unlock failed:', data?.error)
        setGold(prevGold)
        setUnlockedIncubatorSlots(prevSlots)
        return
      }

      setGold(data.gold)
      setUnlockedIncubatorSlots(data.unlocked_slots || [])
      console.log('✅ 부화장치 해제 완료:', { slot: slotIndex, gold: data.gold })
    } catch (err) {
      console.error('Unlock network error:', err)
      setGold(prevGold)
      setUnlockedIncubatorSlots(prevSlots)
    }
  }

  // 캐러셀 네비게이션
  const goToPrevIncubator = () => {
    playSwipe()
    setCurrentIncubatorIndex((prev) => (prev - 1 + 5) % 5)
  }

  const goToNextIncubator = () => {
    playSwipe()
    setCurrentIncubatorIndex((prev) => (prev + 1) % 5)
  }

  // 로그아웃 시 상태 리셋
  const resetIncubatorState = () => {
    setIncubatorEggs(prev => { const next = [...prev]; next[currentIncubatorIndex] = null; return next; })
    setSlots([null, null, null, null, null])
    setHatchDismissed(false)
    setConfirmHatchOpen(false)
    setSlotToHatch(null)
  }

  // 부화 시간 조정 (설정 패널)
  const handleAdjustHatch = (hours) => {
    setIncubatorEggs(prev => {
      const next = [...prev]
      const egg = next[currentIncubatorIndex]
      if (!egg || !egg.hatching_started_at) return prev
      next[currentIncubatorIndex] = {
        ...egg,
        hatching_started_at: egg.hatching_started_at - (hours * 3600000)
      }
      return next
    })
  }

  return {
    currentIncubatorIndex, setCurrentIncubatorIndex,
    remainingMs,
    gaugeProgress,
    hatchDismissed,
    confirmHatchOpen,
    slotToHatch,
    slotLockedAlertOpen, setSlotLockedAlertOpen,
    slotFullAlertOpen, setSlotFullAlertOpen,
    incubatorLockedAlertOpen, setIncubatorLockedAlertOpen,
    currentEgg,
    currentHatchMax,
    currentCrackAt,
    affection,
    bondStage,
    calculateAffection,
    handleSlotClick,
    handleConfirmHatchAccept,
    handleConfirmHatchReject,
    handleHatchDismiss,
    handleResetSlots,
    handleDeleteAllSlots,
    handleResetIncubator,
    handleUnlockIncubator,
    handleAdjustHatch,
    goToPrevIncubator,
    goToNextIncubator,
    resetIncubatorState,
    clearHold,
    startHoldDecrease,
    startHoldIncrease,
  }
}
