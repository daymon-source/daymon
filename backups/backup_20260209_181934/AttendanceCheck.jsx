import { useState, useEffect } from 'react'
import './AttendanceCheck.css'

const DAY_REWARDS = [100, 100, 150, 150, 200, 200, 500] // Day 1~7 루나 보상

function AttendanceCheck({ isOpen, onClose, onClaimReward, attendanceData }) {
    const [stampingDay, setStampingDay] = useState(null)
    const [stamped, setStamped] = useState(false)
    const [particles, setParticles] = useState([])
    const [showReward, setShowReward] = useState(false)

    // 오늘 날짜
    const todayDate = new Date().toISOString().slice(0, 10)

    // 오늘 아직 안 받았을 때만 받기 가능 (하루 1회)
    const canClaim = attendanceData
        && attendanceData.currentDay < 7
        && attendanceData.lastClaimDate !== todayDate

    const handleStamp = () => {
        if (!canClaim || stampingDay !== null) return
        const day = attendanceData.currentDay
        setStampingDay(day)

        const newParticles = Array.from({ length: 14 }, (_, i) => ({
            id: Date.now() + i,
            angle: (360 / 14) * i + Math.random() * 20 - 10,
            distance: 35 + Math.random() * 35,
            size: 4 + Math.random() * 6,
            emoji: ['✨', '⭐', '🌟', '💫', '🌙'][Math.floor(Math.random() * 5)],
        }))
        setParticles(newParticles)

        setTimeout(() => {
            setStamped(true)
            setShowReward(true)
            if (onClaimReward) {
                onClaimReward(day, DAY_REWARDS[day])
            }
        }, 400)

        setTimeout(() => setParticles([]), 1200)
        setTimeout(() => setShowReward(false), 3000)
    }

    useEffect(() => {
        if (isOpen) {
            setStampingDay(null)
            setStamped(false)
            setParticles([])
            setShowReward(false)
        }
    }, [isOpen])

    if (!isOpen) return null

    const claimedDays = attendanceData?.claimedDays || Array(7).fill(false)

    return (
        <div className="attendance-overlay" onClick={onClose}>
            <div className="attendance-modal" onClick={e => e.stopPropagation()}>
                <h3 className="attendance-title">📅 출석체크</h3>
                <p className="attendance-subtitle">매일 접속하여 루나를 받으세요!</p>

                <div className="attendance-grid">
                    {DAY_REWARDS.map((reward, i) => {
                        const isClaimed = claimedDays[i]
                        const isToday = i === attendanceData?.currentDay && !stamped && canClaim
                        const isStamping = stampingDay === i
                        const justStamped = stamped && stampingDay === i
                        const isBonusDay = i === 6
                        const isFuture = !isClaimed && !isToday && !(stamped && stampingDay === i)

                        return (
                            <div
                                key={i}
                                className={[
                                    'attendance-day',
                                    (isClaimed || justStamped) && 'attendance-day--claimed',
                                    isToday && 'attendance-day--today',
                                    isBonusDay && 'attendance-day--bonus',
                                    isStamping && !stamped && 'attendance-day--stamping',
                                    isFuture && !isClaimed && 'attendance-day--future',
                                ].filter(Boolean).join(' ')}
                                onClick={isToday ? handleStamp : undefined}
                            >
                                {/* 수령 완료 상태 */}
                                {(isClaimed || justStamped) ? (
                                    <div className={`attendance-claimed-content ${justStamped ? 'attendance-claimed--animate' : ''}`}>
                                        <div className="attendance-stamp-seal">
                                            <span className="attendance-stamp-moon">🌙</span>
                                        </div>
                                        <span className="attendance-claimed-label">수령 완료</span>
                                    </div>
                                ) : (
                                    <>
                                        <span className="attendance-day-label">
                                            {isBonusDay ? '🎁 Day 7' : `Day ${i + 1}`}
                                        </span>
                                        <div className="attendance-day-reward">
                                            <span className="attendance-day-icon">🌙</span>
                                            <span className="attendance-day-amount">{reward.toLocaleString()}</span>
                                        </div>

                                        {isToday && (
                                            <div className="attendance-claim-btn">받기</div>
                                        )}
                                    </>
                                )}

                                {/* 파티클 */}
                                {isStamping && particles.map(p => (
                                    <span
                                        key={p.id}
                                        className="attendance-particle"
                                        style={{
                                            '--angle': `${p.angle}deg`,
                                            '--distance': `${p.distance}px`,
                                            '--size': `${p.size}px`,
                                        }}
                                    >
                                        {p.emoji}
                                    </span>
                                ))}
                            </div>
                        )
                    })}
                </div>

                <button type="button" className="attendance-close-btn" onClick={onClose}>
                    닫기
                </button>
            </div>

            {/* 보상 획득 토스트 (모달 밖 — 떠다님) */}
            {showReward && stampingDay !== null && (
                <div className="attendance-reward-toast">
                    <span className="attendance-reward-toast-icon">🌙</span>
                    <span className="attendance-reward-toast-text">
                        +{DAY_REWARDS[stampingDay]} 루나 획득!
                    </span>
                </div>
            )}
        </div>
    )
}

export default AttendanceCheck
