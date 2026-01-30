import { useState, useRef, useEffect } from 'react'
import { getUserData, updateUserData } from '../utils/userStorage'
import './ChatModal.css'

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: '안녕! 나는 네 몬스터의 영혼이야. 오늘 하루는 어땠어?',
}

async function sendChat(messages) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '대화 요청 실패')
  return data.content
}

function ChatModal({ isOpen, onClose, userId }) {
  const [messages, setMessages] = useState([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef(null)

  // 사용자별 대화 기록 로드
  useEffect(() => {
    if (isOpen && userId) {
      const userData = getUserData(userId)
      if (userData?.chatHistory && userData.chatHistory.length > 0) {
        setMessages(userData.chatHistory)
      } else {
        setMessages([INITIAL_MESSAGE])
      }
    }
  }, [isOpen, userId])

  // 대화 기록 저장
  const saveChatHistory = (newMessages) => {
    if (userId) {
      updateUserData(userId, { chatHistory: newMessages })
    }
  }

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, loading])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    const userMessage = { role: 'user', content: text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setLoading(true)

    try {
      const content = await sendChat(newMessages.map((m) => ({ role: m.role, content: m.content })))
      const finalMessages = [...newMessages, { role: 'assistant', content }]
      setMessages(finalMessages)
      saveChatHistory(finalMessages)
    } catch (err) {
      const isNetwork = err.message === 'Failed to fetch' || err.name === 'TypeError'
      const msg = isNetwork
        ? 'API 서버에 연결할 수 없어요. 터미널에서 "npm run dev:server" 또는 "npm run dev:all"을 실행했는지 확인해 주세요.'
        : `오류: ${err.message}`
      const errorMessages = [...newMessages, { role: 'assistant', content: msg }]
      setMessages(errorMessages)
      saveChatHistory(errorMessages)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-modal-overlay" onClick={onClose} role="dialog" aria-label="대화">
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-modal-header">
          <h2 className="chat-modal-title">영혼과 대화</h2>
          <button type="button" className="chat-modal-close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="chat-modal-messages" ref={listRef}>
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg chat-msg--${m.role}`}>
              <span className="chat-msg-role">{m.role === 'user' ? '나' : '영혼'}</span>
              <p className="chat-msg-content">{m.content}</p>
            </div>
          ))}
          {loading && (
            <div className="chat-msg chat-msg--assistant">
              <span className="chat-msg-role">영혼</span>
              <p className="chat-msg-content chat-msg-loading">...</p>
            </div>
          )}
        </div>
        <form className="chat-modal-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="chat-modal-input"
            placeholder="메시지를 입력하세요"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="chat-modal-send" disabled={loading}>
            전송
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatModal
