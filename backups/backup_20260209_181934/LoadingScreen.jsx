import { useState, useEffect, useCallback } from 'react'
import './LoadingScreen.css'

// 프리로드할 이미지 목록을 받아서 모두 로드
function preloadImages(urls, onProgress) {
    let loaded = 0
    const total = urls.length
    if (total === 0) {
        onProgress(1)
        return Promise.resolve()
    }

    return new Promise((resolve) => {
        urls.forEach((url) => {
            const img = new Image()
            img.onload = img.onerror = () => {
                loaded++
                onProgress(loaded / total)
                if (loaded >= total) resolve()
            }
            img.src = url
        })
    })
}

/**
 * LoadingScreen — 에셋 프리로드 + 프로그레스 바
 *
 * Props:
 *   imageUrls: string[] — 프리로드할 이미지 URL 배열
 *   minDurationMs: number — 최소 로딩 시간 (ms, 너무 빨리 지나가면 어색하니까)
 *   onComplete: () => void — 로딩 완료 (fade-out 후) 콜백
 */
function LoadingScreen({ imageUrls = [], minDurationMs = 1500, onComplete }) {
    const [progress, setProgress] = useState(0)
    const [assetsLoaded, setAssetsLoaded] = useState(false)
    const [minTimePassed, setMinTimePassed] = useState(false)
    const [fadingOut, setFadingOut] = useState(false)
    const [hidden, setHidden] = useState(false)

    // 이미지 프리로드
    useEffect(() => {
        preloadImages(imageUrls, (p) => {
            setProgress(p)
        }).then(() => {
            setAssetsLoaded(true)
        })
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // 최소 로딩 시간
    useEffect(() => {
        const timer = setTimeout(() => setMinTimePassed(true), minDurationMs)
        return () => clearTimeout(timer)
    }, [minDurationMs])

    // 둘 다 완료 시 fade-out 시작
    useEffect(() => {
        if (assetsLoaded && minTimePassed && !fadingOut) {
            setFadingOut(true)
            setTimeout(() => {
                setHidden(true)
                onComplete?.()
            }, 600) // fade-out 트랜지션 시간
        }
    }, [assetsLoaded, minTimePassed, fadingOut, onComplete])

    if (hidden) return null

    const statusText = assetsLoaded ? '준비 완료!' : '에셋 불러오는 중'

    return (
        <div className={`loading-screen ${fadingOut ? 'loading-screen--fade-out' : ''}`}>
            <div className="loading-logo">
                <div className="loading-egg">🥚</div>
                <div className="loading-title">DAYMON</div>
            </div>

            <div className="loading-progress-wrapper">
                <div className="loading-progress-track">
                    <div
                        className="loading-progress-fill"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                </div>
                <div className="loading-progress-text">
                    {statusText}
                    {!assetsLoaded && (
                        <span className="loading-dots">
                            <span className="loading-dot" />
                            <span className="loading-dot" />
                            <span className="loading-dot" />
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

export default LoadingScreen
