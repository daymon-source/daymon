// localStorage 기반 사용자 데이터 저장/로드
// 나중에 Firebase로 쉽게 교체 가능하도록 구조화

const STORAGE_PREFIX = 'daymon_user_'

export function getUserData(userId) {
  const key = STORAGE_PREFIX + userId
  const data = localStorage.getItem(key)
  if (!data) return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

export function saveUserData(userId, data) {
  const key = STORAGE_PREFIX + userId
  localStorage.setItem(key, JSON.stringify(data))
}

export function createUser(userId, password) {
  const existing = getUserData(userId)
  if (existing) {
    // 비밀번호 확인
    if (existing.password !== password) {
      return { success: false, error: '비밀번호가 틀렸어요.' }
    }
    return { success: true, user: existing }
  }

  // 새 사용자 생성
  const newUser = {
    userId,
    password,
    createdAt: Date.now(),
    mood: '평온',
    affection: 0,
    chatHistory: [],
  }
  saveUserData(userId, newUser)
  return { success: true, user: newUser }
}

export function updateUserData(userId, updates) {
  const user = getUserData(userId)
  if (!user) return false
  const updated = { ...user, ...updates, updatedAt: Date.now() }
  saveUserData(userId, updated)
  return true
}

export function getCurrentUserId() {
  return sessionStorage.getItem('daymon_current_user')
}

export function setCurrentUserId(userId) {
  if (userId) {
    sessionStorage.setItem('daymon_current_user', userId)
  } else {
    sessionStorage.removeItem('daymon_current_user')
  }
}
