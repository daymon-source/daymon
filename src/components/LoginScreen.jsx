import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'
import './LoginScreen.css'

function LoginScreen() {
  return (
    <div className="login-screen">
      <div className="login-box">
        <h1 className="login-title">DAYMON</h1>

        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
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

        <p className="login-hint">처음 접속하면 새 계정이 만들어져요</p>
      </div>
    </div>
  )
}

export default LoginScreen
