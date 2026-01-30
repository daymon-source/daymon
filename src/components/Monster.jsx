import { useEffect, useRef, useState } from 'react'
import egg1Img from '../assets/egg1.png'
import egg2Img from '../assets/egg2.png'
import './Monster.css'

/* 알 크기 1.5배 (기준 260 → 390) */
const EGG_MAX_WIDTH = 390

const HATCH_TAPS_NEEDED = 5
const CRACK_DURATION_MS = 1400
const MONSTER_POP_DURATION_MS = 600

function Monster({ mood, bondStage, affection, note, onTouch, onHatch, onHatchDismiss, readyToHatch }) {
  const [shaking, setShaking] = useState(false)
  const [shakeIntensity, setShakeIntensity] = useState(1)
  const [hatchTaps, setHatchTaps] = useState(0)
  const [hatchPhase, setHatchPhase] = useState('idle') // 'idle' | 'cracking' | 'hatched'
  const lastTouchRef = useRef(0)
  const width = bondStage >= 2 ? EGG_MAX_WIDTH * 0.7 : EGG_MAX_WIDTH
  const displayImg = bondStage >= 2 ? egg2Img : egg1Img
  const monsterWidth = EGG_MAX_WIDTH * 0.85

  const trigger = (e) => {
    if (e && e.type === 'touchend') {
      e.preventDefault()
      lastTouchRef.current = Date.now()
    }
    if (e && e.type === 'click' && Date.now() - lastTouchRef.current < 400) return
    if (hatchPhase !== 'idle') return

    if (readyToHatch) {
      const next = Math.min(HATCH_TAPS_NEEDED, hatchTaps + 1)
      setHatchTaps(next)
      setShakeIntensity(next)
      setShaking(true)
      window.setTimeout(() => {
        setShaking(false)
        if (next === HATCH_TAPS_NEEDED) setHatchPhase('cracking')
      }, 500)
    } else if (onTouch) {
      onTouch()
      setShakeIntensity(1)
      setShaking(true)
      window.setTimeout(() => setShaking(false), 400)
    }
  }

  useEffect(() => {
    if (hatchPhase !== 'cracking') return
    const t = setTimeout(() => {
      setHatchPhase('hatched')
      setHatchTaps(0)
      onHatch?.()
    }, CRACK_DURATION_MS)
    return () => clearTimeout(t)
  }, [hatchPhase, onHatch])

  const isCracking = hatchPhase === 'cracking'
  const isHatched = hatchPhase === 'hatched'

  return (
    <div className={`monster-wrap ${bondStage >= 2 ? 'monster-wrap--egg2' : 'monster-wrap--egg1'} ${readyToHatch ? 'monster-wrap--ready-to-hatch' : ''} ${isCracking ? 'monster-wrap--cracking' : ''} ${isHatched ? 'monster-wrap--hatched' : ''}`}>
      {!isHatched && (
        <button
          type="button"
          className={`monster monster--img ${shaking ? (readyToHatch ? `monster--shake-${shakeIntensity}` : 'monster--shake') : ''} ${readyToHatch ? 'monster--ready-to-hatch' : ''} ${isCracking ? 'monster--cracking' : ''}`}
          onClick={trigger}
          onTouchEnd={trigger}
          aria-label={readyToHatch ? '부화하기' : '몬스터 터치'}
          disabled={isCracking}
        >
          {readyToHatch && !isCracking && <span className="monster-glow-ring" aria-hidden="true" />}
          <img
            src={displayImg}
            alt={bondStage >= 2 ? 'egg2' : 'egg1'}
            className="monster-img"
            style={{ width: `${width}px`, height: 'auto' }}
          />
          {isCracking && (
            <span className="monster-crack" aria-hidden="true">
              <span className="monster-crack-line monster-crack-line--1" />
              <span className="monster-crack-line monster-crack-line--2" />
              <span className="monster-crack-line monster-crack-line--3" />
              <span className="monster-crack-line monster-crack-line--4" />
              <span className="monster-crack-line monster-crack-line--5" />
            </span>
          )}
        </button>
      )}
      {isHatched && (
        <div
          className="monster-hatched"
          style={{ width: `${monsterWidth}px` }}
          onClick={() => onHatchDismiss?.()}
          onTouchEnd={(e) => { e.preventDefault(); onHatchDismiss?.(); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onHatchDismiss?.(); }}
          aria-label="닫기"
        >
          <span className="monster-hatch-glow-burst" aria-hidden="true" />
          <span className="monster-hatch-glow" aria-hidden="true" />
          <img
            src={egg2Img}
            alt="몬스터"
            className="monster-hatched-img"
            style={{ width: `${monsterWidth}px`, height: 'auto' }}
          />
        </div>
      )}
      {note && !isHatched ? <p className="monster-note">{note}</p> : <p className="monster-note monster-note--empty"> </p>}
    </div>
  )
}

export default Monster
