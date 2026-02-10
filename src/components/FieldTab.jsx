import { GAUGE_MAX, CARE_SNACK_MAX_PER_DAY, CARE_PLAY_MAX_PER_DAY } from '../constants/gameConfig'
import { getMonsterImage } from '../constants/elements'
import { getCurrentHunger, getExpToNextLevel, getDisplayName } from '../utils/gameHelpers'

export default function FieldTab({
  fieldMonster,
  fieldMonsterPos,
  fieldMonsterMaxWidthPx,
  fieldLikeHearts,
  fieldMonsterLiking,
  fieldCareExpFlash,
  fieldAreaRef,
  fieldMonsterDivRef,
  onFieldReset,
  onGaugeAdjust,
  onCareSnack,
  onCarePlay,
  onMonsterNameEditOpen,
  // 포인터 이벤트 핸들러
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  onTouchStart,
  onTouchEnd,
  onClick,
}) {
  return (
    <div className="tab-screen tab-screen--field" aria-label="필드">
      <div className="field-area" ref={fieldAreaRef}>
        {fieldMonster ? (
          <>
            {/* 게이지: 화면 상단 */}
            {(() => {
              const currentHunger = getCurrentHunger(fieldMonster)
              const currentHappiness = fieldMonster.happiness ?? GAUGE_MAX
              const expMax = getExpToNextLevel(fieldMonster.level ?? 1)
              const expPct = Math.min(100, (100 * (fieldMonster.exp ?? 0)) / expMax)
              return (
                <div className="field-care-gauges-top" aria-label="몬스터 상태">
                  <div className="field-care-head">
                    <span className="field-care-name">{getDisplayName(fieldMonster)}</span>
                    <button type="button" className="field-care-name-edit" onClick={onMonsterNameEditOpen} aria-label="이름 편집">편집</button>
                    <span className="field-care-level">Lv.{fieldMonster.level ?? 1}</span>
                  </div>
                  <div className="field-care-gauges">
                    <div className="field-care-gauge-row">
                      <span className="field-care-gauge-label">배고픔</span>
                      <div className="field-care-gauge-wrap" role="progressbar" aria-valuenow={currentHunger} aria-valuemin={0} aria-valuemax={GAUGE_MAX}>
                        <div className="field-care-gauge-bar field-care-gauge-bar--hunger" style={{ width: `${currentHunger}%` }} />
                      </div>
                      <div className="field-care-gauge-btns">
                        <button type="button" className="field-care-gauge-btn" onClick={() => onGaugeAdjust('hunger', -15)} aria-label="배고픔 감소">−</button>
                        <button type="button" className="field-care-gauge-btn" onClick={() => onGaugeAdjust('hunger', 15)} aria-label="배고픔 증가">+</button>
                      </div>
                    </div>
                    <div className="field-care-gauge-row">
                      <span className="field-care-gauge-label">행복도</span>
                      <div className="field-care-gauge-wrap" role="progressbar" aria-valuenow={currentHappiness} aria-valuemin={0} aria-valuemax={GAUGE_MAX}>
                        <div className="field-care-gauge-bar field-care-gauge-bar--happiness" style={{ width: `${currentHappiness}%` }} />
                      </div>
                      <div className="field-care-gauge-btns">
                        <button type="button" className="field-care-gauge-btn" onClick={() => onGaugeAdjust('happiness', -15)} aria-label="행복도 감소">−</button>
                        <button type="button" className="field-care-gauge-btn" onClick={() => onGaugeAdjust('happiness', 15)} aria-label="행복도 증가">+</button>
                      </div>
                    </div>
                    <div className="field-care-gauge-row field-care-exp-row">
                      <span className="field-care-gauge-label">EXP</span>
                      <div className="field-care-gauge-wrap field-care-exp-wrap" role="progressbar" aria-valuenow={fieldMonster.exp ?? 0} aria-valuemin={0} aria-valuemax={expMax}>
                        <div className="field-care-gauge-bar field-care-exp-bar" style={{ width: `${expPct}%` }} />
                      </div>
                      <div className="field-care-gauge-btns">
                        <button type="button" className="field-care-gauge-btn" onClick={() => onGaugeAdjust('exp', -20)} aria-label="EXP 감소">−</button>
                        <button type="button" className="field-care-gauge-btn" onClick={() => onGaugeAdjust('exp', 20)} aria-label="EXP 증가">+</button>
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
                <button type="button" className="field-care-btn" onClick={onCareSnack} disabled={(fieldMonster.careSnack ?? 0) >= CARE_SNACK_MAX_PER_DAY} aria-label={`간식주기 (오늘 ${fieldMonster.careSnack ?? 0}/${CARE_SNACK_MAX_PER_DAY}회)`}>
                  간식주기
                </button>
                <button type="button" className="field-care-btn" onClick={onCarePlay} disabled={(fieldMonster.carePlay ?? 0) >= CARE_PLAY_MAX_PER_DAY} aria-label={`놀아주기 (오늘 ${fieldMonster.carePlay ?? 0}/${CARE_PLAY_MAX_PER_DAY}회)`}>
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
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerLeave}
              onPointerCancel={onPointerCancel}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              onClick={onClick}
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
              onClick={onFieldReset}
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
  )
}
