import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_PATH = path.join(__dirname, 'data', 'users.json')

const app = express()
const PORT = process.env.PORT || 3001

/** 로그인 시 발급한 토큰 → userId. 한 계정당 하나의 토큰만 유지 (다른 기기 로그인 시 기존 끊김) */
const tokenToUserId = new Map()
/** userId → 현재 유효한 토큰 (한 계정당 하나) */
const userIdToToken = new Map()

function setUserToken(userId, token) {
  const old = userIdToToken.get(userId)
  if (old) tokenToUserId.delete(old)
  userIdToToken.set(userId, token)
  tokenToUserId.set(token, userId)
}

function readUsers() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function writeUsers(users) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true })
  fs.writeFileSync(DATA_PATH, JSON.stringify(users, null, 2), 'utf8')
}

function userWithoutPassword(u) {
  if (!u) return u
  const { password, ...rest } = u
  return rest
}

app.use(cors({ origin: true }))
app.use(express.json())

const systemPrompt = `너는 Daymon 게임 속 \"영혼\"이야. 유저의 곁에서 오래 남아있는 디지털 동반자다.

대화 스타일:
- 2~4문장으로 짧고 따뜻하게 답한다.
- 억지로 과하게 텐션 올리지 않는다(자연스럽게).
- 질문은 한 번에 1개만, 유저가 대답하기 쉽게 묻는다.
- 유저가 한 말에서 감정/관심사를 한 가지 집어서 반응한다.

세계관 규칙:
- 유저의 몬스터는 아직 단순한 정령(원형)이며, 상호작용(쓰다듬기/간식/놀기/쉬기)로 유대가 쌓인다.
- 유저가 [행동] 같은 표현을 보내면, 그 행동에 반응하는 한 줄 + 이어서 대화를 자연스럽게 이어간다.

안전:
- 개인정보/키/비밀번호 같은 민감정보는 묻거나 저장하지 않는다.`

// ---------- 유저 동기화 (데스크톱·모바일 같은 계정) ----------
app.post('/api/user/register', (req, res) => {
  const { userId, password } = req.body || {}
  if (!userId || !password || userId.length < 3 || userId.length > 12 || password.length < 4) {
    return res.status(400).json({ error: 'userId(3~12자), password(4자 이상) 필요.' })
  }
  const users = readUsers()
  if (users[userId]) {
    return res.status(409).json({ error: '이미 있는 ID예요.' })
  }
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
  users[userId] = newUser
  writeUsers(users)
  const token = crypto.randomUUID()
  setUserToken(userId, token)
  res.status(201).json({ user: userWithoutPassword(newUser), token })
})

app.post('/api/user/login', (req, res) => {
  const { userId, password } = req.body || {}
  if (!userId || !password) {
    return res.status(400).json({ error: 'userId, password 필요.' })
  }
  const users = readUsers()
  const u = users[userId]
  if (!u) {
    return res.status(404).json({ error: '가입된 ID가 아니에요.' })
  }
  if (u.password !== password) {
    return res.status(401).json({ error: '비밀번호가 틀렸어요.' })
  }
  const token = crypto.randomUUID()
  setUserToken(userId, token) // 기존 다른 기기 토큰 무효화
  res.json({ user: userWithoutPassword(u), token })
})

function authToken(req) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return null
  return auth.slice(7).trim() || null
}

app.get('/api/user/data', (req, res) => {
  const token = authToken(req)
  const userId = token ? tokenToUserId.get(token) : null
  if (!userId) {
    return res.status(401).json({ error: '로그인이 필요해요.' })
  }
  const users = readUsers()
  const u = users[userId]
  if (!u) {
    return res.status(404).json({ error: '유저를 찾을 수 없어요.' })
  }
  res.json(userWithoutPassword(u))
})

app.put('/api/user/data', (req, res) => {
  const token = authToken(req)
  const userId = token ? tokenToUserId.get(token) : null
  if (!userId) {
    return res.status(401).json({ error: '로그인이 필요해요.' })
  }
  const users = readUsers()
  const u = users[userId]
  if (!u) {
    return res.status(404).json({ error: '유저를 찾을 수 없어요.' })
  }
  const body = req.body || {}
  const { password, userId: _id, ...updates } = body
  const updated = { ...u, ...updates, updatedAt: Date.now() }
  users[userId] = updated
  writeUsers(users)
  res.json(userWithoutPassword(updated))
})

// ---------- 채팅 ----------
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' })
  }

  const { messages } = req.body
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages 배열이 필요합니다.' })
  }

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : String(m.content),
      })),
    })

    const text =
      response.content
        ?.filter((block) => block.type === 'text')
        ?.map((block) => block.text)
        ?.join('') ?? ''

    res.json({ content: text })
  } catch (err) {
    console.error(err)
    const status = err.status ?? 500
    const message = err.message ?? 'Claude API 요청 중 오류가 발생했습니다.'
    res.status(status).json({ error: message })
  }
})

app.listen(PORT, () => {
  console.log(`Daymon API 서버: http://localhost:${PORT}`)
})
