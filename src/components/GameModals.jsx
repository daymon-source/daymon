export default function GameModals({
  // 부화 확인
  confirmHatchOpen,
  onConfirmHatchAccept,
  onConfirmHatchReject,
  // 몬스터 이름 수정
  monsterNameEditTarget,
  monsterNameEditValue,
  onMonsterNameEditValueChange,
  onMonsterNameEditConfirm,
  onMonsterNameEditCancel,
  // 잠금 슬롯 알림
  slotLockedAlertOpen,
  onSlotLockedAlertClose,
  // 부화장치 만석 알림
  slotFullAlertOpen,
  onSlotFullAlertClose,
  // 부화장치 잠금 알림
  incubatorLockedAlertOpen,
  onIncubatorLockedAlertClose,
  // 안식처 → 필드 확인
  sanctuaryToFieldOpen,
  onSanctuaryToFieldAccept,
  onSanctuaryToFieldReject,
}) {
  return (
    <>
      {/* 부화 확인 다이얼로그 */}
      {confirmHatchOpen && (
        <div className="modal-overlay confirm-hatch-overlay" role="alertdialog" aria-modal="true" aria-labelledby="confirm-hatch-title">
          <div className="confirm-hatch-dialog">
            <p id="confirm-hatch-title" className="confirm-hatch-text">부화를 시작하시겠습니까?</p>
            <div className="confirm-hatch-actions">
              <button type="button" className="confirm-hatch-btn confirm-hatch-btn--reject" onClick={onConfirmHatchReject}>
                아니오
              </button>
              <button type="button" className="confirm-hatch-btn confirm-hatch-btn--accept" onClick={onConfirmHatchAccept}>
                예
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 몬스터 이름 수정 모달 */}
      {monsterNameEditTarget != null && (
        <div className="modal-overlay confirm-hatch-overlay" role="dialog" aria-modal="true" aria-labelledby="monster-name-edit-title">
          <div className="confirm-hatch-dialog monster-name-edit-dialog">
            <p id="monster-name-edit-title" className="confirm-hatch-text">몬스터 이름</p>
            <input
              type="text"
              className="monster-name-edit-input"
              value={monsterNameEditValue}
              onChange={(e) => onMonsterNameEditValueChange(e.target.value)}
              placeholder="이름을 입력하세요"
              maxLength={20}
              aria-label="몬스터 이름"
              autoFocus
            />
            <div className="confirm-hatch-actions">
              <button type="button" className="confirm-hatch-btn confirm-hatch-btn--reject" onClick={onMonsterNameEditCancel}>
                취소
              </button>
              <button type="button" className="confirm-hatch-btn confirm-hatch-btn--accept" onClick={onMonsterNameEditConfirm}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 잠금 슬롯 알림 */}
      {slotLockedAlertOpen && (
        <div className="modal-overlay confirm-hatch-overlay" role="alertdialog" aria-modal="true" aria-labelledby="slot-locked-title">
          <div className="confirm-hatch-dialog">
            <p id="slot-locked-title" className="confirm-hatch-text">슬롯이 잠겨있습니다.</p>
            <div className="confirm-hatch-actions">
              <button type="button" className="confirm-hatch-btn confirm-hatch-btn--accept" onClick={onSlotLockedAlertClose}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 부화장치 만석 알림 */}
      {slotFullAlertOpen && (
        <div className="modal-overlay confirm-hatch-overlay" role="alertdialog" aria-modal="true" aria-labelledby="slot-full-title">
          <div className="confirm-hatch-dialog">
            <p id="slot-full-title" className="confirm-hatch-text">부화장치에 이미 알이 있습니다.</p>
            <div className="confirm-hatch-actions">
              <button type="button" className="confirm-hatch-btn confirm-hatch-btn--accept" onClick={onSlotFullAlertClose}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 부화장치 잠금 알림 */}
      {incubatorLockedAlertOpen && (
        <div className="modal-overlay confirm-hatch-overlay" role="alertdialog" aria-modal="true" aria-labelledby="incubator-locked-title">
          <div className="confirm-hatch-dialog">
            <p id="incubator-locked-title" className="confirm-hatch-text">부화장치를 수리해야 합니다.</p>
            <div className="confirm-hatch-actions">
              <button type="button" className="confirm-hatch-btn confirm-hatch-btn--accept" onClick={onIncubatorLockedAlertClose}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 안식처 → 필드 확인 */}
      {sanctuaryToFieldOpen && (
        <div className="modal-overlay confirm-hatch-overlay" role="alertdialog" aria-modal="true" aria-labelledby="sanctuary-to-field-title">
          <div className="confirm-hatch-dialog">
            <p id="sanctuary-to-field-title" className="confirm-hatch-text">필드로 내보내시겠습니까?</p>
            <div className="confirm-hatch-actions">
              <button type="button" className="confirm-hatch-btn confirm-hatch-btn--reject" onClick={onSanctuaryToFieldReject}>
                아니오
              </button>
              <button type="button" className="confirm-hatch-btn confirm-hatch-btn--accept" onClick={onSanctuaryToFieldAccept}>
                예
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
