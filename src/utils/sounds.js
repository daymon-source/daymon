/**
 * 🔊 Daymon 사운드 시스템 (8-bit 레트로 스타일)
 * Web Audio API로 포켓몬/도트게임 스타일 효과음을 생성합니다.
 * BGM과 효과음(SFX) 볼륨을 독립적으로 조절할 수 있습니다.
 */

let audioContext = null

// 볼륨 설정 (0.0 ~ 1.0)
let sfxVolume = 0.7
let bgmVolume = 0.5
let sfxEnabled = true
let bgmEnabled = true // 기본 켜짐

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume()
    }
    return audioContext
}

// ── SFX 설정 ──
export function setSfxVolume(vol) {
    sfxVolume = Math.max(0, Math.min(1, vol))
}
export function getSfxVolume() { return sfxVolume }

export function setSfxEnabled(enabled) {
    sfxEnabled = enabled
}
export function isSfxEnabled() { return sfxEnabled }

// ── BGM 설정 ──
export function setBgmVolume(vol) {
    bgmVolume = Math.max(0, Math.min(1, vol))
    // TODO: 나중에 BGM AudioElement가 추가되면 여기서 volume 반영
}
export function getBgmVolume() { return bgmVolume }

export function setBgmEnabled(enabled) {
    bgmEnabled = enabled
    // TODO: 나중에 BGM play/pause 제어
}
export function isBgmEnabled() { return bgmEnabled }

// ── 헬퍼: 노트 재생 ──

function playNote({ frequency, duration = 0.08, volume = 0.08, type = 'square', startTime = 0 }) {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    // SFX 볼륨 적용
    const finalVol = volume * sfxVolume

    osc.type = type
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + startTime)
    gain.gain.setValueAtTime(finalVol, ctx.currentTime + startTime)
    gain.gain.setValueAtTime(finalVol, ctx.currentTime + startTime + duration * 0.7)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime + startTime)
    osc.stop(ctx.currentTime + startTime + duration)
}

// ── 효과음 모음 ──

/** 🔘 버튼 클릭 (찰칵 - 짧은 8비트 탭) */
export function playClick() {
    if (!sfxEnabled) return
    try {
        playNote({ frequency: 1568, duration: 0.04, volume: 0.06, type: 'square' })
    } catch (e) { /* 무시 */ }
}

/** 📋 메뉴 열기 (띠링~ 포켓몬 메뉴 스타일 2음 상승) */
export function playMenuOpen() {
    if (!sfxEnabled) return
    try {
        playNote({ frequency: 784, duration: 0.07, volume: 0.07, type: 'square', startTime: 0 })
        playNote({ frequency: 1047, duration: 0.1, volume: 0.07, type: 'square', startTime: 0.06 })
    } catch (e) { /* 무시 */ }
}

/** 📋 메뉴 닫기 (띠릭 - 2음 하강) */
export function playMenuClose() {
    if (!sfxEnabled) return
    try {
        playNote({ frequency: 1047, duration: 0.06, volume: 0.06, type: 'square', startTime: 0 })
        playNote({ frequency: 784, duration: 0.08, volume: 0.06, type: 'square', startTime: 0.05 })
    } catch (e) { /* 무시 */ }
}

/** 🔀 탭 전환 (틱 - 가벼운 전환음) */
export function playTabSwitch() {
    if (!sfxEnabled) return
    try {
        playNote({ frequency: 1175, duration: 0.05, volume: 0.05, type: 'square' })
    } catch (e) { /* 무시 */ }
}

/** ✅ 확인/수락 (삐빕 - 포켓몬 선택 확인음) */
export function playConfirm() {
    if (!sfxEnabled) return
    try {
        playNote({ frequency: 880, duration: 0.08, volume: 0.07, type: 'square', startTime: 0 })
        playNote({ frequency: 1175, duration: 0.12, volume: 0.07, type: 'square', startTime: 0.07 })
    } catch (e) { /* 무시 */ }
}

/** ❌ 취소/에러 (뿌웅 - 낮은 거부음) */
export function playCancel() {
    if (!sfxEnabled) return
    try {
        playNote({ frequency: 523, duration: 0.06, volume: 0.06, type: 'square', startTime: 0 })
        playNote({ frequency: 392, duration: 0.1, volume: 0.06, type: 'square', startTime: 0.05 })
    } catch (e) { /* 무시 */ }
}

/** 🎁 보상 획득 (띠리리링~ 도레미솔 상승 팡파르) */
export function playReward() {
    if (!sfxEnabled) return
    try {
        const notes = [523, 659, 784, 1047]
        notes.forEach((freq, i) => {
            playNote({ frequency: freq, duration: 0.12, volume: 0.07, type: 'square', startTime: i * 0.09 })
        })
    } catch (e) { /* 무시 */ }
}

/** 🥚 알 부화장치에 넣기 (통 - 부드러운 착지) */
export function playEggPlace() {
    if (!sfxEnabled) return
    try {
        playNote({ frequency: 698, duration: 0.06, volume: 0.06, type: 'triangle', startTime: 0 })
        playNote({ frequency: 523, duration: 0.1, volume: 0.07, type: 'triangle', startTime: 0.05 })
    } catch (e) { /* 무시 */ }
}

/** 🐣 부화 완료! (팡파르 - 축하 멜로디) */
export function playHatch() {
    if (!sfxEnabled) return
    try {
        const notes = [784, 988, 1175, 1568]
        notes.forEach((freq, i) => {
            playNote({ frequency: freq, duration: 0.15, volume: 0.08, type: 'square', startTime: i * 0.12 })
        })
        playNote({ frequency: 2093, duration: 0.25, volume: 0.06, type: 'square', startTime: 0.48 })
    } catch (e) { /* 무시 */ }
}

/** ◀▶ 부화장치 슬롯 전환 (틱) */
export function playSwipe() {
    if (!sfxEnabled) return
    try {
        playNote({ frequency: 1319, duration: 0.03, volume: 0.04, type: 'square' })
    } catch (e) { /* 무시 */ }
}

/** 🍖 간식주기 / 놀아주기 */
export function playCare() {
    if (!sfxEnabled) return
    try {
        playNote({ frequency: 784, duration: 0.06, volume: 0.06, type: 'triangle', startTime: 0 })
        playNote({ frequency: 988, duration: 0.08, volume: 0.06, type: 'triangle', startTime: 0.05 })
    } catch (e) { /* 무시 */ }
}

/** 💰 구매/결제 (찰칵찰칵 - 동전음) */
export function playPurchase() {
    if (!sfxEnabled) return
    try {
        playNote({ frequency: 1397, duration: 0.05, volume: 0.06, type: 'square', startTime: 0 })
        playNote({ frequency: 1760, duration: 0.05, volume: 0.06, type: 'square', startTime: 0.06 })
        playNote({ frequency: 2093, duration: 0.1, volume: 0.07, type: 'square', startTime: 0.12 })
    } catch (e) { /* 무시 */ }
}
