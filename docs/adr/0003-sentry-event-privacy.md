# ADR 0003: Sentry 공통 문맥과 개인정보 전송 경계

- 상태: ADR 0004로 대체됨
- 현재 구현: [ADR 0004](0004-sentry-sdk-context.md)
- 관련 이슈: #613, #687
- 영향: frontend. BE 요청·응답 계약 변경 없음.

## 배경

#612의 API 오류 필터는 일반 Error와 captureMessage, 성능 추적 이벤트에 적용되지 않았다. 오류 메시지, SDK request/breadcrumb/extra, URL과 파일 첨부에 사용자 입력이 포함될 수 있다. `sendDefaultPii: false`만으로 이 항목을 모두 차단할 수 없다.

## 결정

`initialize-sentry.ts`가 client/server/edge에 동일한 최종 필터를 등록한다. API 수집 판단과 중복 억제는 기존 reporter가 담당하고, `sentry-privacy.ts`는 허용한 필드만 골라 새 이벤트를 만든다. 필터 실패 시 오류·transaction은 폐기하며 원문을 대신 전송하지 않는다. span 필터는 SDK 계약상 null 대신 내용 없는 span을 반환한다. 초기화·capture 실패도 앱으로 전파하지 않는다.

- 공통 태그: `environment`, `release`, `feature`, `operation`, `route`, `browser`, `device`.
- release는 SDK의 빌드 릴리즈 값을 재사용한다. 릴리즈가 주입되지 않은 개발 실행은 `unversioned`로 표시한다. 배포에서는 실제 릴리즈 주입과 소스맵 업로드를 함께 확인한다.
- operation은 #612 계약을 재사용한다. 일반 오류는 `unhandled`, feature는 알려진 화면 경로에서 결정하고 없으면 `app`이다.
- URL은 현재 App Router의 고정 경로 또는 `/[slug]`, `/[slug]/settings`, `/[slug]/posts/[postId]`, `/[slug]/posts/[postId]/markdown`만 남긴다. `/write`의 draft ID를 포함한 모든 query와 fragment는 버린다. 알 수 없는 경로는 `unknown`이다.
- 브라우저는 UA를 로컬에서 종류·major version으로 분류한다. device는 desktop/mobile/tablet, 정보가 없으면 unknown이다. #687부터 오류 이벤트에는 아래 진단 계약에 따라 UA도 보존한다. 서버 요청에 UA가 없으면 추측하지 않는다.
- API 추가 태그는 `api_error_code`, `httpStatus`, UUID 형식의 `request_id`다. 실제 값이 없으면 생략한다. 코드표에 없는 코드는 수집하되 원문 대신 `UNKNOWN_ERROR_CODE`를 기록한다. 공개 코드인지 확인할 수 없는 응답 문자열에 닉네임 등이 섞일 가능성을 막기 위함이다. #612의 수집 여부 판단은 바꾸지 않는다.
- 내부 변환의 `errorCode`/`error_code`/`status` 별칭은 최종 전송에서 제거한다. 정규화 분류 `error_type`, `error_kind`는 정해진 값만 유지한다.
- #687부터 일반 오류 메시지·captureMessage는 아래 치환 계약으로 설명을 보존한다. 연결된 cause 객체는 보내지 않는다. 오류 종류와 배포 스택의 파일·라인·컬럼, 검증한 source-map debug ID를 남긴다. API 제목은 허용한 태그로 다시 만든다.
- 배포 스택은 Next 정적 chunk와 서버 빌드 경로만 보존한다. 호스트·로컬 절대 경로·query·fragment·소스 문맥·지역변수·임의 함수명은 제거한다. 프레임과 debug metadata는 동일한 `app:///_next/...` 경로로 변환한다.
- request/response body, 모든 request headers, user, extra, 임의 contexts/tags/fingerprint, 원문 breadcrumb, 파일 첨부를 제거한다. UA는 request headers를 유지하지 않고 허용한 진단 context에만 복사한다. 429 breadcrumb는 고정 문구와 HTTP method·retry_count만 남긴다.
- transaction 이름과 span description도 경로 템플릿으로 변환한다. span data/links, transaction 추가 속성은 제거하고 추적 ID와 시간만 유지한다. Sentry Logs는 비활성화한다. Replay는 추가하지 않는다.

## 결과와 한계

### #687: 오류 이벤트의 User-Agent 보존

브라우저 종류로만 축약하면 봇과 자동화의 단서가 사라진다. 오류 이벤트(일반·API 오류와 메시지)의 `contexts.client.user_agent`에 UA를 보존한다. 브라우저는 `navigator.userAgent`를 우선하고, server/edge는 이벤트 요청의 대소문자 구분 없는 `User-Agent` 헤더를 사용한다. 제어 문자를 제거하고 앞뒤 공백을 정리한 후 최대 1024자로 제한한다. 비어 있으면 context를 생략한다. transaction/span에는 UA 원문을 추가하지 않는다.

검색용 태그는 다음 고정 계약을 따른다.

- `client_type`: 알려진 봇 이름 또는 `bot`으로 끝나는 단어·`crawler`·`spider`가 있으면 `bot`, 그 외 `HeadlessChrome/`이면 `automation`, 기존 브라우저 분류로 식별되면 `browser`, 나머지는 `unknown`.
- `bot_name`: Googlebot, bingbot, DuckDuckBot에 일치할 때만 고정 이름을 기록한다. 나머지 봇은 이름을 추측하지 않는다.
- `detection_source`: 비어 있지 않은 UA로 분류하면 `user_agent`, UA가 없으면 `unknown`.

UA와 분류는 위조 가능하며 실제 사람 여부를 보증하지 않는다. HeadlessChrome도 테스트 자동화일 수 있다. 이 태그로 오류를 자동 제외하거나 사용자 수를 계산하지 않는다. UA 원문은 context에만 두어 태그 값의 종류가 과도하게 늘지 않도록 한다.

UA는 클라이언트가 정하는 문자열이므로 임의 민감값이 들어가지 않는다는 보장은 없다. 제어 문자 제거·길이 제한은 개인정보 탐지기가 아니다. 진단을 위해 이 필드의 원문 수집을 허용하되 Cookie·Authorization 등 다른 헤더와 임의 context를 함께 복원하지 않는다. 단위 테스트, client/server/edge의 최종 필터 테스트 및 실제 SDK transport 테스트로 이 경계를 검증한다.

민감정보 유출 가능성을 줄이는 대신 치환한 메시지 값, 제3자·개발 소스 프레임과 상세 성능 속성은 잃는다. 배포 소스맵과 request_id로 조사한다. 안전한 추가 정보가 필요하면 필드별 허용 계약과 테스트를 먼저 추가한다. 새 App Router 경로를 추가할 때 경로 분류도 갱신한다.

이 결정은 Sentry로 보내는 프론트엔드 이벤트에 적용하며 PostHog나 BE 로그 정책을 변경하지 않는다. 운영 Sentry의 보관·서버 측 IP 설정과 실제 소스맵 복원은 배포 환경에서 별도로 확인한다.

## 검증 계약

민감값을 섞은 일반 오류·API 오류·메시지·transaction·span을 검증한다. client/server/edge 초기화에 같은 필터가 연결되고, 첨부파일과 필터 실패도 차단되는지 확인한다. 실제 설치된 Sentry SDK와 메모리 transport로 최종 envelope를 검사하여 정책 기반 수집·중복 억제·배포 스택 보존이 함께 유지되는지 확인한다.

## #687: 오류 메시지 보존

일반 오류와 captureMessage의 설명을 고정 문구로 바꾸지 않고 보존한다. URL(서명 query 포함)·상대 경로, 인증 헤더/Bearer 값, 토큰·비밀번호 등의 이름이 붙은 값, 이메일·JWT, body/content/filename/nickname/slug로 표시된 입력을 치환한다. JSON 파싱 오류는 본문 조각을 포함할 수 있어 `Invalid JSON response`로 분류한다. 제어 문자는 공백으로 바꾸고 최대 2048자로 제한한다. API 제목에는 network/timeout 등의 분류를 남기며 unknown 오류의 Error 원인은 같은 메시지 치환을 적용한다. 서버의 응답 detail.message와 원본 cause 객체는 보내지 않는다.

이 변경은 모든 자유 입력을 폐기하던 정책을 진단 설명 보존으로 바꾼다. 패턴 치환은 임의의 개인정보를 완전히 탐지하지 못한다. 호출부는 사용자 본문·닉네임·파일명을 오류 메시지에 직접 연결하지 않아야 한다. 응답 카테고리 원문을 메시지에 삽입하던 코드는 고정 설명으로 변경한다. 기존 테스트의 임의 문자열 메시지는 URL/인증정보가 포함된 실제 노출 형태로 바꾸고, 다른 부가 필드의 민감정보 제거 검증은 유지한다.

## #687: API 요청 진단 정보

현재 페이지 route와 실패한 API endpoint는 별도 태그다. 공통 ky의 beforeError와 직접 호출하는 인증 갱신 경계에서 원본 Request를 읽되, Sentry에는 허용한 method와 정적 endpoint 템플릿만 전송한다. 원본 host·slug·ID·query·서명 URL은 보내지 않는다. 알려진 Rilog API 경로와 HTTP method가 함께 일치할 때 `http_method`, `api_endpoint`, `api_operation`, `api_target=api`를 붙인다. 외부 저장소 업로드는 실제 URL 대신 `PUT storage/[objectKey]`, `upload.put`, `api_target=storage`로 표시한다. 최종 필터는 이 고정 계약과 일치하지 않는 임의 태그를 제거한다.

수집 정책의 `operation`은 기존 query/mutation/핵심 작업 분류를 유지한다. 실제 요청을 식별하는 `api_operation`은 진단용이며 API 오류 제목에 우선 표시한다. 알 수 없는 경로는 추측하거나 일부만 남기지 않고 생략한다. 응답 검증 단계처럼 원본 Request가 오류와 연결되지 않은 경우 endpoint는 남지 않는다. 누락 사례가 확인되면 해당 raw API 경계에 고정 요청 문맥을 연결한다.
