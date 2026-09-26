# 리로그 프론트엔드 에러 트래킹 전략

## 1. 목표

리로그 프론트엔드에서 발생한 문제를 사용자 제보보다 먼저 발견하고, 개발자가 다음 정보를 한 번에 확인할 수 있게 한다.

- 어떤 사용자 흐름과 화면에서 실패했는가?
- 어떤 브라우저·디바이스·릴리즈에서 발생했는가?
- 같은 원인의 에러가 몇 명에게 얼마나 자주 발생했는가?
- 실제 소스의 파일·라인은 어디인가?
- 최근 배포가 원인인가?
- 클라이언트뿐 아니라 server component, route handler 등 서버사이드 오류도 자동으로 수집되는가?
- Slack에서 즉시 인지하고 대응을 시작할 수 있는가?

### 왜 Sentry인가

프론트엔드 에러 트래킹 도구로 PostHog Error Tracking, Bugsnag, Sentry를 비교했다.

- **PostHog Error Tracking**: 리로그가 이미 제품 분석·세션 리플레이에 사용 중이다. `@posthog/nextjs-config`로 소스맵 빌드 업로드, `posthog-js`의 `capture_exceptions`로 클라이언트 자동 수집, `instrumentation-client.ts` 연동을 지원한다. 세션 리플레이와 에러를 같은 플랫폼에서 바로 연결할 수 있다.
- **Bugsnag**: 에러 트래킹 전문 도구. "stability score"와 릴리즈 health 중심의 워크플로우가 강점이다. 알림 noise가 적고 가볍다는 평가를 받는다.
- **Sentry**: 에러 트래킹 전문 도구. `@sentry/nextjs`로 server component·client component·route handler·middleware 오류를 자동 계측한다. fingerprint 커스텀·이슈 워크플로우·Slack 조건부 알림이 성숙하다.

| 요구사항 | PostHog Error Tracking | Bugsnag | Sentry |
| --- | --- | --- | --- |
| 브라우저 런타임 오류 자동 수집 | ✔ (`capture_exceptions`) | ✔ | ✔ |
| 서버 오류 자동 계측 (server component, route handler) | △ (instrumentation hook 수동 구성) | △ (범용 SDK 수동 구성) | ✔ (`@sentry/nextjs` 자동) |
| stack trace 기반 이슈 그룹화 | ✔ | ✔ | ✔ (fingerprint 커스텀 성숙) |
| 소스맵 업로드 → 원본 파일·라인 복원 | ✔ (`@posthog/nextjs-config`) | ✔ | ✔ |
| 릴리즈·커밋 연결 및 회귀 감지 | ✔ (릴리즈 breakdown) | ✔ (stability score) | ✔ (suspect commit, 자동 회귀 알림) |
| Slack rule-based 알림 | △ (webhook 기반) | ✔ | ✔ (조건부 규칙 세밀) |
| 세션 리플레이 연동 | ✔ (내장, 같은 플랫폼) | ✕ | ✔ (별도 기능) |
| 이슈 상태 관리 (resolve/regression/reopen) | △ (기본 제공) | ✔ | ✔ (성숙) |
| 이미 리로그에서 사용 중 | ✔ | ✕ | ✕ |

**PostHog Error Tracking을 선택하지 않은 이유:**

PostHog 하나로 합치면 도구 수를 줄이고 세션 리플레이를 바로 연결할 수 있어 매력적이지만, 현시점에서 다음 차이가 있다.

- `@sentry/nextjs`는 server component, client component, route handler, middleware 오류를 SDK가 자동 계측한다. PostHog는 클라이언트 `capture_exceptions`는 자동이지만, 서버 쪽은 `instrumentation-client.ts`와 Error Boundary에서 `posthog.captureException`을 직접 호출하는 수동 구성이 필요하다.
- fingerprint 규칙, 이슈 상태 관리(`resolve`/`regression`/`reopen`), Slack 조건부 알림 등 에러 전용 워크플로우가 Sentry만큼 세밀하지 않다.
- 에러 트래킹은 PostHog의 핵심 제품이 아니라 확장 기능이므로, 에러 전용 기능의 발전 속도와 안정성이 Sentry보다 불확실하다.

**Bugsnag을 선택하지 않은 이유:**

- Next.js 전용 SDK가 없다. 범용 JS SDK로 수동 구성이 필요하다.
- stability score 같은 릴리즈 health 지표가 강점이지만, 리로그 초기 단계에서는 "에러가 왔다 → 빨리 보고 고친다"가 더 중요하고 stability score를 의미 있게 쓸 트래픽이 아직 부족하다.
- 이미 사용 중인 도구가 아니므로 새로 도입하는 비용이 Sentry와 동일하다.

따라서 **에러 트래킹은 Sentry**, **제품 분석·세션 리플레이는 PostHog**, **서버 로그는 CloudWatch**로 역할을 분리한다. PostHog Error Tracking의 서버 자동 계측과 에러 워크플로우가 성숙하면 통합을 재검토한다.

> Next.js 프론트엔드 → Sentry SDK → 이슈 그룹화·소스맵·릴리즈 → Slack 알림

## 2. 현재 상태와 도입 시 영향

현재 프론트엔드는 다음 기반을 가지고 있다.

- Next.js App Router와 `frontend/instrumentation-client.ts`
- `app/error.tsx`와 도메인별 route error boundary
- ky 기반 공통 API 클라이언트와 오류 정규화
- PostHog 수동 이벤트 및 개인정보 마스킹
- GitHub Actions에서 `pnpm build` 후 `.next` 산출물을 EC2에 배포

따라서 Sentry는 화면별로 흩어져 직접 호출하기보다 다음 경계에 설치한다.

1. SDK 초기화: `instrumentation-client.ts`
2. 전역/라우트 렌더링 오류: `app/error.tsx`, route `error.tsx`
3. 처리되지 않은 브라우저 오류: SDK의 global handler
4. API 오류: 공통 ky 오류 정규화 계층
5. 사용자 흐름의 의도적 실패: 발행·임시저장·업로드 등 feature mutation 경계
6. 릴리즈·소스맵: GitHub Actions의 frontend build job

## 3. Sentry 프로젝트 구성

Sentry 프로젝트는 프론트엔드와 백엔드를 분리한다. 이번 작업에서는 프론트엔드 프로젝트만 먼저 만든다.

| 구분 | 권장 값 |
| --- | --- |
| 프로젝트 | `rilog-frontend` |
| 환경 | `prod`, `dev`(스테이징 서버 도입 시), `local`(기본 비활성) |
| 릴리즈 | Git commit SHA를 기본값으로 사용. 필요하면 `rilog-frontend@<sha>` 형식 |
| 팀/소유자 | 프론트엔드 담당 팀. 이후 CODEOWNERS와 연결 |
| 데이터 보존 | 팀 예산과 개인정보 정책을 확인해 결정 |

### 로컬 환경 전송 정책

`local`(개발자가 `pnpm dev`로 띄운 환경)에서는 기본적으로 Sentry에 이벤트를 전송하지 않는다. 작업 중 발생하는 의도적·임시적 오류가 noise로 쌓이는 것을 방지하기 위함이다.

SDK 초기화 시 환경변수로 전송 여부를 제어한다.

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true'
    || process.env.NODE_ENV === 'production',
  environment: process.env.NODE_ENV === 'production' ? 'prod' : 'local',
});
```

현재 배포된 개발 서버가 없으므로 실질적인 수집 대상은 `prod`뿐이다. 스테이징 서버가 도입되면 `dev` 환경을 활성화한다.

**로컬에서 수집 연결을 테스트하는 방법:**

1. 초기 세팅(우선순위 단계 1)에서 `NEXT_PUBLIC_SENTRY_ENABLED=true pnpm dev`로 SDK를 일시 활성화한다.
2. 의도적 예외(`throw new Error('sentry-test')` 등)를 발생시켜 Sentry 대시보드에 `environment:local` 이벤트가 도착하는지 확인한다.
3. 확인이 끝나면 환경변수를 제거하여 일상 개발 중에는 전송하지 않는다.
4. 이후 수집 검증은 prod 배포 후 smoke test에서 수행한다.

Sentry 릴리즈는 처음 발생한 이벤트와 해당 릴리즈·커밋을 연결하고, 소스맵 등 디버깅 기능에도 사용된다. 따라서 이벤트 수집보다 릴리즈 식별자를 먼저 CI에 넣어야 한다. ([Sentry Releases](https://docs.sentry.io/api/releases/create-a-new-release-for-an-organization/))

## 4. 무엇을 수집할 것인가

2026-09-26 보완: [API 오류 분류 결정](../adr/0002-api-error-classification.md)과
[코드별 추가 수집 검토](api-error-collection-review.md)를 함께 따른다.
BE 오류 코드의 FE 분류 보완, 실제 계약 밖 코드 수집, 비동기 이미지 태깅의 Sentry 연동 제외는 확정했다.
사용자가 입력을 고쳐 해결하는 정상 검증은 제외하고 앱이 잘못 만든 요청은 수집한다.
OAuth와 429 수집 기준도 확정하고 핵심 플로우에 보고를 연결했다. 429는 reporter 인스턴스/operation당 60초에 1건이며 state 오류 증가의 자동 탐지는 후속 범위다.
일반 QueryCache/MutationCache는 최종 5xx·통신·계약 밖 코드·429를 다룬다. 추가적인 400 예외는 각 작업 경계에서 판단한다.

### 자동 수집할 것

- React 렌더링 오류와 Error Boundary 오류
- 처리되지 않은 `window.onerror`
- 처리되지 않은 Promise rejection
- Next.js route/page 오류
- Sentry SDK가 잡는 브라우저 런타임 오류
- Server component, route handler, middleware에서 발생한 서버사이드 오류
- API 호출 중 발생한 네트워크 오류와 예상하지 못한 5xx 중 자동 경계에 도달한 오류

catch된 HTTP 오류까지 SDK 초기화만으로 자동 보고된다고 가정하지 않는다. 처리된 오류는 해당 작업 경계에서
명시적으로 보고하고 자동 수집과 중복되지 않도록 수집 소유 경계를 정한다.

### 명시적으로 보고할 것

사용자에게 실패 화면이나 실패 메시지를 보여주는 핵심 행동은 `captureException` 또는 `captureMessage`로 별도 보고한다.

- 로그인·OAuth callback의 예상 밖 처리 실패 (정상 취소·거부와 구분 필요)
- 글 임시저장 실패
- 글 발행 실패
- 이미지 presigned URL 발급·업로드 실패와 FE에서 관측 가능한 잘못된 asset 참조 오류
- Co-log 생성·초대 실패
- 복구 UI가 표시된 데이터 조회 실패

단순히 HTTP 4xx가 발생했다는 이유로 모두 예외로 보고하지 않는다. 유효성 오류, 권한 없음, 없는 리소스, 만료 access token은 정상적인 제품 상태로 분류하고, 필요한 경우 PostHog 이벤트나 별도 카운터로 집계한다.

### 상태코드·에러코드별 보고 기준

모든 HTTP 에러를 일괄 보고하거나 일괄 무시하지 않는다. **operation(어떤 행동인가)**과 **에러 성격(예상된 것인가)**을 기준으로 보고 여부를 결정한다.

#### 항상 보고하는 에러

| 조건 | 근거 |
| --- | --- |
| 5xx 전체 | 서버 장애. 프론트에서 대응할 수 없으므로 즉시 인지 필요 |
| 네트워크 오류 (timeout, DNS, connection refused) | 인프라 문제 가능성 |
| 실제 API 계약에 정의되지 않은 errorCode | FE 코드표를 BE 정의와 동기화한 뒤에도 계약에 없는 코드. HTTP 403/404/409여도 수집 |

BE에는 정의됐지만 FE에만 누락된 코드는 우선 FE `kind`를 보완하고 의미별로 판단한다.
`request`도 정상 업무 제약일 수 있으며, `field`와 오류 이름만으로 모든 거부의 성격을 확정하지 않는다.
추가 42개 코드와 기존 코드 정정은 [코드별 판정표](api-error-collection-review.md#추가-코드별-의미와-수집-판정)를 참고한다.

#### 핵심 mutation 실패 중 보고하는 4xx

핵심 mutation에서 예상 밖 4xx가 발생하면 다음과 같이 판단한다.
사용자 수정 가능한 정상 검증은 제외한다. 앱의 요청 생성 오류는 field 응답이어도 수집하며,
핵심 operation이라는 이유만으로 해당 endpoint의 모든 400을 수집하지 않는다.

| 시나리오 | 왜 보고해야 하는가 |
| --- | --- |
| 글 임시저장의 예상 밖 400 | 앱이 생성한 본문 구조·요청 계약 오류 등은 저장 실패를 유발한다. FE validation 통과 사실만으로 모든 서버 거부를 버그로 단정하지 않는다 |
| 글 발행의 예상 밖 400 | 핵심 발행 실패. 실제 draft 발행은 기존 Post를 PUBLISHED로 변경하며 삭제 후 생성하지 않는다 |
| FE에서 관측 가능한 asset 참조 오류 | 앱의 URL·객체 참조 계약 오류인지 판정. BE 비동기 태깅 실패를 동기 400으로 가정하지 않는다 |
| Co-log 초대의 예상 밖 400 | 기존 멤버는 409 `BLOG_MEMBER_ALREADY_EXISTS`, 멤버/Co-log 수 제한 400도 정상 업무 거부다. 그 외 오류를 문맥으로 판단한다 |
| OAuth callback의 예상 밖 400 | `OAUTH_CALLBACK_PARAMETER_MISSING`은 수집. `OAUTH_REQUEST_FAILED`는 확인된 동의 취소만 제외하고 나머지는 수집. `INVALID_OAUTH_STATE`는 기본 집계하며 비정상 증가 시 재평가 |

#### 보고하지 않는 에러 (정상 흐름)

| 조건 | 근거 |
| --- | --- |
| 401 + `EXPIRED_ACCESS_TOKEN` | 정상적인 토큰 갱신 과정. ky afterResponse hook에서 자동 재시도 |
| 403 Forbidden (권한 없음) | 정상적인 접근 제어. UI에서 안내 |
| 404 Not Found (삭제된 글, 잘못된 URL) | 정상적인 리소스 부재 |
| 409 Conflict (중복 요청 등) | 비즈니스 규칙 위반이지 시스템 에러가 아님 |
| 400/422 중 사용자가 입력을 고쳐 해결하는 정상 검증 | `kind: field`만으로 제외하지 않는다. 앱이 생성해야 하는 내부 필드 누락·구조 오류는 수집 |
| `AbortError` (사용자 취소) | 의도적 행동 |
| offline 전환 | 네트워크 상태 변경, 시스템 에러가 아님 |

#### 판단 흐름과 미확정 경계

실제 계약 위반·5xx·온라인 통신 장애는 재시도 가능 여부와 별개로 수집한다.
BE/FE 코드표를 동기화하고 오류의 의미와 operation으로 정상 거부인지 판단한다.

정상 입력 검증은 핵심 mutation 여부와 무관하게 제외하고 앱의 요청 생성 오류는 수집한다.
예를 들어 삭제된 글의 404에 홈 이동 UI가 있어도 정상 부재로 보고 제외한다.
사용자가 제목 길이를 수정할 수 있는 field 오류와 앱이 잘못 생성한 본문 JSON 오류는 구분한다.
특히 `REQUEST_VALIDATION_FAILED`는 앱의 필수 내부 필드 누락까지 포괄하므로 일괄 제외하지 않는다.
operation별 실제 요청값이 입력 제약을 위반했는지 확인한다. 서버 검증 문구는 문자열로 비교하지 않는다. 혼합 오류나 원인 불명 오류를 정상 검증으로 자동 제외하지 않는다.

#### mutation 수준의 보고 구현

보고 판단은 공통 API 계층이 아니라 각 mutation hook의 `onError`에서 operation별로 수행한다. 공통 ky 계층은 오류를 정규화하고 `X-Request-ID`를 추출하는 역할까지만 담당한다.

각 mutation hook이 자신의 operation에서 **예상된 에러코드 목록**을 알고 있도록 API 계약과 함께 관리한다.
apiErrorReporter.report가 순수 정책을 평가하고 인스턴스 소유 상태로 중복 전송을 억제한다. beforeSend 연결부도 같은 reporter를 사용한다. ErrorTracker는 주입받으며, SentryErrorTracker는 안전한 Error 변환과 SDK 호출을 담당한다. initialize-sentry.ts가 공통 SDK 초기화와 beforeSend 연결을 담당하며 client/server/edge 진입점은 환경별 설정만 전달한다. reporter 인스턴스 파일은 생성만 담당한다. 이미 정규화한 오류는 다시 감싸지 않는다.
실제 계약 밖 코드는 수집하며, 알려진 코드는 [코드별 판정](api-error-collection-review.md)에 따라 분류한다.
모든 field 오류를 무조건 제외하거나 모든 발행 실패를 무조건 수집하는 예시를 구현 기준으로 사용하지 않는다.
원본 오류의 stack을 보존하되 정규화 객체·ky HTTPError 원문을 그대로 Sentry에 보내지 않는다. 공통 정규화의 cause 보존·재정규화 방지와 Sentry 어댑터 변환·client/server/edge의 beforeSend 필터는 구현했다. 핵심 mutation·OAuth·업로드·QueryCache와 조회 복구 UI에 report 호출을 연결했다.
보고 경계에서 고정 메시지·안전한 stack·허용 태그를 구성하고 body와 원본 URL을 제거한다.

#### 이미지 비동기 태깅과 429

이미지 태깅은 BE의 커밋 후 비동기 작업이며 Sentry에 연동하지 않는다.
`s3_object_tagging_failed` ERROR 로그와 CloudWatch 조회 문서가 이미 있다.
운영 로그 수집·알림·재처리·임시 객체 정리 영향·requestId 연결 여부는 검토 기록으로 남긴다. 별도 BE 문의는 보내지 않는다.

저장소에서 자사 API의 429 응답 정의나 rate limit 설정은 확인되지 않았다.
ky의 기본 429 재시도와 실제 서비스 429 발생은 별개다. 미정의 errorCode와 문서화되지 않은 HTTP status도 별개다.
현재 자사 API의 재시도 후 최종 429는 예상 밖 제한으로 대표 이벤트를 수집한다. 일반 조회는 warning, 핵심 작업 최종 차단은 error로 분류한다.
정상 복구된 중간 429는 안전한 breadcrumb로만 남기고, 반복되는 최종 실패는 reporter 인스턴스의 같은 operation에서 60초당 1건으로 전송을 제한한다.
외부 API와 Sentry 수집 endpoint의 429를 자사 계약 위반으로 보고하지 않는다.
[OAuth·정규화·429 상세 검토](api-error-collection-review.md)를 참고한다.

### 수집하지 않을 것

- 요청·응답 body
- Authorization, Cookie, Set-Cookie
- OAuth `code`, `state`, token, signed/presigned URL
- 글 본문, 댓글 본문, 파일 이름 원문
- 이메일·닉네임·private slug 등 직접 식별 정보
- 사용자가 취소한 요청과 offline 전환처럼 사용자 의도가 명확한 상황

요청·응답 body를 수집하지 않는 이유는 다음과 같다.

1. 리로그의 요청 body에는 글 본문, 댓글, 닉네임, OAuth token 등 민감 데이터가 포함된다. 마스킹 규칙에 빠진 필드가 하나라도 있으면 Sentry에 영구 저장되고, Slack 알림 경로까지 전파될 수 있다.
2. 대부분의 에러는 `errorCode`, `httpStatus`, `operation`, `requestId` 조합으로 원인을 특정할 수 있다.
3. body를 포함하면 이벤트 크기가 커져 Sentry quota를 빨리 소모한다.

body 수준의 디버깅이 필요하면 Sentry 이벤트의 `request_id` 태그로 CloudWatch 서버 로그를 조회한다. 백엔드 `RequestIdFilter`가 모든 응답에 `X-Request-ID` 헤더를 붙이므로, 프론트 ky 계층의 `beforeError` hook에서 이를 추출해 Sentry 태그로 전달한다. 구체적인 연결 방법은 태그 섹션의 `request_id`를 참고한다.

## 5. 에러를 보기 좋게 그룹화하는 기준

Sentry의 기본 그룹화는 stack trace, 예외 타입, 메시지를 기반으로 한다. 우선 기본 그룹화를 사용하고, 실제 운영 데이터에서 잘못 묶이거나 지나치게 쪼개지는 사례가 생길 때만 fingerprint를 추가한다. Sentry는 이슈를 stack trace·exception·message 기준으로 그룹화하며, fingerprint 규칙으로 이를 조정할 수 있다. ([Sentry Issue Grouping 참고](https://docs.sentry.io/pdfs/developer-quick-reference-guide.pdf))

### 태그

모든 이벤트에 다음 태그를 공통으로 붙인다.

```text
environment: prod | local (dev는 스테이징 서버 도입 시 추가)
release: <git-sha>
feature: auth | post_write | upload | colog | feed | settings
operation: login | draft_save | publish | upload | invite | query
route: route template 또는 민감값을 제거한 pathname
browser: 브라우저 종류와 major version
device: desktop | mobile | tablet
api_error_code: API 응답의 공개 errorCode가 있을 때만
request_id: API 응답의 X-Request-ID가 있을 때만
```

`route`에는 실제 slug, post ID, draft ID, query parameter를 넣지 않는다. `request_id`는 사용자 식별자가 아니라 장애 조사용 요청 상관관계 값이다.

### 제목과 fingerprint

에러 제목은 동적인 값이 아니라 안정적인 작업 단위로 만든다.

좋은 예:

```text
[publish] API request failed
[upload] presigned URL request failed
[colog] member invite failed
```

나쁜 예:

```text
POST /v1/drafts/12345 failed for user alice@example.com
```

다음 원칙을 지킨다.

- 에러 메시지에 사용자 입력·ID·URL을 직접 포함하지 않는다.
- `errorCode`, `feature`, `operation`을 기준으로 의미를 부여한다.
- 서로 다른 원인을 하나의 generic `Error`로 바꾸지 않는다.
- 처음부터 모든 이벤트에 수동 fingerprint를 강제하지 않는다.
- 그룹화가 깨지는 실제 사례가 쌓이면 Sentry fingerprint 규칙과 회귀 테스트를 추가한다.

## 6. 릴리즈와 소스맵 관리

### 원칙

운영에서 보이는 minified stack trace를 실제 TypeScript 파일·라인으로 복원하려면, 배포되는 번들과 정확히 대응하는 source map을 Sentry에 업로드해야 한다. source map 업로드는 트래픽이 들어오기 전에 완료되어야 한다. Sentry는 소스맵이 업로드되기 전에 발생한 이벤트를 뒤늦게 자동으로 복원하지 않을 수 있다. ([Sentry Source Maps](https://docs.sentry.io/platforms/javascript/guides/hono/sourcemaps/troubleshooting_js))

### 현재 CI에 맞춘 흐름

현재 `.github/workflows/rilog-fe-prod.yml`의 build job에 다음 순서를 추가한다.

1. GitHub Actions에서 commit SHA를 release로 결정한다.
2. `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`를 CI secret/environment로 주입한다.
3. Sentry Next.js integration이 production build 중 release 생성과 source map 업로드를 수행한다.
4. 업로드 성공을 확인한 뒤 `.next`와 `public` 산출물을 패키징한다.
5. EC2에는 실행에 필요한 산출물만 배포한다.
6. 배포 완료 후 release finalize/deploy 기록을 남긴다.

Sentry 공식 Next.js integration 또는 현재 Next.js 버전과 호환되는 최신 설정을 사용하며, 정확한 SDK·플러그인 버전은 구현 시 lockfile과 함께 검증한다. CI token은 브라우저에 노출되는 `NEXT_PUBLIC_*` 환경변수가 아니어야 한다.

### 소스맵 보안

- `.map` 파일과 Sentry auth token을 Git에 커밋하지 않는다.
- 브라우저가 `.map` 파일을 직접 다운로드할 수 없게 한다.
- Sentry 업로드 후 공개 배포물에서 source map을 제거하거나 서버에서 접근을 차단한다.
- source map 안에 source content를 포함할지 보안 검토를 거친다.
- PR 빌드에서는 실제 업로드를 하지 않고, production 배포 빌드에서만 업로드한다.
- release와 source map이 실제 배포된 JS 번들과 일치하는지 smoke test로 확인한다.

Sentry도 공개 source map으로 소스가 노출될 수 있으므로 업로드 후 `.map` 접근 차단 또는 삭제를 권장한다. ([Sentry Source Map Upload](https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/sourcemaps/uploading/esbuild))

## 7. Slack 알림 전략

Slack은 모든 Sentry 이벤트를 전달하는 곳이 아니라, 사람이 즉시 행동해야 하는 이슈만 전달하는 채널이다. ([Sentry Slack Integration](https://docs.sentry.io/api/integrations/get-integration-provider-information/))

### 채널

2인 팀 규모에서는 단일 채널로 운영한다. 실제 채널명은 팀 Slack 정책에 맞춘다.

- `#rilog-error-alerts`: prod 신규 issue, 회귀, spike

### 알림 규칙

| 규칙 | 목적 |
| --- | --- |
| prod에서 새 issue가 처음 발생 | 새 회귀 즉시 확인 |
| 같은 issue가 5분 내 10회 이상 발생 | 급격한 장애 감지 |

같은 issue를 매 이벤트마다 보내지 않는다. `new issue`, `regression`, `spike`만 알리고, 해결되지 않은 동일 issue의 반복 알림은 억제한다.

Slack 메시지에는 다음을 포함한다.

- `[prod] [publish] API request failed`
- 최초 발생·최근 발생 시각, affected users/events 수
- release, route, feature, operation
- Sentry issue 링크
- 대표 `requestId` 또는 API error code

알림에는 stack trace 전문이나 사용자 데이터를 복사하지 않는다. 상세 정보는 Sentry 링크로 확인한다. Slack 알림이 실패해도 Sentry 수집은 계속되어야 한다.

## 8. 사용자·제품 문맥 연결

Sentry에는 디버깅에 필요한 최소 문맥만 붙인다.

### 허용할 문맥

- `feature`, `operation`, `route`
- `environment`, `release`
- browser/device 정보
- 공개 API `errorCode`, `httpStatus`
- `X-Request-ID`
- 현재 로그인 여부 또는 비식별 user key

### 사용자 정보

기본값은 사용자 식별 정보를 보내지 않는다. 실제 운영에서 특정 계정의 재현이 반드시 필요하다는 요구가 생기면, 이메일·닉네임 대신 내부 정책으로 승인된 비식별 ID만 사용한다. PostHog의 `identify` 정보와 Sentry user context를 자동으로 동일하게 복사하지 않는다.

### PostHog와의 역할 분리

- Sentry: 예외·스택트레이스·릴리즈·issue 상태
- PostHog: 어떤 사용자 행동 뒤 실패했는지, 퍼널과 session replay
- CloudWatch: API `requestId` 기준의 서버 상세 로그

세 시스템의 연결 키는 사용자 ID가 아니라 `release`, `operation`, `requestId`, 시간 범위로 잡는다.

## 9. 운영 및 대응 프로세스


1. Slack 알림으로 Sentry issue를 인지한다.
2. Slack thread에 이모지 또는 한마디로 "내가 봄"을 선언한다.
3. Sentry에서 release, route, operation, `requestId`를 확인한다.
4. API 호출이면 `requestId`로 CloudWatch 로그를 조회한다.
5. 직전 배포가 원인이면 rollback을 우선 검토한다.
6. 원인에 가장 가까운 계층에 회귀 테스트를 추가한다.
7. Sentry issue를 resolve하고, Slack thread에 원인·수정 PR을 남긴다.

## 10. 우선순위

| 단계 | 작업 | 완료 기준 |
| --- | --- | --- |
| 1 | Sentry org/project 생성, dev DSN 연결 | 의도적인 테스트 예외가 Sentry에 도착 |
| 2 | SDK 초기화와 전역 오류 연결 | render error·unhandled rejection 수집 |
| 3 | ky와 핵심 mutation 오류 연결 | login/save/publish/upload/invite가 operation별 그룹화 |
| 4 | 태그·PII 필터·requestId 연결 | 민감정보가 이벤트에 없는지 테스트 통과 |
| 5 | CI release/source map 업로드 | 실제 소스 파일·라인으로 stack trace 표시 |
| 6 | Slack integration과 alert rule 연결 | 새 prod issue와 spike가 Slack에 도착 |
| 7 | noise 조정 | 반복 4xx와 취소 오류가 알림을 만들지 않음 |

## 11. 놓치기 쉬운 필수 항목

### 에러 수집 실패 자체

Sentry SDK가 실패해도 앱의 UX가 깨지면 안 된다. 초기화·전송 실패는 개발 환경에서만 console warning을 남기고, 사용자 화면과 핵심 API 동작에는 영향을 주지 않게 한다.

### source map과 release 불일치

소스맵 업로드 성공만 확인하면 부족하다. 실제 배포된 번들의 release와 Sentry 이벤트의 release가 같은지, 운영에서 파일·라인이 복원되는지 확인해야 한다.

### Error Boundary의 사용자 경험

에러를 Sentry에 보내는 것과 사용자가 복구하는 것은 별개다. 전역 오류 화면에는 재시도, 홈 이동, 문의 시 사용할 request ID 등 최소한의 복구 경로를 제공한다. 단, 내부 stack trace는 노출하지 않는다.

### issue 방치 방지

Slack 알림만 보내면 이슈가 쌓인다. 알림을 인지하면 Slack thread에 담당을 선언하고, 해결 후 Sentry issue를 resolve한다. 팀 규모가 커지면 CODEOWNERS나 Sentry ownership rule 도입을 검토한다.

### 테스트 환경의 오염

local·PR 테스트 예외가 prod 프로젝트나 Slack을 오염시키지 않게 한다. dev와 prod DSN/project 또는 최소한 environment를 분리하고, 테스트 이벤트에는 명확한 release·environment 값을 붙인다.

## 12. 성공 기준

- production의 프론트 렌더링 오류와 unhandled rejection이 Sentry에 자동 수집된다.
- 같은 원인의 에러가 동적 URL·사용자 ID 때문에 쪼개지지 않는다.
- Sentry issue에서 실제 TypeScript 파일·라인을 확인할 수 있다.
- 모든 production 이벤트에 release와 environment가 붙는다.
- 글 발행·임시저장·업로드·로그인·초대 실패를 operation별로 검색할 수 있다.
- 신규 issue·회귀·스파이크만 Slack에 알림된다.
- Sentry, Slack, PostHog, CloudWatch 어느 곳에도 토큰·쿠키·본문·presigned URL이 노출되지 않는다.
- 사용자가 문의한 API 오류를 `requestId`로 Sentry와 CloudWatch에서 연결할 수 있다.

## 참고 자료

- [리로그 프론트엔드 규칙](../../frontend/AGENTS.md)
- [리로그 CloudWatch Logs 운영 가이드](../backend/cloudwatch-logs.md)
- [Sentry Releases](https://docs.sentry.io/api/releases/create-a-new-release-for-an-organization/)
- [Sentry Source Map Troubleshooting](https://docs.sentry.io/platforms/javascript/guides/hono/sourcemaps/troubleshooting_js)
- [Sentry Source Map Upload](https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/sourcemaps/uploading/esbuild)
- [Sentry Slack Integration](https://docs.sentry.io/api/integrations/get-integration-provider-information/)
- [PostHog Error Tracking](https://posthog.com/docs/error-tracking)
