import './ActionBar.css'

function ActionBar({ onAction }) {
  return (
    <div className="action-bar" aria-label="상호작용">
      <button type="button" className="action" onClick={() => onAction('pet')}>
        쓰다듬기
      </button>
      <button type="button" className="action" onClick={() => onAction('snack')}>
        간식 주기
      </button>
      <button type="button" className="action" onClick={() => onAction('play')}>
        놀아주기
      </button>
      <button type="button" className="action action--ghost" onClick={() => onAction('rest')}>
        쉬기
      </button>
    </div>
  )
}

export default ActionBar

