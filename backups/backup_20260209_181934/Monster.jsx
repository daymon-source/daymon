import { useEffect, useRef, useState } from 'react'
import { getMonsterImage } from '../constants/elements'
import { getEggImage, getEggReadyImage, getEggConfig } from '../constants/eggs'
import './Monster.css'

/* 알 크기 1.5배 (기준 260 → 390) */
const EGG_MAX_WIDTH = 390

const HATCH_TAPS_NEEDED = 5
const SHAKE_BEFORE_CRACK_MS = 120 // 5번째 터치 후 흔들림 끝나고 곧바로 쪼개짐
const CRACK_DURATION_MS = 500 // 알 쪼개짐 → 몬스터 등장까지

function Monster({ mood, bondStage, affection, element, eggType, note, onTouch, onHatch, onHatchDismiss, readyToHatch }) {
  const [shaking, setShaking] = useState(false)
  const [shakeIntensity, setShakeIntensity] = useState(1)
  const [hatchTaps, setHatchTaps] = useState(0)
  const [hatchPhase, setHatchPhase] = useState('idle') // 'idle' | 'cracking' | 'hatched'
  const lastTouchRef = useRef(0)

  const config = getEggConfig(eggType)
  const isEgg2 = bondStage >= 2
  const eggImg = isEgg2 ? getEggReadyImage(eggType) : getEggImage(eggType)
  const widthScale = isEgg2 ? (config.centerReadyWidthScale ?? config.centerWidthScale) : config.centerWidthScale
  const width = EGG_MAX_WIDTH * widthScale
  const centerImgClass = isEgg2 ? config.centerReadyClass : config.centerEgg1Class
  /* 부화된 몬스터는 알 기준 1.5배 */
  const monsterWidth = EGG_MAX_WIDTH * 1.5

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
      }, SHAKE_BEFORE_CRACK_MS)
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
            key={`egg-${eggType}-${isEgg2 ? '2' : '1'}`}
            src={eggImg}
            alt={isEgg2 ? '알 (2단계)' : '알'}
            className={`monster-img ${centerImgClass ? centerImgClass : ''}`.trim()}
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
          <div className="monster-hatched-inner">
            <span className="monster-hatch-glow-burst" aria-hidden="true" />
            <span className="monster-hatch-glow" aria-hidden="true" />
            <img
              src={getMonsterImage(element)}
              alt="몬스터"
              className="monster-hatched-img"
              style={{ width: `${monsterWidth}px`, height: 'auto' }}
            />
          </div>
        </div>
      )}
      {note && !isHatched ? <p className="monster-note">{note}</p> : <p className="monster-note monster-note--empty"> </p>}
    </div>
  )
}

export default Monster
