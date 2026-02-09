/**
 * 🎵 Daymon BGM 시스템 (8-bit 칩튠)
 * Web Audio API로 탭별 다른 분위기의 루프 BGM을 재생합니다.
 * - egg: 몽환적이고 잔잔한 멜로디
 * - field: 밝고 활기찬 모험 느낌
 * - sanctuary: 따뜻하고 편안한 느낌
 */

import { getBgmVolume, isBgmEnabled } from './sounds'

let audioCtx = null
let currentTrack = null // 'egg' | 'field' | 'sanctuary'
let isPlaying = false
let schedulerTimer = null
let activeOscillators = []
let masterGain = null

function getCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (audioCtx.state === 'suspended') audioCtx.resume()
    return audioCtx
}

// ── 음표 주파수 테이블 ──
const NOTE = {
    '_': 0,    // 쉼표
    'C3': 130.81, 'D3': 146.83, 'Eb3': 155.56, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'Ab3': 207.65, 'A3': 220.00, 'Bb3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'Ab4': 415.30, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'Eb5': 622.25, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'Ab5': 830.61, 'A5': 880.00, 'Bb5': 932.33, 'B5': 987.77,
    'C6': 1046.50, 'D6': 1174.66, 'Eb6': 1244.51, 'E6': 1318.51,
}

// ── 트랙 정의 ──
// 각 트랙은 { bpm, melody, bass, arp } 로 구성
// melody/bass/arp 각각은 [음이름, 박자수] 쌍의 배열

const TRACKS = {
    // 🥚 알 탭: 신비롭고 반짝이는 느낌 (Eb major / 펜타토닉, ~98 BPM)
    egg: {
        bpm: 98,
        melody: {
            wave: 'square',
            volume: 0.04,
            notes: [
                // 프레이즈 1: 반짝이는 신비로운 도입
                ['Eb5', 1], ['G5', 0.5], ['Bb5', 0.5], ['G5', 1], ['Bb5', 1],
                ['C6', 1], ['Bb5', 0.5], ['G5', 0.5], ['Ab5', 1], ['_', 0.5],
                // 프레이즈 2: 밝은 상승
                ['Bb5', 1], ['C6', 0.5], ['Eb6', 0.5], ['C6', 1], ['Bb5', 0.5],
                ['Ab5', 0.5], ['G5', 1], ['Bb5', 1], ['_', 0.5],
                // 프레이즈 3: 살짝 신비로운 변주
                ['Eb5', 0.5], ['F5', 0.5], ['G5', 1], ['Bb5', 1], ['Ab5', 0.5],
                ['G5', 0.5], ['F5', 0.5], ['G5', 0.5], ['Eb5', 1], ['_', 0.5],
                // 프레이즈 4: 희망찬 마무리
                ['G5', 1], ['Ab5', 0.5], ['Bb5', 0.5], ['C6', 1],
                ['Bb5', 1], ['G5', 1], ['Eb5', 1.5], ['_', 0.5],
            ]
        },
        bass: {
            wave: 'triangle',
            volume: 0.055,
            notes: [
                ['Eb3', 2], ['Bb3', 2], ['Ab3', 2], ['Eb3', 2],
                ['Bb3', 2], ['C4', 2], ['Ab3', 2], ['Bb3', 2],
                ['Eb3', 2], ['G3', 2], ['Ab3', 2], ['Bb3', 2],
                ['Eb3', 2], ['Ab3', 2], ['Bb3', 2], ['Eb3', 2],
            ]
        },
        arp: {
            wave: 'square',
            volume: 0.018,
            notes: [
                ['Eb4', 0.5], ['G4', 0.5], ['Bb4', 0.5], ['G4', 0.5],
                ['Eb4', 0.5], ['G4', 0.5], ['Bb4', 0.5], ['Eb5', 0.5],
                ['Ab4', 0.5], ['C5', 0.5], ['Eb5', 0.5], ['C5', 0.5],
                ['Ab4', 0.5], ['Bb4', 0.5], ['Eb5', 0.5], ['Bb4', 0.5],
                ['Bb4', 0.5], ['D5', 0.5], ['F5', 0.5], ['D5', 0.5],
                ['Bb4', 0.5], ['Eb5', 0.5], ['G5', 0.5], ['Eb5', 0.5],
                ['Ab4', 0.5], ['C5', 0.5], ['Eb5', 0.5], ['C5', 0.5],
                ['Bb4', 0.5], ['D5', 0.5], ['F5', 0.5], ['D5', 0.5],
            ]
        }
    },

    // 🌿 필드 탭: 밝고 활기찬 모험 (C major, ~120 BPM)
    field: {
        bpm: 120,
        melody: {
            wave: 'square',
            volume: 0.04,
            notes: [
                // 프레이즈 1: 밝은 도입
                ['E5', 1], ['G5', 0.5], ['A5', 0.5], ['G5', 1], ['E5', 1],
                ['D5', 1], ['C5', 1], ['D5', 1], ['_', 1],
                // 프레이즈 2: 상승
                ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['G5', 1], ['A5', 1],
                ['G5', 1], ['E5', 1], ['D5', 1], ['_', 1],
                // 프레이즈 3: 클라이맥스
                ['A5', 1], ['B5', 0.5], ['C6', 0.5], ['B5', 1], ['A5', 1],
                ['G5', 1], ['E5', 1], ['G5', 1], ['_', 1],
                // 프레이즈 4: 마무리
                ['E5', 1], ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 1],
                ['D5', 1], ['C5', 2], ['_', 1],
            ]
        },
        bass: {
            wave: 'triangle',
            volume: 0.06,
            notes: [
                ['C3', 1], ['C3', 1], ['C3', 1], ['C3', 1],
                ['F3', 1], ['F3', 1], ['G3', 1], ['G3', 1],
                ['A3', 1], ['A3', 1], ['E3', 1], ['E3', 1],
                ['F3', 1], ['F3', 1], ['G3', 1], ['G3', 1],
                ['F3', 1], ['F3', 1], ['E3', 1], ['E3', 1],
                ['D3', 1], ['D3', 1], ['G3', 1], ['G3', 1],
                ['A3', 1], ['A3', 1], ['E3', 1], ['E3', 1],
                ['F3', 1], ['G3', 1], ['C3', 2],
            ]
        },
        arp: {
            wave: 'square',
            volume: 0.02,
            notes: [
                ['C4', 0.5], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5],
                ['C4', 0.5], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5],
                ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5],
                ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5],
                ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['C5', 0.5],
                ['E4', 0.5], ['G4', 0.5], ['B4', 0.5], ['G4', 0.5],
                ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5],
                ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5],
                ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5],
                ['E4', 0.5], ['G4', 0.5], ['B4', 0.5], ['G4', 0.5],
                ['D4', 0.5], ['F4', 0.5], ['A4', 0.5], ['F4', 0.5],
                ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5],
                ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['C5', 0.5],
                ['E4', 0.5], ['G4', 0.5], ['B4', 0.5], ['G4', 0.5],
                ['F4', 0.5], ['G4', 0.5], ['C4', 0.5], ['E4', 0.5],
            ]
        }
    },

    // 🏠 안식처 탭: 따뜻하고 편안한 펜타토닉 (F major, ~75 BPM)
    sanctuary: {
        bpm: 75,
        melody: {
            wave: 'triangle',  // 더 부드러운 음색
            volume: 0.05,
            notes: [
                // 프레이즈 1: 따뜻한 인사
                ['F4', 2], ['A4', 1], ['C5', 2], ['A4', 1],
                ['Bb4', 1.5], ['A4', 0.5], ['G4', 2], ['_', 1],
                // 프레이즈 2: 안식
                ['A4', 1], ['C5', 1], ['D5', 2], ['C5', 1],
                ['Bb4', 1], ['A4', 1], ['F4', 2], ['_', 1],
                // 프레이즈 3: 희망
                ['C5', 1], ['D5', 1], ['F5', 2], ['D5', 1],
                ['C5', 1.5], ['A4', 0.5], ['Bb4', 2], ['_', 1],
                // 프레이즈 4: 편안한 마무리
                ['A4', 1], ['G4', 1], ['F4', 1], ['A4', 1],
                ['G4', 1], ['F4', 3], ['_', 1],
            ]
        },
        bass: {
            wave: 'triangle',
            volume: 0.06,
            notes: [
                ['F3', 4], ['C3', 4],
                ['Bb3', 4], ['F3', 4],
                ['C3', 4], ['Bb3', 4],
                ['F3', 4], ['C3', 4],
            ]
        },
        arp: {
            wave: 'sine',  // 가장 부드러운 음색
            volume: 0.025,
            notes: [
                ['F3', 1.5], ['A3', 1.5], ['C4', 1.5], ['A3', 1.5],
                ['C3', 1.5], ['E3', 1.5], ['G3', 1.5], ['E3', 1.5],
                ['Bb3', 1.5], ['D4', 1.5], ['F4', 1.5], ['D4', 1.5],
                ['F3', 1.5], ['A3', 1.5], ['C4', 1.5], ['A3', 1.5],
                ['C4', 1.5], ['E4', 1.5], ['G4', 1.5], ['E4', 1.5],
                ['Bb3', 1.5], ['D4', 1.5], ['F4', 1.5], ['D4', 1.5],
                ['F3', 1.5], ['A3', 1.5], ['C4', 1.5], ['A3', 1.5],
                ['C3', 1.5], ['E3', 1.5], ['G3', 1.5], ['E3', 1.5],
            ]
        }
    }
}

// ── 보이스 스케줄러 ──
class Voice {
    constructor(ctx, gainNode, { wave, volume, notes }, beatDuration) {
        this.ctx = ctx
        this.gainNode = gainNode
        this.wave = wave
        this.baseVolume = volume
        this.notes = notes
        this.beatDuration = beatDuration
        this.noteIndex = 0
        this.nextNoteTime = 0
    }

    scheduleNotes(until) {
        while (this.nextNoteTime < until) {
            const [noteName, beats] = this.notes[this.noteIndex % this.notes.length]
            const duration = beats * this.beatDuration
            const freq = NOTE[noteName]

            if (freq > 0) {
                this.playNote(freq, this.nextNoteTime, duration * 0.85)
            }

            this.nextNoteTime += duration
            this.noteIndex++
        }
    }

    playNote(freq, startTime, duration) {
        const ctx = this.ctx
        const osc = ctx.createOscillator()
        const noteGain = ctx.createGain()
        const vol = this.baseVolume

        osc.type = this.wave
        osc.frequency.setValueAtTime(freq, startTime)

        // 부드러운 엔벨로프 (ADSR 간이)
        noteGain.gain.setValueAtTime(0, startTime)
        noteGain.gain.linearRampToValueAtTime(vol, startTime + 0.01) // Attack
        noteGain.gain.setValueAtTime(vol * 0.8, startTime + 0.03) // Decay
        noteGain.gain.setValueAtTime(vol * 0.7, startTime + duration * 0.5) // Sustain
        noteGain.gain.linearRampToValueAtTime(0, startTime + duration) // Release

        osc.connect(noteGain)
        noteGain.connect(this.gainNode)
        osc.start(startTime)
        osc.stop(startTime + duration + 0.02)

        activeOscillators.push({ osc, stop: startTime + duration + 0.02 })
    }

    reset(time) {
        this.noteIndex = 0
        this.nextNoteTime = time
    }
}

// ── BGM 컨트롤 ──

const SCHEDULE_AHEAD = 0.15 // 150ms 미리 스케줄
const SCHEDULE_INTERVAL = 100 // 100ms마다 체크

let voices = []
let stopCleanupTimer = null

function updateVolume() {
    if (masterGain && audioCtx) {
        const vol = getBgmVolume()
        // 즉시 반영: 예약된 값 취소 후 즉시 설정
        masterGain.gain.cancelScheduledValues(audioCtx.currentTime)
        masterGain.gain.setValueAtTime(vol, audioCtx.currentTime)
    }
}

export function startBgm(trackName) {
    if (!isBgmEnabled()) return
    if (currentTrack === trackName && isPlaying) {
        updateVolume()
        return
    }

    stopBgm(true) // 즉시 정리 (페이드 없이)

    const track = TRACKS[trackName]
    if (!track) return

    const ctx = getCtx()
    currentTrack = trackName
    isPlaying = true

    // 마스터 게인 (BGM 볼륨)
    masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0, ctx.currentTime)
    masterGain.gain.linearRampToValueAtTime(getBgmVolume(), ctx.currentTime + 0.3) // 페이드인
    masterGain.connect(ctx.destination)

    const beatDuration = 60 / track.bpm

    // 보이스 생성
    voices = []
    const voiceConfigs = [track.melody, track.bass, track.arp].filter(Boolean)
    for (const config of voiceConfigs) {
        const voice = new Voice(ctx, masterGain, config, beatDuration)
        voice.nextNoteTime = ctx.currentTime + 0.1
        voices.push(voice)
    }

    // 스케줄러 루프
    function scheduler() {
        if (!isPlaying) return
        const scheduleUntil = ctx.currentTime + SCHEDULE_AHEAD

        for (const voice of voices) {
            voice.scheduleNotes(scheduleUntil)
        }

        // 완료된 오실레이터 정리
        activeOscillators = activeOscillators.filter(o => o.stop > ctx.currentTime)
    }

    schedulerTimer = setInterval(scheduler, SCHEDULE_INTERVAL)
    scheduler() // 즉시 첫 호출
}

export function stopBgm(immediate = false) {
    isPlaying = false
    currentTrack = null

    if (schedulerTimer) {
        clearInterval(schedulerTimer)
        schedulerTimer = null
    }

    // 이전 정리 타이머 취소
    if (stopCleanupTimer) {
        clearTimeout(stopCleanupTimer)
        stopCleanupTimer = null
    }

    const gainToClean = masterGain
    const oscsToClean = [...activeOscillators]

    if (immediate) {
        // 즉시 정리 (트랙 전환 시)
        if (gainToClean && audioCtx) {
            try {
                gainToClean.gain.cancelScheduledValues(audioCtx.currentTime)
                gainToClean.gain.setValueAtTime(0, audioCtx.currentTime)
            } catch (e) { /* 무시 */ }
        }
        for (const o of oscsToClean) {
            try { o.osc.stop() } catch (e) { /* 이미 멈춤 */ }
        }
        activeOscillators = []
        masterGain = null
    } else {
        // 페이드아웃 (사용자가 BGM 끌 때)
        if (gainToClean && audioCtx) {
            try {
                gainToClean.gain.cancelScheduledValues(audioCtx.currentTime)
                gainToClean.gain.setTargetAtTime(0, audioCtx.currentTime, 0.06)
            } catch (e) { /* 무시 */ }
        }
        stopCleanupTimer = setTimeout(() => {
            for (const o of oscsToClean) {
                try { o.osc.stop() } catch (e) { /* 이미 멈춤 */ }
            }
            activeOscillators = activeOscillators.filter(o => !oscsToClean.includes(o))
            if (masterGain === gainToClean) masterGain = null
            stopCleanupTimer = null
        }, 250)
    }

    voices = []
}

/** 탭 변경 시 호출 - 해당 탭의 BGM으로 교체 */
export function switchBgm(tabName) {
    if (!isBgmEnabled()) {
        stopBgm()
        return
    }
    if (currentTrack === tabName && isPlaying) {
        updateVolume()
        return
    }
    startBgm(tabName)
}

/** BGM 볼륨 실시간 반영 */
export function updateBgmVolume() {
    updateVolume()
}

/** 현재 재생 중인 트랙 이름 */
export function getCurrentTrack() {
    return currentTrack
}

