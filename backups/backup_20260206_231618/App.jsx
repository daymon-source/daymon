import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Monster from './components/Monster'
import LoginScreen from './components/LoginScreen'
import GaugeBar from './components/GaugeBar'
import EggIncubator from './components/EggIncubator'
import { DEFAULT_ELEMENT, getMonsterImage, ELEMENT_LABELS } from './constants/elements'
import { EGG_TYPES, getEggImage, getElementByEggType, getEggTypeByElement, getEggConfig } from './constants/eggs'
import './App.css'

// 저장된 알에 element 없으면 기본값 적용 (레거시 호환)
function normalizeEgg(egg) {
  if (!egg) return null
  const next = { ...egg }
  if (next.element == null) next.element = DEFAULT_ELEMENT
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

// 필드 몬스터: 레벨/경험치, 배고픔/행복 게이지
const CARE_EXP_PER_SNACK = 12
const CARE_EXP_PER_PLAY = 18
const CARE_SNACK_MAX_PER_DAY = 5
const CARE_PLAY_MAX_PER_DAY = 5
const GAUGE_MAX = 100
const HUNGER_PER_SNACK = 25
const HAPPINESS_PER_PLAY = 20
const HUNGER_DECAY_HOURS = 12 // 12시간이 지나면 배고픔 0
const HAPPINESS_DECAY_PER_DAY = 8
function getExpToNextLevel(level) {
  return 80 + level * 25 // Lv1→2: 105, Lv2→3: 130, ...
}
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function parseDateStr(str) {
  if (!str || str.length !== 10) return null
  const [y, m, d] = str.split('-').map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null
  return new Date(y, m - 1, d)
}
function daysBetween(aStr, bStr) {
  const a = parseDateStr(aStr)
  const b = parseDateStr(bStr)
  if (!a || !b) return 0
  return Math.max(0, Math.floor((b - a) / 86400000))
}
function normalizeFieldMonster(m) {
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
function getCurrentHunger(m) {
  if (!m) return 0
  const stored = m.hunger ?? GAUGE_MAX
  const updatedAt = m.lastHungerUpdatedAt ?? Date.now()
  const elapsedHours = (Date.now() - updatedAt) / 3600000
  const decay = (elapsedHours / HUNGER_DECAY_HOURS) * GAUGE_MAX
  return Math.max(0, Math.min(GAUGE_MAX, stored - decay))
}

/** 몬스터 표시 이름: 사용자 지정 name이 있으면 사용, 없으면 속성 기반 기본명 */
function getDisplayName(m) {
  if (!m) return ''
  const custom = (m.name ?? '').trim()
  if (custom) return custom
  const label = ELEMENT_LABELS[m.element] ?? m.element ?? '데이몬'
  return `${label} 데이몬`
}

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
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [nicknamePrompt, setNicknamePrompt] = useState(false) // 닉네임 입력 화면 표시 여부
  const [nicknameInput, setNicknameInput] = useState('') // 닉네임 입력값
  const [nicknameError, setNicknameError] = useState('') // 닉네임 에러 메시지
  const [mood, setMood] = useState('평온')
  const [incubatorEggs, setIncubatorEggs] = useState([null, null, null, null, null]) // 부화장치 5칸. 0~2 사용, 3~4 잠금
  const [currentIncubatorIndex, setCurrentIncubatorIndex] = useState(0) // 현재 보이는 부화장치 인덱스
  const [slots, setSlots] = useState([null, null, null, null, null]) // 슬롯 5칸. 0~2 사용, 3~4 잠금
  const [fieldMonster, setFieldMonster] = useState(null) // 필드 메인 몬스터. null이면 없음
  const [fieldMonsterPos, setFieldMonsterPos] = useState({ x: 50, y: 50 }) // 필드 몬스터: 화면 정중앙(50%, 50%)
  const [fieldMonsterMaxWidthPx, setFieldMonsterMaxWidthPx] = useState(null) // field-area 기준 몬스터 최대 너비(px)
  const [fieldLikeHearts, setFieldLikeHearts] = useState([]) // 터치 시 하트 이펙트 [{ id, batchId }]
  const [fieldMonsterLiking, setFieldMonsterLiking] = useState(false) // 터치 시 몬스터 살짝 커졌다 작아짐
  const [fieldCareExpFlash, setFieldCareExpFlash] = useState(0) // 돌봐주기 시 "+N EXP" 잠깐 표시
  const [fieldHungerTick, setFieldHungerTick] = useState(0) // 배고픔 시간 경과로 게이지 갱신용 (60초마다 +1)
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
  const [confirmHatchOpen, setConfirmHatchOpen] = useState(false) // '부화를 시작하시겠습니까?' 다이얼로그
  const [slotToHatch, setSlotToHatch] = useState(null) // 부화 확인 시 선택한 슬롯 인덱스
  const [slotLockedAlertOpen, setSlotLockedAlertOpen] = useState(false) // '이 슬롯은 아직 잠겨있습니다' 알림
  const [slotFullAlertOpen, setSlotFullAlertOpen] = useState(false) // '부화장치에 이미 알이 있습니다' 알림
  const [sanctuaryToFieldOpen, setSanctuaryToFieldOpen] = useState(false) // '필드로 내보내시겠습니까?' 다이얼로그
  const [sanctuarySlotToField, setSanctuarySlotToField] = useState(null) // 필드로 내보낼 안식처 슬롯 인덱스
  const [monsterNameEditTarget, setMonsterNameEditTarget] = useState(null) // 'field' | null — 필드 몬스터 이름 수정 모달
  const [monsterNameEditValue, setMonsterNameEditValue] = useState('') // 이름 입력 필드 값
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(null) // 401 시 "세션이 만료되었습니다" 등
  const [devCoords, setDevCoords] = useState({ x: 0, y: 0 })
  const [devViewport, setDevViewport] = useState({ w: 0, h: 0 })
  const noteTimerRef = useRef(null)
  const holdTimeoutRef = useRef(null)
  const holdIntervalRef = useRef(null)
  const nextTickAtRef = useRef(0) // 다음 부화 게이지 +1 시각(ms)
  const dataLoadedRef = useRef(false) // DB에서 데이터 로드 완료 여부 (핫 리로드 시 빈 state로 덮어쓰기 방지)
  const [remainingMs, setRemainingMs] = useState(0) // 부화까지 남은 ms (표시용)
  const [gaugeProgress, setGaugeProgress] = useState(0) // 현재 1시간 구간 내 진행률 0~1 (실시간 채움)

  const currentEgg = incubatorEggs[currentIncubatorIndex]
  const affection = currentEgg ? currentEgg.affection : 0
  const bondStage = currentEgg ? (currentEgg.affection >= HATCH_EGG2_AT ? 2 : 1) : 1

  // Supabase에서 가져온 userData를 state에 반영
  const applyUserDataToState = (userData) => {
    if (!userData) return
    setUser(userData)
    setMood(userData.mood || '평온')

    // incubatorEggs는 applyMonstersToState에서 처리됨

    // slots 처리
    if (Array.isArray(userData.slots)) {
      setSlots(normalizeSlots(userData.slots))
    } else {
      setSlots([null, null, null, null, null])
    }

    // field_monster 처리
    setFieldMonster(normalizeFieldMonster(userData.field_monster ?? null))

    // sanctuary 처리
    const s = Array.isArray(userData.sanctuary) ? userData.sanctuary : []
    const pad = [...s]
    while (pad.length < SANCTUARY_SLOT_COUNT) pad.push(null)
    setSanctuary(pad.slice(0, SANCTUARY_SLOT_COUNT).map((m) => (m ? normalizeFieldMonster(m) : null)))

    // next_tick_at 처리
    nextTickAtRef.current = (userData.next_tick_at != null && userData.next_tick_at > 0) ? userData.next_tick_at : Date.now() + 3600000
  }

  // Supabase 인증 상태 관리
  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        loadUserData(session.user.id)
      }
    })

    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        loadUserData(session.user.id)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Supabase에서 유저 데이터 로드
  async function loadUserData(userId) {
    // 1. users 테이블에서 기본 정보 확인
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError && userError.code === 'PGRST116') {
      // 유저 없음 → 생성
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

    // user_id가 임시 ID(temp_로 시작)면 닉네임 입력 화면 표시
    if (userData && userData.user_id && userData.user_id.startsWith('temp_')) {
      console.log('Setting nickname prompt to true, user_id:', userData.user_id)
      setNicknamePrompt(true)
      return
    }

    // 2. monsters 테이블에서 몬스터/알 데이터 로드
    const { data: monsters, error: monstersError } = await supabase
      .from('monsters')
      .select('*')
      .eq('user_id', userId)

    if (monstersError) {
      console.error('Failed to load monsters:', monstersError)
      return
    }

    // 3. monsters 데이터를 state에 반영
    applyMonstersToState(monsters || [], userData)
  }

  // 첫 로그인 시 users 테이블에 유저 생성
  async function createInitialUser(userId) {
    // 임시 user_id 생성 (UUID 기반)
    const tempUserId = `temp_${crypto.randomUUID().slice(0, 8)}`

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        user_id: tempUserId,
        created_at: Date.now(),
        updated_at: Date.now(),
        mood: '평온',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create user:', error)
      return null
    }

    return data
  }

  // 닉네임 제출
  async function handleNicknameSubmit() {
    const nickname = nicknameInput.trim()

    if (nickname.length < 2 || nickname.length > 10) {
      setNicknameError('닉네임은 2-10자여야 합니다.')
      return
    }

    // user_id 업데이트
    const { error } = await supabase
      .from('users')
      .update({ user_id: nickname })
      .eq('id', session.user.id)

    if (error) {
      console.error('Failed to create user:', error)
      if (error.code === '23505') {
        setNicknameError('이미 사용 중인 닉네임입니다.')
      } else {
        setNicknameError('닉네임 등록에 실패했습니다.')
      }
      return
    }

    // 성공 시 닉네임 입력 화면 닫고 데이터 로드
    setNicknamePrompt(false)
    setNicknameInput('')
    setNicknameError('')
    await loadUserData(session.user.id)
  }

  // monsters 데이터를 state에 반영
  function applyMonstersToState(monsters, userData) {
    setUser(userData ? { ...userData, userId: userData.user_id } : { id: session?.user?.id, mood: '평온', userId: 'Guest' })
    setMood(userData?.mood || '평온')

    // next_tick_at 로드
    if (userData?.next_tick_at) {
      nextTickAtRef.current = userData.next_tick_at
    }

    // center_egg 찾기
    // incubatorEggs 찾기 (5개 부화장치)
    const newIncubatorEggs = [null, null, null, null, null]
    for (let i = 0; i < 5; i++) {
      const incubatorMonster = monsters.find(m => m.location === `incubator_${i}`)
      if (incubatorMonster) {
        newIncubatorEggs[i] = {
          id: incubatorMonster.id,
          affection: incubatorMonster.affection || 0,
          bondStage: incubatorMonster.bond_stage || 1,
          element: incubatorMonster.element,
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
          id: slotMonster.id, // DB의 id 포함
          affection: slotMonster.affection || 0,
          bondStage: slotMonster.bond_stage || 1,
          element: slotMonster.element,
        }
      }
    }
    setSlots(newSlots)

    // field_monster 찾기
    const fieldMonster = monsters.find(m => m.location === 'field')
    if (fieldMonster) {
      setFieldMonster({
        id: fieldMonster.id, // DB의 id 포함
        element: fieldMonster.element,
        level: fieldMonster.level || 1,
        exp: fieldMonster.exp || 0,
        hunger: fieldMonster.hunger || 100,
        happiness: fieldMonster.happiness || 100,
        name: fieldMonster.nickname,
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
          id: sanctuaryMonster.id, // DB의 id 포함
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

  // 탭/창 포커스 시 Supabase에서 최신 데이터 가져오기
  useEffect(() => {
    const onFocus = async () => {
      if (!session?.user || !user) return
      await loadUserData(session.user.id)
    }
    window.addEventListener('visibilitychange', onFocus)
    return () => window.removeEventListener('visibilitychange', onFocus)
  }, [session, user])

  // Supabase에 monsters 데이터 저장
  const saveMonstersToSupabase = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const now = Date.now()

      // 기존 monsters 데이터 모두 삭제
      await supabase
        .from('monsters')
        .delete()
        .eq('user_id', session.user.id)

      const monstersToInsert = []

      // incubatorEggs 저장 (5개 부화장치 모두 저장)
      incubatorEggs.forEach((egg, index) => {
        if (egg) {
          const eggData = {
            user_id: session.user.id,
            location: `incubator_${index}`,
            element: egg.element,
            egg_type: egg.element,
            affection: egg.affection || 0,
            bond_stage: egg.bondStage || 1,
            is_hatched: false,
            created_at: now,
            updated_at: now,
          }
          // 기존 id가 있으면 포함 (DB 레코드 유지)
          if (egg.id) {
            eggData.id = egg.id
          }
          console.log(`💾 Saving incubator_${index}:`, eggData)
          monstersToInsert.push(eggData)
        }
      })

      // slots 저장
      slots.forEach((egg, index) => {
        if (egg) {
          const slotData = {
            user_id: session.user.id,
            location: `slot_${index}`,
            element: egg.element,
            egg_type: egg.eggType,
            affection: egg.affection || 0,
            bond_stage: egg.bondStage || 1,
            is_hatched: false,
            created_at: now,
            updated_at: now,
          }
          // 기존 id가 있으면 포함 (DB 레코드 유지)
          if (egg.id) {
            slotData.id = egg.id
          }
          console.log(`💾 Saving slot ${index}:`, slotData)
          monstersToInsert.push(slotData)
        }
      })

      // fieldMonster 저장
      if (fieldMonster) {
        const fieldData = {
          user_id: session.user.id,
          location: 'field',
          element: fieldMonster.element,
          level: fieldMonster.level || 1,
          exp: fieldMonster.exp || 0,
          hunger: fieldMonster.hunger || 100,
          happiness: fieldMonster.happiness || 100,
          nickname: fieldMonster.name || null,
          is_hatched: true,
          created_at: now,
          updated_at: now,
        }
        // 기존 id가 있으면 포함 (DB 레코드 유지)
        if (fieldMonster.id) {
          fieldData.id = fieldMonster.id
        }
        monstersToInsert.push(fieldData)
      }

      // sanctuary 저장
      sanctuary.forEach((monster, index) => {
        if (monster) {
          const sanctuaryData = {
            user_id: session.user.id,
            location: `sanctuary_${index}`,
            element: monster.element,
            level: monster.level || 1,
            exp: monster.exp || 0,
            hunger: monster.hunger || 100,
            happiness: monster.happiness || 100,
            nickname: monster.name || null,
            is_hatched: true,
            created_at: now,
            updated_at: now,
          }
          // 기존 id가 있으면 포함 (DB 레코드 유지)
          if (monster.id) {
            sanctuaryData.id = monster.id
          }
          monstersToInsert.push(sanctuaryData)
        }
      })

      // monsters 테이블에 일괄 저장
      if (monstersToInsert.length > 0) {
        const { error } = await supabase
          .from('monsters')
          .insert(monstersToInsert)

        if (error) {
          console.error('❌ Failed to save monsters:', error)
          console.error('❌ Error details:', JSON.stringify(error, null, 2))
          console.error('❌ Data attempted:', monstersToInsert)
        } else {
          console.log('✅ Saved monsters:', monstersToInsert.length)
        }
      }

      // users 테이블에 메타데이터 저장
      await supabase
        .from('users')
        .update({
          mood,
          next_tick_at: nextTickAtRef.current,
          updated_at: now,
        })
        .eq('id', session.user.id)
    } catch (error) {
      console.error('Failed to save data:', error)
    }
  }, [session?.user?.id, incubatorEggs, slots, fieldMonster, sanctuary, mood])

  // 데이터 변경 시 저장 (500ms debounce로 무한 루프 방지)
  useEffect(() => {
    if (!user || !session?.user) return
    // 데이터 로드가 완료되지 않았으면 저장하지 않음 (핫 리로드 시 빈 state로 덮어쓰기 방지)
    if (!dataLoadedRef.current) return

    const timer = setTimeout(() => {
      saveMonstersToSupabase()
    }, 500)

    return () => clearTimeout(timer)
  }, [user, session, saveMonstersToSupabase, incubatorEggs, currentIncubatorIndex, slots, fieldMonster, sanctuary])

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
    if (!user || !currentEgg) return
    if (nextTickAtRef.current <= 0) nextTickAtRef.current = Date.now() + 3600000
    const interval = setInterval(() => {
      setIncubatorEggs((prev) => {
        const next = [...prev]
        if (next[currentIncubatorIndex]) {
          next[currentIncubatorIndex] = {
            ...next[currentIncubatorIndex],
            affection: Math.min(HATCH_MAX, next[currentIncubatorIndex].affection + 1)
          }
        }
        return next
      })
      nextTickAtRef.current = Date.now() + 3600000
    }, 3600000)
    return () => clearInterval(interval)
  }, [user, currentEgg, currentIncubatorIndex])

  // 부화까지 남은 시간 표시(1초마다 갱신) — 게이지에 따라: 다음 틱까지 + 그 다음 남은 시간
  useEffect(() => {
    if (!currentEgg || affection >= HATCH_MAX) return
    const update = () => {
      const untilNextTick = Math.max(0, nextTickAtRef.current - Date.now())
      const fullHoursAfter = Math.max(0, (HATCH_MAX - affection - 1) * 3600000)
      setRemainingMs(untilNextTick + fullHoursAfter)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [currentEgg, affection])

  // 게이지 실시간 채움: 현재 1시간 구간 진행률을 자주 갱신 (부드럽게 차오르게)
  useEffect(() => {
    if (!currentEgg) {
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
  }, [currentEgg, affection])

  // 언마운트 시 증감 버튼 누름 타이머 정리
  useEffect(() => {
    return () => clearHold()
  }, [])



  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setMood('평온')
    setIncubatorEggs(prev => { const next = [...prev]; next[currentIncubatorIndex] = null; return next; })
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
    const monster = normalizeFieldMonster({
      element: currentEgg?.element ?? DEFAULT_ELEMENT,
      id: Date.now(),
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
    setHatchDismissed(true)
    setIncubatorEggs(prev => {
      const next = [...prev]
      next[currentIncubatorIndex] = null
      return next
    })
  }

  // 슬롯 알 클릭: 가운데에 알이 없을 때만 '부화를 시작하시겠습니까?' 표시
  const handleSlotClick = (index) => {
    // 잠금 슬롯 클릭 시 알림 다이얼로그
    if (index >= EGG_SLOT_LOCKED_FROM) {
      setSlotLockedAlertOpen(true)
      return
    }

    const egg = slots[index]
    // 빈 슬롯은 무시
    if (!egg) return

    // 부화장치에 이미 알이 있으면 알림 다이얼로그
    if (currentEgg != null) {
      setSlotFullAlertOpen(true)
      return
    }

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
    // 현재 보이는 부화장치에 알 추가, 슬롯에서 제거
    setIncubatorEggs(prev => {
      const next = [...prev]
      next[currentIncubatorIndex] = egg
      return next
    })
    setSlots(prevSlots => compactSlots(prevSlots, slotToHatch))
    setHatchDismissed(false)
    setConfirmHatchOpen(false)
    setSlotToHatch(null)
  }

  const handleConfirmHatchReject = () => {
    setConfirmHatchOpen(false)
    setSlotToHatch(null)
  }

  const createEgg = (element) => ({
    id: crypto.randomUUID(),
    affection: 0,
    bondStage: 1,
    element,
    created_at: Date.now(),
  })

  // 초기화: 슬롯에 알 3개 — 불속성·물속성 둘 다 나오게 (1 classic, 1 glow, 1 랜덤)
  const handleResetSlots = async () => {
    if (!session?.user?.id) return

    try {
      // 1. 먼저 기존 슬롯 알들을 DB에서 삭제
      const slotsToDelete = slots.filter(egg => egg != null).map(egg => egg.id).filter(id => id)

      if (slotsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('monsters')
          .delete()
          .in('id', slotsToDelete)

        if (deleteError) {
          console.error('❌ Failed to delete old slot eggs:', deleteError)
          return
        }
        console.log('🗑️ Deleted old slot eggs:', slotsToDelete.length)
      }

      // 2. 새 알 3개 생성 (랜덤)
      const three = [
        createEgg(EGG_TYPES[Math.floor(Math.random() * EGG_TYPES.length)]),
        createEgg(EGG_TYPES[Math.floor(Math.random() * EGG_TYPES.length)]),
        createEgg(EGG_TYPES[Math.floor(Math.random() * EGG_TYPES.length)]),
      ]

      // 랜덤 섞기
      for (let i = three.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [three[i], three[j]] = [three[j], three[i]]
      }

      // 3. DB에 새 알 INSERT
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

      const { error: insertError } = await supabase
        .from('monsters')
        .insert(newEggsData)

      if (insertError) {
        console.error('❌ Failed to insert new eggs:', insertError)
        return
      }

      console.log('✅ Inserted new eggs:', newEggsData.length)

      // 4. state 업데이트
      setSlots([...three, null, null])
    } catch (error) {
      console.error('❌ Failed to reset slots:', error)
    }
  }

  // 알 삭제: 모든 슬롯 알 제거 (부화장치 알은 유지)
  const handleDeleteAllSlots = async () => {
    if (!session?.user?.id) return

    try {
      // 1. DB에서 슬롯 알들 삭제
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

      // 2. state 업데이트 (슬롯만 비움, 부화장치는 유지)
      setSlots([null, null, null, null, null])
    } catch (error) {
      console.error('❌ Failed to delete all slots:', error)
    }
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
    if (!currentEgg) return
    clearHold()
    holdTimeoutRef.current = setTimeout(() => {
      holdTimeoutRef.current = null
      holdIntervalRef.current = setInterval(() => {
        setIncubatorEggs((prev) => { const next = [...prev]; if (next[currentIncubatorIndex]) { next[currentIncubatorIndex] = { ...next[currentIncubatorIndex], affection: Math.max(0, next[currentIncubatorIndex].affection - 1) }; } return next; })
        nextTickAtRef.current = Date.now() + 3600000
      }, 80)
    }, 400)
  }

  const startHoldIncrease = () => {
    if (!currentEgg) return
    clearHold()
    holdTimeoutRef.current = setTimeout(() => {
      holdTimeoutRef.current = null
      holdIntervalRef.current = setInterval(() => {
        setIncubatorEggs((prev) => { const next = [...prev]; if (next[currentIncubatorIndex]) { next[currentIncubatorIndex] = { ...next[currentIncubatorIndex], affection: Math.min(HATCH_MAX, next[currentIncubatorIndex].affection + 1) }; } return next; })
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

  // 안식처 몬스터 터치 → '필드로 내보내시겠습니까?' 다이얼로그
  const handleSanctuarySlotClick = (index) => {
    if (!sanctuary[index]) return
    setSanctuarySlotToField(index)
    setSanctuaryToFieldOpen(true)
  }

  const handleMonsterNameEditOpen = () => {
    setMonsterNameEditTarget('field')
    setMonsterNameEditValue((fieldMonster && (fieldMonster.name ?? '').trim()) || '')
  }

  const handleMonsterNameEditConfirm = () => {
    if (monsterNameEditTarget === 'field' && fieldMonster) {
      setFieldMonster({ ...fieldMonster, name: monsterNameEditValue.trim() || '' })
    }
    setMonsterNameEditTarget(null)
    setMonsterNameEditValue('')
  }

  const handleMonsterNameEditCancel = () => {
    setMonsterNameEditTarget(null)
    setMonsterNameEditValue('')
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
      setFieldMonster(normalizeFieldMonster(sanctuaryMonster))
      setSanctuary((prev) => {
        const next = [...prev]
        next[sanctuarySlotToField] = fieldMonster
        return next
      })
    } else {
      setFieldMonster(normalizeFieldMonster(sanctuaryMonster))
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

  // 배고픔 실시간 감소 표시: 필드 탭에서 60초마다 리렌더
  useEffect(() => {
    if (tab !== 'field' || !fieldMonster) return
    const id = setInterval(() => setFieldHungerTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [tab, fieldMonster])

  // 게이지 조정: +/- 버튼
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

  // 돌봐주기: 간식주기 — 배고픔 상승(현재값 기준), 경험치·레벨업
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

  // 돌봐주기: 놀아주기 — 행복도 상승, 경험치·레벨업
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

  if (!session) {
    return <LoginScreen />
  }

  // 닉네임 입력 화면
  if (nicknamePrompt) {
    return (
      <div className="app">
        <div className="nickname-prompt-overlay">
          <div className="nickname-prompt-box">
            <h2>닉네임을 입력하세요</h2>
            <input
              type="text"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              placeholder="2-10자"
              maxLength={10}
              autoFocus
            />
            {nicknameError && <div className="nickname-error">{nicknameError}</div>}
            <button onClick={handleNicknameSubmit}>확인</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`app ${tab === 'egg' ? 'app--bg-egg' : ''} ${tab === 'field' ? 'app--bg-field' : ''} ${tab === 'sanctuary' ? 'app--bg-sanctuary' : ''}`}>
      <div className="dev-coords" aria-hidden="true">
        <div>x: {devCoords.x} · y: {devCoords.y}</div>
        <div>viewport: {devViewport.w}×{devViewport.h}</div>
      </div>
      <div className="app-frame">
        {/* 안내 메시지 - 게임 화면 안에서 표시 */}
        {note && (
          <div
            className="note-overlay"
            onClick={() => setNote('')}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="note-message">
              {note}
              <div className="note-hint">탭하여 닫기</div>
            </div>
          </div>
        )}

        <main className="main">
          {tab === 'egg' && (
            <>
              <div className="user-area">
                <div className="user-name" title="로그아웃하려면 클릭">
                  <button type="button" className="user-name-btn" onClick={handleLogout} aria-label="유저 이름 · 로그아웃">
                    {user?.userId || 'Guest'}
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
              <div className="hud-area">
                <div className="egg-slots" role="list" aria-label="알 슬롯">
                  {Array.from({ length: EGG_SLOT_COUNT }, (_, i) => {
                    const locked = i >= EGG_SLOT_LOCKED_FROM
                    const egg = slots[i]
                    const hasEgg = !locked && egg != null
                    const canSelect = !currentEgg && hasEgg
                    return (
                      <button
                        key={i}
                        type="button"
                        role="listitem"
                        className={`egg-slot ${hasEgg ? 'egg-slot--has-egg' : 'egg-slot--empty'} ${locked ? 'egg-slot--locked' : ''}`}
                        aria-label={locked ? `슬롯 ${i + 1} 잠금` : hasEgg ? '알 있음 · 부화하려면 탭' : '빈 슬롯'}
                        onClick={() => handleSlotClick(i)}
                        tabIndex={hasEgg || locked ? 0 : -1}
                      >
                        {locked ? (
                          <span className="egg-slot-lock" aria-hidden="true">🔒</span>
                        ) : hasEgg ? (
                          <img
                            src={getEggImage(egg.element)}
                            alt="알"
                            className={`egg-slot-img ${getEggConfig(egg.element).slotClass ? getEggConfig(egg.element).slotClass : ''}`}
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
              {/* 부화장치와 방향키 */}
              <div className="incubator-with-controls">
                <button
                  type="button"
                  className="incubator-arrow incubator-arrow--left"
                  onClick={() => setCurrentIncubatorIndex((prev) => (prev - 1 + 5) % 5)}
                  aria-label="이전 부화장치"
                >
                  ◀
                </button>
                <EggIncubator
                  incubatorEggs={incubatorEggs}
                  currentIndex={currentIncubatorIndex}
                  affection={affection}
                  gaugeProgress={gaugeProgress}
                  remainingMs={remainingMs}
                />
                <button
                  type="button"
                  className="incubator-arrow incubator-arrow--right"
                  onClick={() => setCurrentIncubatorIndex((prev) => (prev + 1) % 5)}
                  aria-label="다음 부화장치"
                >
                  ▶
                </button>
              </div>
            </>
          )}

          {tab === 'field' && (
            <div className="tab-screen tab-screen--field" aria-label="필드">
              <div className="field-area" ref={fieldAreaRef}>
                {fieldMonster ? (
                  <>
                    {/* 게이지: 화면 상단 (배고픔은 12시간 경과 시 0) */}
                    {(() => {
                      const currentHunger = getCurrentHunger(fieldMonster)
                      const currentHappiness = fieldMonster.happiness ?? GAUGE_MAX
                      const expMax = getExpToNextLevel(fieldMonster.level ?? 1)
                      const expPct = Math.min(100, (100 * (fieldMonster.exp ?? 0)) / expMax)
                      return (
                        <div className="field-care-gauges-top" aria-label="몬스터 상태">
                          <div className="field-care-head">
                            <span className="field-care-name">{getDisplayName(fieldMonster)}</span>
                            <button type="button" className="field-care-name-edit" onClick={handleMonsterNameEditOpen} aria-label="이름 편집">편집</button>
                            <span className="field-care-level">Lv.{fieldMonster.level ?? 1}</span>
                          </div>
                          <div className="field-care-gauges">
                            <div className="field-care-gauge-row">
                              <span className="field-care-gauge-label">배고픔</span>
                              <div className="field-care-gauge-wrap" role="progressbar" aria-valuenow={currentHunger} aria-valuemin={0} aria-valuemax={GAUGE_MAX}>
                                <div className="field-care-gauge-bar field-care-gauge-bar--hunger" style={{ width: `${currentHunger}%` }} />
                              </div>
                              <div className="field-care-gauge-btns">
                                <button type="button" className="field-care-gauge-btn" onClick={() => handleGaugeAdjust('hunger', -15)} aria-label="배고픔 감소">−</button>
                                <button type="button" className="field-care-gauge-btn" onClick={() => handleGaugeAdjust('hunger', 15)} aria-label="배고픔 증가">+</button>
                              </div>
                            </div>
                            <div className="field-care-gauge-row">
                              <span className="field-care-gauge-label">행복도</span>
                              <div className="field-care-gauge-wrap" role="progressbar" aria-valuenow={currentHappiness} aria-valuemin={0} aria-valuemax={GAUGE_MAX}>
                                <div className="field-care-gauge-bar field-care-gauge-bar--happiness" style={{ width: `${currentHappiness}%` }} />
                              </div>
                              <div className="field-care-gauge-btns">
                                <button type="button" className="field-care-gauge-btn" onClick={() => handleGaugeAdjust('happiness', -15)} aria-label="행복도 감소">−</button>
                                <button type="button" className="field-care-gauge-btn" onClick={() => handleGaugeAdjust('happiness', 15)} aria-label="행복도 증가">+</button>
                              </div>
                            </div>
                            <div className="field-care-gauge-row field-care-exp-row">
                              <span className="field-care-gauge-label">EXP</span>
                              <div className="field-care-gauge-wrap field-care-exp-wrap" role="progressbar" aria-valuenow={fieldMonster.exp ?? 0} aria-valuemin={0} aria-valuemax={expMax}>
                                <div className="field-care-gauge-bar field-care-exp-bar" style={{ width: `${expPct}%` }} />
                              </div>
                              <div className="field-care-gauge-btns">
                                <button type="button" className="field-care-gauge-btn" onClick={() => handleGaugeAdjust('exp', -20)} aria-label="EXP 감소">−</button>
                                <button type="button" className="field-care-gauge-btn" onClick={() => handleGaugeAdjust('exp', 20)} aria-label="EXP 증가">+</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                    {/* 간식주기·놀아주기: 화면 하단 */}
                    <div className="field-care-actions-bottom" aria-label="돌봐주기">
                      {fieldCareExpFlash > 0 && (
                        <span className="field-care-exp-flash" aria-hidden="true">+{fieldCareExpFlash} EXP</span>
                      )}
                      <div className="field-care-actions">
                        <button type="button" className="field-care-btn" onClick={handleCareSnack} disabled={(fieldMonster.careSnack ?? 0) >= CARE_SNACK_MAX_PER_DAY} aria-label={`간식주기 (오늘 ${fieldMonster.careSnack ?? 0}/${CARE_SNACK_MAX_PER_DAY}회)`}>
                          간식주기
                        </button>
                        <button type="button" className="field-care-btn" onClick={handleCarePlay} disabled={(fieldMonster.carePlay ?? 0) >= CARE_PLAY_MAX_PER_DAY} aria-label={`놀아주기 (오늘 ${fieldMonster.carePlay ?? 0}/${CARE_PLAY_MAX_PER_DAY}회)`}>
                          놀아주기
                        </button>
                      </div>
                    </div>
                    <div
                      ref={fieldMonsterDivRef}
                      className={`field-monster ${fieldMonsterLiking ? 'field-monster--liking' : ''} ${fieldMonsterPos.x < 50 ? 'field-monster--facing-left' : ''}`}
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
                        try { e.currentTarget.releasePointerCapture(e.pointerId) } catch (_) { }
                        fieldMonsterPointerIdRef.current = null
                        setTimeout(() => { fieldMonsterPointerDownRef.current = false }, 0)
                      }}
                      onPointerLeave={(e) => {
                        try { e.currentTarget.releasePointerCapture(e.pointerId) } catch (_) { }
                        fieldMonsterPointerIdRef.current = null
                        setTimeout(() => { fieldMonsterPointerDownRef.current = false }, 0)
                      }}
                      onPointerCancel={(e) => {
                        try { e.currentTarget.releasePointerCapture(e.pointerId) } catch (_) { }
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
                      role={m ? 'button' : 'listitem'}
                      onClick={m ? () => handleSanctuarySlotClick(i) : undefined}
                      onKeyDown={m ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSanctuarySlotClick(i); } } : undefined}
                      tabIndex={m ? 0 : -1}
                      aria-label={m ? `${getDisplayName(m)} Lv.${m.level ?? 1}, 필드로 내보내기` : undefined}
                    >
                      {m ? (
                        <>
                          <div className="sanctuary-slot-info" aria-hidden="true">
                            <span className="sanctuary-slot-level">Lv.{m.level ?? 1}</span>
                            <span className="sanctuary-slot-name">{getDisplayName(m)}</span>
                          </div>
                          <img
                            src={getMonsterImage(m.element)}
                            alt=""
                            className="sanctuary-slot-img"
                            draggable={false}
                          />
                        </>
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

        {/* Monster component removed - using direct img rendering instead */}
        {/* {tab === 'egg' && currentEgg != null && !hatchDismissed && (
          <Monster
            mood={mood}
            bondStage={bondStage}
            affection={affection}
            element={currentEgg.element ?? DEFAULT_ELEMENT}
            eggType={currentEgg.element}
            note={note}
            onTouch={handleMonsterTouch}
            onHatch={() => { }}
            onHatchDismiss={handleHatchDismiss}
            readyToHatch={affection >= HATCH_MAX}
          />
        )} */}
        {tab === 'egg' && currentEgg && (
          <>
            <div className="dev-affection" aria-label="부화 조절 (개발용)">
              <button
                type="button"
                className="dev-affection-btn"
                title="부화 -1 (누르고 있으면 연속 감소)"
                onClick={() => {
                  setIncubatorEggs((prev) => { const next = [...prev]; if (next[currentIncubatorIndex]) { next[currentIncubatorIndex] = { ...next[currentIncubatorIndex], affection: Math.max(0, next[currentIncubatorIndex].affection - 1) }; } return next; })
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
                  setIncubatorEggs((prev) => { const next = [...prev]; if (next[currentIncubatorIndex]) { next[currentIncubatorIndex] = { ...next[currentIncubatorIndex], affection: Math.min(HATCH_MAX, next[currentIncubatorIndex].affection + 1) }; } return next; })
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
              <p id="confirm-hatch-title" className="confirm-hatch-text">부화를 시작하시겠습니까?</p>
              <div className="confirm-hatch-actions">
                <button type="button" className="confirm-hatch-btn confirm-hatch-btn--reject" onClick={handleConfirmHatchReject}>
                  아니오
                </button>
                <button type="button" className="confirm-hatch-btn confirm-hatch-btn--accept" onClick={handleConfirmHatchAccept}>
                  예
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 몬스터 이름 수정 모달 (필드 몬스터) */}
        {monsterNameEditTarget != null && (
          <div className="modal-overlay confirm-hatch-overlay" role="dialog" aria-modal="true" aria-labelledby="monster-name-edit-title">
            <div className="confirm-hatch-dialog monster-name-edit-dialog">
              <p id="monster-name-edit-title" className="confirm-hatch-text">몬스터 이름</p>
              <input
                type="text"
                className="monster-name-edit-input"
                value={monsterNameEditValue}
                onChange={(e) => setMonsterNameEditValue(e.target.value)}
                placeholder="이름을 입력하세요"
                maxLength={20}
                aria-label="몬스터 이름"
                autoFocus
              />
              <div className="confirm-hatch-actions">
                <button type="button" className="confirm-hatch-btn confirm-hatch-btn--reject" onClick={handleMonsterNameEditCancel}>
                  취소
                </button>
                <button type="button" className="confirm-hatch-btn confirm-hatch-btn--accept" onClick={handleMonsterNameEditConfirm}>
                  확인
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 잠금 슬롯 알림 다이얼로그 */}
        {slotLockedAlertOpen && (
          <div className="modal-overlay confirm-hatch-overlay" role="alertdialog" aria-modal="true" aria-labelledby="slot-locked-title">
            <div className="confirm-hatch-dialog">
              <p id="slot-locked-title" className="confirm-hatch-text">슬롯이 잠겨있습니다.</p>
              <div className="confirm-hatch-actions">
                <button type="button" className="confirm-hatch-btn confirm-hatch-btn--accept" onClick={() => setSlotLockedAlertOpen(false)}>
                  확인
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 부화장치 만석 알림 다이얼로그 */}
        {slotFullAlertOpen && (
          <div className="modal-overlay confirm-hatch-overlay" role="alertdialog" aria-modal="true" aria-labelledby="slot-full-title">
            <div className="confirm-hatch-dialog">
              <p id="slot-full-title" className="confirm-hatch-text">부화장치에 이미 알이 있습니다.</p>
              <div className="confirm-hatch-actions">
                <button type="button" className="confirm-hatch-btn confirm-hatch-btn--accept" onClick={() => setSlotFullAlertOpen(false)}>
                  확인
                </button>
              </div>
            </div>
          </div>
        )}


        {/* 안식처 → 필드 확인 다이얼로그 */}
        {sanctuaryToFieldOpen && (
          <div className="modal-overlay confirm-hatch-overlay" role="alertdialog" aria-modal="true" aria-labelledby="sanctuary-to-field-title">
            <div className="confirm-hatch-dialog">
              <p id="sanctuary-to-field-title" className="confirm-hatch-text">필드로 내보내시겠습니까?</p>
              <div className="confirm-hatch-actions">
                <button type="button" className="confirm-hatch-btn confirm-hatch-btn--reject" onClick={handleSanctuaryToFieldReject}>
                  아니오
                </button>
                <button type="button" className="confirm-hatch-btn confirm-hatch-btn--accept" onClick={handleSanctuaryToFieldAccept}>
                  예
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div >
  )
}

export default App
