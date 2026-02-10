import { useState, useRef, useEffect } from 'react'
import { getEggImage, getEggConfig } from '../constants/eggs'
import { playClick, playPurchase, playCancel } from '../utils/sounds'
import magicCircleImg from '../assets/magic-circle.png'
import './EggIncubator.css'

const INCUBATOR_LOCKED_FROM = 3 // 3번, 4번 부화장치는 잠금
const UNLOCK_COST = 10000

function EggIncubator({ incubatorEggs, currentIndex, affection, hatchMax, crackAt, gaugeProgress, remainingMs, gold, onUnlockIncubator, unlockedSlots }) {
    const [shaking, setShaking] = useState(false)
    const [confirmUnlock, setConfirmUnlock] = useState(false) // 수리 확인 모달
    const anglePerSlot = 360 / 5
    const [rotationAngle, setRotationAngle] = useState(() => -currentIndex * anglePerSlot)
    const prevIndexRef = useRef(currentIndex)
    const [gaugeFillProgress, setGaugeFillProgress] = useState(0) // 필인 애니메이션용
    const fillTimerRef = useRef(null)

    const currentEgg = incubatorEggs[currentIndex]

    useEffect(() => {
        const prevIndex = prevIndexRef.current
        const anglePerSlot = 360 / 5
        let diff = currentIndex - prevIndex
        if (diff > 2) diff -= 5
        else if (diff < -2) diff += 5
        setRotationAngle(prev => prev - diff * anglePerSlot)
        prevIndexRef.current = currentIndex

        // 게이지 필인 애니메이션: 0으로 리셋 후 캐러셀 회전 끝나면 채움
        setGaugeFillProgress(0)
        if (fillTimerRef.current) cancelAnimationFrame(fillTimerRef.current)
        // 다음 프레임에서 0이 확실히 렌더된 후, 캐러셀 회전(0.6s) 후 필인
        fillTimerRef.current = requestAnimationFrame(() => {
            setTimeout(() => setGaugeFillProgress(1), 650)
        })
    }, [currentIndex])

    // 처음 마운트 시에도 필인 실행
    useEffect(() => {
        const t = setTimeout(() => setGaugeFillProgress(1), 400)
        return () => clearTimeout(t)
    }, [])

    // 잠금 여부 판단 (unlockedSlots prop 활용)
    const isSlotLocked = (index) => {
        if (index < INCUBATOR_LOCKED_FROM) return false
        if (unlockedSlots && unlockedSlots.includes(index)) return false
        return true
    }

    const formatRemainingTime = (ms) => {
        const totalSec = Math.max(0, Math.floor(ms / 1000))
        const h = Math.floor(totalSec / 3600)
        const m = Math.floor((totalSec % 3600) / 60)
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    const handleEggClick = (index) => {
        if (index !== currentIndex) return
        const egg = incubatorEggs[index]
        if (!egg || !egg.element || isSlotLocked(index)) return
        if (shaking) return
        setShaking(true)
        setTimeout(() => setShaking(false), 800)
    }

    const handleUnlockClick = () => {
        playClick()
        setConfirmUnlock(true)
    }

    const handleConfirmYes = () => {
        playPurchase()
        setConfirmUnlock(false)
        if (onUnlockIncubator) {
            onUnlockIncubator(currentIndex, UNLOCK_COST)
        }
    }

    const handleConfirmNo = () => {
        playCancel()
        setConfirmUnlock(false)
    }

    const getEggState = (egg) => {
        if (!egg || !egg.element) return { isCracked: false, isReady: false, eggAffection: 0 }
        const eggConfig = getEggConfig(egg.element)
        const eggHatchMax = eggConfig?.hatchHours || 24
        const eggCrackAt = eggConfig?.crackAtHours || 19
        let eggAffection = 0
        if (egg.hatching_started_at) {
            const elapsed = Date.now() - egg.hatching_started_at
            const totalRequired = eggHatchMax * 3600000
            eggAffection = Math.min(eggHatchMax, Math.max(0, (elapsed / totalRequired) * eggHatchMax))
        }
        return {
            isCracked: eggAffection >= eggCrackAt,
            isReady: eggAffection >= eggHatchMax,
            eggAffection,
        }
    }

    return (
        <>
            <div className="incubator-container">
                <div className="incubator-carousel" style={{ transform: `rotateY(${rotationAngle}deg)` }}>
                    {incubatorEggs.map((egg, index) => {
                        const locked = isSlotLocked(index)
                        const isCurrent = index === currentIndex
                        const slotAngle = index * anglePerSlot
                        // 수리된 슬롯인지 (원래 잠겼지만 해금된 슬롯)
                        const isRepaired = index >= INCUBATOR_LOCKED_FROM && !locked

                        return (
                            <div
                                key={index}
                                className={`incubator-slot ${isCurrent ? 'incubator-slot--current' : ''}`}
                                style={{ transform: `rotateY(${slotAngle}deg) translateZ(320px)` }}
                            >
                                <div className="incubator-display">
                                    {locked ? (
                                        <div className="incubator-locked-wrapper">
                                            {/* 회색 마법진 */}
                                            <img src={magicCircleImg} alt="" className="incubator-magic-circle incubator-magic-circle--locked" draggable={false} />
                                            {/* 수리 버튼 (현재 슬롯만, 모달이 안 열린 상태만) */}
                                            {isCurrent && !confirmUnlock && (
                                                <button
                                                    className="incubator-unlock-btn"
                                                    onClick={handleUnlockClick}
                                                    type="button"
                                                >
                                                    🔧 수리하기
                                                </button>
                                            )}
                                        </div>
                                    ) : egg && egg.element ? (() => {
                                        const { isCracked, isReady } = getEggState(egg)
                                        const eggConfig = getEggConfig(egg.element)
                                        return (
                                            <div className="incubator-egg-wrapper">
                                                {/* 마법진 이미지 */}
                                                <img src={magicCircleImg} alt="" className="incubator-magic-circle" draggable={false} />
                                                {/* 에너지 파티클 */}
                                                <div className="incubator-particles" aria-hidden="true">
                                                    {[...Array(6)].map((_, i) => (
                                                        <span key={i} className="incubator-particle" style={{ '--i': i }} />
                                                    ))}
                                                </div>
                                                {/* 오라 */}
                                                <div className="incubator-aura" />
                                                {/* 바닥 그림자 (float와 독립) */}
                                                <div className="incubator-ground-shadow" aria-hidden="true" />
                                                <div
                                                    className={`incubator-egg-container incubator-egg-float ${isReady ? 'incubator-egg--ready' :
                                                        isCracked ? 'incubator-egg--cracking' : ''
                                                        } ${isCurrent && shaking ? 'incubator-egg-shake' : ''}`}
                                                    onClick={() => handleEggClick(index)}
                                                    onTouchStart={(e) => {
                                                        e.preventDefault()
                                                        handleEggClick(index)
                                                    }}
                                                >
                                                    <img
                                                        src={
                                                            isCracked
                                                                ? eggConfig.images.cracked || getEggImage(egg.element)
                                                                : getEggImage(egg.element)
                                                        }
                                                        alt="부화 중인 알"
                                                        className="incubator-egg-img"
                                                        draggable={false}
                                                    />
                                                </div>

                                            </div>
                                        )
                                    })() : (
                                        <div className="incubator-empty">
                                            {/* 빈 부화장치: 수리된 슬롯은 밝은 흰색, 일반 빈 슬롯은 흐리게 */}
                                            <img src={magicCircleImg} alt="" className={`incubator-magic-circle ${isRepaired ? 'incubator-magic-circle--repaired' : 'incubator-magic-circle--empty'}`} draggable={false} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* ── 돌 제단 위 타원형 게이지 (container 내부 absolute) ── */}
                {(() => {
                    const currentEgg = incubatorEggs[currentIndex]
                    const hasEgg = currentEgg && currentEgg.element && currentEgg.hatching_started_at
                    if (!hasEgg) return null
                    const progress = Math.min(1, (affection + gaugeProgress) / hatchMax)
                    const displayProgress = progress * gaugeFillProgress
                    return (
                        <div className="incubator-pedestal-gauge">
                            <svg viewBox="0 0 380 100" className="incubator-pedestal-svg">
                                {/* 배경 트랙 */}
                                <path
                                    d="M 190 88 A 170 38 0 1 1 189.99 88"
                                    fill="none"
                                    stroke="rgba(255,220,100,0.15)"
                                    strokeWidth="5"
                                    pathLength="100"
                                />
                                {/* 진행도: 6시에서 시계방향 */}
                                <path
                                    d="M 190 88 A 170 38 0 1 1 189.99 88"
                                    fill="none"
                                    stroke="url(#pedestalGradient)"
                                    strokeWidth="5"
                                    strokeLinecap="round"
                                    pathLength="100"
                                    strokeDasharray="100"
                                    strokeDashoffset={100 - (displayProgress * 100)}
                                    className="incubator-gauge-ring"
                                />
                                <defs>
                                    <linearGradient id="pedestalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="rgba(255,220,80,0.9)" />
                                        <stop offset="50%" stopColor="rgba(255,200,50,1)" />
                                        <stop offset="100%" stopColor="rgba(255,180,30,0.9)" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="incubator-pedestal-time">
                                {affection >= hatchMax ? '✨ 부화 준비 완료!' : formatRemainingTime(remainingMs)}
                            </div>
                        </div>
                    )
                })()}
            </div>

            {/* ── 수리 확인 모달 (풀스크린 오버레이) ── */}
            {confirmUnlock && (
                <div className="incubator-unlock-overlay" onClick={handleConfirmNo}>
                    <div className="incubator-unlock-modal" onClick={e => e.stopPropagation()}>
                        <h3 className="incubator-unlock-title">부화장치를 수리하시겠습니까?</h3>
                        <p className="incubator-unlock-cost">
                            <span className="incubator-unlock-coin">🌙</span>
                            {UNLOCK_COST}
                        </p>
                        {(gold ?? 0) < UNLOCK_COST && (
                            <p className="incubator-unlock-insufficient">루나가 부족합니다</p>
                        )}
                        <div className="incubator-unlock-buttons">
                            <button
                                className={`incubator-unlock-btn-cancel`}
                                onClick={handleConfirmNo}
                                type="button"
                            >
                                취소
                            </button>
                            <button
                                className={`incubator-unlock-btn-confirm ${(gold ?? 0) < UNLOCK_COST ? 'incubator-unlock-btn--disabled' : ''}`}
                                onClick={handleConfirmYes}
                                disabled={(gold ?? 0) < UNLOCK_COST}
                                type="button"
                            >
                                수리
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default EggIncubator

