import { useMemo } from 'react'
import './Monster.css'

function moodToStage(mood) {
  if (mood === '활기') return 3
  if (mood === '만족') return 2
  if (mood === '따뜻') return 2
  return 1
}

function Monster({ mood, affection, note }) {
  const stage = useMemo(() => moodToStage(mood), [mood])
  const width = 140 + stage * 16
  const height = 120 + stage * 14
  const glow = 0.15 + stage * 0.08

  return (
    <div className="monster-wrap">
      <div
        className="monster"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          boxShadow: `0 8px ${24 + stage * 6}px rgba(0, 0, 0, ${glow})`,
        }}
        aria-label="나의 몬스터"
      />
      <div className="monster-meta" aria-label="상태">
        <span className="monster-chip">기분: {mood}</span>
        <span className="monster-chip monster-chip--soft">유대: {affection}</span>
      </div>
      {note ? <p className="monster-note">{note}</p> : <p className="monster-note monster-note--empty"> </p>}
    </div>
  )
}

export default Monster
