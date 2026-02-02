import { useState } from 'react'
import {
  createUser,
  getUserData,
  setCurrentUserId,
  setSyncToken,
  saveUserData,
  saveUserDataToServer,
  loginWithServer,
  registerWithServer,
} from '../utils/userStorage'
import './LoginScreen.css'

function LoginScreen({ onLogin, sessionExpiredMessage }) {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
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

    // 1) 서버 로그인 시도 (데스크톱·모바일 동기화)
    const loginRes = await loginWithServer(id, pwd)
    if (loginRes.success && loginRes.user && loginRes.token) {
      setSyncToken(loginRes.token)
      setCurrentUserId(id)
      saveUserData(id, { ...getUserData(id), ...loginRes.user, password: pwd })
      onLogin(loginRes.user)
      setLoading(false)
      return
    }
    if (loginRes.status === 401) {
      setError(loginRes.error || '비밀번호가 틀렸어요.')
      setLoading(false)
      return
    }

    // 2) 서버 404(가입된 ID 아님) 또는 오프라인 → 로컬 로그인/가입
    const result = createUser(id, pwd)
    if (result.success) {
      setCurrentUserId(id)
      onLogin(result.user)
      // 로컬만 있던 계정이면 서버에 등록해 두면 다음부터 동기화됨
      const regRes = await registerWithServer(id, pwd)
      if (regRes.success && regRes.token) {
        setSyncToken(regRes.token)
        saveUserDataToServer(id, result.user).catch(() => {})
      }
    } else {
      setError(result.error || '로그인 실패')
    }
    setLoading(false)
  }

  return (
    <div className="login-screen">
      <div className="login-box">
        <h1 className="login-title">DAYMON</h1>
        <p className="login-subtitle">영혼과 함께하는 여정</p>
        {sessionExpiredMessage && (
          <p className="login-session-expired" role="status">
            {sessionExpiredMessage}
          </p>
        )}

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
