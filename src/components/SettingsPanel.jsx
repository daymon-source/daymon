import { useState } from 'react'
import { playMenuOpen, playMenuClose, playClick, setSfxVolume, getSfxVolume, setSfxEnabled, isSfxEnabled, setBgmVolume, getBgmVolume, setBgmEnabled, isBgmEnabled } from '../utils/sounds'
import { switchBgm, stopBgm, updateBgmVolume, getCurrentTrack } from '../utils/bgm'
import './SettingsPanel.css'

/**
 * SettingsPanel — 프로필 바 + 왼쪽 상단 드롭다운 설정 메뉴
 */
function SettingsPanel({
    nickname,
    profileImage,
    gold = 0,
    goldFlash = 0,
    currentTab = 'egg',
    onLogout,
    onChangeNickname,
    onChangeProfileImage,
    onResetSlots,
    onDeleteAllSlots,
    onAddGold,
    onResetIncubator,
    onOpenAttendance,
    onAdjustHatch,
}) {
    const [panelOpen, setPanelOpen] = useState(false)
    const [nicknameModalOpen, setNicknameModalOpen] = useState(false)
    const [nicknameInput, setNicknameInput] = useState('')
    const [nicknameError, setNicknameError] = useState('')
    const [nicknameSaving, setNicknameSaving] = useState(false)
    // 사운드 상태 (sounds.js에서 관리, UI 리렌더용 로컬 state)
    const [localSfxEnabled, setLocalSfxEnabled] = useState(isSfxEnabled())
    const [localSfxVol, setLocalSfxVol] = useState(getSfxVolume())
    const [localBgmEnabled, setLocalBgmEnabled] = useState(isBgmEnabled())
    const [localBgmVol, setLocalBgmVol] = useState(getBgmVolume())

    const togglePanel = () => {
        setPanelOpen(prev => {
            if (!prev) playMenuOpen()
            else playMenuClose()
            return !prev
        })
    }
    const closePanel = () => { playMenuClose(); setPanelOpen(false) }

    const openNicknameModal = () => {
        setNicknameInput(nickname || '')
        setNicknameError('')
        setNicknameModalOpen(true)
        closePanel()
    }

    const handleNicknameSave = async () => {
        const trimmed = nicknameInput.trim()
        if (!trimmed) { setNicknameError('닉네임을 입력해주세요.'); return }
        if (trimmed.length < 2 || trimmed.length > 12) { setNicknameError('2~12자로 입력해주세요.'); return }
        if (trimmed === nickname) { setNicknameModalOpen(false); return }

        setNicknameSaving(true)
        try {
            const error = await onChangeNickname(trimmed)
            if (error) { setNicknameError(error) } else { setNicknameModalOpen(false) }
        } catch (e) {
            setNicknameError('변경에 실패했습니다.')
        }
        setNicknameSaving(false)
    }

    return (
        <>
            {/* ── 프로필 바 ── */}
            <div className="profile-bar">
                <button type="button" className="profile-bar-left" onClick={togglePanel}>
                    {profileImage ? (
                        <img src={profileImage} alt="프로필" className="profile-avatar" />
                    ) : (
                        <div className="profile-avatar-placeholder">🐣</div>
                    )}
                    <span className="profile-nickname">{nickname || 'Guest'}</span>
                    <span className="profile-caret">{panelOpen ? '▲' : '▼'}</span>
                </button>
                <div className="profile-bar-right">
                    <div className="profile-gold">
                        <span className="profile-gold-icon">🌙</span>
                        <span className="profile-gold-amount">{gold.toLocaleString()}</span>
                        {goldFlash > 0 && (
                            <span className="profile-gold-flash" key={goldFlash + '-' + Date.now()}>+{goldFlash}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 왼쪽 드롭다운 설정 메뉴 ── */}
            {panelOpen && (
                <>
                    <div className="settings-overlay" onClick={closePanel} />
                    <div className="settings-panel">
                        {/* 프로필 헤더: 아바타 + 닉네임 + 편집 아이콘 */}
                        <div className="settings-header">
                            <div className="settings-avatar-wrapper" onClick={() => { closePanel(); onChangeProfileImage(); }}>
                                {profileImage ? (
                                    <img src={profileImage} alt="프로필" className="settings-avatar" />
                                ) : (
                                    <div className="settings-avatar-placeholder">🐣</div>
                                )}
                                <div className="settings-avatar-edit">📷</div>
                            </div>
                            <span className="settings-nickname">{nickname || 'Guest'}</span>
                            <button type="button" className="settings-nickname-edit" onClick={openNicknameModal} aria-label="닉네임 변경">
                                ✏️
                            </button>
                        </div>

                        {/* 사운드 설정 */}
                        <div className="settings-section">
                            {/* SFX */}
                            <div className="settings-item settings-sound-row">
                                <button
                                    type="button"
                                    className="settings-sound-toggle"
                                    onClick={() => {
                                        const next = !localSfxEnabled
                                        setLocalSfxEnabled(next)
                                        setSfxEnabled(next)
                                        if (next) playClick()
                                    }}
                                >
                                    <span className="settings-item-icon">{localSfxEnabled ? '🔊' : '🔇'}</span>
                                    <span>효과음</span>
                                </button>
                                <input
                                    type="range"
                                    className="settings-volume-slider"
                                    min="0" max="100" step="5"
                                    value={Math.round(localSfxVol * 100)}
                                    onChange={(e) => {
                                        const v = Number(e.target.value) / 100
                                        setLocalSfxVol(v)
                                        setSfxVolume(v)
                                        if (v > 0 && !localSfxEnabled) {
                                            setLocalSfxEnabled(true)
                                            setSfxEnabled(true)
                                        }
                                    }}
                                    onPointerUp={() => playClick()}
                                    onTouchEnd={() => playClick()}
                                />
                                <span className="settings-volume-label">{Math.round(localSfxVol * 100)}</span>
                            </div>
                            {/* BGM */}
                            <div className="settings-item settings-sound-row">
                                <button
                                    type="button"
                                    className="settings-sound-toggle"
                                    onClick={() => {
                                        const next = !localBgmEnabled
                                        setLocalBgmEnabled(next)
                                        setBgmEnabled(next)
                                        if (next) {
                                            switchBgm(currentTab)
                                        } else {
                                            stopBgm()
                                        }
                                    }}
                                >
                                    <span className="settings-item-icon">{localBgmEnabled ? '🎵' : '🔇'}</span>
                                    <span>BGM</span>
                                </button>
                                <input
                                    type="range"
                                    className="settings-volume-slider"
                                    min="0" max="100" step="5"
                                    value={Math.round(localBgmVol * 100)}
                                    onChange={(e) => {
                                        const v = Number(e.target.value) / 100
                                        setLocalBgmVol(v)
                                        setBgmVolume(v)
                                        updateBgmVolume()
                                        if (v > 0 && !localBgmEnabled) {
                                            setLocalBgmEnabled(true)
                                            setBgmEnabled(true)
                                            switchBgm(currentTab)
                                        }
                                    }}
                                />
                                <span className="settings-volume-label">{Math.round(localBgmVol * 100)}</span>
                            </div>
                        </div>

                        <div className="settings-divider" />

                        {/* 출석체크·친구·도감 */}
                        <div className="settings-section">
                            <button type="button" className="settings-item" onClick={() => { closePanel(); if (onOpenAttendance) onOpenAttendance(); }}>
                                <span className="settings-item-left">
                                    <span className="settings-item-icon">📅</span>출석체크
                                </span>
                                <span className="settings-item-arrow">›</span>
                            </button>
                            <button type="button" className="settings-item" onClick={() => { }}>
                                <span className="settings-item-left">
                                    <span className="settings-item-icon">👥</span>친구
                                </span>
                                <span className="settings-item-arrow" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>준비 중</span>
                            </button>
                            <button type="button" className="settings-item" onClick={() => { }}>
                                <span className="settings-item-left">
                                    <span className="settings-item-icon">📖</span>도감
                                </span>
                                <span className="settings-item-arrow" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>준비 중</span>
                            </button>
                        </div>

                        <div className="settings-divider" />

                        {/* 로그아웃 */}
                        <div className="settings-section">
                            <button type="button" className="settings-item settings-item--logout" onClick={() => { closePanel(); onLogout(); }}>
                                <span className="settings-item-left">
                                    <span className="settings-item-icon">🚪</span>로그아웃
                                </span>
                            </button>
                        </div>

                        <div className="settings-divider" />

                        {/* 개발자 도구 */}
                        <div className="settings-dev-section">
                            <div className="settings-dev-label">🔧 개발자 도구</div>
                            <div className="settings-dev-buttons">
                                <button type="button" className="settings-dev-btn" onClick={() => { closePanel(); onResetSlots(); }}>초기화</button>
                                <button type="button" className="settings-dev-btn" onClick={() => { closePanel(); onDeleteAllSlots(); }}>알 삭제</button>
                                <button type="button" className="settings-dev-btn" onClick={() => { if (onAddGold) onAddGold(1000); }}>루나 +1000</button>
                            </div>
                            <div className="settings-dev-buttons" style={{ marginTop: '0.25rem' }}>
                                <button type="button" className="settings-dev-btn" onClick={() => { closePanel(); if (onResetIncubator) onResetIncubator(); }}>부화장치 초기화</button>
                            </div>
                            <div className="settings-dev-buttons" style={{ marginTop: '0.25rem' }}>
                                <button type="button" className="settings-dev-btn" onClick={() => { if (onAdjustHatch) onAdjustHatch(-1); }}>부화 -1h</button>
                                <button type="button" className="settings-dev-btn" onClick={() => { if (onAdjustHatch) onAdjustHatch(1); }}>부화 +1h</button>
                                <button type="button" className="settings-dev-btn" onClick={() => { if (onAdjustHatch) onAdjustHatch(3); }}>부화 +3h</button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── 닉네임 변경 모달 ── */}
            {nicknameModalOpen && (
                <div className="nickname-modal-overlay" onClick={() => setNicknameModalOpen(false)}>
                    <div className="nickname-modal" onClick={e => e.stopPropagation()}>
                        <h3>닉네임 변경</h3>
                        <input
                            type="text"
                            className="nickname-modal-input"
                            value={nicknameInput}
                            onChange={e => setNicknameInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleNicknameSave()}
                            placeholder="새 닉네임 (2~12자)"
                            maxLength={12}
                            autoFocus
                        />
                        {nicknameError && <div className="nickname-modal-error">{nicknameError}</div>}
                        <div className="nickname-modal-buttons">
                            <button type="button" className="nickname-modal-btn nickname-modal-btn--cancel" onClick={() => setNicknameModalOpen(false)}>취소</button>
                            <button type="button" className="nickname-modal-btn nickname-modal-btn--save" onClick={handleNicknameSave} disabled={nicknameSaving}>
                                {nicknameSaving ? '저장 중...' : '저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default SettingsPanel
