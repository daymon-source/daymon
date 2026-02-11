import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { GAUGE_MAX, SANCTUARY_SLOT_COUNT } from '../constants/gameConfig'
import { normalizeFieldMonster } from '../utils/gameHelpers'
import { applyDbEggTypes } from '../constants/eggs'

export function useGameData(session, user, setUser, setNicknamePrompt, loadAttendanceData) {
  const [gold, setGold] = useState(0)
  const [goldFlash, setGoldFlash] = useState(0)
  const [unlockedIncubatorSlots, setUnlockedIncubatorSlots] = useState([])
  const [incubatorEggs, setIncubatorEggs] = useState([null, null, null, null, null])
  const [slots, setSlots] = useState([null, null, null, null, null])
  const [fieldMonster, setFieldMonster] = useState(null)
  const [sanctuary, setSanctuary] = useState([null, null, null, null, null, null])
  const [mood, setMood] = useState('평온')

  const dataLoadedRef = useRef(false)
  const lastIncubatorCountRef = useRef(0)

  // monsters 데이터를 state에 반영
  function applyMonstersToState(monsters, userData) {
    setUser(userData ? { ...userData, userId: userData.user_id } : { id: session?.user?.id, mood: '평온', userId: 'Guest' })
    setMood(userData?.mood || '평온')

    // incubatorEggs 찾기 (5개 부화장치)
    const newIncubatorEggs = [null, null, null, null, null]
    for (let i = 0; i < 5; i++) {
      const incubatorMonster = monsters.find(m => m.location === `incubator_${i}`)
      if (incubatorMonster) {
        newIncubatorEggs[i] = {
          id: incubatorMonster.id,
          element: incubatorMonster.element,
          created_at: incubatorMonster.created_at || Date.now(),
          hatching_started_at: incubatorMonster.hatching_started_at || null,
        }
      }
    }
    setIncubatorEggs(newIncubatorEggs)

    // slots 찾기
    const newSlots = [null, null, null, null, null]
    for (let i = 0; i < 5; i++) {
      const slotMonster = monsters.find(m => m.location === `slot_${i}`)
      if (slotMonster) {
        newSlots[i] = {
          id: slotMonster.id,
          element: slotMonster.element,
          created_at: slotMonster.created_at || Date.now(),
        }
      }
    }
    setSlots(newSlots)

    // field_monster 찾기
    const fm = monsters.find(m => m.location === 'field')
    if (fm) {
      setFieldMonster({
        id: fm.id,
        element: fm.element,
        level: fm.level || 1,
        exp: fm.exp || 0,
        hunger: fm.hunger || 100,
        happiness: fm.happiness || 100,
        name: fm.nickname,
      })
    } else {
      setFieldMonster(null)
    }

    // sanctuary 찾기
    const newSanctuary = [null, null, null, null, null, null]
    for (let i = 0; i < 6; i++) {
      const sanctuaryMonster = monsters.find(m => m.location === `sanctuary_${i}`)
      if (sanctuaryMonster) {
        newSanctuary[i] = {
          id: sanctuaryMonster.id,
          element: sanctuaryMonster.element,
          level: sanctuaryMonster.level || 1,
          exp: sanctuaryMonster.exp || 0,
          hunger: sanctuaryMonster.hunger || 100,
          happiness: sanctuaryMonster.happiness || 100,
          name: sanctuaryMonster.nickname,
        }
      }
    }
    setSanctuary(newSanctuary)

    // 데이터 로드 완료 플래그 설정
    dataLoadedRef.current = true
  }

  // 첫 로그인 시 users 테이블에 유저 생성
  async function createInitialUser(userId) {
    const tempUserId = `temp_${crypto.randomUUID().slice(0, 8)}`

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        user_id: tempUserId,
        created_at: Date.now(),
        updated_at: Date.now(),
        mood: '평온',
        gold: 500,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create user:', error)
      return null
    }

    return data
  }

  // Supabase에서 유저 데이터 로드
  async function loadUserData(userId) {
    // 핫 리로드 시 빈 state가 저장되는 것을 방지하기 위해 리셋
    dataLoadedRef.current = false

    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError && userError.code === 'PGRST116') {
      userData = await createInitialUser(userId)

      if (!userData) {
        console.error('Failed to create initial user')
        await supabase.auth.signOut()
        return
      }
    }

    if (!userData) {
      console.error('No user data available')
      return
    }

    if (userData && userData.user_id && userData.user_id.startsWith('temp_')) {
      console.log('Setting nickname prompt to true, user_id:', userData.user_id)
      setNicknamePrompt(true)
      return
    }

    // egg_types 테이블에서 알 밸런스 수치 로드
    const { data: eggTypesData, error: eggTypesError } = await supabase
      .from('egg_types')
      .select('*')

    if (eggTypesError) {
      console.warn('⚠️ egg_types 로드 실패 (로컬 기본값 사용):', eggTypesError.message)
    } else if (eggTypesData) {
      applyDbEggTypes(eggTypesData)
    }

    // monsters 테이블에서 몬스터/알 데이터 로드
    const { data: monsters, error: monstersError } = await supabase
      .from('monsters')
      .select('*')
      .eq('user_id', userId)

    if (monstersError) {
      console.error('Failed to load monsters:', monstersError)
      return
    }

    // 골드 + 해제된 부화장치 슬롯 로드
    setGold(userData?.gold ?? 500)
    setUnlockedIncubatorSlots(userData?.unlocked_incubator_slots ?? [])

    // 출석체크 데이터 로드
    loadAttendanceData(userData)

    // monsters 데이터를 state에 반영
    applyMonstersToState(monsters || [], userData)
  }

  // 동시 저장 방지 잠금
  const savingRef = useRef(false)
  // 저장 재시도 플래그 (동시 저장 시 드롭하지 않고 재시도)
  const pendingRetryRef = useRef(false)
  // 로그아웃 중 저장 차단
  const loggingOutRef = useRef(false)

  // Supabase에 monsters 데이터 저장 (UPSERT 방식: 중단되어도 데이터 손실 없음)
  const saveMonstersToSupabase = useCallback(async () => {
    if (!session?.user?.id) return
    if (loggingOutRef.current) return
    if (savingRef.current) {
      pendingRetryRef.current = true
      return
    }
    savingRef.current = true

    try {
      const now = Date.now()

      // ── 1단계: UPSERT할 데이터 빌드 (모든 레코드에 ID 보장) ──
      const monstersToUpsert = []

      incubatorEggs.forEach((egg, index) => {
        if (egg) {
          monstersToUpsert.push({
            id: egg.id || crypto.randomUUID(),
            user_id: session.user.id,
            location: `incubator_${index}`,
            element: egg.element,
            egg_type: egg.element,
            is_hatched: false,
            created_at: egg.created_at || now,
            hatching_started_at: egg.hatching_started_at || null,
            updated_at: now,
          })
        }
      })

      slots.forEach((egg, index) => {
        if (egg) {
          monstersToUpsert.push({
            id: egg.id || crypto.randomUUID(),
            user_id: session.user.id,
            location: `slot_${index}`,
            element: egg.element,
            egg_type: egg.element,
            is_hatched: false,
            created_at: egg.created_at || now,
            updated_at: now,
          })
        }
      })

      if (fieldMonster) {
        monstersToUpsert.push({
          id: fieldMonster.id || crypto.randomUUID(),
          user_id: session.user.id,
          location: 'field',
          element: fieldMonster.element,
          nickname: fieldMonster.name || null,
          level: fieldMonster.level || 1,
          exp: fieldMonster.exp || 0,
          hunger: fieldMonster.hunger ?? GAUGE_MAX,
          happiness: fieldMonster.happiness ?? GAUGE_MAX,
          last_fed_at: fieldMonster.last_fed_at || now,
          is_hatched: true,
          created_at: fieldMonster.created_at || now,
          updated_at: now,
        })
      }

      sanctuary.forEach((monster, index) => {
        if (monster) {
          monstersToUpsert.push({
            id: monster.id || crypto.randomUUID(),
            user_id: session.user.id,
            location: `sanctuary_${index}`,
            element: monster.element,
            nickname: monster.name || null,
            level: monster.level || 1,
            exp: monster.exp || 0,
            hunger: monster.hunger ?? GAUGE_MAX,
            happiness: monster.happiness ?? GAUGE_MAX,
            last_fed_at: monster.last_fed_at || now,
            is_hatched: true,
            created_at: monster.created_at || now,
            updated_at: now,
          })
        }
      })

      // ── 2단계: 안전 검증 ──
      if (monstersToUpsert.length === 0) {
        console.warn('⚠️ 저장할 몬스터가 0마리 — 건너뜁니다.')
        return
      }

      console.log(`💾 저장 시작: ${monstersToUpsert.length}마리`)

      // ── 3단계: UPSERT (INSERT or UPDATE — 중단되어도 기존 데이터 삭제 안 됨) ──
      const { error: upsertError } = await supabase
        .from('monsters')
        .upsert(monstersToUpsert)

      if (upsertError) {
        console.error('❌ UPSERT 실패:', upsertError)
        return
      }

      // ── 4단계: 제거된 레코드 정리 (실패해도 데이터 손실 없음, 고아 레코드만 남음) ──
      const currentIds = monstersToUpsert.map(m => m.id)
      const { error: cleanupError } = await supabase
        .from('monsters')
        .delete()
        .eq('user_id', session.user.id)
        .not('id', 'in', `(${currentIds.join(',')})`)

      if (cleanupError) {
        console.warn('⚠️ 정리 실패 (데이터 무결):', cleanupError)
      }

      console.log('✅ 저장 완료:', monstersToUpsert.length, '마리')

      // ── 5단계: users 테이블 메타데이터 저장 ──
      await supabase
        .from('users')
        .update({
          mood,
          gold,
          unlocked_incubator_slots: unlockedIncubatorSlots,
          updated_at: now,
        })
        .eq('id', session.user.id)
    } catch (error) {
      console.error('Failed to save data:', error)
    } finally {
      savingRef.current = false
      if (pendingRetryRef.current) {
        pendingRetryRef.current = false
        setTimeout(() => saveMonstersToSupabase(), 300)
      }
    }
  }, [session?.user?.id, incubatorEggs, slots, fieldMonster, sanctuary, mood, gold, unlockedIncubatorSlots])

  // 데이터 변경 시 저장 (500ms debounce)
  useEffect(() => {
    if (!user || !session?.user) return
    if (!dataLoadedRef.current) return
    if (loggingOutRef.current) return

    // 모든 데이터가 비어있으면 절대 저장하지 않음
    const hasAnyData = incubatorEggs.some(egg => egg != null) ||
      slots.some(egg => egg != null) ||
      fieldMonster != null ||
      sanctuary.some(m => m != null)

    if (!hasAnyData) {
      console.warn('⚠️ 모든 데이터가 비어있어 저장을 건너뜁니다. 핫 리로드 보호 활성화.')
      return
    }

    // 부화장치 보호: 2마리 이상에서 갑자기 0이 되면 차단 (1→0은 정상 부화)
    const incubatorCount = incubatorEggs.filter(e => e != null).length
    if (lastIncubatorCountRef.current > 1 && incubatorCount === 0) {
      console.warn('⚠️ 부화장치 알이 갑자기 모두 사라졌습니다! 저장을 건너뜁니다.')
      return
    }
    lastIncubatorCountRef.current = incubatorCount

    const timer = setTimeout(() => {
      saveMonstersToSupabase()
    }, 500)

    return () => clearTimeout(timer)
  }, [user, session, saveMonstersToSupabase, incubatorEggs, slots, fieldMonster, sanctuary, mood, gold, unlockedIncubatorSlots])

  // 탭 가시성 변경: hidden→즉시 저장, visible→최신 데이터 로드
  useEffect(() => {
    const onVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        // 탭이 숨겨질 때 즉시 저장 (종료/전환 대비)
        if (!session?.user?.id || !dataLoadedRef.current) return
        if (loggingOutRef.current) return
        await saveMonstersToSupabase()
      } else if (document.visibilityState === 'visible') {
        // 탭이 보일 때 최신 데이터 로드
        if (!session?.user || !user) return
        if (savingRef.current) return
        await loadUserData(session.user.id)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [session, user, saveMonstersToSupabase])

  // beforeunload: 저장 진행 중이면 탭 닫기 경고
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (savingRef.current || pendingRetryRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  // 로그아웃 전 최종 저장 (진행 중인 저장 완료 대기 → 최종 저장 → 자동저장 차단)
  const flushBeforeLogout = useCallback(async () => {
    let attempts = 0
    while (savingRef.current && attempts < 30) {
      await new Promise(r => setTimeout(r, 100))
      attempts++
    }
    await saveMonstersToSupabase()
    loggingOutRef.current = true
    dataLoadedRef.current = false
  }, [saveMonstersToSupabase])

  return {
    gold, setGold,
    goldFlash, setGoldFlash,
    unlockedIncubatorSlots, setUnlockedIncubatorSlots,
    incubatorEggs, setIncubatorEggs,
    slots, setSlots,
    fieldMonster, setFieldMonster,
    sanctuary, setSanctuary,
    mood, setMood,
    loadUserData,
    dataLoadedRef,
    flushBeforeLogout,
    loggingOutRef,
  }
}
