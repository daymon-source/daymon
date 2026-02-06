# API 서버 무료 배포하기 (다른 사람에게 주소 알려줄 때)

다른 사람이 **https://daymon-source.github.io/daymon/** 로 접속해서 가입/로그인하려면, API 서버를 **인터넷에 올려야** 합니다. 아래 서비스들은 **무료 티어**가 있어서 소규모로 쓰기 좋습니다.

---

## 1. 무료인가? 사람들이 뭘 많이 쓰나?

| 서비스 | 무료 티어 | 많이 쓰는 이유 |
|--------|-----------|----------------|
| **Render** | ✅ 월 750시간 (24시간 켜둬도 됨) | 설정이 단순하고, 튜토리얼/블로그 예제가 많음. 정적 사이트 + 백엔드 같이 쓰기 좋음. |
| **Railway** | ✅ 월 $1 크레딧 (소규모 트래픽이면 버팀) | GitHub 연동 후 클릭 몇 번에 배포. 예전엔 무료가 널널했고, 지금도 개인/취미용으로 많이 씀. |
| **Fly.io** | ✅ 160GB·시간 등 무료 한도 | 서버를 “머신” 단위로 올리는 느낌. 무료 한도 안에서 영구 디스크 붙이기 좋음. |

- **가장 많이 쓰는 편**: **Render** (무료 백엔드 예제·글 많음) → **Railway** (쉽고 빠름) → **Fly.io** (디스크/네트워크 세밀하게 쓰고 싶을 때).

---

## 2. 로그인 정보 제대로 남기려면? (Fly.io vs Vercel)

지금 API 서버는 **파일 하나**(`server/data/users.json`)에 유저를 저장합니다.  
**“가입/로그인 정보가 재시작 후에도 안 날리게”** 하려면 **저장 공간이 영구**여야 합니다.

| 서비스 | 뭔가요? | 로그인(파일) 유지에 적합? |
|--------|---------|---------------------------|
| **Fly.io** | **진짜 서버(VM)** 하나 올리는 곳. **영구 디스크(볼륨)** 붙일 수 있음. | ✅ **적합.** 볼륨을 `users.json` 넣는 폴더에 붙이면 재시작/재배포해도 데이터 유지. |
| **Vercel** | **프론트/정적 사이트 + 서버리스 함수**용. 요청 올 때마다 함수만 잠깐 실행. | ❌ **부적합.** 파일 시스템이 요청 끝나면 사라짐. `users.json` 같은 상태를 파일로 오래 남겨두기엔 맞지 않음. |

- **정리:** 로그인 정보를 **파일로 제대로 남기려면** → **Fly.io + 볼륨** 쓰면 됨. Vercel은 “API 서버를 파일로 유저 저장”하는 용도로 쓰기엔 아님.

---

## 3. 주의할 점 (Daymon 현재 구조)

- **Render 무료**: 15분 동안 요청 없으면 **잠들고**, **디스크가 휘발성**이라 재시작/재배포 시 `users.json`이 **초기화**될 수 있음.
- **Railway 무료**: 월 $1 크레딧만 있어서, 트래픽이 조금만 많아도 금방 소진될 수 있음.
- **Fly.io 무료**: **영구 볼륨**을 붙일 수 있어서, `users.json`을 오래 유지하기에 적합함.

그래서  
- “일단 무료로 올려보고, 가입/로그인 되는지만 확인” → **Render**가 가장 단순.  
- **“가입한 사람 데이터를 안 날리고 싶다”** → **Fly.io + 볼륨** 쓰면 됨. (또는 나중에 DB로 바꾸기.)

---

## 4. Render로 배포 (가장 많이 쓰는 방식, 단계별)

### 4-1. 준비

- GitHub에 Daymon 저장소가 올라가 있어야 함.
- (선택) 로컬에서 `npm run dev:server` 로 서버가 잘 뜨는지 확인.

### 4-2. Render 가입

1. [https://render.com](https://render.com) 접속.
2. **Get Started for Free** → GitHub로 로그인.
3. Render가 GitHub 저장소 접근 권한 요청하면 **승인**.

### 4-3. Web Service 만들기

1. **Dashboard** → **New +** → **Web Service**.
2. **Connect a repository**에서 **daymon** (또는 해당 저장소) 선택.
3. 아래처럼 설정:
   - **Name**: `daymon-api` (원하는 이름으로)
   - **Region**: Singapore 또는 가까운 곳
   - **Branch**: `main` (또는 사용하는 브랜치)
   - **Runtime**: **Node**
   - **Build Command**: `npm install` (또는 `npm ci`)
   - **Start Command**: `node server/index.js`  
     (또는 `package.json`에 `"start": "node server/index.js"` 가 있으면 `npm start`)
   - **Instance Type**: **Free**

4. **Advanced**에서 **Environment Variables** (환경 변수):
   - `NODE_ENV` = `production`
   - (채팅 쓰면) `ANTHROPIC_API_KEY` = 본인 API 키

5. **Create Web Service** 클릭.

### 4-4. 주소 확인

- 배포가 끝나면 상단에 **URL**이 생김.  
  예: `https://daymon-api.onrender.com`
- 이 주소가 **API 서버 주소**입니다. (다른 사람에게 주는 건 아래 4번의 프론트 주소.)

### 4-5. 프론트에서 이 주소 쓰기

로컬에서 **한 번만** 빌드할 때 API 주소를 넣습니다:

```bash
VITE_API_URL=https://daymon-api.onrender.com npm run build
```

(위 URL을 본인 Render URL로 바꾸세요.)

- 빌드된 `dist`를 **GitHub Pages**에 올리면,  
  **https://daymon-source.github.io/daymon/** 로 접속하는 사람은 이 API를 쓰게 됩니다.

### 4-6. Render 무료 한계 다시 한번

- **15분 동안 요청 없으면** 서버가 잠듦 → 다음 접속 시 1분 안까지 느려질 수 있음.
- **재배포/재시작 시** `users.json` 같은 로컬 파일은 **날아갈 수 있음** (무료 인스턴스는 디스크가 휘발성).  
  → “데이터 유지”가 중요하면 나중에 **Render PostgreSQL** 붙이거나, **Fly.io + 볼륨**으로 옮기는 걸 추천.

---

## 5. Railway로 배포 (클릭 몇 번에 올리기)

1. [https://railway.app](https://railway.app) 접속 → GitHub로 로그인.
2. **New Project** → **Deploy from GitHub repo** → **daymon** 선택.
3. 생성된 서비스 클릭 → **Settings**:
   - **Build**: Build Command `npm install` (또는 비워두고)
   - **Start**: Start Command `node server/index.js`
   - **Root Directory**: `server`가 아니라 **프로젝트 루트** (package.json 있는 곳).
4. **Variables**에 `NODE_ENV=production`, (필요 시) `ANTHROPIC_API_KEY` 추가.
5. **Settings** → **Networking** → **Generate Domain** → 나온 URL이 API 주소.

- 무료는 **월 $1 크레딧**만 있어서, 트래픽이 많으면 금방 소진될 수 있음.

---

## 6. Fly.io로 배포 (로그인 정보 제대로 남기기 — 단계별)

**목표:** `users.json`을 **영구 볼륨**에 두어서 재시작/재배포해도 가입·로그인 정보가 안 날리게 하기.

### 6-1. Fly.io 가입 및 CLI

1. [https://fly.io](https://fly.io) 접속 → **Sign Up** (GitHub 등).
2. [설치 가이드](https://fly.io/docs/hands-on/install-flyctl/) 따라 **flyctl** 설치.
   - Windows (PowerShell): `powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"`
3. 터미널에서 `fly auth login` → 브라우저로 로그인.

### 6-2. 앱 만들기 (프로젝트 루트에서)

```bash
cd c:\Users\smkim\daymon
fly launch --no-deploy
```

- App name: 원하는 이름 (예: `daymon-api`)
- Region: 가까운 곳 (예: `nrt` 도쿄)
- PostgreSQL 등 추가 물어보면 **No**
- `fly.toml` 이 생김.

### 6-3. 영구 볼륨 만들고 마운트

1. **볼륨 생성** (앱 이름을 위에서 쓴 이름으로 바꾸세요):
   ```bash
   fly volumes create data --region nrt --size 1
   ```
2. **`fly.toml`** 열어서 `[http_service]` 위에 **mount** 추가:
   ```toml
   [mounts]
     source = "data"
     destination = "/data"
   ```
3. **환경 변수**로 데이터 폴더 지정:
   ```bash
   fly secrets set DATA_DIR=/data NODE_ENV=production
   ```
   (채팅 쓰면 `ANTHROPIC_API_KEY=본인키` 도 추가)

### 6-4. 배포

```bash
fly deploy
```

- 끝나면 **URL** 나옴. 예: `https://daymon-api.fly.dev`  
  이 주소가 **API 서버 주소**.

### 6-5. 프론트에서 이 주소 쓰기

```bash
VITE_API_URL=https://daymon-api.fly.dev npm run build
```

빌드된 `dist`를 GitHub Pages에 올리면, 접속하는 사람은 이 API를 쓰고 **가입/로그인 정보는 Fly 볼륨에 남습니다**.

---

## 7. 정리

- **무료로 쓰는 게 맞고**, Render / Railway / Fly.io 모두 무료 티어 있음.
- **가장 많이 쓰는 편**: **Render** (설정 단순, 예제 많음) → **Railway** (배포 빠름).
- **로그인 정보 제대로 남기려면**: **Fly.io + 볼륨** 쓰면 됨. Vercel은 서버리스라 파일로 유저 저장하기엔 맞지 않음.
- **다른 사람에게 알려줄 주소**는 그대로 **https://daymon-source.github.io/daymon/** 이고,  
  위처럼 API만 Render/Railway/Fly.io에 올린 뒤, 빌드할 때 `VITE_API_URL=본인_API주소` 넣어서 배포하면 됨.
