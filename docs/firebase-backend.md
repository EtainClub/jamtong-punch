# 잼통펀치 백엔드 상세 구현 설계 (Firebase)

- 상태: 운영 인프라 및 CMS 등록 화면 배포 완료, 최초 콘텐츠 등록 대기 중 (rev. 3)
- 상위 문서: [`implementation-design.md`](./implementation-design.md) — 이 문서는 그 문서의 8·9·10·12·13장을 구현 수준으로 푼 것이다
- 전제: Firebase (Auth · Firestore · App Check · Storage · App Hosting) + Cloud Scheduler
- 작성일: 2026-09-20

## 0. 개정 이력

### rev. 3 — 운영 CMS

콘텐츠를 코드 배열에 넣어 배포하는 방식은 운영 UI 등록 요구와 맞지 않는다. `contentSubjects`·`contentSources`·`contentRecords`·`contentBrackets`를 Firestore 신뢰 원천으로 바꾸고, `/ops/content`에서 `ops` 운영자가 등록·수정·공개·보관한다. 클라이언트 Firestore 쓰기는 여전히 전부 차단하고, 콘텐츠 변경도 App Check·ID 토큰·Custom Claim을 확인하는 Route Handler만 수행한다.

등록 화면은 문서 ID와 slug를 자동 생성하고, 대상 종류별 분류를 선택하게 한다. 이미지는 파일 선택 또는 붙여넣기로 `/api/ops/media`에 올린다. 이 경로는 JPEG·PNG·WebP와 5 MiB 이하만 받고, 서버가 `public/content/`에 쓴 뒤 공개 URL을 돌려준다. 사진의 원 출처 URL과 권리 상태는 별도 필수 항목으로 남겨 업로드 자체가 출처 확인을 대체하지 않게 한다.

### rev. 2 — 비용 최소 구조

첫 판은 집계가 **대상 수에 비례해** 돌았다. 아무도 참여하지 않아도 매분 비용이 나갔다. 그 고정 비용을 걷어내고, 참여 1건당 읽기도 절반으로 줄였다.

| 항목 | rev. 1 | rev. 2 | 효과 |
| --- | --- | --- | --- |
| 롤업 파티션 | 16개 팬아웃, 각각 리스 | 워커 1개. `shard` 필드는 심어만 둠 | 유휴 분당 32읽기+16쓰기 → **2읽기+0쓰기** (5.2.1) |
| 리스 획득 | 실행마다 먼저 잡음 | **일이 있을 때만** 잡음 | 유휴 쓰기 1,440/일 → **0** (5.5) |
| `index-stats` 크론 | 5분마다 `_index` 재생성 | 롤업 배치에 합침 | 주기 작업 하나 소멸 (5.4) |
| 재계산 | 매일 원장 전량 | 1단계 불변식 검사 + 2단계 선택 재구축 | 190만 읽기/일 → **활동한 대상 × 31** (5.7) |
| 롤업의 직전 상태 조회 | `subjectMembers` 문서 읽기 | 원장의 `prev` 필드 | 참여 1건당 읽기 2 → **1** (5.3) |
| 요청 경로 읽기 | 대상마다 1회 (`N+2`) | 상태 맵 1문서 (`3+K`) | 스와이프 25장 읽기 27 → **3** (6.1) |
| 파생 컬렉션 | 5개 | **4개** (`subjectMembers` 제거) | 재계산·규칙 대상이 하나 줄어듦 |
| 인덱스 | `(shard,updatedAt)` 포함 4개 | 2개 + 필드 예외 처리 | 쓰기마다 붙는 색인 항목 감소 (8장) |

유휴 비용은 **하루 약 1,450 읽기 · 0 쓰기**가 됐다. 무료 할당 안이고, 대상이 10명이든 500명이든 같다.

## 1. 범위와 전제

이 문서가 정하는 것: 컬렉션 스펙, 집계 알고리즘, API 계약, 보안 규칙, 인덱스, 크론, 테스트, 배포.

이 문서가 정하지 않는 것: 화면, 게임 내부 로직, 콘텐츠 스키마(상위 문서 6장).

전제 넷을 먼저 못박는다.

1. **서버 코드는 전부 Next.js Route Handler다.** Cloud Functions는 없다(상위 2장). App Hosting의 Cloud Run 인스턴스가 서비스 계정으로 돌고, 그 안에서 Admin SDK가 ADC로 붙는다.
2. **클라이언트는 Firestore에 직접 쓰지 않는다.** 단 하나의 예외도 두지 않는다. 읽기는 공개 집계에만 허용한다.
3. **집계 문서마다 작성자는 롤업 하나뿐이다.** 이것이 문서당 쓰기 한도 문제를 푸는 방식이다(5.2).
4. **비용은 참여량에만 비례한다.** 대상 수에 비례하는 주기 작업을 두지 않는다. 아무도 오지 않은 날의 비용은 0에 가까워야 한다(11.1).

## 2. 프로젝트·리전·환경

| 항목 | 값 | 비고 |
| --- | --- | --- |
| Firebase 프로젝트 | `jamtong-punch` (prod), `jamtong-punch-dev` (preview·CI) | 프로젝트를 나눈다. 같은 프로젝트에서 규칙을 실험하면 운영 데이터가 위험하다 |
| Firestore 모드 | Native | |
| Firestore 리전 | `asia-northeast3` (서울) | 생성 후 변경 불가 |
| App Hosting 리전 | `asia-east1` (대만) | 2026-09-20에 생성 완료. App Hosting은 `asia-northeast3`(서울)를 지원하지 않으므로 Firestore와 지역 간 왕복이 생긴다 |
| Storage 버킷 | 기본 버킷 + `public` 접두 경로 | |
| 결제 | Blaze | App Hosting·Scheduler에 필요 |

> 운영 배포 기준 URL은 `https://jamtong-punch--jamtong-punch.asia-east1.hosted.app`이다. 커스텀 도메인을 연결하면 reCAPTCHA Enterprise 허용 도메인, `NEXT_PUBLIC_SITE_URL`, `CRON_AUDIENCE`를 함께 교체한 뒤 사전검증을 다시 통과시킨다.

환경은 셋이다.

- **local** — Firebase Emulator Suite (Auth·Firestore·Storage). App Check는 디버그 토큰.
- **preview** — `jamtong-punch-dev` + App Hosting 프리뷰 채널. 실제 콘텐츠 대신 시드 데이터.
- **prod** — `jamtong-punch`.

## 3. 인증과 신뢰 경계

### 3.1 사용자 인증

Anonymous Auth로 시작하고, 선택적 로그인은 아직 붙이지 않는다(상위 16장 1번).

클라이언트는 모든 쓰기 API 호출에 두 개의 헤더를 싣는다.

```http
Authorization: Bearer <Firebase ID token>
X-Firebase-AppCheck: <App Check limited-use token>
```

서버는 순서대로 검증한다.

```ts
// lib/firebase/admin.ts
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAppCheck } from "firebase-admin/app-check";

// App Hosting의 Cloud Run 인스턴스는 서비스 계정으로 돈다.
// 자격증명을 코드나 환경변수로 넣지 않는다 — ADC가 집어 간다.
if (!getApps().length) initializeApp();

export const auth = getAuth();
export const db = getFirestore();
export const appCheck = getAppCheck();
```

```ts
// lib/guard/identity.ts
export async function verifyCaller(req: Request) {
  const appCheckToken = req.headers.get("x-firebase-appcheck");
  if (!appCheckToken) throw new Refusal(401, "app-check-missing");

  // consume: true 는 재사용을 막는다. 클라이언트는 getLimitedUseToken()으로 받아야 한다.
  const checked = await appCheck.verifyToken(appCheckToken, { consume: true });
  if (checked.alreadyConsumed) throw new Refusal(401, "app-check-replay");

  const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!bearer) throw new Refusal(401, "auth-missing");
  const decoded = await auth.verifyIdToken(bearer);

  return { uid: decoded.uid, isOps: decoded.ops === true };
}
```

`consume: true`를 쓰는 이유: 일반 App Check 토큰은 유효기간 동안 재사용할 수 있다. 참여 제출처럼 한 번만 일어나야 하는 요청에서는 토큰 하나로 수십 번 때리는 것을 막아야 한다. 대가는 클라이언트가 매번 `getLimitedUseToken()`을 호출해야 한다는 것 — 읽기 요청에는 쓰지 않는다.

App Check는 **enforce**로 둔다. monitor 모드는 로그만 남기므로 켜 놓고 막고 있다고 착각하기 쉽다.

### 3.2 운영자 권한

Custom Claim `ops: true` 하나뿐이다. 역할을 더 쪼개지 않는다 — 콘텐츠 권한은 git 저장소 쓰기 권한이 대신한다(상위 10장).

```ts
// scripts/grant-ops.ts
const uid = process.argv[2];
await auth.setCustomUserClaims(uid, { ops: true });
// 클레임은 다음 ID 토큰 갱신부터 유효하다. 부여 직후에는 로그아웃/재로그인이 필요하다.
```

### 3.3 크론 호출자

Cloud Scheduler가 OIDC 토큰으로 `/api/cron/*`를 호출한다. 서버는 Firebase가 아니라 Google OAuth로 검증한다.

```ts
// lib/guard/cron.ts
import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client();

export async function verifyCron(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new Refusal(401, "cron-auth-missing");

  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.CRON_AUDIENCE!,   // 스케줄러에 설정한 audience
  });
  const payload = ticket.getPayload();
  if (payload?.email !== process.env.CRON_SERVICE_ACCOUNT) {
    throw new Refusal(403, "cron-wrong-caller");
  }
}
```

크론 라우트는 `robots`·사이트맵에서 제외하고, 실패해도 본문을 돌려주지 않는다.

## 4. Firestore 컬렉션 명세

원장(사실)과 파생(계산 결과)을 이름으로 구분한다. 파생은 언제든 지우고 다시 만들 수 있어야 한다.

### 4.1 원장

| 경로 | 문서 ID | 성격 |
| --- | --- | --- |
| `users/{uid}/stances/{subjectId}_{date}` | 대상+날짜 | **신뢰 원천.** 그 사람의 그날 그 대상에 대한 입장 |
| `users/{uid}/sessions/{sessionId}` | 클라이언트 UUID | 멱등 가드 + 제출 결과 캐시 |
| `users/{uid}/comparisons/{sessionId}_{matchIndex}` | 세션+경기 번호 | 월드컵 비교 결과 |
| `users/{uid}/daily/{date}` | KST 날짜 | 개인 일일 카운터(상한 판정) |
| `users/{uid}/state/subjects` | 고정 | 대상별 최신 입장 맵. 읽기를 3회로 고정하는 장치(6.1) |
| `reports/{reportId}` | 자동 | 신고 |
| `contentSubjects/{id}` | 콘텐츠 ID | 인물·정책 CMS 문서 |
| `contentSources/{id}` | 콘텐츠 ID | 출처 CMS 문서 |
| `contentRecords/{id}` | 콘텐츠 ID | 기록 CMS 문서 |
| `contentBrackets/{id}` | 콘텐츠 ID | 월드컵 CMS 문서 |

```ts
// users/{uid}/stances/{subjectId}_{date}
{
  subjectId: string            // people/policies slug
  kind: "person" | "policy"
  shard: number                // hash(subjectId) % 16. 지금은 안 쓰고 심어만 둔다 (5.2.1)
  date: string                 // "YYYY-MM-DD", Asia/Seoul
  stance: "punch" | "cheer" | "unknown"
  game: "reflex" | "swipe" | "static"

  // 직전 상태. 롤업이 이 문서 하나만으로 델타를 계산하게 해 준다 (5.3)
  prev: { stance: "punch" | "cheer" | "unknown"; date: string; game?: "reflex" | "swipe" | "static" } | null

  recordId: string | null      // 반사 게임이 띄운 발언·행동 카드
  sessionId: string            // 이 입장을 마지막으로 만든 세션
  score: number | null         // 개인 기록. 집계에 쓰지 않는다
  excluded: boolean            // 이상 판정. 지우지 않는다
  createdAt: Timestamp
  updatedAt: Timestamp         // 롤업 커서의 기준
  rolledUpAt: Timestamp | null // 집계에 반영된 시점. null이면 미반영
}

// users/{uid}/state/subjects   — 문서 하나. 대상마다 항목 하나
{
  m: { [subjectId: string]: { s: "punch"|"cheer"|"unknown"; d: string } }
  updatedAt: Timestamp
}

// users/{uid}/sessions/{sessionId}
{
  game: "reflex" | "swipe" | "worldcup" | "static"
  subjectIds: string[]
  startedAt: Timestamp         // 클라이언트가 보낸 값 (이상치 판정용, 신뢰하지 않음)
  receivedAt: Timestamp        // 서버 시각
  result: {                    // 재시도에 그대로 돌려줄 응답
    accepted: string[]
    replaced: string[]
    capped: string[]
  }
  expiresAt: Timestamp         // TTL 30일
}

// users/{uid}/daily/{date}
{
  stances: number              // 오늘 입장을 낸 대상 수
  sessions: number
  perSubject: { [subjectId: string]: number }   // 번복 횟수
  expiresAt: Timestamp         // TTL 30일
}
```

`perSubject` 맵은 하루치라 크기가 상한(60)에 묶인다. `state/subjects`의 `m`은 참여한 대상 수만큼 늘지만 1,000개에서 잘라낸다(6.1).

`prev`는 파생처럼 보이지만 원장에 둔다. 요청 시점의 사실을 기록한 것이고, 나중에 다시 계산할 수 없기 때문이다. 같은 날 이미 롤업된 입장을 바꿀 때만 `game`도 보관한다. 그래야 `dailyStats.byGame`에서 이전 게임의 1건을 정확히 뺄 수 있다.

### 4.2 파생

| 경로 | 뜻 | 작성자 |
| --- | --- | --- |
| `subjectCohorts/{subjectId}_{date}` | 그 대상에 대해 `최신 참여일 == date`인 사람 수 | 롤업만 |
| `dailyStats/{subjectId}_{date}` | 그날의 활동(스파크라인용) | 롤업만 |
| `subjectStats/{subjectId}` | 공개 수치 | 롤업만 |
| `subjectStats/_index` | 탐색 화면용 요약 묶음 | 롤업만 |

파생은 넷이다. 이전 판의 `subjectMembers`는 없앴다 — 그 정보가 `prev`로 원장에 들어갔고(5.3), 사용자 쪽 사본은 `state/subjects`가 들고 있다. 파생을 하나 줄이면 롤업의 읽기가 참여 1건당 1회 줄고, 재계산해야 할 대상도 하나 준다.

```ts
// subjectCohorts/{subjectId}_{date}
{ subjectId: string, date: string, punch: number, cheer: number, unknown: number }

// dailyStats/{subjectId}_{date}
{
  subjectId: string, date: string,
  punch: number, cheer: number, unknown: number, excluded: number,
  byGame: { reflex: number, swipe: number, static: number },
  computedAt: Timestamp
}

// subjectStats/{subjectId}
{
  windows: {
    d7:  { punch: number, cheer: number, unknown: number }
    d30: { punch: number, cheer: number, unknown: number }
    all: { punch: number, cheer: number, unknown: number }
  }
  spark: number[]              // 최근 30일 일별 참여자 수
  computedAt: Timestamp
  schemaVersion: 2
}

// subjectStats/_index   — 탐색 화면이 문서 1개로 읽는 묶음. 롤업이 같은 배치에서 갱신 (5.4)
{ s: { [subjectId: string]: { d30: { punch: number, cheer: number, unknown: number } } }, computedAt: Timestamp }
```

비율·인지도·마스킹은 **저장하지 않는다.** 읽는 쪽에서 계산한다. 규칙이 바뀌면 저장된 값은 조용히 낡고, 화면은 그걸 모른 채 그린다.

```ts
// lib/stats/present.ts — 상위 3장의 규칙을 구현하는 유일한 지점
export function present(w: { punch: number; cheer: number; unknown: number }) {
  const voters = w.punch + w.cheer;           // "잘 모름"은 분모에서 뺀다
  const reached = voters + w.unknown;
  return {
    n: voters,
    ratio: voters >= 30 ? Math.round((w.punch / voters) * 100) : null,
    awareness: reached >= 30 ? Math.round((voters / reached) * 100) : null,
  };
}
```

### 4.3 서버 전용

```ts
// 남용 방지 카운터 — 유일하게 샤딩하는 곳 (5.9)
// 쓰기: 무작위 샤드. 읽기: 롤업이 만든 요약 문서 하나.
abuse/{yyyymmdd}/ip/{ipHash}/shards/{0..9}
{ newUids: number, submits: number, expiresAt: Timestamp }

abuse/{yyyymmdd}/ip/{ipHash}                    // 요약. 롤업만 쓴다
{ newUids: number, submits: number, summarizedAt: Timestamp, expiresAt: Timestamp }

// system/rollup   — 커서와 리스. 문서 하나다 (5.5)
{
  cursor: Timestamp        // 마지막으로 처리한 updatedAt
  cursorPath: string       // 같은 Timestamp 안에서의 문서 경로 tie-breaker
  leaseUntil: Timestamp    // 동시 실행 방지. 일이 있을 때만 잡는다
  lastRunAt: Timestamp
  processed: number
  backlog: number          // 이번 실행에서 못 비운 추정치
}

// system/reconcileQueue/subjects/{subjectId}  — 2단계 재계산 대상 (5.7)
{ reason: "drift" | "ops-exclude" | "user-delete" | "rotation", queuedAt: Timestamp }

// system/flags
{ ratiosHidden: boolean, hiddenSubjects: string[] }   // 선거기간 토글(상위 11장)
```

`ipHash`는 일별 솔트 + `IP_HASH_PEPPER`로 해시한 값의 앞 16자다. 원문 IP는 어디에도 저장하지 않는다.

여기만 샤딩하는 이유는 여기만 **여러 요청 프로세스가 같은 문서에 직접 쓰기** 때문이다. 한국 이동통신의 CGNAT 때문에 해시 하나가 수천 명을 가리킬 수 있어 초당 1회를 쉽게 넘는다. 나머지 카운터는 전부 롤업 단독 작성자라 흩을 이유가 없다(5.2).

### 4.4 TTL

Firestore TTL 정책을 `expiresAt` 필드에 건다.

| 컬렉션 그룹 | 필드 | 보관 |
| --- | --- | --- |
| `sessions` | `expiresAt` | 30일 — 멱등 창을 넘으면 필요 없다 |
| `daily` | `expiresAt` | 30일 |
| `ip` | `expiresAt` | 7일 — 상위 10장의 약속 |

TTL 삭제는 즉시가 아니다(수 시간 지연). 개인정보 약속을 적을 때 "7일 이내"가 아니라 "7일 뒤 자동 삭제"로 쓴다.

## 5. 집계 설계 — 왜 이렇게 하는가

이 장이 백엔드에서 가장 어려운 부분이다. 문제는 두 개다.

**문제 1 — 문서당 쓰기 한도.** Firestore는 문서 하나에 지속 쓰기가 초당 약 1회다. 뉴스가 터진 인물에게 초당 수십 건이 들어오면, 요청마다 `subjectStats`를 갱신하는 설계는 경합으로 무너진다.

**문제 2 — 1인 1표를 창(window)으로 세기.** 상위 3장은 "기간 내 한 사람은 1표, 입장이 바뀌었으면 가장 최근 것"이라고 정했다. 일별 카운트를 더하면 같은 사람이 여러 번 세어진다. 그렇다고 창마다 전체 참여자를 훑으면 인기 대상에서 수만 건을 매분 읽는다.

### 5.1 코호트 분해

어떤 사람의 어떤 대상에 대한 **최신 참여일**을 `last`라고 하자. 그러면:

```text
last ≥ cutoff  ⟺  그 사람은 창 안에 참여했다
                  그리고 그때의 stance가 창 안에서의 최신 입장이다
```

`last`는 **전체 기간의 최댓값**이므로, 그것이 cutoff보다 앞서면 창 안에 아무 참여도 없다. 뒤면 창 안에 있고, 최신 입장이 곧 그 stance다. 따라서

```text
window(W)[stance] = Σ  cohort[S][d][stance]      (d ∈ [today-W+1, today])
```

`cohort[S][d]`는 "S에 대해 `last == d`인 사람 수"다. 창 계산이 덧셈이 된다.

`last`와 그때의 stance를 어디에 두느냐가 남는데, **아무 데도 따로 두지 않는다.** 요청 시점에는 사용자의 상태 맵(6.1)이, 롤업 시점에는 원장의 `prev`(5.3)가 그 값을 들고 있다. 대상별 회원 명부를 따로 만들면 참여 1건마다 읽기가 하나 더 붙는다.

### 5.2 단일 작성자 롤업, 그리고 샤딩은 어디에 쓰는가

요청 경로는 **원장만** 쓴다. 원장은 `users/{uid}` 아래라 uid로 자연히 흩어져 경합이 없다.

1분마다 도는 롤업이 변경분을 읽어 파생을 갱신한다. 이게 문제 1의 답이다 — 1분 동안 같은 대상에 1,000건이 들어와도 롤업은 그것을 메모리에서 합쳐 **집계 문서당 1회** 쓴다. 초당 쓰기 한도는 분당 1회 쓰기 앞에서 의미가 없다.

```text
요청     원장 쓰기 (uid별, 경합 없음)
  ↓
롤업     변경된 원장 읽기 → 대상별로 델타 합산 → 배치 1회 쓰기
  ↓
화면     subjectStats 읽기 (60초 캐시)
```

**그래서 집계 문서에는 샤드가 필요 없다.** punchpol은 같은 문제를 `characterStats/{id}/shards/{0..9}`로 풀었는데, 그것은 여러 클라이언트가 같은 카운터에 직접 쓰기 때문이다. 작성자가 하나면 흩을 이유가 없고, 흩으면 읽을 때 10배를 읽어야 한다. 자세한 비교는 5.9에 있다.

### 5.2.1 파티셔닝은 심어만 두고 켜지 않는다

단일 작성자 설계의 진짜 한계는 경합이 아니라 **처리량**이다. 워커 하나가 1분치 변경분을 1분 안에 못 비우면 백로그가 쌓이고, 수치 지연이 분 단위로 늘어난다. punchpol의 샤딩 아이디어를 옮긴다면 카운터가 아니라 **작업**에 적용하는 것이 맞다.

```text
원장 쓰기 시:  shard = hash(subjectId) % 16      // 문서에 함께 저장
워커 p:        where("shard", "==", part) 인 것만 처리
```

**대상(subjectId) 기준으로 나눈다.** uid 기준으로 나누면 같은 대상의 이벤트가 여러 워커에 흩어지고, 그러면 `subjectCohorts`·`subjectStats`에 다시 경합이 생긴다. 대상 기준이면 한 대상의 모든 이벤트가 한 워커에만 가므로 "집계 문서당 작성자 하나"가 유지된다.

**그런데 출시에는 켜지 않는다.** 파티션 16개에 각각 리스를 걸면 아무도 안 와도 분당 32 읽기 + 16 쓰기가 나간다. 하루 46,000 읽기 + 23,000 쓰기 — 트래픽이 0인 날에도 무료 할당을 거의 다 쓴다. 지금 필요하지 않은 처리량을 위해 매일 그 돈을 낼 이유가 없다.

그래서 출시 구성은 이렇다.

| | 출시 | 나중에 |
| --- | --- | --- |
| 원장의 `shard` 필드 | **쓴다** | 쓴다 |
| 질의의 `shard` 필터 | 없음 | `where("shard", "==", p)` |
| `(shard, updatedAt)` 인덱스 | 만들지 않음 | 만든다 |
| 커서·리스 | `system/rollup` 하나 | `system/rollup/partitions/{p}` |
| 스케줄러 작업 | 1개 | W개 |

전환에 필요한 것은 인덱스 빌드와 스케줄러 작업 추가뿐이다. **데이터 이동도, 리샤딩도, 원장 재작성도 없다** — `shard` 값이 이미 모든 문서에 들어 있기 때문이다. 필드 하나의 저장 비용을 미리 내고 나중의 마이그레이션을 통째로 사는 거래다.

파티션 수는 16으로 고정하고 영원히 바꾸지 않는다. punchpol은 `SHARD_COUNT`를 환경변수로 읽는데(`process.env.SHARD_COUNT || '10'`), 그 값을 운영 중에 바꾸면 이미 쓰인 샤드와 어긋난다.

### 5.3 델타 적용 규칙 — 조회 없이

롤업이 처리하는 원장 문서는 **자기 자신만으로 완결된다.** 요청 트랜잭션이 상태 맵(6.1)을 이미 읽었으므로, 그때 알고 있던 "직전 상태"를 문서에 같이 박아 둔다.

```ts
// 원장 문서 안
prev: { stance: "cheer", date: "2026-08-14" } | null
```

`prev`가 있으니 롤업은 `subjectMembers` 같은 것을 조회할 필요가 없다. **이것이 참여 1건당 읽기를 2에서 1로 줄인 지점이다**(11.2). 그리고 파생 컬렉션이 하나 통째로 사라진다.

```text
e = 변경된 원장 1건 (uid, S, d, stance, prev, game, excluded)

if e.excluded:
    dailyStats[S][d].excluded += 1
    끝

if e.prev 있고 e.prev.date > d:
    // 과거 날짜가 뒤늦게 들어온 경우. 최신 입장은 그대로다.
    dailyStats[S][d] 만 갱신하고 끝

if e.prev 있음:
    cohort[S][e.prev.date][e.prev.stance] -= 1
    for W in {7, 30}: if e.prev.date ≥ cutoff(W): window[W][e.prev.stance] -= 1
    all[e.prev.stance] -= 1

cohort[S][d][e.stance] += 1
for W in {7, 30}: if d ≥ cutoff(W): window[W][e.stance] += 1
all[e.stance] += 1

dailyStats[S][d]:
    if e.prev 있고 e.prev.date == d:  그날 안의 번복 → -1 e.prev.stance, +1 e.stance
    else:                              +1 e.stance
    byGame[e.game] 도 같은 방식
```

#### `prev`가 가리키는 시점

`prev`는 "지금 상태"가 아니라 **"아직 집계에 반영되지 않은 것을 뺀 상태"** 여야 한다. 하루에 두 번 참여한 경우를 보면 왜 그런지 나온다.

```text
초기 상태: (cheer, 09-10)  — 이미 집계에 반영됨

쓰기 1 (오늘, punch):  prev = (cheer, 09-10)        ← 상태 맵 값 그대로
쓰기 2 (오늘, cheer):  prev = ???
```

쓰기 2가 상태 맵을 그대로 쓰면 `prev = (punch, today)`가 된다. 그런데 롤업이 아직 쓰기 1을 안 봤다면 `cohort[today][punch]`는 올라간 적이 없다. 그것을 빼는 델타는 틀린다.

그래서 규칙은 하나다.

> 오늘 문서가 **이미 있고 `rolledUpAt == null`** 이면, 그 문서의 `prev`를 그대로 물려받는다. 아니면 상태 맵 값을 쓴다.

쓰기 2의 `prev`는 `(cheer, 09-10)`이 되고, 롤업은 `cohort[09-10][cheer] -1, cohort[today][cheer] +1`을 적용한다. 정확하다.

이 판정에 필요한 읽기가 6.1의 `K`다 — 오늘 이미 손댄 대상만 읽으면 되고, 스와이프에서는 보통 0이다.

### 5.4 정확히 한 번, 그리고 `_index`

증분은 두 번 적용되면 틀린다. 그래서 **원장의 `rolledUpAt` 갱신을 같은 배치에 넣는다.**

```text
batch = [
  subjectCohorts/...  increment,
  dailyStats/...      increment,
  subjectStats/{S}    increment,          // 대상별로 합산해 1회
  subjectStats/_index set(merge),         // 이 실행에서 건드린 대상만
  users/*/stances/... update { rolledUpAt: e.updatedAt },   // 처리한 원장 전부
  system/rollup       update { cursor, lastRunAt, processed },
]
batch.commit()
```

Firestore 배치는 원자적이다. 실패하면 아무것도 적용되지 않고 커서도 전진하지 않으므로, 다음 실행이 같은 원장을 다시 집는다. 성공하면 `rolledUpAt == updatedAt`이 되어 다시 집히지 않는다.

`_index`를 여기에 넣은 것이 크론 하나를 없앤 방법이다. 5분마다 도는 `index-stats` 작업 대신, **일이 있을 때만** 같은 배치에서 갱신한다. 유휴 시간에는 쓰기가 0이다.

배치 상한은 500 연산이다. 최악에는 원장 1건이 이전·현재 코호트, 일별 통계, 대상 통계, 인덱스, 원장 표시까지 6개 연산을 쓸 수 있으므로 한 번에 **80건**씩 끊는다.

### 5.5 커서와 리스 — 일이 있을 때만 잡는다

```ts
// system/rollup  (문서 하나)
{ cursor: Timestamp, cursorPath: string, leaseUntil: Timestamp, lastRunAt: Timestamp, processed: number, backlog: number }
```

순서가 중요하다. **질의를 먼저 하고, 결과가 있을 때만 리스를 잡는다.**

```ts
export async function rollupOnce() {
  const state = await db.doc("system/rollup").get();          // 읽기 1
  const cursor = state.get("cursor");
  const cursorPath = state.get("cursorPath");

  let changed = db.collectionGroup("stances")
    .orderBy("updatedAt")
    .orderBy(FieldPath.documentId());
  if (cursor && cursorPath) changed = changed.startAfter(cursor, cursorPath);
  else if (cursor) changed = changed.where("updatedAt", ">", cursor); // timestamp-only cursor migration
  const pending = await changed
    .limit(80)
    .get();                                                   // 읽기 1 (빈 결과도 1회 과금)

  if (pending.empty) return { processed: 0 };                 // 쓰기 0으로 끝

  if (!(await acquireLease())) return { skipped: "busy" };
  // ... 5.3 델타 적용 → 5.4 배치 커밋
}
```

`updatedAt`만으로 커서를 만들면 같은 밀리초에 저장된 문서 중 첫 페이지 밖의 항목을 영구히 건너뛸 수 있다. 그래서 정렬·커서는 `(updatedAt, documentPath)` 쌍이다. 기존 배포본의 timestamp-only 커서는 한 번만 `updatedAt > cursor` 경로를 거친 뒤 새 형식으로 전환한다.

유휴 비용이 **분당 읽기 2 · 쓰기 0**이다. 리스를 먼저 잡는 구조였다면 분당 쓰기 1이 붙어 하루 1,440 쓰기가 아무 일 없이 나갔다.

동시 실행 위험은 이렇게 다룬다. 스케줄러는 실행이 1분을 넘겨도 다음 트리거를 보낸다. 둘 다 같은 커서를 읽고 같은 80건을 집을 수 있지만, 리스를 잡는 쪽만 진행한다. 리스를 못 잡은 쪽은 조용히 끝낸다 — 오류가 아니다.

```ts
async function acquireLease() {
  return db.runTransaction(async (tx) => {
    const ref = db.doc("system/rollup");
    const snap = await tx.get(ref);
    if ((snap.get("leaseUntil")?.toMillis() ?? 0) > Date.now()) return false;
    tx.set(ref, { leaseUntil: Timestamp.fromMillis(Date.now() + 120_000) }, { merge: true });
    return true;
  });
}
```

리스가 걸린 채 프로세스가 죽으면 2분 뒤 자동으로 풀린다. 리스를 못 잡은 실행이 연속 5회면 백로그 경보를 올린다.

배치가 80건을 꽉 채웠으면 아직 남았다는 뜻이므로, 같은 실행 안에서 리스를 쥔 채 **최대 10회까지 이어서 돈다**(한 번에 800건). 그래도 남으면 `backlog`에 기록하고 다음 분에 넘긴다.

### 5.5.1 IP 샤드 합산

같은 롤업 실행에서 `abuse` 샤드도 접는다. 롤업은 이미 단일 작성자이므로 요약 문서에 경합이 없다.

```text
오늘 쓰기가 있었던 abuse/{date}/ip/{hash}/shards/* 를 모아
  → abuse/{date}/ip/{hash} 에 { newUids, submits, summarizedAt } 로 덮어쓴다
```

**이것도 일이 있을 때만 한다.** 마지막 합산 이후 새 원장이 없었다면 IP 샤드도 움직이지 않았다는 뜻이므로 건너뛴다. 요청 경로는 이 요약 하나만 읽는다(6.1).

### 5.6 만료 — 창에서 떨어져 나가는 날

창은 증분만으로는 줄어들지 않는다. 매일 KST 00:05에 만료 작업이 돈다.

```text
POST /api/cron/expire     (매일 00:05 Asia/Seoul)

for W in {7, 30}:
    d_out = today - W
    subjectCohorts where date == d_out     ← 그날 활동이 있었던 대상만 걸린다
        window[W] -= cohort[d_out]
```

질의 둘이 전부다. **대상 수가 아니라 그날 활동한 대상 수에 비례한다** — 아무도 안 온 날이 30일 전이면 읽기 2회로 끝난다.

`all` 창은 만료가 없다. 유지 기간을 자를지는 상위 16장 7번에서 정한다.

### 5.7 재계산 — 두 단계로 나눠 비용을 가둔다

증분 집계는 언젠가 어긋난다. 버그, 부분 실패, 운영자의 소급 제외 판정, 상태 맵 절삭(6.1) 때문이다. 그래서 **원장에서 다시 만드는 경로**를 처음부터 만든다.

문제는 비용이다. 원장 전체를 매일 읽으면 3,000 DAU · 30일 보관 기준으로 190만 읽기가 매일 나간다. 트래픽 비용보다 검증 비용이 더 큰 구조다. 그래서 두 단계로 나눈다.

**1단계 — 불변식 검사 (매일, 그날 바뀐 대상만).**

```text
for S in 오늘 롤업이 건드린 대상:
    cohorts = subjectCohorts where subjectId == S and date in [today-29 … today]   ← 30 읽기
    assert window[d30] == Σ cohorts
    assert window[d7]  == Σ cohorts[today-6 …]
    어긋나면 → 2단계 큐에 넣는다
```

원장을 읽지 않는다. 대상 하나당 30 읽기 + `subjectStats` 1 읽기. 하루에 50개 대상이 활동했다면 1,550 읽기다. **활동이 없으면 0이다.**

이 검사가 잡는 것: 창 카운터의 드리프트, 만료 작업의 누락, 배치 부분 실패. 못 잡는 것: 코호트 자체가 틀린 경우 — 그건 2단계가 잡는다.

**2단계 — 원장에서 재구축 (필요할 때만).**

```text
트리거: ① 1단계가 어긋남을 발견  ② 운영자가 소급 제외를 누름
        ③ /api/me 삭제가 일어남   ④ 순번 — 매일 대상 N개씩 돌아가며

대상 S에 대해:
  1. collectionGroup("stances").where("subjectId","==",S) 를 페이지 단위로 전부 읽는다
  2. uid별 최신(날짜 최대) 입장을 접는다
  3. 거기서 cohort 를 다시 센다
  4. cohort 에서 window·all 을 다시 더한다
  5. 기존 값과 비교해 차이를 로그로 남기고 덮어쓴다
```

순번(④)은 **읽기 예산**으로 제어한다. 하루 5만 읽기를 상한으로 두고, 그 안에 들어가는 만큼만 돈다. 대상 50개면 전부 매일, 500개면 열흘에 한 바퀴다. 예산은 환경변수로 조절한다.

운영자가 참여를 소급 제외하면 그 대상을 2단계 큐에 넣는다. 제외를 증분으로 되돌리려 하지 않는다 — 되돌리기는 항상 앞으로 가기보다 어렵고, 틀리면 조용히 틀린다.

### 5.8 이 설계가 포기하는 것

- **실시간이 아니다.** 공개 수치는 최대 1분 늦다. 화면에 `computedAt` 기준을 적고, 방금 낸 내 입장만 클라이언트가 낙관적으로 얹는다.
- **롤업이 멈추면 수치가 멈춘다.** 원장은 계속 쌓이지만 화면은 그대로다. 출시 구성은 워커 하나이므로 그것이 단일 장애점이다. 나중에 파티셔닝을 켜도 처리량이 늘 뿐 가용성은 그대로다 — 워커들이 같은 배포본이기 때문이다. 백로그 경보가 이것을 잡고, 원장이 신뢰 원천이므로 복구하면 따라잡는다.
- **`unknown`을 포함한 창 인원은 인지도에만 쓴다.** 비율의 분모는 `punch + cheer`다(상위 3장).

### 5.9 punchpol의 분산 카운터에서 무엇을 가져오고 무엇을 안 가져오는가

punchpol은 같은 문제(문서당 쓰기 한도)를 **분산 카운터**로 풀었다. 구현이 저장소에 있으므로 추측 대신 코드를 읽었다.

```text
characterStats/{id}/shards/{0..9}          registerCharacter.ts 가 등록 시 10개 생성
actionStats/{id}/shards/{0..9}             registerAction.ts 가 동일
dailyStats/{date}/shards/shard_{0..9}      issuePoints.ts 의 updateDistributedCounter()
                                           → Math.floor(Math.random() * SHARD_COUNT)
aggregatePunchCounts (1분)                 모든 stats 문서 + 각 샤드 10개를 읽어 합산
```

**가져오는 것 — 쓰기를 흩고 읽기를 합친다.**

경합이 실제로 생기는 지점에는 이 패턴이 맞다. 이 설계에서 그런 지점은 하나다: `abuse/{date}/ip/{hash}`. 한국 이동통신의 CGNAT 때문에 해시 하나가 수천 명을 가리킬 수 있어 초당 1회를 쉽게 넘는다. 여기에 punchpol의 방식을 그대로 쓴다(4.3).

**안 가져오는 것 — 집계 문서의 샤딩.**

`subjectStats`·`subjectCohorts`·`dailyStats`에는 샤드를 두지 않는다. 작성자가 롤업 워커 하나뿐이라 경합이 애초에 없기 때문이다. 샤드를 두면 얻는 것 없이 읽기 비용만 대상당 10배가 된다.

punchpol의 집계 함수가 그 비용을 보여 준다.

```js
// docs/new_schema.md 의 aggregatePunchCounts
const statsSnapshot = await db.collection(collectionName).get();   // 전량 스캔
for (const statDoc of statsSnapshot.docs) {
  const shardsSnapshot = await statDoc.ref.collection('shards').get();  // + 10
  ...
}
```

변경 여부와 무관하게 매분 `대상 수 × 11`을 읽는다. 아무도 참여하지 않은 인물도 매분 11번 읽힌다. 커서 기반 변경분 탐색(5.5)은 이 비용을 참여량에 비례하게 바꾼다.

**punchpol에서 배우는 세 가지 함정.**

1. **샤드를 만들어 놓고 핫 패스가 쓰지 않으면 진실 원천이 둘이 된다.** `registerCharacter.ts`는 샤드 10개를 만들지만, `issuePoints.ts`의 실제 펀치 경로는 `characterStats/{id}`의 `directPunchStats.totalPunches`에 직접 `increment`한다. 그리고 `acp/services.ts`는 샤드 합을 읽되 "샤드가 비었으면 문서 필드로 폴백"한다. 어느 쪽이 맞는 값인지 코드가 모른다. → **폴백은 불일치를 감춘다.** 이 설계에서는 파생의 작성자를 컬렉션마다 한 곳으로 고정하고(4.2 표), 폴백 경로를 두지 않는다.
2. **트랜잭션 밖 증분은 원장과 갈라진다.** `updateDistributedCounter`는 포인트 트랜잭션이 끝난 뒤 호출된다. 그 사이에 실패하면 원장과 카운터가 어긋나고, punchpol에는 원장에서 다시 만드는 경로가 없어 영구히 어긋난다. → 이 설계는 증분과 `rolledUpAt`을 한 배치에 넣고(5.4), 그래도 어긋날 것을 전제로 재계산을 둔다(5.7).
3. **샤드 수를 런타임에 바꾸면 안 된다.** punchpol은 `SHARD_COUNT`를 환경변수(`process.env.SHARD_COUNT || '10'`)로 읽는다. 값을 줄이면 인덱스 범위를 벗어난 기존 샤드가 합산에서 빠지고, 늘리면 존재하지 않는 샤드를 읽는다. → 이 설계의 파티션 수는 **코드 상수이고 영원히 16이다**(5.2).

**그리고 하나 더 — 중첩 필드 쓰기 규약.**

punchpol은 `docs/firestore-nested-fields.md`를 따로 만들어야 할 만큼 이 실수를 반복했다. `set({ merge: true })`에 dot notation을 주면 Firestore는 그것을 **리터럴 키**로 해석해 `"directPunchStats.totalPunches"`라는 이름의 최상위 필드를 만든다. `update()`는 중첩 경로로 해석하지만 문서가 없으면 실패한다.

이 설계의 규약은 하나다. **dot notation을 쓰지 않는다.**

```ts
// ❌ 금지 — 리터럴 키가 만들어진다
ref.set({ "windows.d30.punch": FieldValue.increment(1) }, { merge: true });

// ❌ 금지 — 문서가 없으면 던진다
ref.update({ "windows.d30.punch": FieldValue.increment(1) });

// ✅ 중첩 객체 + set(merge). 문서가 없으면 만들고, 있으면 그 필드만 건드린다
ref.set({ windows: { d30: { punch: FieldValue.increment(1) } } }, { merge: true });
```

ESLint 규칙으로 `set`/`update` 인자의 키에 `.`이 들어가면 막는다. 규율로 지키는 규칙은 결국 샌다.

## 6. API 계약

공통 규칙: 요청·응답은 JSON, 오류는 `{ error: "<code>" }` + HTTP 상태. **거부 이유를 자세히 알려 주지 않는다**(상위 9장 8번). 자세한 사유는 서버 로그에만 남긴다.

```ts
// lib/guard/refusal.ts
export class Refusal extends Error {
  constructor(public status: number, public reason: string, public clientCode = "rejected") { super(reason); }
}
```

### 6.1 `POST /api/participation`

반사·스와이프·정적 경로가 **모두** 쓰는 하나의 엔드포인트다.

```ts
const body = z.object({
  sessionId: z.uuid(),
  game: z.enum(["reflex", "swipe", "static"]),
  startedAt: z.iso.datetime(),
  stances: z.array(z.object({
    kind: z.enum(["person", "policy"]),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    stance: z.enum(["punch", "cheer", "unknown"]),
    recordId: z.string().nullable().default(null),
    score: z.number().int().min(0).max(10_000).nullable().default(null),
    dwellMs: z.number().int().min(0).optional(),   // 스와이프 체류 시간
  })).min(1).max(25),
});
```

```ts
// 응답
{
  accepted: string[],   // 반영된 subjectId
  replaced: string[],   // 오늘 입장을 덮어쓴 subjectId
  capped: string[],     // 상한에 걸려 잘린 subjectId
  date: string,         // 서버가 판정한 KST 날짜
}
```

처리 순서:

```text
 1. Origin 확인
 2. App Check (consume: true)
 3. ID 토큰 → uid
 4. zod 검증 — stances 길이 1~25, slug 중복 없음
 5. game == "reflex" | "static" 이면 stances 길이는 1이어야 한다
 6. 각 slug 가 published 인가 — git 콘텐츠를 서버 메모리에서 조회. Firestore 왕복 없음
 7. IP 해시 카운터 (트랜잭션 밖, 자문용)
 8. 트랜잭션
 9. 이상치 판정 → excluded 로 기록하되 정상 응답
```

6번은 CMS의 `published` 대상만 통과시킨다. 서버가 `contentSubjects`를 읽어 검증하며 브라우저가 임의 대상을 제출하는 경로는 없다. 콘텐츠 변경은 운영 빈도가 낮고 공개 대상 수가 작으므로, 이 읽기는 참여 원장의 무결성과 교환할 수 있는 비용이다.

```ts
// app/api/participation/route.ts (핵심만)
export const runtime = "nodejs";

export async function POST(req: Request) {
  const origin = checkOrigin(req); if (!origin.ok) return refuse(origin);
  const { uid } = await verifyCaller(req);
  const input = body.parse(await req.json());

  const date = kstDate(new Date());                     // 서버가 정한다
  const subjects = input.stances.map(s => requirePublished(s.kind, s.slug));
  const anomaly = detectAnomaly(input, Date.now());     // 판정만, 거부하지 않는다

  const result = await db.runTransaction(async (tx) => {
    const sessionRef = db.doc(`users/${uid}/sessions/${input.sessionId}`);
    const dailyRef   = db.doc(`users/${uid}/daily/${date}`);
    const stateRef   = db.doc(`users/${uid}/state/subjects`);

    // 읽기는 항상 3회. 대상이 25개여도 3회다.
    const [session, daily, state] = await tx.getAll(sessionRef, dailyRef, stateRef);
    if (session.exists) return session.get("result");    // 멱등: 그대로 돌려준다

    const map = state.get("m") ?? {};                    // { [subjectId]: { s, d } }

    // 오늘 이미 손댄 대상만 추가로 읽는다. 스와이프에서는 보통 0건이다.
    const touchedToday = subjects.filter(s => map[s.id]?.d === date);
    const existing = touchedToday.length
      ? await tx.getAll(...touchedToday.map(s => db.doc(`users/${uid}/stances/${s.id}_${date}`)))
      : [];

    // ... 상한 판정 → accepted / replaced / capped 분류
    // ... 각 대상에 대해 tx.set(stanceRef, { ..., prev }, { merge: true })
    // ... tx.set(dailyRef, {...}, { merge: true })
    // ... tx.set(stateRef, { m: { [id]: { s: stance, d: date } } }, { merge: true })
    tx.set(sessionRef, { /* ... */ result });
    return result;
  });

  return Response.json(result);
}
```

### 읽기를 3회로 고정한 방법

이전 판은 대상마다 오늘의 원장 문서를 읽었다 — 스와이프 25장이면 읽기 27회. 지금은 **상태 맵 문서 하나**가 그 정보를 대신한다.

```ts
// users/{uid}/state/subjects
{ m: { "lee-jm": { s: "punch", d: "2026-09-20" }, "min-saeng": { s: "cheer", d: "2026-08-14" }, ... } }
```

- `m[subjectId].d === today` 면 오늘 이미 입장을 냈다는 뜻이다 → `replaced`.
- `m[subjectId]` 가 없으면 이 대상에 처음이다.
- 그 사람의 **가장 최근 입장**이 여기 있으므로, 원장 문서에 `prev`를 채워 넣을 수 있다(5.3).

맵 크기: 참여한 대상 수만큼 항목이 는다. 대상 500개를 전부 건드려도 항목당 약 40바이트로 20 KB — 문서 한도 1 MiB의 2%다. 그래도 무한히 두지 않고 **가장 오래된 순으로 1,000개까지만** 유지한다. 잘려 나간 대상은 `prev`를 모르는 채 새 참여로 처리되고, 그 어긋남은 재계산이 잡는다(5.7).

`tx.getAll`로 세 문서를 한 번에 읽는다. 순차로 읽으면 왕복이 셋이다.

트랜잭션 비용: **읽기 3 + K, 쓰기 N + 3.** K는 오늘 이미 손댄 대상 수로 보통 0이다. 전부 `users/{uid}` 아래라 다른 사용자와 경합하지 않는다.

**상한.**

| 상한 | 값 | 저장 위치 | 읽기 |
| --- | --- | --- | --- |
| uid 하루 입장 대상 수 | 60 | `users/{uid}/daily/{date}.stances` | 트랜잭션 안, 정확 |
| uid·대상 하루 번복 | 3 | `...daily/{date}.perSubject[subjectId]` | 트랜잭션 안, 정확 |
| uid 하루 세션 | 20 | `...daily/{date}.sessions` | 트랜잭션 안, 정확 |
| IP 해시 하루 신규 uid | 20 | `abuse/{yyyymmdd}/ip/{hash}` (샤드 합) | 트랜잭션 밖, 최대 1분 낡음 |

앞의 셋은 `users/{uid}` 아래라 트랜잭션 안에서 정확하게 읽고 쓴다. IP 상한만 다르다 — 쓰기는 무작위 샤드로, 읽기는 롤업이 만든 요약 문서 하나로 한다(4.3). **1분 낡은 값으로 판정한다**는 뜻이고, 공격자는 최대 1분치 여유를 더 얻는다. 그 대가로 요청 경로가 샤드 10개를 읽지 않아도 된다. IP 상한은 원래 보조 방어선이지 주 방어선이 아니므로(상위 10장) 이 교환이 맞다.

상한을 넘는 원소는 **거절이 아니라 잘라낸다.** 스와이프 25장 중 3장이 상한을 넘었다고 22장까지 버리면 사용자는 이유를 모른 채 세션을 잃는다. `capped`로 돌려주고 화면은 "오늘 반영할 수 있는 만큼 반영했습니다"로 끝낸다.

**이상치.**

```ts
// lib/guard/anomaly.ts
export function detectAnomaly(input: Input, now: number): string | null {
  const elapsed = now - Date.parse(input.startedAt);
  if (elapsed < MIN_SESSION_MS[input.game]) return "too-fast";          // reflex 3s, swipe 3s, static 1s
  if (input.game === "reflex") {
    const cap = Math.ceil(elapsed / 120);                                // 사람이 낼 수 있는 최대 입력
    if ((input.stances[0].score ?? 0) > cap) return "impossible-score";
  }
  if (input.game === "swipe") {
    const avg = input.stances.reduce((a, s) => a + (s.dwellMs ?? 0), 0) / input.stances.length;
    if (avg < 200) return "not-read";                                    // 읽지 않고 넘겼다
  }
  return null;
}
```

`startedAt`은 클라이언트 값이라 신뢰하지 않는다. 그래서 **세션 시작을 서버에 알리지 않는다** — 알리면 왕복이 하나 늘고, 그래도 조작은 막지 못한다. 대신 이상치는 차단이 아니라 `excluded` 표시이고, 진짜 방어는 사후 재집계(5.7)다.

**반사 게임에는 시간 제한이 없다**(상위 7.3). 세션이 3초일 수도 20분일 수도 있으므로, 길이 자체는 이상 신호가 아니다. 판정은 **입력 속도**로만 한다 — `elapsed / 120ms`를 넘는 타격 수는 사람이 낼 수 없다. `MIN_SESSION_MS`의 반사 게임 값을 3초로 낮춘 이유도 이것이다. 두 번 때리고 나가는 사람은 조작자가 아니라 그냥 화가 덜 난 사람이다.

타격 수가 늘어도 **비용은 변하지 않는다.** 원장에 남는 것은 세션당 1건이고(상위 7.2), 연타 수는 그 문서의 `score` 필드 하나에 들어간다. 300번을 때려도 쓰기는 1회다.

### 6.2 `POST /api/comparison`

월드컵 결과. 같은 검증을 거쳐 `comparisons`에만 쓴다. **`stances`에는 한 건도 쓰지 않는다**(상위 7.5).

```ts
const body = z.object({
  sessionId: z.uuid(),
  bracket: z.string(),                 // git 콘텐츠에 정의된 토너먼트 id
  matches: z.array(z.object({
    round: z.number().int().min(1),
    leftId: z.string(),
    rightId: z.string(),
    winner: z.enum(["left", "right"]),
  })).min(1).max(15),                  // 16강 = 15경기
});
```

`bracket`과 `leftId`/`rightId`가 그 브래킷의 정의와 맞는지 서버가 확인한다. 임의의 두 항목을 붙여 보낼 수 있으면 비교 데이터가 의미를 잃는다.

이 데이터는 지금 아무 화면에도 집계되지 않는다(상위 16장 4번). 그래도 원장에는 쌓는다 — 나중에 공개 형식이 정해졌을 때 과거 데이터가 없으면 처음부터 다시 모아야 한다.

### 6.3 `POST /api/report`

신고. 규칙으로도 클라이언트 직접 생성을 허용할 수 있지만(7장), 서버를 거친다. 첨부 URL 검증, 중복 신고 차단, 알림이 전부 서버 일이다.

### 6.4 `DELETE /api/me`

개인정보 요구사항(상위 11장 4번).

```text
? scope=stances   내 입장 전부 삭제
? scope=account   Auth 계정까지 삭제
```

원장을 지우면 파생이 어긋나므로, 삭제한 대상들을 재계산 큐에 넣는다. **클라이언트가 Firestore에서 직접 지우게 두지 않는 이유가 이것이다.**

### 6.5 크론

| 경로 | 주기 | 하는 일 |
| --- | --- | --- |
| `/api/cron/rollup` | 1분 | 5.2~5.5. 일이 없으면 읽기 1회로 끝난다 |
| `/api/cron/expire` | 매일 00:05 KST | 5.6 |
| `/api/cron/reconcile` | 매일 04:00 KST | 5.7 — 1단계는 그날 바뀐 대상만 |

작업은 셋뿐이다. `index-stats`는 없앴다 — `subjectStats/_index`는 롤업이 일한 김에 같은 배치에서 갱신한다(5.4). 주기 작업 하나가 통째로 사라지고, 바뀐 게 없는 5분에는 아무것도 쓰지 않는다.

`_index`는 탐색 화면이 카드 40개의 수치를 문서 1개로 읽기 위한 묶음이다(상위 12장). 대상이 늘어 1 MiB에 가까워지면 쪽으로 나눈다.

## 7. Security Rules

원칙 하나: **클라이언트는 쓰지 않는다.** 예외를 만들면 검사가 늘고, 늘어난 검사 중 하나는 반드시 덜 검사된다.

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }
    function isSelf(uid) { return signedIn() && request.auth.uid == uid; }
    function isOps()     { return signedIn() && request.auth.token.ops == true; }

    // ── 공개 집계: 누구나 읽고, 아무도 못 쓴다 ──────────────────────
    match /subjectStats/{docId} { allow read: if true;  allow write: if false; }
    match /dailyStats/{docId}   { allow read: if true;  allow write: if false; }

    // ── 내부 파생: 클라이언트는 존재도 모른다 ──────────────────────
    match /subjectCohorts/{docId} { allow read, write: if false; }

    // ── 개인 원장: 본인만 읽는다. 쓰기와 삭제는 서버만 ─────────────
    match /users/{uid} {
      allow read:  if isSelf(uid);
      allow write: if false;

      match /stances/{docId}     { allow read: if isSelf(uid); allow write: if false; }
      match /sessions/{sessionId}{ allow read: if isSelf(uid); allow write: if false; }
      match /comparisons/{docId} { allow read: if isSelf(uid); allow write: if false; }
      match /daily/{date}        { allow read: if isSelf(uid); allow write: if false; }
      match /state/{docId}       { allow read: if isSelf(uid); allow write: if false; }
    }

    // ── 신고: 읽기만 본인·운영자. 쓰기는 서버 ──────────────────────
    match /reports/{reportId} {
      allow read:  if isOps() || (signedIn() && resource.data.reporterUid == request.auth.uid);
      allow write: if false;
    }

    // ── 서버 전용 ────────────────────────────────────────────────
    match /abuse/{document=**}  { allow read, write: if false; }
    match /system/{document=**} { allow read, write: if false; }

    // ── 나머지는 전부 닫는다 ──────────────────────────────────────
    match /{document=**} { allow read, write: if false; }
  }
}
```

삭제조차 막는 이유: 사용자가 `stances` 문서 하나를 직접 지우면 `subjectCohorts`와 `subjectStats`가 그 사실을 모른다. 삭제는 `/api/me`를 거쳐 재계산과 함께 일어나야 한다(6.4).

`match /{document=**} { allow read, write: if false; }`를 마지막에 두는 이유: 나중에 컬렉션을 추가하고 규칙 작성을 잊어도 열려 있지 않다. Firestore는 기본이 거부지만, 명시해 두면 리뷰에서 눈에 띈다.

### Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 공개 자산은 읽기만
    match /public/{allPaths=**} {
      allow read: if true;
      allow write: if false;
    }
    // 운영자 업로드 — 형식과 크기를 규칙에서 막는다
    match /ops/{allPaths=**} {
      allow read: if request.auth != null && request.auth.token.ops == true;
      allow write: if request.auth != null
        && request.auth.token.ops == true
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/(jpeg|png|webp)');
    }
    match /{allPaths=**} { allow read, write: if false; }
  }
}
```

대부분의 사진은 `public/`에 커밋되는 정적 자산이다(상위 2장). Storage는 운영 중 교체분만 받는다.

## 8. 인덱스

인덱스는 **실제로 도는 질의만큼만** 만든다. 쓰지 않는 인덱스는 저장 비용이고, 쓰기마다 색인 항목을 하나 더 쓴다.

```json
{
  "indexes": [
    {
      "collectionGroup": "stances",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "subjectId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "reports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": [
    {
      "collectionGroup": "stances",
      "fieldPath": "updatedAt",
      "indexes": [
        { "order": "ASCENDING", "queryScope": "COLLECTION" },
        { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" }
      ]
    }
  ]
}
```

**`fieldOverrides`가 롤업의 생명줄이다.** 커서 질의는

```ts
db.collectionGroup("stances")
  .where("updatedAt", ">", cursor)
  .orderBy("updatedAt")
   .limit(ROLLUP_BATCH_SIZE)      // 기본 80 (최악의 배치 500연산 제한을 넘지 않음)
```

이고, Firestore가 자동으로 만들어 주는 단일 필드 인덱스는 **컬렉션 범위**다. 컬렉션 그룹 범위는 `fieldOverrides`로 따로 켜야 한다. 빠뜨리면 배포 후 첫 롤업에서 `FAILED_PRECONDITION`으로 드러난다.

`(subjectId, date)` 복합 인덱스는 재계산 2단계(5.7)에서만 쓴다. 평소에는 돌지 않지만, 필요해졌을 때 만들면 인덱스 빌드를 기다려야 하므로 미리 둔다.

**`(shard, updatedAt)` 인덱스는 지금 만들지 않는다.** 워커가 하나면 `shard` 필터가 질의에 들어가지 않는다(5.2.1). 워커를 늘리기로 결정하는 시점에 추가한다 — 원장에 `shard` 값이 이미 들어 있으므로 인덱스 빌드만 기다리면 되고, 데이터 이동은 없다.

`subjectCohorts`의 `date == d` 질의, `users/{uid}/stances`의 `date` 정렬, `abuse` 샤드 조회는 자동 인덱스로 충분하다.

### 인덱스 예외 처리

쓰지 않는 필드에는 색인을 끈다. 원장은 이 서비스에서 가장 많이 쓰이는 문서이고, 색인 항목이 곧 쓰기 비용이자 저장 비용이다.

```json
{
  "collectionGroup": "stances",
  "fieldPath": "score",
  "indexes": []
}
```

`score`·`recordId`·`sessionId`·`prev`는 아무 질의에도 쓰이지 않는다. 전부 `indexes: []`로 색인을 끈다.

## 9. 에뮬레이터·시드·테스트

```json
// firebase.json
{
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
  "storage":   { "rules": "storage.rules" },
  "emulators": {
    "auth":      { "port": 9099 },
    "firestore": { "port": 8080 },
    "storage":   { "port": 9199 },
    "ui":        { "enabled": true }
  }
}
```

에뮬레이터에서 App Check는 검증되지 않는다. `verifyCaller`가 `FIREBASE_AUTH_EMULATOR_HOST`를 보고 App Check 단계를 건너뛰되, **그 분기는 프로덕션 번들에서 죽은 코드가 되도록** 환경 플래그로 감싼다.

### 테스트

| 층 | 도구 | 무엇을 |
| --- | --- | --- |
| 규칙 | `@firebase/rules-unit-testing` | 남의 원장 읽기, 집계 직접 쓰기, 신고 위조, 삭제 시도 — 전부 거부되는가 |
| 집계 | vitest (에뮬레이터) | 5.3 델타 규칙, 5.4 재적용 무해성, 5.6 만료, 5.7 재계산이 증분과 같은 답을 내는가 |
| 커서·리스 | vitest (에뮬레이터) | 일이 없으면 쓰기 0으로 끝난다. 동시 실행 시 한쪽만 진행한다. 배치 실패 시 커서가 전진하지 않는다 |
| API | vitest (에뮬레이터) | 멱등, 상한 잘라내기, KST 경계, 이상치 표시, 게임 등가성 |
| E2E | Playwright | 스와이프 25장 완주, 정적 경로 동일 결과 |

가장 중요한 테스트 하나를 꼽으면 **"재계산과 증분이 같은 답을 낸다"**이다. 이것이 깨지면 공개 수치가 조용히 틀리기 시작하고, 이 제품에서 조용히 틀린 수치는 가장 나쁜 실패다.

```ts
// 성질 기반 테스트의 뼈대
test("증분 집계와 전체 재계산이 일치한다", async () => {
  const events = randomLedgerEvents({ users: 200, subjects: 5, days: 40 });
  for (const e of events) await writeLedger(e);
  await runRollupUntilDrained();
  const incremental = await readAllSubjectStats();
  await runReconcileAll();
  expect(await readAllSubjectStats()).toEqual(incremental);
});
```

### 시드

```bash
pnpm seed-dev          # 에뮬레이터 CMS의 공개 대상 + 익명 사용자 200명 + 40일치 참여
```

시드는 에뮬레이터의 `contentSubjects`에서 `published` 대상만 읽고 참여 원장만 생성한다. 운영 CMS와 별도 배열을 만들지 않아 대상 원천이 둘로 갈라지지 않는다.

## 10. 배포

### apphosting.yaml

```yaml
runConfig:
  minInstances: 0
  maxInstances: 4
  concurrency: 80
  cpu: 1
  memoryMiB: 512

env:
  # NEXT_PUBLIC_* 은 빌드 때 코드에 박힌다. BUILD 를 빠뜨리면
  # 배포본에서 Firebase 설정이 비어 조용히 실패한다.
  - variable: NEXT_PUBLIC_SITE_URL
    value: https://jamtong-punch--jamtong-punch.asia-east1.hosted.app
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    secret: NEXT_PUBLIC_FIREBASE_API_KEY
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    value: jamtong-punch
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    value: jamtong-punch.firebaseapp.com
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    value: jamtong-punch.firebasestorage.app
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    value: "382811092993"
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_FIREBASE_APP_ID
    value: "1:382811092993:web:b9a1bde1233407f5a66800"
    availability: [BUILD, RUNTIME]
  - variable: NEXT_PUBLIC_APPCHECK_SITE_KEY
    value: "6LdSI8UtAAAAANY8dQwlRT-Jd6DRBMEmD1-L3UVH"
    availability: [BUILD, RUNTIME]

  - variable: CRON_AUDIENCE
    value: https://jamtong-punch--jamtong-punch.asia-east1.hosted.app/api/cron
    availability: [RUNTIME]
  - variable: CRON_SERVICE_ACCOUNT
    value: jamtong-scheduler@jamtong-punch.iam.gserviceaccount.com
    availability: [RUNTIME]
  - variable: IP_HASH_PEPPER
    secret: IP_HASH_PEPPER
    availability: [RUNTIME]

  # 집계 처리량·비용 손잡이. 재배포 없이 조일 수 있어야 한다 (5.5 · 5.7)
  - variable: ROLLUP_BATCH_SIZE
    value: "80"
    availability: [RUNTIME]
  - variable: ROLLUP_MAX_PASSES
    value: "10"
    availability: [RUNTIME]
  - variable: RECONCILE_READ_BUDGET
    value: "50000"
    availability: [RUNTIME]
```

`IP_HASH_PEPPER`는 Secret Manager로 간다. 일별 솔트와 함께 IP를 해시하는 데 쓰고, 이것이 새면 IP 역산이 쉬워진다. 웹 API 키는 비밀이 아니지만 현재 운영 구성에서는 저장소 복사를 피하기 위해 별도 App Hosting Secret으로도 주입한다. 이 키의 실제 보호선은 Firestore 규칙과 허용 도메인이다.

App Hosting 생성 직후에는 `pnpm preflight:prod`를 먼저 실행한다. 이 명령은 값을 출력하지 않고 로컬 운영 환경과 `apphosting.yaml` 양쪽의 Firebase 웹 설정 여섯 개, 운영 URL·크론 audience, App Check 키·비밀, 그리고 공개 가능한 콘텐츠 묶음이 모두 있는지만 확인한다. 통과 전에는 rollout이나 Scheduler 생성을 하지 않는다.

CMS 최초 배포만 예외다. 등록 화면을 먼저 제공하기 위해 `pnpm deploy:cms-bootstrap`은 인프라 검사는 그대로 수행하되 콘텐츠 존재 조건만 한 번 건너뛴다. 이 배포본은 빈 목록만 보이며, 첫 콘텐츠 공개 뒤에는 반드시 일반 `pnpm preflight:prod`를 통과시켜야 한다.

### 배포 순서

순서가 중요하다. 거꾸로 하면 규칙 없는 컬렉션이 잠깐 열리거나, 인덱스 없는 질의가 첫 호출에서 죽는다.

```text
1. firestore.indexes.json 배포 → 빌드 완료까지 대기
2. firestore.rules · storage.rules 배포
3. TTL 정책 설정 (`sessions`, `daily`, `ip`, `shards`, `uids`, `items`의 `expiresAt`)
4. App Check 등록 → monitor 로 하루 관찰 → enforce 전환
5. `pnpm preflight:prod`를 통과시킨 뒤 `pnpm deploy:apphosting`으로 `asia-east1` App Hosting rollout. GitHub 저장소·live branch 연결은 자동 브랜치 배포가 필요할 때만 추가한다
6. Cloud Scheduler 작업 3개 생성 — rollup(1분) / expire(00:05 KST) / reconcile(04:00 KST)
7. grant-ops 로 운영자 지정
```

첫 rollout 전에는 Scheduler를 `PAUSED`로 둔다. 배포가 살아 있고 헬스 확인을 마친 뒤 `PROJECT_ID=jamtong-punch pnpm resume:schedulers`로 세 작업을 함께 켠다.

4번에서 하루 관찰하는 이유: enforce를 바로 켜면 App Check를 아직 못 붙인 클라이언트가 전부 막히고, 그게 배포 사고인지 공격인지 구분이 안 된다.

## 11. 비용

이 설계의 목표는 **트래픽이 없으면 비용도 없다**이다. 그래서 두 가지를 분리해서 본다.

### 11.1 유휴 비용 — 아무도 안 와도 나가는 돈

| 항목 | 일 건수 | 비고 |
| --- | --- | --- |
| rollup 질의 | 1,440 읽기 | 결과가 비면 리스도 잡지 않는다. 쓰기 0 |
| expire | 2 읽기 · 0 쓰기 | 만료할 코호트가 없으면 끝 |
| reconcile(1단계) | 0 | 그날 바뀐 대상이 없으면 돌 것이 없다 |
| **합계** | **약 1,450 읽기 · 0 쓰기** | 무료 할당(일 5만 읽기) 안 |

**대상 수에 비례하는 주기 작업은 하나도 없다.** 인물 10명이든 500명이든 유휴 비용이 같다. 이것이 punchpol과 갈리는 지점이다 — `aggregatePunchCounts`는 매분 `characterStats` 전량과 각 샤드 10개를 읽으므로, 대상 500개면 트래픽 0에서도 하루 790만 읽기가 고정으로 나간다.

없앤 것 넷:

- **파티션 팬아웃.** 파티션 16개에 각각 리스를 걸면 유휴에도 분당 32 읽기 + 16 쓰기다. 출시에는 워커 1개·질의 1개로 돌리고, 원장에는 `shard` 값만 심어 둔다. 필요해지면 인덱스를 추가하고 스케줄러 작업을 늘리는 것으로 전환한다(5.2.1).
- **`index-stats` 크론.** 5분마다 돌던 것을 없애고, 롤업이 일한 김에 같은 배치에서 `_index`를 갱신한다. 바뀐 게 없으면 아무것도 안 쓴다.
- **매일 전량 재계산.** 원장 전체를 매일 읽던 것을 두 단계로 나눴다(5.7). 1단계는 그날 바뀐 대상만, 코호트 30개 읽기로 끝난다.
- **요청 경로의 대상별 읽기.** 상태 맵 문서 하나로 접어서 스와이프 25장의 읽기가 27에서 3으로 줄었다(6.1).

### 11.2 트래픽 비용 — 참여 1건당

가정: 일 활성 3,000명, 1인당 세션 2회(반사 1 + 스와이프 1), 스와이프 평균 20장 → 일 입장 63,000건.

| 항목 | 일 건수 | 산식 |
| --- | --- | --- |
| 요청 읽기 | 18,000 | 세션당 3 (세션 가드 · 일일 카운터 · 상태 맵) |
| 요청 쓰기 | 81,000 | 원장 63,000 + 세션당 3 |
| 롤업 읽기 | 63,000 | 변경 원장만. **`prev`가 문서 안에 있으므로 추가 조회가 없다**(5.3) |
| 롤업 쓰기 | 63,000 + α | 원장 표시 63,000 + 집계는 대상당 분당 1회가 상한 |
| 화면 읽기 | ≈ 0 | 상세는 정적, 집계는 60초 캐시 |
| **합계** | **읽기 ≈ 8.1만 · 쓰기 ≈ 15만** | 읽기 $0.05 · 쓰기 $0.27 수준 |

참여 1건당 **읽기 1.3 · 쓰기 2.3**이 든다. 이전 판(읽기 3 · 쓰기 2.3)에서 읽기가 절반 아래로 준 것은 `subjectMembers` 조회를 없앴기 때문이다(5.3).

지배적인 항목은 원장 쓰기이고, 그것은 줄일 수 없다 — 입장 하나에 문서 하나가 이 제품의 정의다(상위 3장).

### 11.3 컴퓨트

App Hosting은 `minInstances: 0`이다. 크론이 1분마다 때리므로 인스턴스가 사실상 상시 유지되는데, Cloud Run은 기본적으로 **요청 처리 중에만 CPU를 할당**하므로 유휴 시간은 과금되지 않는다. 롤업이 비어서 즉시 끝나면 요청 하나당 수십 ms다.

`minInstances: 1`로 올리면 콜드 스타트가 사라지는 대신 상시 과금이 붙는다. 실측 후에 정한다 — 계산이 아니라 청구서로(13장).

## 12. 실패 모드와 대응

| 실패 | 증상 | 대응 |
| --- | --- | --- |
| 롤업 중단 | 원장은 쌓이는데 수치가 멈춤 | 백로그 경보. 원장이 신뢰 원천이므로 재가동하면 따라잡는다 |
| 롤업 백로그 증가 | 수치 지연이 분 단위로 늘어남 | 먼저 배치 크기·연속 실행 횟수를 올린다. 그래도 밀리면 **파티셔닝을 켠다**(5.2.1) — 인덱스 빌드와 스케줄러 작업 추가뿐, 데이터 이동은 없다 |
| 롤업 리스 누수 | 계속 `skipped: busy` | 2분 뒤 자동 해제. 반복되면 `system/rollup.leaseUntil` 수동 초기화 |
| 핫 IP 경합 | `abuse` 샤드 쓰기 지연 | 샤드 수를 늘린다. 요약은 다음 롤업이 따라잡고, 그 사이 상한은 느슨해질 뿐 무너지지 않는다 |
| 인덱스 누락 | 첫 질의에서 `FAILED_PRECONDITION` | 배포 순서 1번. CI에서 에뮬레이터로 질의를 한 번씩 돌려 잡는다 |
| 증분 드리프트 | 재계산 로그에 차이 | 재계산이 덮어쓴다. 차이가 반복되면 델타 규칙 버그 |
| App Check 오탐 | 정상 사용자 401 | monitor 로 되돌리고 로그를 본다. enforce 전환은 되돌릴 수 있어야 한다 |
| 조작 정황 | `excluded` 비율 급등 | 해당 기간 대상을 재계산 큐에 넣고, 무엇을 왜 뺐는지 `/about`에 남긴다 |
| 집계 정의 변경 | 화면이 옛 모양을 읽음 | `schemaVersion` 불일치면 그리지 않는다. 전체 재계산 후 올린다 |

## 13. 확인이 필요한 것

1. **파티셔닝을 켜는 시점.** 출시는 워커 1개다(5.2.1). 백로그가 붙기 시작하는 지점을 부하 시험으로 찾고, 거기서 한 단계 아래를 전환 기준으로 삼는다. 전환 비용은 인덱스 빌드 시간뿐이다.
2. **배치 크기와 연속 실행 횟수.** 지금은 80건 × 10회 = 분당 800건이다. 80은 최악의 경우에도 Firestore 500연산 배치 제한을 지키는 상한이다. 이 값이 실제 피크를 감당하는지, 아니면 파티셔닝이 먼저 필요해지는지 실측한다(5.5).
3. **IP 해시 샤드 수.** 한국 이동통신은 CGNAT를 크게 쓴다. 해시 하나가 수천 명을 가리킬 수 있어 10개로 충분한지 실측이 필요하다(4.3).
4. **App Check limited-use 토큰의 비용과 지연.** `consume: true`는 매 요청 토큰 발급을 요구한다. 스와이프 제출처럼 세션당 1회면 괜찮지만, 측정 전에는 단정하지 않는다(3.1).
5. **재계산 2단계의 읽기 예산.** 1단계는 활동한 대상만 돌므로 값이 싸다(5.7). 2단계 순번을 하루 몇 대상까지 돌릴지는 예산으로 정하는데, 그 예산이 얼마여야 드리프트를 제때 잡는지는 실측이 필요하다.
6. **`minInstances` 0 vs 1.** 크론이 1분마다 깨우는 상황에서 어느 쪽이 싼지는 계산이 아니라 청구서로 확인한다(11장).
7. **TTL 삭제 지연.** 개인정보 문구를 쓰기 전에 실제 삭제까지 걸리는 시간을 재고, 그 숫자로 적는다(4.4).
