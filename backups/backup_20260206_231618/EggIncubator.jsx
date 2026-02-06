import { useState } from 'react'
import { getEggImage } from '../constants/eggs'
import GaugeBar from './GaugeBar'
import './EggIncubator.css'

const HATCH_MAX = 24 // 부화 게이지 총 24칸
const INCUBATOR_LOCKED_FROM = 3 // 3번, 4번 부화장치는 잠금

function EggIncubator({ incubatorEggs, currentIndex, affection, gaugeProgress, remainingMs }) {
    // incubatorEggs: 5개 부화장치 알 배열
    // currentIndex: 현재 보이는 부화장치 인덱스 (0~4)
    // affection: 현재 부화 게이지 값 (0~24)
    // gaugeProgress: 현재 1시간 구간 내 진행률 (0~1)
    // remainingMs: 부화까지 남은 시간 (ms)

    const [shaking, setShaking] = useState(false)

    const currentEgg = incubatorEggs[currentIndex]
    const isLocked = currentIndex >= INCUBATOR_LOCKED_FROM

    // 남은 ms → "HH:MM" (예: 23:59, 01:10)
    const formatRemainingTime = (ms) => {
        const totalSec = Math.max(0, Math.floor(ms / 1000))
        const h = Math.floor(totalSec / 3600)
        const m = Math.floor((totalSec % 3600) / 60)
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    // 알 클릭/터치 시 흔들림
    const handleEggClick = () => {
        if (!currentEgg || isLocked) return
        setShaking(true)
        setTimeout(() => setShaking(false), 500)
    }

    return (
        <div className="incubator-container">
            <div className="incubator-display">
                {isLocked ? (
                    <div className="incubator-locked">
                        <span className="incubator-lock-icon">🔒</span>
                        <p>잠긴 부화장치</p>
                    </div>
                ) : currentEgg && currentEgg.element ? (
                    <div className="incubator-egg-wrapper">
                        <img
                            src={getEggImage(currentEgg.element)}
                            alt="부화 중인 알"
                            className={`incubator-egg-img ${shaking ? 'incubator-egg-shake' : ''}`}
                            draggable={false}
                            onClick={handleEggClick}
                            onTouchStart={(e) => {
                                e.preventDefault()
                                handleEggClick()
                            }}
                        />
                        {/* 알 바로 아래 게이지 */}
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
                    </div>
                ) : (
                    <div className="incubator-empty">
                        <p>빈 부화장치</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default EggIncubator
