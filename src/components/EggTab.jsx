import { EGG_SLOT_COUNT, EGG_SLOT_LOCKED_FROM } from '../constants/gameConfig'
import { getEggImage, getEggConfig } from '../constants/eggs'
import EggIncubator from './EggIncubator'

export default function EggTab({
  slots,
  incubatorEggs,
  currentIncubatorIndex,
  currentEgg,
  affection,
  currentHatchMax,
  currentCrackAt,
  gaugeProgress,
  remainingMs,
  gold,
  unlockedIncubatorSlots,
  onSlotClick,
  onUnlockIncubator,
  onPrevIncubator,
  onNextIncubator,
  onOpenRhythm,
}) {
  return (
    <>
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
                onClick={() => onSlotClick(i)}
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
          onClick={onPrevIncubator}
          aria-label="이전 부화장치"
        >
          ◀
        </button>
        <EggIncubator
          incubatorEggs={incubatorEggs}
          currentIndex={currentIncubatorIndex}
          affection={affection}
          hatchMax={currentHatchMax}
          crackAt={currentCrackAt}
          gaugeProgress={gaugeProgress}
          remainingMs={remainingMs}
          gold={gold}
          unlockedSlots={unlockedIncubatorSlots}
          onUnlockIncubator={onUnlockIncubator}
        />
        <button
          type="button"
          className="incubator-arrow incubator-arrow--right"
          onClick={onNextIncubator}
          aria-label="다음 부화장치"
        >
          ▶
        </button>
      </div>
      {/* 노래 불러주기 버튼 — 항상 공간 차지, 부화 중일 때만 보임 */}
      <button
        type="button"
        className={`rhythm-open-btn ${currentEgg ? '' : 'rhythm-open-btn--hidden'}`}
        onClick={onOpenRhythm}
        tabIndex={currentEgg ? 0 : -1}
      >
        🎵 노래 불러주기
      </button>
    </>
  )
}
