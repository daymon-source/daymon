import { SANCTUARY_SLOT_COUNT } from '../constants/gameConfig'
import { getMonsterImage } from '../constants/elements'
import { getDisplayName } from '../utils/gameHelpers'

export default function SanctuaryTab({
  sanctuary,
  onSanctuarySlotClick,
  onSanctuaryReset,
}) {
  return (
    <div className="tab-screen tab-screen--sanctuary">
      <button
        type="button"
        className="sanctuary-reset-btn"
        onClick={onSanctuaryReset}
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
              onClick={m ? () => onSanctuarySlotClick(i) : undefined}
              onKeyDown={m ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSanctuarySlotClick(i); } } : undefined}
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
  )
}
