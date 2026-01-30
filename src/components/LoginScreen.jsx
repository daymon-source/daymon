import { useState } from 'react'
import { createUser, setCurrentUserId } from '../utils/userStorage'
import './LoginScreen.css'

function LoginScreen({ onLogin }) {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    const id = userId.trim()
    const pwd = password.trim()

    if (!id || !pwd) {
      setError('ID와 비밀번호를 입력해 주세요.')
      return
    }

    if (id.length < 3 || id.length > 12) {
      setError('ID는 3~12자로 입력해 주세요.')
      return
    }

    if (pwd.length < 4) {
      setError('비밀번호는 4자 이상 입력해 주세요.')
      return
    }

    setLoading(true)
    setError('')

    // 약간의 딜레이로 로딩 느낌
    setTimeout(() => {
      const result = createUser(id, pwd)
      if (result.success) {
        setCurrentUserId(id)
        onLogin(result.user)
      } else {
        setError(result.error || '로그인 실패')
        setLoading(false)
      }
    }, 300)
  }

  return (
    <div className="login-screen">
      <div className="login-box">
        <h1 className="login-title">DAYMON</h1>
        <p className="login-subtitle">영혼과 함께하는 여정</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="userId" className="login-label">
              ID
            </label>
            <input
              id="userId"
              type="text"
              className="login-input"
              placeholder="3~12자"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value)
                setError('')
              }}
              maxLength={12}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password" className="login-label">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              className="login-input"
              placeholder="4자 이상"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? '접속 중...' : '시작하기'}
          </button>
        </form>

        <p className="login-hint">처음 접속하면 새 계정이 만들어져요</p>
      </div>
    </div>
  )
}

export default LoginScreen
