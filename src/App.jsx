import { useEffect, useRef, useState, useCallback } from 'react'
import { playTabSwitch } from './utils/sounds'
import { switchBgm } from './utils/bgm'
import LoginScreen from './components/LoginScreen'
import SettingsPanel from './components/SettingsPanel'
import AttendanceCheck from './components/AttendanceCheck'
import BadgeModal from './components/BadgeModal'
import RhythmGame from './components/RhythmGame'
import LoadingScreen from './components/LoadingScreen'
import EggTab from './components/EggTab'
import FieldTab from './components/FieldTab'
import SanctuaryTab from './components/SanctuaryTab'
import GameModals from './components/GameModals'
import { SANCTUARY_SLOT_COUNT } from './constants/gameConfig'
import { normalizeFieldMonster } from './utils/gameHelpers'
import { getAllEggImages } from './constants/eggs'
import { useAuth } from './hooks/useAuth'
import { useGameData } from './hooks/useGameData'
import { useIncubator } from './hooks/useIncubator'
import { useFieldMonster } from './hooks/useFieldMonster'
import { useAttendance } from './hooks/useAttendance'
import bgEggImg from './assets/bg-egg.png'
import bgFieldImg from './assets/bg-field.png'
import bgSanctuaryImg from './assets/bg-sanctuary.png'
import './App.css'

function App() {
  const [assetsReady, setAssetsReady] = useState(false)
  const [tab, setTab] = useState('egg')
  const [note, setNote] = useState('')
  const [devCoords, setDevCoords] = useState({ x: 0, y: 0 })
  const [devViewport, setDevViewport] = useState({ w: 0, h: 0 })
  // 안식처 → 필드 상태
  const [sanctuaryToFieldOpen, setSanctuaryToFieldOpen] = useState(false)
  const [sanctuarySlotToField, setSanctuarySlotToField] = useState(null)
  // 몬스터 이름 수정 상태
  const [monsterNameEditTarget, setMonsterNameEditTarget] = useState(null)
  const [monsterNameEditValue, setMonsterNameEditValue] = useState('')
  const [badgeModalOpen, setBadgeModalOpen] = useState(false)
  const [rhythmGameOpen, setRhythmGameOpen] = useState(false)

  // ref를 사용해 훅 간 순환 의존성 해결
  const loadUserDataRef = useRef(null)

  // ── 인증 훅 ──
  const auth = useAuth(loadUserDataRef)

  // ── 출석체크 훅 ──
  const attendance = useAttendance({
    session: auth.session,
    setGold: (fn) => gameData.setGold(fn),
    setGoldFlash: (v) => gameData.setGoldFlash(v),
    assetsReady,
  })

  // ── 게임 데이터 훅 ──
  const gameData = useGameData(
    auth.session,
    auth.user,
    auth.setUser,
    auth.setNicknamePrompt,
    attendance.loadAttendanceData,
  )

  // loadUserDataRef를 gameData.loadUserData에 연결
  loadUserDataRef.current = gameData.loadUserData

  // ── 부화장치 훅 ──
  const incubator = useIncubator({
    session: auth.session,
    incubatorEggs: gameData.incubatorEggs,
    setIncubatorEggs: gameData.setIncubatorEggs,
    slots: gameData.slots,
    setSlots: gameData.setSlots,
    fieldMonster: gameData.fieldMonster,
    setFieldMonster: gameData.setFieldMonster,
    sanctuary: gameData.sanctuary,
    setSanctuary: gameData.setSanctuary,
    gold: gameData.gold,
    setGold: gameData.setGold,
    setGoldFlash: gameData.setGoldFlash,
    unlockedIncubatorSlots: gameData.unlockedIncubatorSlots,
    setUnlockedIncubatorSlots: gameData.setUnlockedIncubatorSlots,
  })

  // ── 필드 몬스터 훅 ──
  const field = useFieldMonster({
    fieldMonster: gameData.fieldMonster,
    setFieldMonster: gameData.setFieldMonster,
    tab,
  })

  // ── BGM 자동 시작 ──
  const bgmStartedRef = useRef(false)
  const tryStartBgm = useCallback(() => {
    if (bgmStartedRef.current) return
    bgmStartedRef.current = true
    setTimeout(() => switchBgm('egg'), 200)
  }, [])

  useEffect(() => {
    document.addEventListener('click', tryStartBgm, true)
    document.addEventListener('touchstart', tryStartBgm, true)
    return () => {
      document.removeEventListener('click', tryStartBgm, true)
      document.removeEventListener('touchstart', tryStartBgm, true)
    }
  }, [tryStartBgm])

  useEffect(() => {
    if (auth.session?.user && !bgmStartedRef.current) {
      const t = setTimeout(() => tryStartBgm(), 500)
      return () => clearTimeout(t)
    }
  }, [auth.session?.user, tryStartBgm])

  // ── 개발용 좌표/뷰포트 ──
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

  useEffect(() => {
    const update = () => setDevViewport({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // ── 안식처 → 필드 핸들러 ──
  const handleSanctuarySlotClick = (index) => {
    if (!gameData.sanctuary[index]) return
    setSanctuarySlotToField(index)
    setSanctuaryToFieldOpen(true)
  }

  const handleSanctuaryToFieldAccept = () => {
    if (sanctuarySlotToField == null) {
      setSanctuaryToFieldOpen(false)
      setSanctuarySlotToField(null)
      return
    }
    const sanctuaryMonster = gameData.sanctuary[sanctuarySlotToField]
    if (!sanctuaryMonster) {
      setSanctuaryToFieldOpen(false)
      setSanctuarySlotToField(null)
      return
    }
    // 현재 필드 몬스터를 미리 캡처 (stale closure 방지)
    const currentFieldMonster = gameData.fieldMonster
    gameData.setFieldMonster(normalizeFieldMonster(sanctuaryMonster))
    gameData.setSanctuary((prev) => {
      const next = [...prev]
      next[sanctuarySlotToField] = currentFieldMonster // null이면 빈 슬롯, 있으면 교환
      return next
    })
    setSanctuaryToFieldOpen(false)
    setSanctuarySlotToField(null)
  }

  const handleSanctuaryToFieldReject = () => {
    setSanctuaryToFieldOpen(false)
    setSanctuarySlotToField(null)
  }

  const handleSanctuaryReset = () => {
    gameData.setSanctuary(Array(SANCTUARY_SLOT_COUNT).fill(null))
  }

  // ── 몬스터 이름 수정 ──
  const handleMonsterNameEditOpen = () => {
    setMonsterNameEditTarget('field')
    setMonsterNameEditValue((gameData.fieldMonster && (gameData.fieldMonster.name ?? '').trim()) || '')
  }

  const handleMonsterNameEditConfirm = () => {
    if (monsterNameEditTarget === 'field' && gameData.fieldMonster) {
      gameData.setFieldMonster({ ...gameData.fieldMonster, name: monsterNameEditValue.trim() || '' })
    }
    setMonsterNameEditTarget(null)
    setMonsterNameEditValue('')
  }

  const handleMonsterNameEditCancel = () => {
    setMonsterNameEditTarget(null)
    setMonsterNameEditValue('')
  }

  // ── 로그아웃 ──
  const handleLogout = async () => {
    // 로그아웃 전 미저장 데이터 플러시
    await gameData.flushBeforeLogout()
    await auth.handleLogout()
    gameData.setMood('평온')
    gameData.setFieldMonster(null)
    gameData.setSanctuary([null, null, null, null, null, null])
    incubator.resetIncubatorState()
    setNote('')
  }

  // ── 로그인 전 ──
  if (!auth.session) {
    return <LoginScreen />
  }

  // ── 닉네임 입력 화면 ──
  if (auth.nicknamePrompt) {
    return (
      <div className="app">
        <div className="nickname-prompt-overlay">
          <div className="nickname-prompt-box">
            <h2>닉네임을 입력하세요</h2>
            <input
              type="text"
              value={auth.nicknameInput}
              onChange={(e) => auth.setNicknameInput(e.target.value)}
              placeholder="2-10자"
              maxLength={10}
              autoFocus
            />
            {auth.nicknameError && <div className="nickname-error">{auth.nicknameError}</div>}
            <button onClick={auth.handleNicknameSubmit}>확인</button>
          </div>
        </div>
      </div>
    )
  }

  // 프리로드할 이미지 목록
  const preloadUrls = [...new Set([bgEggImg, bgFieldImg, bgSanctuaryImg, ...getAllEggImages()])]

  return (
    <div className={`app ${tab === 'egg' ? 'app--bg-egg' : ''} ${tab === 'field' ? 'app--bg-field' : ''} ${tab === 'sanctuary' ? 'app--bg-sanctuary' : ''}`}>
      {/* 로딩 화면 */}
      {!assetsReady && (
        <LoadingScreen
          imageUrls={preloadUrls}
          minDurationMs={2000}
          onComplete={() => setAssetsReady(true)}
        />
      )}
      <div className="dev-coords" aria-hidden="true">
        <div>x: {devCoords.x} · y: {devCoords.y}</div>
        <div>viewport: {devViewport.w}×{devViewport.h}</div>
      </div>
      <div className="app-frame">
        {/* 안내 메시지 */}
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

        <SettingsPanel
          nickname={auth.user?.userId || 'Guest'}
          profileImage={null}
          gold={gameData.gold}
          goldFlash={gameData.goldFlash}
          accountLevel={gameData.accountLevel}
          currentTab={tab}
          onLogout={handleLogout}
          onChangeNickname={auth.handleChangeNickname}
          onChangeProfileImage={() => { /* TODO */ }}
          onResetSlots={incubator.handleResetSlots}
          onDeleteAllSlots={incubator.handleDeleteAllSlots}
          onAddGold={(amount) => gameData.setGold(prev => prev + amount)}
          onResetIncubator={incubator.handleResetIncubator}
          onOpenAttendance={() => attendance.setAttendanceOpen(true)}
          onOpenBadges={() => setBadgeModalOpen(true)}
          onAdjustHatch={incubator.handleAdjustHatch}
        />

        <main className="main">
          {tab === 'egg' && (
            <EggTab
              slots={gameData.slots}
              incubatorEggs={gameData.incubatorEggs}
              currentIncubatorIndex={incubator.currentIncubatorIndex}
              currentEgg={incubator.currentEgg}
              affection={incubator.affection}
              currentHatchMax={incubator.currentHatchMax}
              currentCrackAt={incubator.currentCrackAt}
              gaugeProgress={incubator.gaugeProgress}
              remainingMs={incubator.remainingMs}
              gold={gameData.gold}
              unlockedIncubatorSlots={gameData.unlockedIncubatorSlots}
              onSlotClick={incubator.handleSlotClick}
              onUnlockIncubator={incubator.handleUnlockIncubator}
              onPrevIncubator={incubator.goToPrevIncubator}
              onNextIncubator={incubator.goToNextIncubator}
              onOpenRhythm={() => setRhythmGameOpen(true)}
            />
          )}

          {tab === 'field' && (
            <FieldTab
              fieldMonster={gameData.fieldMonster}
              fieldMonsterPos={field.fieldMonsterPos}
              fieldMonsterMaxWidthPx={field.fieldMonsterMaxWidthPx}
              fieldLikeHearts={field.fieldLikeHearts}
              fieldMonsterLiking={field.fieldMonsterLiking}
              fieldCareExpFlash={field.fieldCareExpFlash}
              fieldAreaRef={field.fieldAreaRef}
              fieldMonsterDivRef={field.fieldMonsterDivRef}
              onFieldReset={field.handleFieldReset}
              onGaugeAdjust={field.handleGaugeAdjust}
              onCareSnack={field.handleCareSnack}
              onCarePlay={field.handleCarePlay}
              onMonsterNameEditOpen={handleMonsterNameEditOpen}
              onPointerDown={field.onPointerDown}
              onPointerUp={field.onPointerUp}
              onPointerLeave={field.onPointerLeave}
              onPointerCancel={field.onPointerCancel}
              onTouchStart={field.onTouchStart}
              onTouchEnd={field.onTouchEnd}
              onClick={field.onClick}
            />
          )}

          {tab === 'sanctuary' && (
            <SanctuaryTab
              sanctuary={gameData.sanctuary}
              onSanctuarySlotClick={handleSanctuarySlotClick}
              onSanctuaryReset={handleSanctuaryReset}
            />
          )}
        </main>

        <nav className="bottom-nav" aria-label="메인 메뉴">
          <button
            type="button"
            className={`bottom-nav-btn ${tab === 'egg' ? 'bottom-nav-btn--active' : ''}`}
            onClick={() => {
              playTabSwitch()
              switchBgm('egg')
              field.releaseFieldMonsterPointer()
              setTab('egg')
            }}
            aria-current={tab === 'egg' ? 'page' : undefined}
          >
            <span className="bottom-nav-icon">🥚</span>
            <span className="bottom-nav-label">알</span>
          </button>
          <button
            type="button"
            className={`bottom-nav-btn ${tab === 'field' ? 'bottom-nav-btn--active' : ''}`}
            onClick={() => {
              playTabSwitch()
              switchBgm('field')
              field.fieldTabShownAtRef.current = Date.now()
              setTab('field')
            }}
            aria-current={tab === 'field' ? 'page' : undefined}
          >
            <span className="bottom-nav-icon">🌿</span>
            <span className="bottom-nav-label">필드</span>
          </button>
          <button
            type="button"
            className={`bottom-nav-btn ${tab === 'sanctuary' ? 'bottom-nav-btn--active' : ''}`}
            onClick={() => {
              playTabSwitch()
              switchBgm('sanctuary')
              field.releaseFieldMonsterPointer()
              setTab('sanctuary')
            }}
            aria-current={tab === 'sanctuary' ? 'page' : undefined}
          >
            <span className="bottom-nav-icon">🏡</span>
            <span className="bottom-nav-label">안식처</span>
          </button>
        </nav>

        <GameModals
          confirmHatchOpen={incubator.confirmHatchOpen}
          onConfirmHatchAccept={incubator.handleConfirmHatchAccept}
          onConfirmHatchReject={incubator.handleConfirmHatchReject}
          monsterNameEditTarget={monsterNameEditTarget}
          monsterNameEditValue={monsterNameEditValue}
          onMonsterNameEditValueChange={setMonsterNameEditValue}
          onMonsterNameEditConfirm={handleMonsterNameEditConfirm}
          onMonsterNameEditCancel={handleMonsterNameEditCancel}
          slotLockedAlertOpen={incubator.slotLockedAlertOpen}
          onSlotLockedAlertClose={() => incubator.setSlotLockedAlertOpen(false)}
          slotFullAlertOpen={incubator.slotFullAlertOpen}
          onSlotFullAlertClose={() => incubator.setSlotFullAlertOpen(false)}
          incubatorLockedAlertOpen={incubator.incubatorLockedAlertOpen}
          onIncubatorLockedAlertClose={() => incubator.setIncubatorLockedAlertOpen(false)}
          sanctuaryToFieldOpen={sanctuaryToFieldOpen}
          onSanctuaryToFieldAccept={handleSanctuaryToFieldAccept}
          onSanctuaryToFieldReject={handleSanctuaryToFieldReject}
        />

        {/* 출석체크 모달 */}
        <AttendanceCheck
          isOpen={attendance.attendanceOpen}
          onClose={() => attendance.setAttendanceOpen(false)}
          onClaimReward={attendance.handleAttendanceClaim}
          attendanceData={attendance.attendanceData}
        />

        {/* 뱃지(업적) 모달 */}
        <BadgeModal
          isOpen={badgeModalOpen}
          onClose={() => setBadgeModalOpen(false)}
          unlockedBadgeIds={gameData.badges?.unlocked || []}
        />

        {/* 리듬게임 모달 */}
        <RhythmGame
          isOpen={rhythmGameOpen}
          onClose={() => setRhythmGameOpen(false)}
        />
      </div>
    </div>
  )
}

export default App
