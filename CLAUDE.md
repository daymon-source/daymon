# Daymon 프로젝트 - AI 작업 기록

## 프로젝트 개요
몬스터 육성 모바일 웹 게임 (React + Vite + Supabase)

## 기술 스택
- **프론트엔드**: React (Hooks 기반, 클래스 컴포넌트 없음), Vite
- **백엔드/DB**: Supabase (PostgreSQL + Auth)
- **스타일**: CSS 파일 (컴포넌트별 분리, CSS Modules 아님)
- **상태관리**: 커스텀 훅 (`src/hooks/`)으로 분리

## 핵심 아키텍처
- `src/App.jsx` — 메인 컴포넌트, 모든 훅 조합 + 탭 라우팅
- `src/hooks/useGameData.js` — 유저/몬스터 데이터 CRUD (Supabase UPSERT 방식)
- `src/hooks/useAuth.js` — 인증 (Supabase Auth)
- `src/hooks/useIncubator.js` — 부화장치 로직
- `src/hooks/useFieldMonster.js` — 필드 몬스터 인터랙션
- `src/hooks/useAttendance.js` — 출석체크
- `src/components/SettingsPanel.jsx` — 프로필 바 + 설정 드롭다운 메뉴
- `src/constants/gameConfig.js` — 게임 상수
- `src/constants/eggs.js` — 알 타입/이미지 정의
- `src/utils/sounds.js` — SFX 관리
- `src/constants/badges.js` — 뱃지(업적) 정의 (카테고리, 뱃지 목록, 티어)
- `src/components/BadgeModal.jsx` — 업적 모달 컴포넌트
- `src/utils/bgm.js` — BGM 관리

## DB 테이블 구조 (Supabase)
- **users**: id, user_id(닉네임), gold, mood, unlocked_incubator_slots, account_level, account_exp, badges(JSONB), created_at, updated_at
- **monsters**: id, user_id, location, element, egg_type, nickname, level, exp, hunger, happiness, is_hatched, hatching_started_at, created_at, updated_at
- **egg_types**: 알 밸런스 수치 (DB에서 로드, 없으면 로컬 기본값)

## 데이터 저장 방식
- `saveMonstersToSupabase` (useGameData.js): UPSERT 방식으로 중단되어도 데이터 손실 없음
- 500ms debounce 자동저장 + 탭 hidden 시 즉시 저장 + 로그아웃 전 flush
- 핫 리로드/빈 데이터 저장 방지 로직 있음

## 작업 이력

### 2026-02-11: 계정 레벨 시스템 인프라 구축
**수정 파일**: useGameData.js, App.jsx, SettingsPanel.jsx, SettingsPanel.css

**내용**:
- `accountLevel` (기본 1), `accountExp` (기본 0) state를 useGameData 훅에 추가
- `createInitialUser`에 `account_level: 1, account_exp: 0` 필드 추가
- `loadUserData`에서 DB의 `account_level`, `account_exp` 읽어 state 설정 (`??` 기본값으로 DB 컬럼 없어도 안전)
- `saveMonstersToSupabase` 5단계 users update에 `account_level`, `account_exp` 포함
- useCallback 의존성 배열에 `accountLevel`, `accountExp` 추가
- return 객체에 `accountLevel, setAccountLevel, accountExp, setAccountExp` 노출
- App.jsx에서 SettingsPanel에 `accountLevel` prop 전달
- SettingsPanel 프로필 바 닉네임 옆 + 설정 패널 헤더에 `Lv.{accountLevel}` 금색 뱃지 표시
- `.profile-level` CSS 스타일 (금색 계열, 작은 뱃지)
- 프로필 바 상하 패딩 약간 확대 (0.4rem → 0.5rem)

**DB 필요 작업**: Supabase 대시보드에서 users 테이블에 컬럼 추가
```sql
ALTER TABLE users ADD COLUMN account_level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN account_exp INTEGER DEFAULT 0;
```
코드에서는 `??` 기본값 처리로 컬럼 없어도 에러 안 남.

**미구현 (향후 작업)**:
- 경험치 획득 방식 (어떤 행동에 경험치를 줄지 미정)
- 레벨업 로직 (경험치 → 레벨 변환 공식)
- 레벨업 이펙트/알림

### 2026-02-11: 뱃지(업적) 시스템 인프라 구축
**신규 파일**: src/constants/badges.js, src/components/BadgeModal.jsx, src/components/BadgeModal.css
**수정 파일**: useGameData.js, App.jsx, SettingsPanel.jsx

**내용**:
- `badges.js`: BADGE_CATEGORIES(5개 카테고리), BADGES(16개 뱃지), BADGE_TIERS(4단계 티어) 상수 정의
- `BadgeModal.jsx`: 카테고리별 그룹 헤더 + 4열 그리드, 해금/미해금 시각 구분, 진행률 표시
- `BadgeModal.css`: AttendanceCheck 패턴 동일 (fixed overlay + blur + 어두운 보라 그라데이션 모달)
- `useGameData.js`: `badges` state 추가 (기본값 `{ unlocked: [], progress: {} }`), load/save/return 포함
- `App.jsx`: `badgeModalOpen` state + BadgeModal 렌더링 + SettingsPanel에 `onOpenBadges` prop 전달
- `SettingsPanel.jsx`: 도감 아래 🏆 업적 버튼 추가

**DB 필요 작업**: Supabase 대시보드에서 users 테이블에 컬럼 추가
```sql
ALTER TABLE users ADD COLUMN badges JSONB DEFAULT '{"unlocked":[],"progress":{}}';
```
코드에서는 `??` 기본값 처리로 컬럼 없어도 에러 안 남.

**미구현 (향후 작업)**:
- 뱃지 해금 체크 로직 (어떤 행동이 어떤 뱃지를 해금하는지)
- 뱃지 해금 알림/이펙트
- 뱃지 progress 추적 (예: 수집 카운터)

## 주의사항
- 모든 state는 커스텀 훅에서 관리, App.jsx는 조합만 담당
- Supabase 저장은 UPSERT 방식 — DELETE-INSERT 아님 (데이터 보호)
- 핫 리로드 시 빈 데이터 저장 방지 로직이 있으므로, 새 데이터 필드 추가 시 초기화 순서 주의
- CSS는 컴포넌트명.css 파일에 작성, 전역 네이밍 (BEM 아님, 접두사로 구분)
- 골드 화폐 아이콘은 🌙 (달 이모지), 화폐명은 "루나"
