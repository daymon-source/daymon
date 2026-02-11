import { BADGES, BADGE_CATEGORIES, BADGE_TIERS } from '../constants/badges'
import './BadgeModal.css'

function BadgeModal({ isOpen, onClose, unlockedBadgeIds = [] }) {
    if (!isOpen) return null

    const unlockedSet = new Set(unlockedBadgeIds)
    const unlockedCount = unlockedBadgeIds.length
    const totalCount = BADGES.length

    // 카테고리 순서대로 뱃지 그룹화
    const categoryOrder = Object.keys(BADGE_CATEGORIES)
    const grouped = categoryOrder
        .map(catKey => ({
            key: catKey,
            ...BADGE_CATEGORIES[catKey],
            badges: BADGES.filter(b => b.category === catKey),
        }))
        .filter(g => g.badges.length > 0)

    return (
        <div className="badge-overlay" onClick={onClose}>
            <div className="badge-modal" onClick={e => e.stopPropagation()}>
                <h3 className="badge-title">🏆 업적</h3>
                <p className="badge-subtitle">모험의 기록을 확인하세요</p>

                <div className="badge-scroll">
                    {grouped.map(group => (
                        <div key={group.key} className="badge-category">
                            <div className="badge-category-header">
                                <span className="badge-category-icon">{group.icon}</span>
                                <span className="badge-category-label">{group.label}</span>
                            </div>
                            <div className="badge-grid">
                                {group.badges.map(badge => {
                                    const isUnlocked = unlockedSet.has(badge.id)
                                    const tierInfo = BADGE_TIERS[badge.tier]
                                    return (
                                        <div
                                            key={badge.id}
                                            className={`badge-item ${isUnlocked ? 'badge-item--unlocked' : 'badge-item--locked'}`}
                                            style={isUnlocked ? { '--tier-color': tierInfo.color } : undefined}
                                            title={`${badge.name}\n${badge.desc}`}
                                        >
                                            <div className="badge-item-icon">
                                                {isUnlocked ? badge.icon : '🔒'}
                                            </div>
                                            <div className="badge-item-name">{badge.name}</div>
                                            <div className="badge-item-desc">{badge.desc}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="badge-progress">
                    {unlockedCount} / {totalCount} 업적 달성
                </div>

                <button type="button" className="badge-close-btn" onClick={onClose}>
                    닫기
                </button>
            </div>
        </div>
    )
}

export default BadgeModal
