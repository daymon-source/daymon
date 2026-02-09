import { useState, useRef, useEffect } from 'react'
import { getEggImage, getEggConfig } from '../constants/eggs'
import { playClick, playPurchase, playCancel } from '../utils/sounds'
import GaugeBar from './GaugeBar'
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

    const currentEgg = incubatorEggs[currentIndex]

    useEffect(() => {
        const prevIndex = prevIndexRef.current
        const anglePerSlot = 360 / 5
        let diff = currentIndex - prevIndex
        if (diff > 2) diff -= 5
        else if (diff < -2) diff += 5
        setRotationAngle(prev => prev - diff * anglePerSlot)
        prevIndexRef.current = currentIndex
    }, [currentIndex])

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
                                                {isCurrent && (
                                                    <div className="incubator-gauge-wrapper">
                                                        <div className="incubator-gauge">
                                                            <GaugeBar
                                                                label=""
                                                                value={Math.min(hatchMax, affection + gaugeProgress)}
                                                                maxValue={hatchMax}
                                                                color="affection"
                                                            />
                                                        </div>
                                                        <div className="incubator-time">
                                                            {affection >= hatchMax ? '00:00' : formatRemainingTime(remainingMs)}
                                                        </div>
                                                    </div>
                                                )}
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

