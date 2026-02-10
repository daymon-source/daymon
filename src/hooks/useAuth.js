import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth(loadUserDataRef) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [nicknamePrompt, setNicknamePrompt] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknameError, setNicknameError] = useState('')

  // Supabase 인증 상태 관리
  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        loadUserDataRef.current?.(session.user.id)
      }
    })

    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        loadUserDataRef.current?.(session.user.id)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // 닉네임 제출
  async function handleNicknameSubmit() {
    const nickname = nicknameInput.trim()

    if (nickname.length < 2 || nickname.length > 10) {
      setNicknameError('닉네임은 2-10자여야 합니다.')
      return
    }

    // user_id 업데이트
    const { error } = await supabase
      .from('users')
      .update({ user_id: nickname })
      .eq('id', session.user.id)

    if (error) {
      console.error('Failed to create user:', error)
      if (error.code === '23505') {
        setNicknameError('이미 사용 중인 닉네임입니다.')
      } else {
        setNicknameError('닉네임 등록에 실패했습니다.')
      }
      return
    }

    // 성공 시 닉네임 입력 화면 닫고 데이터 로드
    setNicknamePrompt(false)
    setNicknameInput('')
    setNicknameError('')
    await loadUserDataRef.current?.(session.user.id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
  }

  // 닉네임 변경 (설정 패널에서 호출)
  const handleChangeNickname = async (newNickname) => {
    if (!user || !session) return '로그인이 필요합니다.'
    const { error } = await supabase
      .from('users')
      .update({ user_id: newNickname })
      .eq('id', session.user.id)
    if (error) {
      console.error('닉네임 변경 실패:', error)
      if (error.code === '23505') return '이미 사용 중인 닉네임입니다.'
      return '변경에 실패했습니다.'
    }
    setUser(prev => ({ ...prev, userId: newNickname }))
    return null // 성공
  }

  return {
    session,
    setSession,
    user,
    setUser,
    nicknamePrompt,
    setNicknamePrompt,
    nicknameInput,
    setNicknameInput,
    nicknameError,
    handleNicknameSubmit,
    handleLogout,
    handleChangeNickname,
  }
}
