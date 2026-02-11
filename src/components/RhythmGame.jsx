import { useState, useRef, useCallback, useEffect } from 'react'
import { switchBgm, getCurrentTrack } from '../utils/bgm'
import './RhythmGame.css'

// ── BGM 동기화 차트 ──
// BGM rhythm 트랙: E minor, 150 BPM, 16비트 멜로디 루프
// 멜로디 비트맵: 0:B5, 1:G5, 1.5:A5, 2:B5, 3:G5, 3.5:E5,
//   5:C6, 5.5:B5, 6:A5, 7:B5, 7.5:E5, 8:E6, 9:B5, 9.5:A5,
//   10:G5, 10.5:A5, 11:B5, 13:E6, 13.5:D6, 14:B5, 14.5:G5, 15:E5

const BPM = 150
const BEAT_MS = 60000 / BPM     // 400ms per beat
const BGM_SYNC_OFFSET = 100     // BGM 스케줄러 시작 오프셋 (ms)

// 비트 위치 → ms 변환, BGM 멜로디 음이 있는 비트에만 배치
const CHART = [
  // ── Loop 1: 도입 (쉬움, 매 2비트) ──
  1, 3, 5, 7.5,
  9, 11, 13, 15,
  // ── Loop 2: 가속 (매 비트 + 반비트) ──
  17, 18, 19.5,
  21, 22, 23.5,
  25, 25.5, 27,
  29, 29.5, 30, 31,
  // ── Loop 3 partial: 클라이맥스 (빠른 연타) ──
  33, 33.5, 34, 34.5, 36,
].map(beat => Math.round(beat * BEAT_MS + BGM_SYNC_OFFSET))

const TRAVEL_TIME = 1200        // 노트가 상단→판정선까지 이동하는 시간(ms)
const PERFECT_WINDOW = 80       // ±80ms
const GREAT_WINDOW = 150        // ±150ms
const JUDGE_LINE_RATIO = 0.82   // 트랙 높이 대비 판정선 위치
const SONG_END_MS = Math.round(38 * BEAT_MS + BGM_SYNC_OFFSET) // ~15.3초

const SCORE_PERFECT = 100
const SCORE_GREAT = 50

export default function RhythmGame({ isOpen, onClose }) {
  const [phase, setPhase] = useState('idle') // idle | playing | result
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [comboPop, setComboPop] = useState(false)
  const [judgments, setJudgments] = useState({ perfect: 0, great: 0, miss: 0 })
  const [judgment, setJudgment] = useState(null) // { type, id }
  const [notes, setNotes] = useState([])

  const rafRef = useRef(null)
  const startTimeRef = useRef(0)
  const notesRef = useRef([])
  const trackRef = useRef(null)
  const judgmentIdRef = useRef(0)
  const phaseRef = useRef('idle')
  const prevTrackRef = useRef(null)

  // phase를 ref에도 동기화 (rAF 콜백에서 접근)
  useEffect(() => { phaseRef.current = phase }, [phase])

  // 노트 초기화
  const initNotes = useCallback(() => {
    return CHART.map((time, i) => ({
      id: i,
      time,        // 판정선 도달 예정 시각 (ms, 곡 시작 기준)
      hit: null,    // 'perfect' | 'great' | null
      missed: false,
    }))
  }, [])

  // 게임 루프
  const gameLoop = useCallback(() => {
    if (phaseRef.current !== 'playing') return

    const elapsed = performance.now() - startTimeRef.current
    const notesCopy = notesRef.current
    let changed = false

    // 미스 자동 처리: 판정선 통과 후 GREAT_WINDOW 초과
    for (const n of notesCopy) {
      if (!n.hit && !n.missed && elapsed - n.time > GREAT_WINDOW) {
        n.missed = true
        changed = true
        setCombo(0)
        setJudgments(prev => ({ ...prev, miss: prev.miss + 1 }))
        judgmentIdRef.current++
        setJudgment({ type: 'miss', id: judgmentIdRef.current })
      }
    }

    if (changed) {
      notesRef.current = [...notesCopy]
    }
    setNotes([...notesRef.current])

    // 곡 종료 체크
    if (elapsed >= SONG_END_MS) {
      phaseRef.current = 'result'
      setPhase('result')
      return
    }

    rafRef.current = requestAnimationFrame(gameLoop)
  }, [])

  // 시작
  const handleStart = useCallback(() => {
    // 기존 BGM 기억 후 리듬게임 BGM으로 전환
    prevTrackRef.current = getCurrentTrack() || 'egg'
    switchBgm('rhythm')

    const initialNotes = initNotes()
    notesRef.current = initialNotes
    setNotes(initialNotes)
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setJudgments({ perfect: 0, great: 0, miss: 0 })
    setJudgment(null)
    startTimeRef.current = performance.now()
    setPhase('playing')
    phaseRef.current = 'playing'
    rafRef.current = requestAnimationFrame(gameLoop)
  }, [initNotes, gameLoop])

  // 탭 처리
  const handleTap = useCallback(() => {
    if (phaseRef.current !== 'playing') return

    const elapsed = performance.now() - startTimeRef.current
    const notesCopy = notesRef.current

    // 아직 hit/missed가 아닌 노트 중 판정선에 가장 가까운 것
    let bestIdx = -1
    let bestDiff = Infinity
    for (let i = 0; i < notesCopy.length; i++) {
      const n = notesCopy[i]
      if (n.hit || n.missed) continue
      const diff = Math.abs(elapsed - n.time)
      if (diff < bestDiff) {
        bestDiff = diff
        bestIdx = i
      }
    }

    if (bestIdx === -1 || bestDiff > GREAT_WINDOW) return // 판정 범위 밖

    const note = notesCopy[bestIdx]
    judgmentIdRef.current++

    if (bestDiff <= PERFECT_WINDOW) {
      note.hit = 'perfect'
      setScore(prev => prev + SCORE_PERFECT)
      setCombo(prev => {
        const next = prev + 1
        setMaxCombo(mc => Math.max(mc, next))
        return next
      })
      setComboPop(true)
      setTimeout(() => setComboPop(false), 200)
      setJudgments(prev => ({ ...prev, perfect: prev.perfect + 1 }))
      setJudgment({ type: 'perfect', id: judgmentIdRef.current })
    } else {
      note.hit = 'great'
      setScore(prev => prev + SCORE_GREAT)
      setCombo(prev => {
        const next = prev + 1
        setMaxCombo(mc => Math.max(mc, next))
        return next
      })
      setComboPop(true)
      setTimeout(() => setComboPop(false), 200)
      setJudgments(prev => ({ ...prev, great: prev.great + 1 }))
      setJudgment({ type: 'great', id: judgmentIdRef.current })
    }

    notesRef.current = [...notesCopy]
  }, [])

  // 클린업
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // 닫힐 때 리셋 + BGM 복원
  useEffect(() => {
    if (!isOpen) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      phaseRef.current = 'idle'
      setPhase('idle')
      // 기존 BGM 복원
      if (prevTrackRef.current) {
        switchBgm(prevTrackRef.current)
        prevTrackRef.current = null
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  // 트랙 높이 기준 노트 y 계산
  const elapsed = phase === 'playing' ? performance.now() - startTimeRef.current : 0
  const trackHeight = trackRef.current?.clientHeight || 500
  const judgeLine = trackHeight * JUDGE_LINE_RATIO

  return (
    <div className="rhythm-overlay" onMouseDown={(e) => e.stopPropagation()}>
      <div className="rhythm-game">
        {/* ── idle: 시작 화면 ── */}
        {phase === 'idle' && (
          <div className="rhythm-start-screen">
            <div className="rhythm-start-icon">🎵</div>
            <div className="rhythm-start-text">
              알에게 노래를 들려주세요!<br />
              떨어지는 음표에 맞춰 탭하세요
            </div>
            <button className="rhythm-start-btn" onClick={handleStart}>
              시작
            </button>
            <button className="rhythm-result-close-btn" onClick={onClose}>
              닫기
            </button>
          </div>
        )}

        {/* ── playing: 게임 ── */}
        {phase === 'playing' && (
          <>
            <div className="rhythm-hud">
              <div className="rhythm-title">🎵 노래 불러주기</div>
              <div className="rhythm-score">{score}</div>
              <div className={`rhythm-combo ${comboPop ? 'rhythm-combo--pop' : ''}`}>
                {combo >= 2 ? `♪ ${combo} combo ♪` : '\u00A0'}
              </div>
            </div>

            <div className="rhythm-track-area">
              <div className="rhythm-track" ref={trackRef}>
                {/* 판정선 */}
                <div
                  className="rhythm-judge-line"
                  style={{ top: `${judgeLine}px` }}
                />

                {/* 노트들 */}
                {notes.map((note) => {
                  // y 계산: 노트가 판정선에 도달하는 시각 기준
                  const noteElapsed = performance.now() - startTimeRef.current
                  const timeUntilJudge = note.time - noteElapsed
                  const y = judgeLine - (timeUntilJudge / TRAVEL_TIME) * judgeLine

                  // 화면 밖이면 렌더링 스킵
                  if (y < -40 && !note.hit && !note.missed) return null
                  if (note.missed && y > trackHeight + 40) return null

                  const hitClass = note.hit
                    ? `rhythm-note--${note.hit}`
                    : note.missed
                      ? 'rhythm-note--miss'
                      : ''

                  return (
                    <div
                      key={note.id}
                      className={`rhythm-note ${hitClass}`}
                      style={{ top: `${note.hit || note.missed ? judgeLine - 14 : y}px` }}
                    />
                  )
                })}

                {/* 판정 텍스트 */}
                {judgment && (
                  <div
                    key={judgment.id}
                    className={`rhythm-judgment rhythm-judgment--${judgment.type}`}
                    style={{ top: `${judgeLine + 20}px` }}
                  >
                    {judgment.type === 'perfect' ? 'Perfect!' : judgment.type === 'great' ? 'Great!' : 'Miss'}
                  </div>
                )}
              </div>
            </div>

            <div className="rhythm-hit-area">
              <button
                className="rhythm-tap-btn"
                onPointerDown={handleTap}
              >
                🎤 TAP!
              </button>
            </div>
          </>
        )}

        {/* ── result: 결과 화면 ── */}
        {phase === 'result' && (
          <div className="rhythm-result">
            <div className="rhythm-result-title">🎵 노래 완료!</div>
            <div className="rhythm-result-score">{score}</div>

            <div className="rhythm-result-stats">
              <div className="rhythm-result-stat">
                <span className="rhythm-result-stat-count rhythm-result-stat-count--perfect">
                  {judgments.perfect}
                </span>
                <span className="rhythm-result-stat-label">Perfect</span>
              </div>
              <div className="rhythm-result-stat">
                <span className="rhythm-result-stat-count rhythm-result-stat-count--great">
                  {judgments.great}
                </span>
                <span className="rhythm-result-stat-label">Great</span>
              </div>
              <div className="rhythm-result-stat">
                <span className="rhythm-result-stat-count rhythm-result-stat-count--miss">
                  {judgments.miss}
                </span>
                <span className="rhythm-result-stat-label">Miss</span>
              </div>
            </div>

            <div className="rhythm-result-combo">
              최대 콤보: {maxCombo}
            </div>

            <button className="rhythm-result-close-btn" onClick={onClose}>
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
