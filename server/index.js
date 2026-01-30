import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

const app = express()
const PORT = process.env.PORT || 3001

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
