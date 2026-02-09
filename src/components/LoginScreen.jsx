import { useState, useEffect } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'
import './LoginScreen.css'

// 인앱 브라우저 감지
function isInAppBrowser() {
  const ua = navigator.userAgent || ''
  // 카카오톡, 라인, 인스타그램, 페이스북, 네이버, 트위터 등
  return /KAKAOTALK|Line|Instagram|FBAN|FBAV|NAVER|Twitter|Snapchat|Daum/i.test(ua)
}

function LoginScreen() {
  const [inApp, setInApp] = useState(false)

  useEffect(() => {
    setInApp(isInAppBrowser())
  }, [])

  // 외부 브라우저로 열기 (Android intent, iOS는 clipboard)
  const handleOpenExternal = () => {
    const url = window.location.href
    // Android: intent로 크롬 열기
    if (/android/i.test(navigator.userAgent)) {
      window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`
      return
    }
    // iOS: 클립보드에 복사 후 안내
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-box">
        {/* 로고 */}
        <div className="login-egg">🥚</div>
        <h1 className="login-title">DAYMON</h1>
        <p className="login-subtitle">나만의 몬스터 육성 게임</p>

        {/* 인앱 브라우저 경고 */}
        {inApp && (
          <div className="login-inapp-warning">
            <div className="login-inapp-icon">⚠️</div>
            <div className="login-inapp-text">
              <strong>인앱 브라우저에서는 로그인이 안 돼요!</strong>
              <p>아래 버튼을 누르거나, 우측 상단 <strong>⋮</strong> → <strong>기본 브라우저로 열기</strong>를 눌러주세요.</p>
            </div>
            <button type="button" className="login-inapp-btn" onClick={handleOpenExternal}>
              크롬/사파리로 열기
            </button>
          </div>
        )}

        {/* 구글 로그인 */}
        <div className={`login-auth-wrapper ${inApp ? 'login-auth-wrapper--dimmed' : ''}`}>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'rgba(255, 220, 100, 0.85)',
                    brandAccent: 'rgba(255, 200, 60, 1)',
                    brandButtonText: '#1a1425',
                    inputBackground: 'rgba(255, 255, 255, 0.06)',
                    inputBorder: 'rgba(255, 255, 255, 0.12)',
                    inputText: 'white',
                  },
                  borderWidths: {
                    buttonBorderWidth: '0px',
                  },
                  radii: {
                    borderRadiusButton: '12px',
                  },
                },
              },
            }}
            providers={['google']}
            onlyThirdPartyProviders
            localization={{
              variables: {
                sign_in: {
                  social_provider_text: '{{provider}}로 시작하기',
                },
              },
            }}
          />
        </div>

        {/* 구분선 */}
        <div className="login-divider">
          <div className="login-divider-line" />
          <span className="login-divider-text">게임 소개</span>
          <div className="login-divider-line" />
        </div>

        {/* 특징 카드 */}
        <div className="login-features">
          <div className="login-feature">
            <span className="login-feature-icon">🐣</span>
            <span className="login-feature-text">알 부화</span>
          </div>
          <div className="login-feature">
            <span className="login-feature-icon">⚔️</span>
            <span className="login-feature-text">7가지 속성</span>
          </div>
          <div className="login-feature">
            <span className="login-feature-icon">🏠</span>
            <span className="login-feature-text">안식처</span>
          </div>
        </div>

        {/* 힌트 */}
        <p className="login-hint">처음 접속하면 새 계정이 자동으로 만들어져요</p>
      </div>

      {/* 버전 */}
      <div className="login-version">v0.1.0 Alpha</div>
    </div>
  )
}

export default LoginScreen
