import { useState, useRef, useEffect } from 'react'
import { getEggImage } from '../constants/eggs'
import GaugeBar from './GaugeBar'
import './EggIncubator.css'

const HATCH_MAX = 24 // 부화 게이지 총 24칸
const HATCH_EGG2_AT = 19 // 19칸부터 알 깨짐 효과 시작
const INCUBATOR_LOCKED_FROM = 3 // 3번, 4번 부화장치는 잠금

function EggIncubator({ incubatorEggs, currentIndex, affection, gaugeProgress, remainingMs }) {
    // incubatorEggs: 5개 부화장치 알 배열
    // currentIndex: 현재 보이는 부화장치 인덱스 (0~4)
    // affection: 현재 부화 게이지 값 (0~24)
    // gaugeProgress: 현재 1시간 구간 내 진행률 (0~1)
    // remainingMs: 부화까지 남은 시간 (ms)

    const [shaking, setShaking] = useState(false)
    const [rotationAngle, setRotationAngle] = useState(0) // 누적 회전 각도
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
        console.log('Egg:', egg, 'isLocked:', isLocked)
        if (!egg || isLocked) {
            console.log('❌ No egg or locked')
            return
        }
        console.log('✅ Setting shaking to TRUE!')
        setShaking(true)
        setTimeout(() => {
            console.log('⏰ Setting shaking to FALSE')
            setShaking(false)
        }, 500)
    }

    // shaking state 변화 감지
    useEffect(() => {
        console.log('🔄 Shaking state changed:', shaking)
    }, [shaking])

    // 5개 부화장치를 원형으로 배치하기 위한 각도 계산
    const anglePerSlot = 360 / 5 // 72도씩

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
                                ) : egg && egg.element ? (
                                    <div className="incubator-egg-wrapper">
                                        <div
                                            className={`incubator-egg-container ${isCurrent && affection >= HATCH_MAX ? 'incubator-egg--ready' : ''}`}
                                            onClick={() => handleEggClick(index)}
                                            onTouchStart={(e) => {
                                                e.preventDefault()
                                                handleEggClick(index)
                                            }}
                                        >
                                            <img
                                                src={getEggImage(egg.element)}
                                                alt="부화 중인 알"
                                                className={`incubator-egg-img ${isCurrent && shaking ? 'incubator-egg-shake' : ''}`}
                                                draggable={false}
                                            />
                                        </div>
                                        {/* 게이지는 현재 보이는 알만 표시 */}
                                        {isCurrent && (
                                            <div className="incubator-gauge-wrapper">
                                                <div className="incubator-gauge">
                                                    <GaugeBar
                                                        label=""
                                                        value={Math.min(HATCH_MAX, affection + gaugeProgress)}
                                                        maxValue={HATCH_MAX}
                                                        color="affection"
                                                    />
                                                </div>
                                                {/* 게이지 바로 아래 남은 시간 */}
                                                <div className="incubator-time">
                                                    {affection >= HATCH_MAX ? '00:00' : formatRemainingTime(remainingMs)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
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
