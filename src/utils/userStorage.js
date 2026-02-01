// localStorage 기반 사용자 데이터 저장/로드
// 서버 API 있으면 동기화(데스크톱·모바일 같은 계정), 없으면 로컬만

const STORAGE_PREFIX = 'daymon_user_'
const SYNC_TOKEN_KEY = 'daymon_sync_token'

/** API 베이스 URL. 빌드 시 VITE_API_URL 설정하면 그쪽으로 요청 (배포용) */
function getApiBaseUrl() {
  const env = import.meta.env?.VITE_API_URL
  if (env && typeof env === 'string') return env.replace(/\/$/, '')
  return '' // 같은 출처면 /api 로 프록시
}

export function getSyncToken() {
  return localStorage.getItem(SYNC_TOKEN_KEY)
}

export function setSyncToken(token) {
  if (token) localStorage.setItem(SYNC_TOKEN_KEY, token)
  else localStorage.removeItem(SYNC_TOKEN_KEY)
}

export function clearSyncToken() {
  localStorage.removeItem(SYNC_TOKEN_KEY)
}

/** 서버 로그인 → { success, user?, token?, error? } */
export async function loginWithServer(userId, password) {
  const base = getApiBaseUrl()
  if (!base && !window.location.port) return { success: false, error: 'API 미설정' }
  try {
    const res = await fetch(`${base || ''}/api/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) return { success: true, user: data.user, token: data.token }
    return { success: false, error: data.error || '로그인 실패', status: res.status }
  } catch (e) {
    return { success: false, error: '서버에 연결할 수 없어요.', offline: true }
  }
}

/** 서버 가입 → { success, user?, token?, error? } */
export async function registerWithServer(userId, password) {
  const base = getApiBaseUrl()
  try {
    const res = await fetch(`${base || ''}/api/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) return { success: true, user: data.user, token: data.token }
    return { success: false, error: data.error || '가입 실패' }
  } catch (e) {
    return { success: false, error: '서버에 연결할 수 없어요.', offline: true }
  }
}

const UNAUTHORIZED_EVENT = 'daymon:sync-unauthorized'

function notifyUnauthorized() {
  clearSyncToken()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
  }
}

/** 401(다른 기기에서 로그인됨) 발생 시 콜백 등록용 이벤트 이름 */
export function getSyncUnauthorizedEventName() {
  return UNAUTHORIZED_EVENT
}

/** 서버에서 최신 유저 데이터 가져오기 (토큰 필요). 401 시 null + 끊김 알림 */
export async function fetchUserDataFromServer() {
  const token = getSyncToken()
  if (!token) return null
  const base = getApiBaseUrl()
  try {
    const res = await fetch(`${base || ''}/api/user/data`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 401) {
      notifyUnauthorized()
      return null
    }
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** 서버에 유저 데이터 저장 (동기화). 401 시 토큰 끊김 알림 후 false */
export async function saveUserDataToServer(userId, payload) {
  const token = getSyncToken()
  if (!token) return false
  const base = getApiBaseUrl()
  try {
    const res = await fetch(`${base || ''}/api/user/data`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...payload, userId }),
    })
    if (res.status === 401) {
      notifyUnauthorized()
      return false
    }
    return res.ok
  } catch {
    return false
  }
}

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

  // 새 사용자 생성. fieldMonster = 필드 메인 몬스터(없으면 null), sanctuary = 안식처 몬스터 배열
  const newUser = {
    userId,
    password,
    createdAt: Date.now(),
    mood: '평온',
    affection: 0,
    bondStage: 1,
    centerEgg: { affection: 0, bondStage: 1, element: 'fire', eggType: 'classic' },
    slots: [null, null, null, null, null],
    fieldMonster: null,
    sanctuary: [null, null, null, null, null, null],
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
  saveUserDataToServer(userId, updated).catch(() => {}) // 동기화 시도 (실패해도 로컬은 유지)
  return true
}

const CURRENT_USER_KEY = 'daymon_current_user'

/** 현재 로그인한 유저 ID. localStorage 사용 — 탭/브라우저를 닫아도 유지 */
export function getCurrentUserId() {
  return localStorage.getItem(CURRENT_USER_KEY)
}

export function setCurrentUserId(userId) {
  if (userId) {
    localStorage.setItem(CURRENT_USER_KEY, userId)
  } else {
    localStorage.removeItem(CURRENT_USER_KEY)
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
