import { useState, useRef, useEffect } from 'react'
import { getEggImage, getEggConfig } from '../constants/eggs'
import GaugeBar from './GaugeBar'
import './EggIncubator.css'

const INCUBATOR_LOCKED_FROM = 3 // 3번, 4번 부화장치는 잠금

function EggIncubator({ incubatorEggs, currentIndex, affection, hatchMax, crackAt, gaugeProgress, remainingMs }) {
    // incubatorEggs: 5개 부화장치 알 배열
    // currentIndex: 현재 보이는 부화장치 인덱스 (0~4)
    // affection: 현재 부화 게이지 값 (0~hatchMax)
    // hatchMax: 알별 부화 총 시간 (예: 24, 36)
    // crackAt: 알별 금 가기 시작 시간 (예: 19, 26)
    // gaugeProgress: 현재 1시간 구간 내 진행률 (0~1)
    // remainingMs: 부화까지 남은 시간 (ms)

    const [shaking, setShaking] = useState(false)
    const anglePerSlot = 360 / 5 // 72도씩
    const [rotationAngle, setRotationAngle] = useState(() => -currentIndex * anglePerSlot) // 마운트 시 currentIndex에 맞게 초기화
    const prevIndexRef = useRef(currentIndex) // 이전 인덱스 추적

    const currentEgg = incubatorEggs[currentIndex]

    // currentIndex 변화 감지하여 회전 각도 계산
    useEffect(() => {
        const prevIndex = prevIndexRef.current
        const anglePerSlot = 360 / 5 // 72도

        // 인덱스 차이 계산
        let diff = currentIndex - prevIndex

        // 최단 경로로 회전하도록 조정
        if (diff > 2) {
            diff -= 5 // 예: 0→4는 +4가 아니라 -1
        } else if (diff < -2) {
            diff += 5 // 예: 4→0은 -4가 아니라 +1
        }

        // 누적 회전 각도 업데이트
        setRotationAngle(prev => prev - diff * anglePerSlot)
        prevIndexRef.current = currentIndex
    }, [currentIndex])

    // 남은 ms → "HH:MM" (예: 23:59, 01:10)
    const formatRemainingTime = (ms) => {
        const totalSec = Math.max(0, Math.floor(ms / 1000))
        const h = Math.floor(totalSec / 3600)
        const m = Math.floor((totalSec % 3600) / 60)
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    // 알 클릭/터치 시 흔들림 (현재 보이는 알만)
    const handleEggClick = (index) => {
        console.log('🥚 Egg clicked:', index, 'currentIndex:', currentIndex, 'shaking:', shaking)
        if (index !== currentIndex) {
            console.log('❌ Not current egg')
            return // 현재 보이는 알만 클릭 가능
        }
        const egg = incubatorEggs[index]
        const isLocked = index >= INCUBATOR_LOCKED_FROM
        console.log('  egg:', egg, 'element:', egg?.element, 'hatching_started_at:', egg?.hatching_started_at, 'isLocked:', isLocked)
        if (!egg || !egg.element || isLocked) return
        if (shaking) return

        console.log('✅ Setting shaking to TRUE!')
        setShaking(true)
        setTimeout(() => {
            console.log('⛔ Setting shaking to FALSE')
            setShaking(false)
        }, 800)
    }

    // 각 알의 개별 상태 계산 함수
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
        <div className="incubator-container">
            <div className="incubator-carousel" style={{ transform: `rotateY(${rotationAngle}deg)` }}>
                {incubatorEggs.map((egg, index) => {
                    const isLocked = index >= INCUBATOR_LOCKED_FROM
                    const isCurrent = index === currentIndex
                    const slotAngle = index * anglePerSlot

                    return (
                        <div
                            key={index}
                            className={`incubator-slot ${isCurrent ? 'incubator-slot--current' : ''}`}
                            style={{ transform: `rotateY(${slotAngle}deg) translateZ(320px)` }}
                        >
                            <div className="incubator-display">
                                {isLocked ? (
                                    <div className="incubator-locked">
                                        <span className="incubator-lock-icon">🔒</span>
                                        <p>잠긴 부화장치</p>
                                    </div>
                                ) : egg && egg.element ? (() => {
                                    const { isCracked, isReady } = getEggState(egg)
                                    const eggConfig = getEggConfig(egg.element)
                                    return (
                                        <div className="incubator-egg-wrapper">
                                            {/* 마법진 회전 */}
                                            <div className="incubator-magic-circle" />
                                            {/* 에너지 파티클 */}
                                            <div className="incubator-particles" aria-hidden="true">
                                                {[...Array(6)].map((_, i) => (
                                                    <span key={i} className="incubator-particle" style={{ '--i': i }} />
                                                ))}
                                            </div>
                                            {/* 오라 */}
                                            <div className="incubator-aura" />
                                            {/* 알 아래 빛 그림자 */}
                                            <div className="incubator-egg-shadow" />
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
                                            {/* 게이지는 현재 보이는 알만 표시 */}
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
                                                    {/* 게이지 바로 아래 남은 시간 */}
                                                    <div className="incubator-time">
                                                        {affection >= hatchMax ? '00:00' : formatRemainingTime(remainingMs)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })() : (
                                    <div className="incubator-empty">
                                        <p>빈 부화장치</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default EggIncubator
