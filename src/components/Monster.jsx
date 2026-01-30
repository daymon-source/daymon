import { useRef, useState } from 'react'
import egg1Img from '../assets/egg1.png'
import egg2Img from '../assets/egg2.png'
import './Monster.css'

/* 프레임(430×764) 안에 잘리지 않도록 크기 제한 */
const EGG_MAX_WIDTH = 260

function Monster({ mood, bondStage, affection, note, onTouch }) {
  const [shaking, setShaking] = useState(false)
  const lastTouchRef = useRef(0)
  const width = bondStage >= 2 ? EGG_MAX_WIDTH * 0.7 : EGG_MAX_WIDTH
  const displayImg = bondStage >= 2 ? egg2Img : egg1Img

  const trigger = (e) => {
    if (e && e.type === 'touchend') {
      e.preventDefault()
      lastTouchRef.current = Date.now()
    }
    if (e && e.type === 'click' && Date.now() - lastTouchRef.current < 400) return
    if (onTouch) {
      onTouch()
      setShaking(true)
      window.setTimeout(() => setShaking(false), 400)
    }
  }

  return (
    <div className={`monster-wrap ${bondStage >= 2 ? 'monster-wrap--egg2' : 'monster-wrap--egg1'}`}>
      <button
        type="button"
        className={`monster monster--img ${shaking ? 'monster--shake' : ''}`}
        onClick={trigger}
        onTouchEnd={trigger}
        aria-label="몬스터 터치"
      >
        <img
          src={displayImg}
          alt={bondStage >= 2 ? 'egg2' : 'egg1'}
          className="monster-img"
          style={{ width: `${width}px`, height: 'auto' }}
        />
      </button>
      {note ? <p className="monster-note">{note}</p> : <p className="monster-note monster-note--empty"> </p>}
    </div>
  )
}

export default Monster
