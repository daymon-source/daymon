# Daymon

걸음수로 키우는 **AI 몬스터 육성 게임**.  
영혼은 영원히 유지되고, 몬스터는 걸음과 대화로 성장하는 디지털 동반자입니다.

## MVP

- 메인 화면: 원형 정령 몬스터 + 걸음수 입력 + 대화
- Claude API 기반 대화·기억
- 걸음수 → 성장·간단한 진화

## 기술 스택

- **프론트**: React
- **배포**: GitHub Pages → https://daymon-source.github.io/daymon/
- **AI**: Claude API
- **DB**: Firebase (예정)

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. Claude API 키 설정

`.env.example`을 복사해 `.env`를 만들고 API 키를 넣습니다.

```bash
cp .env.example .env
```

`.env`에 `ANTHROPIC_API_KEY=sk-ant-...` (본인 키) 입력.

### 3. 실행

**방법 A – 한 번에 (프론트 + API 서버)**

```bash
npm run dev:all
```

**방법 B – 터미널 두 개**

- 터미널 1: `npm run dev:server` (API 서버, 포트 3001)
- 터미널 2: `npm run dev` (Vite 개발 서버)

브라우저에서 http://localhost:5173 접속 후 **대화하기**로 Claude와 대화할 수 있습니다.

자세한 기획·속성·몬스터 시스템은 [docs/PROJECT_SUMMARY.md](docs/PROJECT_SUMMARY.md) 참고.
