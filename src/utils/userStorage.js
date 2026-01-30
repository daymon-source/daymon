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

  // 새 사용자 생성 (bondStage 1 = egg1, 2 = egg2, 유대 0~12 스케일, 12가 되면 egg2)
  const newUser = {
    userId,
    password,
    createdAt: Date.now(),
    mood: '평온',
    affection: 0,
    bondStage: 1,
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

/** localStorage에 저장된 유저 ID 목록 (daymon_user_ 접두사), 가나다순 */
export function getStoredUserIds() {
  const ids = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STORAGE_PREFIX)) {
      ids.push(key.slice(STORAGE_PREFIX.length))
    }
  }
  return ids.sort()
}

/** 가입 순서(createdAt)대로 정렬된 유저 ID 목록. 1번 = 가장 먼저 가입한 유저 */
export function getStoredUserIdsInOrder() {
  const entries = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STORAGE_PREFIX)) {
      const userId = key.slice(STORAGE_PREFIX.length)
      const data = getUserData(userId)
      const createdAt = (data && data.createdAt) || 0
      entries.push({ userId, createdAt })
    }
  }
  entries.sort((a, b) => a.createdAt - b.createdAt)
  return entries.map((e) => e.userId)
}

/** 가입 순서에 따른 번호 (1부터 시작). id가 없으면 0 */
export function getUserNumber(userId) {
  const ordered = getStoredUserIdsInOrder()
  const idx = ordered.indexOf(userId)
  return idx === -1 ? 0 : idx + 1
}
