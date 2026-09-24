# 임통 — 인물 아카이브 전환 설계 (rev. 5)

- 상태: 설계 확정 — Phase A 착수 (2026-09-23)
- 작성일: 2026-09-23
- 상위 문서: [`implementation-design.md`](./implementation-design.md). 이 문서는 그 문서의 1·5·6·8장을 **대체**하고, 3·7·9·10장(참여 원장·게임·집계)은 인물 기준으로 좁혀 그대로 쓴다
- 백엔드: [`firebase-backend.md`](./firebase-backend.md)의 원장·집계·크론은 바뀌지 않는다. 콘텐츠 컬렉션(`content*`)만 이 문서 5장으로 바뀐다

## 0. 개정 이력

### rev. 5 — 인물 아카이브가 중심, 게임은 그 위에

| 항목 | rev. 4 | rev. 5 | 이유 |
| --- | --- | --- | --- |
| 제품의 중심 | 게임(분노 해소). 기록은 헤더 한 줄 | **인물 아카이브** — 기록·시선·관계. 게임은 인물 페이지에서 들어가는 개인 층 | 기록이 쌓일수록 가치가 커지는 쪽을 본체로 둔다. 게임은 한 번 하고 끝나지만 관계 그래프는 쌓인다 |
| 대상 | 인물 + 정책 | **인물.** 정책은 인물의 언행(`statement.kind: "policy"`)으로, 주제는 `쟁점(Topic)`으로 | 정책에는 발표하고 추진한 사람이 있다. 그 사람의 기록으로 두면 근거가 따라온다 |
| 콘텐츠 단위 | `subject` + `record` | `Person` · `Statement` · `Evaluation` · `Event` · `Relationship`(파생) · `Topic` · `Source` | 본인 발언과 타인 평가를 한 타임라인에 섞으면 "누가 말했는가"가 흐려진다 |
| 관계 | 없음(16장 11번 미결) | **인물의 언행에서만 자동 파생되는 간선.** 라벨 없음 | 관계에 이름을 붙이는 순간 앱이 인물을 규정한다 |
| 출처 단위 | 문서 1개 | 문서 + **구간(초 단위 timestamp)** | 1시간짜리 영상 전체는 근거가 아니다. "17:32~21:18"이 근거다 |
| 게임 헤더 카드 | `record` | `statement` | 이름만 바뀐다 |
| 호불호 대상 | 인물·정책 | **인물 + 언행·정책** | 사람에 대한 호불호와 그 사람의 말·정책에 대한 호불호는 다른 정보다. 둘 다 받는다(5.8) |
| 참여 비율 위치 | 인물 상세 | 인물 상세 머리 + 언행 카드 | 탭 밖에 두어 아카이브 본문과 가른다 |
| 서비스 이름 | 잼통펀치 | **임통** | 인물통을 빠르게 발음한 것 |
| 관계의 근거 | 사건 동시 등장 + 언급 + 평가 | **언행만** — 원문 속 이름 자동 검출 + 평가 | 운영자가 의도적으로 관계를 만들 수 없게 한다(5.6) |

현재 운영 CMS는 배포됐지만 **최초 콘텐츠 등록 전**이다(`firebase-backend.md` 상태 줄). 옮길 데이터가 사실상 없으므로 이전 호환 계층을 만들지 않고 컬렉션을 바로 바꾼다.

## 1. 제품 정의

> **누가 어떤 말을 해왔고, 다른 사람들은 그를 어떻게 평가했으며, 누구와 어떤 사건으로 연결되어 있는지를 근거와 함께 보여주는 인물 아카이브.**

시작 데이터는 이재명과 관련된 인물로 한정하지만, 구조는 **정치·사회 인물 일반**을 전제로 짠다. "이재명 주변 인물 위키"로 스키마를 만들면 이재명이 없는 관계를 표현할 수 없다.

### 잼통과의 역할 분담

| 잼통 (jamtong.kr) | 이 앱 |
| --- | --- |
| 이재명이 무엇을 했는가 | 이 사람은 무엇을 말하고 행동해 왔는가 |
| 업적·정책 중심 | 언행·평가·관계 중심 |
| 한 사람 | 여러 사람 |
| 사건 → 이재명 | 사람 ↔ 사건 ↔ 사람 |
| Evidence Wiki | People Graph |

### 두 층은 그대로, 내용이 바뀐다

rev. 4의 "안에서는 마음껏, 밖으로는 절제해서"(implementation-design 11장)가 이 전환을 오히려 쉽게 만든다.

| | 공개 층 | 개인 층 |
| --- | --- | --- |
| 무엇 | **아카이브** — 기록·시선·관계·쟁점 | **게임** — 펀치·응원, 점수, 내 기록 |
| 태도 | 규정하지 않는다. 기록을 연결한다 | 제한 없음. 나만 본다 |
| 얼굴 | 식별용 사진 | 타격 대상 |

공개 층이 중립적인 아카이브가 되면서 rev. 4의 "편향을 밝힌 표본"은 **게임 수치에만** 해당하게 된다. 아카이브 본문은 편을 들지 않고, 게임 수치는 편향을 밝힌다. 두 태도가 한 화면에 섞이지 않도록 6장에서 화면을 나눈다.

## 2. 원칙

1. **인물을 규정하지 않는다. 기록을 연결한다.** `친명`, `반명`, `배신`, `우호적` 같은 성향·관계 라벨을 스키마에 두지 않는다. 필드가 없으면 누가 넣을 수도 없다.
2. **모든 카드는 원자료로 끝난다.** 요약 → 원문 → 원본 링크(구간) → 맥락 순서. 원본 없는 카드는 스키마가 막는다.
3. **본인의 말과 타인의 말을 UI부터 분리한다.** `기록` 탭에는 본인 언행만, `시선` 탭에는 타인의 평가만. 같은 타임라인에 섞지 않는다.
4. **평가의 요약은 평가자의 주장이다.** 문장 주어를 평가자로 고정한다 — "B는 A가 ~라고 말했다". 앱의 목소리로 A를 서술하지 않는다.
5. **관계에는 반드시 "왜"가 있다.** 간선은 **두 사람의 언행**(원문 속 언급, 평가)에서만 자동으로 생기고, 근거가 0건이 되면 간선도 사라진다. 운영자가 관계를 만들 수 없다.
6. **공적 활동만.** 사인(私人), 공인의 가족·지인은 등록하지 않는다(rev. 4 11장 유지). 평가자로만 등장하는 외부 인물(유튜버·논평가)은 `Person`으로 만들지 않고 평가 카드 안의 이름으로만 남긴다(5.4).

## 3. 초기 인물 10명 (Q1) — 제안

선정 기준은 인기가 아니라 **그래프 밀도**다. 10명이 서로 여러 사건으로 이어져야 관계도가 첫날부터 빈 화면이 아니다.

- 이재명과 직접 연결되는 사건이 3건 이상
- 본인 발언 기록이 공개 출처로 풍부하다
- 시선이 한쪽으로 쏠리지 않도록 서로 다른 위치의 인물을 섞는다
- 정치인만이 아니라 **평가를 많이 생산하는 사람**을 1~2명 넣는다 — 시선 탭이 여기서 채워진다

| # | 인물 | 넣는 이유 (그래프 관점) |
| --- | --- | --- |
| 1 | 이재명 | 허브. 모든 초기 간선의 중심 |
| 2 | 윤석열 | 대선·검찰 수사·계엄 사건으로 이재명과 가장 많은 사건을 공유 |
| 3 | 한동훈 | 검찰 수사·국회 발언·당 대표 시기로 1·2와 삼각형을 이룸 |
| 4 | 조국 | 검찰개혁 쟁점의 중심. 2·3과도 직접 연결 |
| 5 | 이낙연 | 경선·탈당으로 같은 당 내부의 관계 변화를 보여 줌 |
| 6 | 추미애 | 법무부·검찰 갈등으로 2와 연결, 검찰개혁 쟁점 공유 |
| 7 | 정청래 | 당 지도부·국회 발언이 많아 기록 탭이 두꺼움 |
| 8 | 이준석 | 대선 경쟁, 다른 위치에서의 평가 |
| 9 | 유시민 | 정치 밖에서 평가를 생산하는 사람 — 시선 탭의 대표 사례 |
| 10 | 김어준 | 방송 진행자로서 평가·인터뷰 출처를 많이 만듦 |

**직책과 시기는 등록 시점에 출처로 다시 확인한다.** 이 표는 후보이며 Phase 0에서 확정한다(9장 1번). 교체 후보: 김민석, 홍준표, 박용진, 김동연.

## 4. 개념 모델

```text
Person ──┬─ Statement ──┬─ Topic
         │              └─ Event
         ├─ Evaluation (평가자 → 대상) ── Topic / Event
         └─ Relationship (파생)
                └─ Event · Statement(언급) · Evaluation

Event ── participants: Person[] ── Source ── Topic
```

- `Statement`와 `Evaluation`은 둘 다 "누가 말한 것"이지만 **대상이 다르다.** Statement는 화자 본인의 기록이고, Evaluation은 화자가 다른 인물에 대해 말한 것이다. 한 발언이 둘 다일 수 있는데(A가 B를 비판하는 인터뷰), 이때는 **A의 Statement 1건 + A→B Evaluation 1건**으로 나누고 같은 `Source` 구간을 공유한다. A의 기록 탭과 B의 시선 탭에 각각 나타나야 하기 때문이다.
- `Relationship`은 저장하지만 **작성하지 않는다.** 서버가 Event·Statement·Evaluation 발행 시점에 다시 계산한다(5.6).
- `Topic`이 쌓이면 **사람 ↔ 발언 ↔ 사건 ↔ 쟁점 ↔ 사람**이 하나의 그래프가 된다. MVP에서는 쟁점 화면을 작게 두되 모든 카드에 `topicIds`를 처음부터 받는다. 나중에 채우는 태그는 채워지지 않는다.

## 5. Firestore 데이터 모델 (Q3)

### 5.0 공통

- 모든 콘텐츠 컬렉션은 **클라이언트 읽기·쓰기 모두 차단**(현행 규칙 유지). 공개 화면은 서버에서 Admin SDK로 읽어 렌더링하고, 발행 시 `revalidateTag`로 캐시를 깬다. Firestore 읽기 비용이 트래픽이 아니라 발행 빈도에 비례한다.
- 쓰기는 `/api/ops/content/*`만. zod 검증 → 참조 검증 → 파생 재계산을 한 요청 안에서 한다(현행 `src/lib/content/store.ts`의 흐름 유지).
- 공통 필드

```ts
status: "draft" | "published" | "archived"
corrections: { at: string /* YYYY-MM-DD */; note: string }[]
createdAt: Timestamp
updatedAt: Timestamp
updatedBy: string        // ops uid
```

- 날짜는 `occurredAt: "YYYY-MM-DD"` 문자열 + `datePrecision: "day" | "month" | "year"`. 연도만 아는 발언을 1월 1일로 적으면 타임라인이 거짓말을 한다. 월·연 정밀도는 `-01`로 채워 문자열 정렬을 유지하고, 화면에서는 정밀도대로만 표시한다.
- ID는 ascii slug(`/^[a-z0-9-]+$/`). 현행 규칙 유지.

### 5.1 `sources/{sourceId}` — 원자료

```ts
{
  id: string
  kind: "article" | "video" | "broadcast" | "sns" | "document" | "transcript"
  title: string
  publisher: string          // 언론사, 채널명, 기관
  url: string
  archiveUrl: string | null  // 원본이 사라질 때를 대비한 보존본
  publishedAt: string
  video: { platform: "youtube"; videoId: string; durationSec: number | null } | null
  license: "public" | "quotable" | "link-only"
  rightsStatus: "pending" | "cleared" | "flagged"
}
```

**인용 위치는 Source가 아니라 `Citation`이 가진다.** 같은 영상의 다른 구간을 여러 카드가 가리킬 수 있어야 한다.

```ts
type Citation = {
  sourceId: string
  startSec: number | null    // 영상·방송만
  endSec: number | null
  locator: string | null     // 기사 문단, 페이지 등 텍스트 위치
}
```

검증: `startSec`가 있으면 `source.video`가 있어야 하고, `endSec > startSec`, `durationSec`을 넘지 않는다.

### 5.1a 원자료 보존 (2026-09-24)

영상·기사는 언제든 사라진다. 사라져도 기록이 남도록 세 겹으로 보관한다.

| 층 | 필드 | 설명 |
| --- | --- | --- |
| 구간 전사본 | `Citation.transcript`, `transcriptOrigin`(`manual`·`auto-caption`·`asr`), `transcriptVerified` | 인용한 구간에서 한 말을 받아 적은 원문. **구간만** 보관한다 — 부분 인용은 방어할 수 있지만 전체를 다시 싣는 것은 인용 범위를 넘는다. 원본과 대조한 것만 "확인됨"으로 표시한다 |
| 출처 스냅샷 | `Source.description`, `capturedAt` | 등록 시점의 설명란과 확인 날짜 |
| 외부 보존본 | `Source.archiveUrl` | 운영 화면의 버튼으로 인터넷 아카이브(Save Page Now)에 저장 |

- 영상 파일 자체는 저장하지 않는다(복제권).
- **사라짐 감지:** `sources.availability`(파생)는 저장할 때 한 번, 이후 주 1회 크론(`/api/cron/sources`, 월 05:30)이 확인한다. 유튜브는 키가 필요 없는 oEmbed로 묻는다(404 = 삭제, 401·403 = 비공개). 네트워크 오류는 알려진 상태를 지우지 않는다.
- **표시:** 원본이 사라지면 링크에 "원본 삭제됨 · 확인일"을 붙이고, 접혀 있던 구간 원문을 펼쳐 "임통이 보관한 원문"임을 밝힌다. 영상 썸네일은 내린다.
- 관계도 간선은 여전히 `quote`(핵심 원문)에서만 찾는다. 전사본에는 진행자·질문자의 말이 섞일 수 있어서다.

### 5.1b 블록체인 대조 (2026-09-24)

운영자나 서버 침입자가 데이터베이스를 고치는 것 자체는 막을 수 없다. 대신 **몰래 고치는 것**을 불가능하게 한다. 언행·시선이 공개되거나 수정·내려질 때마다 그 내용의 지문(SHA-256)을 Steem 블록체인에 남긴다.

- **무엇을 올리나:** `custom_json`(id `imtong`, 작성 계정 `@ppebak`, posting 권한) 한 건. 내용은 `{ app, t, id, v, op, h, prev }` — 종류, 기록 ID, 버전, `publish`·`update`·`retract`, 지문, 앞 버전 지문. **본문은 올리지 않는다.** 체인에 올린 글은 지울 수 없어서 정정·삭제 요청에 응할 수 없게 되기 때문이다.
- **지문 규칙** (`src/lib/anchor/canonical.ts`, `imtong-anchor/1`): 화자·날짜·종류·요약·핵심 원문·맥락·판정·쟁점·사건·정정 이력, 근거(출처 URL·영상 ID·구간·위치·구간 원문). 키를 정렬하고 문자열을 NFC로 맞춘 JSON의 SHA-256. 출처 제목처럼 발언과 무관한 필드는 넣지 않는다. 규칙을 바꾸면 형식 번호를 올리고 옛 규칙을 남긴다.
- **버전 사슬:** 수정은 덮어쓰기가 아니라 앞 지문을 가리키는 새 버전이다. 내린 기록도 `retract`로 흔적이 남는다.
- **흐름:** 저장 시 `anchors/{type}_{id}`에 대기 버전을 쌓고(`lib/anchor/queue.ts`), 운영 API가 **응답을 보낸 직후** 순서대로 올린다(`after()`). 저장이 Steem 노드 상태에 묶이지 않는다. 키가 없거나 실패하면 대기 상태로 남고, **1시간마다** 크론(`/api/cron/anchors`, 매시 17분)이 다시 시도한다. 콘텐츠 쓰기는 드물어서 1분 주기로 돌 이유가 없다.
- **대조:** `/verify/{statement|evaluation}/{id}`. 방문자의 브라우저가 화면 내용으로 지문을 계산하고, 임통 서버가 아니라 공개 Steem 노드에서 블록을 직접 읽어 비교한다. 대조용 원문 JSON 내려받기와 직접 확인 방법도 함께 준다.
- **키:** 서버에는 `@ppebak`의 posting 키만(Secret Manager `STEEM_ANCHOR_POSTING`) 둔다. 키가 새도 할 수 있는 것은 새 기록 추가뿐이고, 이미 올라간 기록은 바꿀 수 없다.
- ppebak.com 서비스는 쓰지 않는다. 익명 게시판으로 남겨 두고 계정만 공유한다(2026-09-24 결정).

### 5.1c 날짜 확실성과 화자 확인 (2026-09-24, 김어준 등록 점검에서 추가)

- **`dateCertainty`**(`confirmed`·`estimated`, 기본 `confirmed`) — 언행·시선·사건. 출처에서 날짜를 확인하지 못하고 직책 시기 등으로 추정했다면 `estimated`로 두고, 화면에 "2019년 (추정)"처럼 표시한다. 추정 날짜는 기록이 주장하는 내용이므로 지문에 넣고, `confirmed`는 넣지 않아 이미 체인에 오른 지문을 바꾸지 않는다.
- **`speakerVerified`**(기본 `false`) — 언행·시선. 원문이 정말 그 사람의 말인지 운영자가 원본에서 확인했는가. 공개를 막지 않고, 확인 전이면 공개 카드에 "화자 확인 전" 표식(`pending` 색)을 붙인다. 구간 원문의 `transcriptVerified`와 같은 검수 상태라 지문에 넣지 않는다.
- 원 출처(편집 채널이 아닌 원 방송)는 별도 필드로 두지 않는다. 편집본이 많아 원본을 알기 어려운 경우가 대부분이어서, 알면 맥락·설명란에 적는다(2026-09-24 결정).
- 여러 사람을 함께 겨냥한 평가는 대상별로 한 건씩 만든다(같은 근거 공유).

### 5.2 `people/{personId}`

```ts
{
  id: string                   // = slug
  name: string
  aliases: string[]            // 검색용 공식 표기(한자·영문). 별명 아님
  roles: {                     // 시기별 공적 직함. 현재는 to: null
    title: string              // "국회의원", "작가"
    org: string | null
    from: string | null
    to: string | null
    citation: Citation
  }[]
  summary: string              // 한 줄 소개. 사실만 — 직함·활동 분야
  image: { path, sourceUrl, license, rightsStatus }   // 현행 구조 유지
  playable: boolean            // 게임 대상 여부
  counts: {                    // 파생 — 서버만 쓴다
    statements: number
    evaluationsReceived: number
    evaluationsGiven: number
    relations: number
  }
  searchTokens: string[]       // 이름·별칭 접두어. 서버가 만든다
  status, corrections, createdAt, updatedAt, updatedBy
}
```

- `summary`와 `roles`에 **성향 서술을 넣지 않는다.** 검증기가 금지어 목록(`친명`, `반명`, `비명`, `배신` 등)을 막는다 — 완전하지 않지만 실수는 막는다.
- `counts`는 프로필 상단 `기록 48 · 평가 21 · 관계 17`을 읽기 1회로 그리기 위한 캐시다.

### 5.3 `statements/{statementId}` — 본인 언행 (`기록` 탭)

```ts
{
  id: string
  personId: string             // 화자
  occurredAt: string
  datePrecision: "day" | "month" | "year"
  kind: "remark" | "interview" | "speech" | "sns" | "hearing" | "action" | "decision" | "policy"
  headline: string             // 짧은 요약 — 앱의 목소리. 사실만
  quote: string | null         // 실제 발언 원문. action/decision은 null 허용
  context: string              // 어떤 질문·상황에 대한 것이었나
  citations: Citation[]        // min 1
  topicIds: string[]
  eventId: string | null
  mentionExclusions: string[]  // 자동 검출된 언급 중 오검출(동명이인·다른 뜻)만 뺀다
  mentionedPersonIds: string[] // 파생 — 원문에서 자동 검출. 관계 간선의 근거 (5.6)
  assertionType: "FACT" | "CLAIM" | "INTERPRETATION"
  status, corrections, createdAt, updatedAt, updatedBy
}
```

- 카드 표시 순서가 필드 순서다: **headline → quote → citation(구간) → context**.
- `kind`가 `remark|interview|speech|sns|hearing`이면 `quote` 필수.
- "같은 주제에 대한 과거 발언"은 `personId == X && topicIds array-contains T` + `occurredAt` 정렬 한 번이다. 앱은 변했다/유지됐다를 **판정하지 않고** 나란히 놓기만 한다.

### 5.4 `evaluations/{evaluationId}` — 타인의 평가 (`시선` 탭)

```ts
{
  id: string
  targetPersonId: string
  evaluator: {
    personId: string | null    // 등록된 인물이면 링크
    name: string               // 항상 채운다 (등록 인물도 스냅샷)
    descriptor: string         // "유튜브 채널 운영자", "정치평론가" — 직함·매체만
  }
  occurredAt: string
  datePrecision: "day" | "month" | "year"
  format: "video" | "interview" | "broadcast" | "column" | "sns" | "book"
  claim: string                // 평가자 주장의 요약. 주어는 평가자
  quote: string | null
  citation: Citation           // 정확히 1개. 영상이면 구간 필수
  topicIds: string[]
  eventIds: string[]           // 평가가 언급한 사건
  respondsTo: string | null    // 다른 평가에 대한 반론이면 그 id
  status, corrections, createdAt, updatedAt, updatedBy
}
```

- `evaluator.personId !== targetPersonId`. 자기 평가는 Statement다.
- `format: video|broadcast`면 `citation.startSec/endSec` 필수. 영상 전체를 근거로 등록하지 않는다.
- **등록 기준(법적 방어선, 8장 9번):** 이미 공개된 발언만, `claim`은 원문 범위를 넘지 않게, 구체적 사실을 적시한 비방은 원문이 있어도 등록하지 않는다.
- 외부 평가자를 `Person`으로 만들지 않는 이유: 한 번 등장한 유튜버마다 프로필이 생기면 인물 목록이 평가자로 채워지고, 사인에 가까운 사람의 페이지가 생긴다. 반복 등장하고 공적 활동이 충분해지면 `Person`으로 승격하고 `evaluator.personId`를 채운다(9장 4번).

### 5.5 `events/{eventId}` — 사건

```ts
{
  id: string
  title: string                // 중립적 명칭. 한쪽이 붙인 이름을 쓰지 않는다
  occurredAt: string
  endAt: string | null
  datePrecision: "day" | "month" | "year"
  summary: string
  participants: {
    personId: string
    role: "principal" | "participant" | "commenter"   // 당사자 / 참여 / 발언만 함
    note: string | null        // "기소", "증인 출석" 등 사실만
  }[]
  memberIds: string[]          // 파생 — 등장 인물 전체 (의존성 검사·사건 화면용)
  topicIds: string[]
  citations: Citation[]        // min 1
  status, corrections, createdAt, updatedAt, updatedBy
}
```

- `memberIds`(파생)는 사건에 등장하는 인물 전체다. Firestore `array-contains`는 객체 배열 안의 필드를 찾지 못해서 따로 둔다.
- `role`은 사건 안에서의 **행위**만 담는다. 편(가해/피해, 아군/적군)을 담지 않는다.
- **사건은 관계 간선을 만들지 않는다**(5.6).

### 5.6 `relationships/{pairId}` — 관계 (파생 전용)

```ts
// pairId = 정렬된 두 personId를 "__"로 잇는다: "han-donghoon__lee-jaemyung"
{
  pairId: string
  personIds: [string, string]  // 정렬됨
  weight: number               // 근거 수. 이웃 순서·선 굵기
  counts: { mentions: number; evaluations: number }
  firstAt: string
  lastAt: string
  evidence: {                  // 시간순, 최대 100건. 넘으면 페어 화면이 원 컬렉션을 쿼리
    type: "mention" | "evaluation"
    id: string
    at: string
    from: string | null        // 방향이 있는 근거(언급·평가)의 화자
    headline: string           // 스냅샷
  }[]
  computedAt: Timestamp
}
```

**간선은 두 사람의 언행에서만 생긴다.** 운영자도 사용자도 "이 둘은 연결돼 있다"고 선언할 수 없다(2026-09-23 결정).

| 근거 | 조건 | 방향 |
| --- | --- | --- |
| `mention` | A의 Statement **원문(`quote`)에 B의 이름·별칭이 나온다** — 서버가 자동 검출 | A → B |
| `evaluation` | 등록 인물 A가 B를 평가한 Evaluation — 평가도 A의 언행이다 | A → B |

- **사건은 간선을 만들지 않는다.** 같은 사건에 등장했다는 것은 운영자가 참여자 목록을 어떻게 적었는가의 결과이지 두 사람의 언행이 아니다. 사건은 사건 화면에서 등장 인물을 보여 주는 데만 쓴다.
- **언급은 자동 검출이다.** `mentionedPersonIds`는 파생 필드이고 CMS가 받지 않는다. 한글 이름은 조사가 붙어도(이재명은·이재명이) 잡히도록 부분 일치, 라틴 별칭은 단어 경계로 찾는다. 한 글자 이름은 찾지 않는다.
- **운영자는 빼기만 할 수 있다.** `mentionExclusions`로 동명이인이나 다른 뜻(예: "조국" = 나라)으로 잡힌 이름을 제외한다. 더하는 입력은 없다.
- 인물을 새로 등록하거나 이름·별칭·공개 상태를 바꾸면 서버가 **모든 언행의 원문을 다시 검출**한다. 오늘 등록한 인물도 과거에 그를 부른 발언과 이어진다.
- 간선은 두 사람이 모두 `published`일 때만 있다.

**`label`·`type`·`sentiment` 필드는 없다.** 스키마에 없으면 CMS에 입력칸이 없고, API가 받지 않는다(2장 1번).

재계산: Statement·Evaluation이 발행·내려감·원문 변경될 때, 서버가 **변경 전과 후의 인물 쌍 합집합**에 대해 해당 쌍을 원 컬렉션에서 다시 쿼리해 덮어쓴다. 근거가 0이면 문서를 지운다. 증분이 아니라 쌍 단위 전체 재계산이다 — 콘텐츠 쓰기는 운영자만 하므로 빈도가 낮고, 증분은 한 번 틀리면 계속 틀린다.

### 5.7 `topics/{topicId}` — 쟁점

```ts
{
  id: string
  name: string                 // "검찰개혁"
  description: string
  parentId: string | null      // 한 단계만
  counts: { statements: number; evaluations: number; events: number; people: number }
  status, corrections, createdAt, updatedAt, updatedBy
}
```

MVP에서는 `/topics/[slug]` 목록 화면 하나. 데이터는 처음부터 채운다(4장).

### 5.8 참여 원장 — 인물과 언행에 대한 호불호

입장(`stance: punch | cheer | unknown`)을 내는 대상은 **인물과 언행** 두 가지다. 정책은 별도 타입이 아니라 `statement.kind: "policy"` — 누가 발표하고 추진한 정책인지가 곧 근거다.

원장(`users/{uid}/stances`)과 롤업은 **그대로 쓴다.** 대상 종류만 바뀐다.

| 원장 필드 | rev. 4 | rev. 5 |
| --- | --- | --- |
| `kind` | `"person" \| "policy"` | `"person" \| "statement"` |
| `subjectId` | `contentSubjects` id | `people` id (`playable: true`만) 또는 `statements` id |
| `recordId` | `contentRecords` id | `statements` id (반사 게임 헤더 카드) |
| 월드컵 항목 | record / policy | statement |

두 대상은 **읽는 창이 다르다.**

| | 인물 | 언행·정책 |
| --- | --- | --- |
| 무엇을 묻나 | 지금 이 사람을 어떻게 보는가 | 이 말·행동·정책을 어떻게 보는가 |
| 기본 창 | 최근 30일 (7일·전체 제공) | **전체 기간** — 언행은 과거의 고정된 사건이다 |
| 1인 1표 | 창 안에서 가장 최근 입장 | 전체 기간에서 가장 최근 입장 |
| 어디서 내나 | 반사 게임, 훑어보기, 정적 버튼 | 언행 카드 버튼, 훑어보기(언행 모드) |
| 어디에 보이나 | 인물 상세 머리(6.1), 게임 화면 | 언행 카드 아래(6.1), 같은 주제 시트(6.2) |

- 한 행위가 두 원장에 동시에 쓰이지 않는다. 반사 게임은 인물 입장 1건만 만들고, 헤더에 띄운 언행에는 입장을 만들지 않는다. 언행에 대한 입장은 사용자가 그 언행을 보고 직접 누른 것만이다.
- 표시 규칙은 인물과 같다: n<30 마스킹, 표본 문구 동반, `지지율`·`여론`·`찬반`이라는 말을 쓰지 않는다(implementation-design 3장).
- 언행은 수천 건으로 늘어난다. `subjectStats/_index`(목록용 단일 문서)에는 **인물만** 넣고, 언행 수치는 기록 탭 한 페이지(20건)를 `getAll` 한 번으로 읽는다.

#### 이 수치가 여론의 참고치가 되려면

호불호가 쌓이면 사람들이 이 수치를 비공식 지지율처럼 인용할 수 있다. 앱이 그렇게 **부르지 않는 것**과, 인용될 때 **덜 틀리게 하는 것**은 별개의 일이다. 후자를 위해 데이터 구조에 미리 넣어 둘 것:

1. **1인 1표 유지.** 이미 원장이 보장한다. 연타·반복이 수치를 움직이지 않는다.
2. **표본 구성의 공개.** 참여자 수뿐 아니라 참여자가 어떤 사람들인지. 선택 입력으로 연령대·지역·성별을 받아 두면(`users/{uid}.profile`, 선택, 수정 가능) 나중에 가중 추정을 붙일 수 있다. 받지 않은 데이터는 나중에 복원할 수 없다.
3. **가중 전과 후를 함께.** 가중을 붙이더라도 원 수치와 나란히 둔다.
4. **자기 선택 표본이라는 한계는 가중으로 사라지지 않는다.** 앱에 스스로 온 사람들이라는 사실 자체가 편향이고, 확률 표본 여론조사와 같은 것이 될 수는 없다. 이 문장은 `/about`에 그대로 적는다.
5. **선거기간 규제.** 공직선거법은 선거 전 일정 기간 여론조사와 인기투표·모의투표 결과의 공표를 제한한다. 이 수치가 그 범위에 드는지는 법률 검토 대상이다(implementation-design 11장 3번). 대상별·전역 비공개 토글은 언행 수치에도 적용한다.

### 5.9 쿼리와 인덱스

| 화면 | 쿼리 | 복합 인덱스 |
| --- | --- | --- |
| 기록 탭 | `statements` `personId ==` `status ==` order `occurredAt desc` | personId, status, occurredAt desc |
| 같은 주제 과거 발언 | + `topicIds array-contains` | personId, status, topicIds(array), occurredAt |
| 시선 탭 | `evaluations` `targetPersonId ==` `status ==` order `occurredAt desc` | targetPersonId, status, occurredAt desc |
| 이 사람이 한 평가 | `evaluations` `evaluator.personId ==` … | evaluator.personId, status, occurredAt desc |
| 관계도 | `relationships` `personIds array-contains` order `weight desc` limit 12 | personIds(array), weight desc |
| 관계 상세 | `relationships/{pairId}` 1회 | — |
| 사건 상세 | `events/{id}` + `statements` `eventId ==` | eventId, status, occurredAt |
| 쟁점 | 세 컬렉션 각각 `topicIds array-contains` `status ==` order `occurredAt desc` | 컬렉션별 1개 |
| 인물 검색 | `people` `searchTokens array-contains` | — |

인물 상세 1회 렌더링 = 인물 1 + 기록 첫 페이지 1 + 시선 첫 페이지 1 + 관계 1 = **쿼리 4회**. 서버 렌더링 후 태그 캐시하므로 방문이 늘어도 읽기는 늘지 않는다.

### 5.10 검증 (`validate` + ops API 공용)

현행 검사(implementation-design 6장)에 더해:

1. Statement·Event는 citation ≥ 1, Evaluation은 정확히 1
2. 영상 citation의 구간 유효성(5.1)
3. `quote` 필수 조건(5.3), `evaluator.personId !== targetPersonId`(5.4)
4. 참조 무결성 — personId, topicIds, eventId(s), mentionedPersonIds, respondsTo, sourceId
5. `published` 콘텐츠가 `draft`·`archived` 인물·사건을 참조하지 않는다
6. (삭제) — 사건은 간선을 만들지 않으므로 참여자 상한이 필요 없다
7. 인물 `summary`·`roles`, Event `title`의 금지어
8. 인물을 `archived`로 내릴 때 그를 참조하는 `published` 카드가 있으면 거부 — 현행 `assertNoDependents`와 같은 방식

## 6. 화면 설계 (Q2)

모바일 우선, 콘텐츠 폭 560px. 토큰·색 규칙은 implementation-design 4장 그대로. 추가 규칙: **본인 기록 카드와 평가 카드는 모양부터 다르다** — 기록은 세로 타임라인의 점, 평가는 평가자 이름이 머리에 오는 인용 카드.

### 6.1 인물 상세 `/people/[slug]`

```text
┌──────────────────────────────┐
│ ←                        ⋯  │
│          ( 사진 )            │
│          유시민              │
│      작가 · 전 보건복지부 장관 │
│                              │
│  기록 48 · 평가 21 · 관계 17  │
│                              │
│  30일 · 참여 968명 · 펀치 61% │  인물 참여 비율
│  임통 참여자의 기록 · 여론조사 아님│  표본 문구는 떼어 낼 수 없다
│ ┌──────────────────────────┐ │
│ │ 펀치 / 응원 하러 가기  →  │ │  playable일 때만. 개인 층 진입
│ └──────────────────────────┘ │
│                              │
│  기록     시선     관계       │  탭 = ?tab= 쿼리. 공유 링크가 탭을 보존
│  ━━━━                        │
│  [쟁점 ▾ 전체]               │
│                              │
│  2026                        │
│   │                          │
│   ● 9월 12일 · 방송 인터뷰    │
│   │ 요약 한 줄 (headline)     │
│   │ “실제 발언 원문…”         │
│   │ ▶ 영상 03:21–04:10  원문  │  구간 링크는 해당 초로 바로
│   │ 맥락 ▸                    │  접힘. 펼치면 context
│   │ #검찰개혁 · 같은 주제 발언 3 │  → 6.2
│   │ [👊 펀치] [👏 응원] [잘 모름]│  언행 호불호 (5.8)
│   │ 참여 412명 · 펀치 71%       │  n<30이면 "참여 30명부터"
│   │                          │
│   ● 7월 4일 · SNS             │
│  2025                        │
│   ● …                        │
│        [ 더 보기 ]            │  커서 페이지네이션 20건
└──────────────────────────────┘
```

**`시선` 탭**

```text
  이 사람에 대해 말한 사람들
  [전체] [등록 인물] [외부]

  ┌──────────────────────────┐
  │ 조하나 · 유튜브 채널 운영자 │  평가자가 머리. 등록 인물이면 링크
  │ 2026.08.30 · 영상          │
  │ ┌──────────────────────┐ │
  │ │ ▶ 썸네일  12:31–18:42 │ │  링크 + 썸네일. 임베드는 탭할 때
  │ └──────────────────────┘ │
  │ 조하나는 유시민이 …라고     │  claim — 주어가 평가자
  │ 말했다.                   │
  │ #언론 · 사건: ○○ 인터뷰     │
  │ ↳ 이 평가에 대한 반론 1     │  respondsTo 역방향
  └──────────────────────────┘
```

**`관계` 탭** — 6.3의 관계도 + 아래에 이웃 목록(가중치 순). 목록이 그래프의 동등 경로다.

**참여 비율은 인물 상세 상단에 둔다**(9장 2번 확정). 기록·시선·관계 탭 **밖**, 프로필 머리에 한 줄로 두고, n과 표본 문구를 항상 붙인다. 아카이브 본문(탭 안)은 여전히 인물을 규정하지 않는다 — 수치는 앱의 판단이 아니라 참여자의 기록이고, 화면 위치로 그 둘을 가른다.

### 6.2 같은 주제 발언 비교 (바텀 시트)

```text
  유시민 · #검찰개혁           ✕
  ─────────────────────────────
  2022.03  “…”   ▶ 01:24
     │
  2024.06  “…”   ▶ 12:10
     │
  2026.02  “…”   원문
  ─────────────────────────────
  앱은 입장 변화를 판정하지 않습니다.
```

변화 여부를 표시하는 배지·색은 없다.

### 6.3 관계도 (`관계` 탭 + `/graph/[slug]` 전체 화면)

**형태: 1촌 방사형(ego graph).** 전체 포스 레이아웃은 모바일에서 읽을 수 없고 그릴 때마다 모양이 바뀌어 기억할 수 없다.

```text
                 한동훈
                   │ 12
        조국 ────( 이재명 )──── 윤석열
          7        │  │   24
                 3 │  └── 이낙연 5
                 정청래
```

- 중심 1명 + 가중치 상위 12명을 원 위에 **결정적 배치**(weight 내림차순, 동률은 id순 → 각도 고정). 같은 데이터면 같은 그림.
- 선 굵기 = `weight` 3단계 양자화. 선 위 숫자 = 근거 수. **색은 쓰지 않는다** — 색이 있으면 우호/적대로 읽힌다.
- 이웃 탭 → 그 사람이 중심인 관계도로 이동(계속 타고 도는 핵심 UX). 선 탭 → 6.4.
- SVG. 노드 13개에 그래프 라이브러리는 필요 없다.
- 넘치는 이웃은 아래 목록에 "외 N명".
- 고정 문구: "선은 한 사람이 다른 사람을 공개적으로 언급하거나 평가한 기록이 있다는 뜻입니다."

### 6.4 관계 상세 `/people/[a]/with/[b]`

```text
  ←   이재명 ↔ 한동훈
      근거 12 · 2022.05 – 2026.07

  [전체] [언급 10] [평가 2]

  2026.07
   ● 언급 · 한동훈 → 이재명
     “…이재명 대표는 …”          ▶ 12:40
  2025.04
   ● 평가 · 한동훈 → 이재명
     한동훈은 이재명이 …라고 말했다  ▶ 05:12
  2024.11
   ● 언급 · 이재명 → 한동훈
     “…”                            원문
```

- `a`·`b` 순서는 자유. 서버가 정렬해 `pairId`로 읽고, 정규 URL(`a < b`)로 리다이렉트한다.
- 방향이 있는 근거는 화살표로 누가 말했는지 보여 준다. 이 화면이 "왜 연결되어 있는가"의 답이다.

### 6.5 사건 상세 `/events/[id]`

제목·기간·요약·출처 → **등장 인물**(당사자·참여·발언) → 이 사건에 대한 발언(`statements.eventId`) → 이 사건을 언급한 평가. 인물 칩을 누르면 그 인물로.

### 6.6 탐색 `/`

```text
  [ 인물 검색                 ]

  인물                        전체 →
  ( ) ( ) ( ) ( ) ( )  가로 스크롤

  최근 추가된 기록
  ● 2026.09.12 유시민 · 방송 인터뷰 …
  ● 2026.09.10 조하나 → 이재명 · 영상 …

  쟁점
  #검찰개혁 #사법개혁 #계엄 …

  ─────────────
  게임: 훑어보기 · 월드컵
```

게임 진입은 탐색 화면 아래와 인물 상세 CTA 두 곳. 첫 화면의 주인공은 아카이브다.

### 6.7 게임

implementation-design 7장 그대로. 헤더 카드는 그 인물의 statement 중 운영자가 고른 것, 없으면 최신 1건. 결과 화면에 "이 사람의 기록 보기"로 아카이브에 되돌아가는 링크를 둔다.

## 7. 라우트

```text
/                               탐색
/people                         인물 전체
/people/[slug]?tab=records|views|relations
/people/[slug]/with/[other]     관계 상세
/people/[slug]/play/[mode]      반사 게임 (playable만)
/graph/[slug]                   관계도 전체 화면
/events/[id]
/topics  /topics/[slug]
/play/swipe  /play/worldcup/[bracket]
/about
/ops/content                    CMS
```

삭제: `/policies/*`, `/records`(인물·쟁점 화면이 대체).

CMS `type`: `person | statement | evaluation | event | topic | source | bracket`. 평가·발언 폼에는 유튜브 URL에서 `videoId`를 뽑고 `mm:ss` 입력을 초로 바꾸는 보조를 둔다 — 구간 입력이 귀찮으면 영상 전체가 등록된다.

## 8. 법적 검토 추가 항목

implementation-design 11장에 더한다.

9. **타인의 평가 재게시.** 제3자의 비방을 요약해 다시 게시하면 게시자도 책임 주체가 될 수 있다. 대응: 공개 출처에 이미 게시된 발언만, 원문 범위를 넘는 요약 금지, 구체적 사실을 적시한 비방은 등록 거절, 평가 대상의 정정·삭제 요청 창구(11장 6번 SLA 공유). 확인할 것: 요약·발췌 인용의 허용 범위.
10. **영상 인용.** 썸네일 표시·구간 링크·임베드의 저작권 범위. 기본은 링크 + 썸네일, 임베드는 사용자가 탭할 때. 영상 캡처를 서버에 올리지 않는다.
11. **관계도의 암시.** 라벨이 없어도 선이 이어져 있다는 것 자체가 연루로 읽힐 수 있다. 대응: 선은 두 사람의 **발언에서만** 생기고(5.6), 선을 누르면 항상 그 발언이 나오며, 관계도에 고정 문구를 둔다(6.3).

## 9. 미결 사항

1. ~~초기 10명~~ — **확정(2026-09-23):** 3장 제안대로. 권리 확인된 사진이 있어야 `playable: true`. 사진이 없으면 아카이브에만 올리고 게임에서는 뺀다.
2. ~~펀치 비율 노출 위치~~ — **확정:** 인물 상세에도 표시한다(6.1). 언행 카드에도 표시한다(5.8).
3. ~~서비스 이름~~ — **확정:** `임통`. 도메인(`punch.jamtong.kr` 유지 여부)은 배포 단계에서 정한다.
4. **외부 평가자 승격 기준**(5.4).
5. **쟁점 계층.** 한 단계 `parentId`로 충분한지.
6. **월드컵 항목.** statement/topic으로 바꾸면 사실상 "어느 발언이 더 문제인가"만 남는다. topic 대결이 의미가 있는지.
7. **반론 연결(`respondsTo`) 노출.** MVP에서 데이터만 받아 둘지.
8. **대상 사용자 범위.** rev. 4는 대상을 범진보 성향으로 못박았다. 호불호 수치를 여론의 참고치로 키우려면(5.8) 참여자 폭이 넓어야 하는데, 이 전제와 부딪힌다.
9. **게임 화면.** 반사 게임(얼굴 타격)·훑어보기·월드컵 UI는 아직 없다. 지금 입장은 정적 경로(버튼)로만 낼 수 있고, 원장에 남는 것은 게임과 같은 1건이다. 얼굴 타격은 implementation-design 11장 2번(초상권) 검토가 선행 조건이다.

## 10. 구현 단계

원장·집계·게임 셸(rev. 4 Phase 3~4)은 구현돼 있으므로 건드리지 않는다. 아래는 콘텐츠 쪽 교체다.

### Phase A — 스키마와 CMS — 구현됨 (2026-09-23)

- `src/content/schema.ts`를 5장 스키마로 교체, `lib/content/store.ts`의 컬렉션·참조 검증·의존성 검사 확장
- `relationships` 쌍 단위 재계산(5.6), `people.counts`·`topics.counts` 파생
- CMS 폼 6종 + 유튜브 구간 입력 보조
- `firestore.indexes.json`에 5.9 인덱스. 규칙은 콘텐츠 전체 차단 유지
- `validate-content.ts`에 5.10 검사

완료 조건: 원문에 다른 인물의 이름이 나온 언행을 발행하면 `relationships/{pairId}`가 생기고, 그 언행을 `archived`로 내리면 문서가 사라진다. 사건에 함께 등장한 것만으로는 생기지 않는다(에뮬레이터 테스트). 관계 라벨·언급 목록을 담은 요청은 400.

### Phase B — 아카이브 화면 — 구현됨 (2026-09-23)

구현된 것: `/`, `/people`, `/people/[slug]`(기록·시선·관계 탭, 쟁점 필터, `?compare=` 같은 주제 시트, 참여 비율), `/events/[id]`, `/topics`, `/topics/[slug]`. 읽기는 `src/lib/archive/read.ts`에서 `content` 태그로 캐시하고 운영 API가 쓸 때마다 만료시킨다. 관계 탭은 이웃 목록까지이고, 방사형 그림과 관계 상세는 Phase C, 게임 진입 버튼과 언행 호불호 버튼은 Phase D다.

- 탐색, 인물 상세 3탭, 같은 주제 시트, 사건 상세, 쟁점 목록·상세
- 태그 캐시와 발행 시 재검증

완료 조건: 초기 인물이 전부 렌더링되고, 기록·시선이 서로 다른 탭에만 나타나며, 모든 카드에서 원본 구간으로 이동할 수 있다.

### Phase C — 관계도 — 구현됨 (2026-09-23)

구현된 것: 방사형 SVG 관계도(`src/lib/archive/graph.ts` 결정적 배치, `RelationGraph`), 인물 상세 `관계` 탭의 그림 + 목록, `/graph/[slug]` 전체 화면(인물을 누르면 관계도 안에서 이동), `/people/[a]/with/[b]` 관계 상세(정규 주소로 리다이렉트, 방향별 건수, 언급·평가 필터). 그림은 서버에서 그린 SVG이고 선과 인물이 모두 일반 링크라 자바스크립트 없이 동작한다.

- 방사형 SVG 관계도, 이웃 목록, 관계 상세, 전체 화면 관계도

완료 조건: 모든 선과 이웃이 탭 가능하고 탭하면 근거가 1건 이상 나온다. 같은 데이터로 두 번 그리면 같은 배치다.

### Phase D — 게임 재연결과 언행 호불호 — 부분 구현 (2026-09-23)

구현된 것: 참여 API의 인물·언행 대상(`requirePublishedTargets`), 인물 상세 머리의 펀치·응원 버튼과 모든 언행 카드의 펀치·응원·잘 모름 버튼(정적 경로, `StanceButtons`), 언행 카드의 전체 기간 참여 비율, 목록용 `subjectStats/_index`에서 언행 제외(롤업·만료·재집계 모두 코호트의 `kind`로 가른다), 월드컵 항목의 언행 전환, 정책 대상 제거.

**구현되지 않은 것:** 반사 게임·훑어보기·월드컵의 **화면 자체**. rev. 4에서 만든 것은 참여·비교 API와 집계뿐이고 게임 UI는 없었다. 그래서 게임 헤더 카드, 훑어보기 언행 모드, 게임 결과 → 아카이브 링크는 게임 화면과 함께 만든다(9장 9번).

- 참여 API의 대상을 `{ kind: "person" | "statement", id }`로 바꾸고, 인물은 `playable`, 언행은 `published`만 받는다
- 게임 헤더 카드를 `statements`로
- 언행 카드의 펀치·응원·잘 모름 버튼(정적 경로), 훑어보기의 언행 모드
- 인물 상세 상단 참여 비율, 언행 카드 참여 비율(5.8)
- 정책 대상·정책 라우트 제거, 월드컵 항목 타입 교체
- 게임 결과 → 아카이브 링크

완료 조건: `playable: false` 인물에 대한 참여 제출이 거부되고, 언행 1건에 한 사람이 여러 날 입장을 내도 `all` 비율은 1인분만 움직이며, 현행 원장·집계 테스트가 전부 통과한다.
