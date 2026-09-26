# API 오류 분류와 추가 수집 검토

기준: 2026-09-26 저장소의 BE `*ErrorInformation` enum과 FE `error-codes.ts`.
배포 환경과 실시간 Swagger의 일치 여부는 별도 확인 대상이다.

## 확정 범위와 남은 결정

- BE에 정의된 코드를 FE 코드표와 `kind`에 반영한다. 실제 계약에 없는 코드는 Sentry 수집 대상으로 한다.
- `kind`는 오류 의미를 표현하며, 그 자체가 Sentry 수집 여부는 아니다. `request`에도 정상 업무 제약과 앱이 만든 잘못된 요청이 함께 있다.
- 이미지 비동기 태깅 실패는 BE에서 관측한다. Sentry에는 연동하지 않는다.
- 사용자가 입력을 고쳐 해결하는 정상 검증은 제외하고 앱이 잘못 만든 요청은 수집한다. `field` 전체 제외는 채택하지 않는다. 핵심 mutation·OAuth·조회 복구 경계에 runtime 판정을 연결했다.
- 아래 OAuth와 429 수집 기준은 확정했다. state 오류의 비정상 증가 자동 탐지는 후속 범위다. 429는 reporter 인스턴스의 같은 operation에서 60초당 1건으로 제한한다. 정규화 객체의 원본 보존·중복 정규화 방지·안전한 Sentry 변환도 구현했다.

## 정상 오류를 먼저 제외한다는 의미

“발행에 실패했다”만 보면 정상 거부인지 프로그램 문제인지 알 수 없다.
실패한 행동보다 **왜 실패했는지**를 먼저 확인한다. 사용자 수정 가능한 정상 검증 제외·앱 요청 생성 오류 수집은 확정했다.

| 같은 핵심 작업에서 발생하는 실패 | 제안 판정 | 이유 |
| --- | --- | --- |
| 제목이 제한 길이를 넘어 서버가 입력 수정을 요구 | 정상 field 오류라면 제외 | 사용자가 값을 고칠 수 있는 예정된 검증 |
| 권한을 잃은 팀 블로그에 발행 | 제외 | 정상 접근 제어 |
| 다른 탭에서 삭제한 임시저장본을 다시 조회 | 제외 | 정상 리소스 부재. 홈 이동 UI가 있어도 같음 |
| 이미 발행된 글을 다시 발행 | 제외 | `400 DUPLICATED_PUBLISH`, 의미는 중복 |
| 에디터가 만든 본문 JSON에 필수 블록 구조가 없음 | 수집 | 사용자가 고칠 수 있는 필드 오류가 아니라 앱의 직렬화/계약 문제 |
| 저장 서버의 500 또는 온라인 통신 실패 | 수집 | 재시도 버튼이 있어도 시스템 실패 |

`field`는 BE가 보내는 값이 아니라 FE가 `errorCode`로부터 계산한다.
`REQUEST_VALIDATION_FAILED`는 `field`지만, 본문 구조가 잘못된 `INVALID_POST_CONTENT`는 `request`다.
따라서 모든 400 또는 이름에 `INVALID`가 붙은 오류를 정상 입력 오류로 묶지 않는다.

발행 DTO에는 제목 길이 등 `@Valid` 검증이 실제 존재한다. “핵심 endpoint는 field 오류를 반환하지 않는다”는 전제를 둘 수 없다.
다만 `REQUEST_VALIDATION_FAILED`도 앱이 반드시 넣어야 하는 내부 필드가 누락된 경우에는 정상 입력 오류라고 단정할 수 없다.
**사용자 수정 가능한 정상 검증만 제외**한다. 앱이 생성해야 하는 내부 필드가 누락된 오류는 `field`라도 수집한다.
구현에서는 operation별 실제 요청값이 입력 제약을 위반했는지 확인한다. 정책은 BE의 reason 문자열을 비교하지 않고 invalidUserInputFields만 받는다. 이름만 같은 필드도 실제 UI에서 수정 가능하지 않을 수 있다.
사용자 입력과 내부 오류가 섞인 응답이나 원인 불명 validation을 통째로 정상 제외하지 않는다.
FE 검증을 통과했다는 사실만으로 서버 거부가 곧 시스템 버그라는 결론도 내리지 않는다.

## FE 코드표 보완

BE enum의 96개 코드를 모두 분류한다. 기존 FE 58개에 누락 42개를 추가해 FE는 100개가 된다.
이전 스프레드시트 집계는 코드명에 숫자가 들어간 S3 코드 4개를 누락했다. 아래 목록과 갱신한 스프레드시트에서 정정한다.
기존 FE 전용 4개는 계약 폐기 여부가 확인되지 않아 유지한다.

### 추가 코드별 의미와 수집 판정

`제외 제안`은 정의된 정상 상황에서만 적용한다. 알려진 코드여도 실제 장애 증거가 있으면 operation 문맥으로 재판단한다.
`수집`은 수집 정책이며 이번 코드표 수정 자체가 Sentry 이벤트를 보내는 것은 아니다.

| 추가 errorCode | BE HTTP | FE kind | 수집 판정과 이유 |
| --- | --- | --- | --- |
| `DUPLICATE_KEY_CONFLICT` | 409 | conflict | 제외 제안: 이미 존재하는 데이터 |
| `INVALID_OAUTH_REDIRECT_URL` | 400 | request | 조건부: 앱이 만든 정상 로그인 URL이 잘못되면 수집, 임의 외부 URL 거부는 제외 |
| `BLOG_PROFILE_NAME_ALREADY_EXISTS` | 409 | conflict | 제외 제안: 블로그 이름 중복 |
| `ADMIN_PERMISSION_REQUIRED` | 403 | authorization | 제외 제안: 관리 권한 없음 |
| `COLOG_MEMBER_COUNT_EXCEEDED` | 400 | request | 제외 제안: 팀 멤버 수 한도 |
| `BLOG_MEMBER_DOESNT_NOT_BELONG` | 400 | authorization | 제외 제안: 해당 팀 멤버가 아님. 응답 숫자보다 접근 자격의 의미를 반영 |
| `ALREADY_BLOG_MEMBER_LEFT` | 403 | authorization | 제외 제안: 이미 탈퇴하여 접근 자격이 없음 |
| `COLOG_REQUIRED` | 403 | authorization | 제외 제안: Co-log에만 허용된 기능 |
| `COLOG_OWNER_LEAVE_FORBIDDEN` | 403 | authorization | 제외 제안: 소유자 탈퇴 제한 |
| `COLOG_MEMBER_REMOVE_FORBIDDEN` | 403 | authorization | 제외 제안: 멤버 제거 권한 없음 |
| `COLOG_SELF_REMOVE_FORBIDDEN` | 400 | authorization | 제외 제안: 자기 자신 제거 금지 |
| `COLOG_MEMBER_UPDATE_FORBIDDEN` | 403 | authorization | 제외 제안: 멤버 수정 권한 없음 |
| `COLOG_SELF_PERMISSION_UPDATE_FORBIDDEN` | 400 | authorization | 제외 제안: 자기 권한 변경 금지 |
| `COLOG_MEMBER_UPDATE_REQUEST_EMPTY` | 400 | request | 조건부: 빈 수정이 정상 no-op이면 제외, UI가 유효한 변경을 누락했다면 수집 |
| `COLOG_DELETE_FORBIDDEN` | 403 | authorization | 제외 제안: Co-log 삭제 권한 없음 |
| `DUPLICATED_PUBLISH` | 400 | conflict | 제외 제안: 발행된 글을 재발행 |
| `CHAPTER_NOT_FOUND` | 404 | not-found | 제외 제안: 챕터 부재 |
| `CHAPTER_NAME_ALREADY_EXISTS` | 409 | conflict | 제외 제안: 챕터 이름 중복 |
| `CHAPTER_COUNT_EXCEEDED` | 400 | request | 제외 제안: 챕터 수 한도 |
| `CHAPTER_MANAGE_FORBIDDEN` | 403 | authorization | 제외 제안: 챕터 관리 권한 없음 |
| `INVALID_CHAPTER_NAME` | 400 | field | 제외 제안: 사용자가 입력한 챕터 이름 검증 |
| `INVALID_CHAPTER_ORDER` | 400 | request | 조건부: 앱이 구성한 순서가 잘못되면 수집, 동시 삭제·변경 충돌이 확인되면 정상 복구 |
| `COMMENT_NOT_FOUND` | 404 | not-found | 제외 제안: 댓글 부재 |
| `COMMENT_AUTHOR_FORBIDDEN` | 403 | authorization | 제외 제안: 댓글 작성자 권한 없음 |
| `COMMENT_REPLY_DEPTH_EXCEEDED` | 400 | request | 제외 제안: 답글 깊이 제한 |
| `INVALID_COMMENT_CONTENT` | 400 | field | 제외 제안: 댓글 빈 문자열·최대 길이 검증 |
| `INVALID_COMMENT_ANCHOR` | 400 | request | 조건부: 앱이 생성한 위치·선택영역 구조 오류면 수집, 동시 편집으로 무효화된 위치는 별도 판정 |
| `COMMENT_ANCHOR_BLOCK_NOT_COMMENTABLE` | 400 | request | 조건부: 지원하지 않는 블록에 대한 정상 거부는 제외, UI가 지원 대상으로 잘못 제공하면 수집 |
| `COMMENT_ANCHOR_NOT_ACTIVE` | 409 | conflict | 제외 제안: 위치를 잃은 댓글의 위치 수정 제한 |
| `COMMENT_ANCHOR_SELECTION_NOT_FOUND` | 404 | not-found | 제외 제안: 선택범위 부재 |
| `NOT_POST_AUTHOR` | 403 | authorization | 제외 제안: 글 작성자 아님 |
| `POST_DELETE_FORBIDDEN` | 403 | authorization | 제외 제안: 글 삭제 권한 없음 |
| `INVALID_POST_CONTENT` | 400 | request | 수집: 정상 에디터가 만든 본문 구조·블록 계약 오류. 사용자 입력 field와 구분 |
| `INVALID_FEED_FILTER` | 400 | request | 조건부: 앱이 잘못된 필터 조합을 생성하면 수집, 임의 URL 조합 거부는 제외 |
| `DRAFT_NOT_FOUND` | 404 | not-found | 제외 제안: 임시저장본 부재 |
| `TEXT_BLOCK_NOT_FOUND` | 400 | request | 조건부: 잘못된 블록 참조는 수집, 동시 편집·삭제로 확인된 정상 무효화는 복구 |
| `INVALID_TEXT_RANGE` | 400 | request | 조건부: 앱의 범위 계산 오류는 수집, 오래된 선택영역은 문맥 확인 |
| `INVALID_TEXT_BLOCK` | 400 | request | 수집: 앱이 구성한 텍스트 블록 구조 오류 |
| `INVALID_S3_URL_SCHEME` | 400 | request | 조건부: 앱이 만든 asset URL 오류가 응답으로 오면 수집. 현재 enum 외 사용처 미확인 |
| `UNSUPPORTED_S3_BUCKET` | 400 | request | 조건부: 앱의 bucket 계약 오류가 응답으로 오면 수집. 현재 enum 외 사용처 미확인 |
| `UNSUPPORTED_S3_HOST` | 400 | request | 조건부: 앱의 host 계약 오류가 응답으로 오면 수집. 현재 enum 외 사용처 미확인 |
| `S3_OBJECT_KEY_MISSING` | 400 | request | 조건부: 앱의 객체 key 누락이 응답으로 오면 수집. 현재 enum 외 사용처 미확인 |

S3 코드의 정의 존재가 현재 endpoint에서 해당 오류를 던진다는 뜻은 아니다.
현재 `S3ObjectKeyResolver`는 잘못된 참조를 `Optional.empty()`로 제외한다.
이를 사용자에게 반환되는 “태깅 후처리 400”으로 설명하지 않는다.

### 기존 코드 정정·호환성

- `DATA_INTEGRITY_VIOLATION`: BE가 500을 반환하는 데이터 처리 오류이므로 `request`에서 `server`로 정정한다. 수집 대상이다.
- `USER_COLOG_COUNT_EXCEEDED`: 기존 `request` 유지. 사용자별 Co-log 수 제한은 정상 업무 제약으로 제외 제안한다.
- `BLOG_MEMBER_ALREADY_EXISTS`: 기존 `conflict` 유지. BE는 409이며 이미 팀에 참여한 사용자에 대한 거부다. 별도 pending 초대 중복 코드는 확인되지 않았다.
- `DATA_NOT_DUPLICATED_KEY`, `REUSED_REFRESH_TOKEN`, `BLOG_MEMBER_PERMISSION_INVALID`, `RENAME_PLZ`: 현행 BE enum에는 없지만 FE에는 남아 있다. 기존 소비 호환성을 위해 유지하며 현재 계약 코드인지, 과거 호환 코드인지 BE 확인이 필요하다. FE 표에 있다는 이유만으로 정상 제외 목록에 추가하지 않는다.
- `isApiErrorCode`는 객체 자체에 등록된 코드만 인정한다. `toString`, `constructor`, `__proto__` 같은 상속 속성은 실제 등록 코드가 아니다.

### 실제 계약에 없는 코드

먼저 BE 정의와 FE 코드표를 동기화한다. 그 뒤 실제 계약에 없는 코드는 HTTP 403/404/409여도 수집한다.
“FE 매핑 누락”과 “실제 계약 위반”을 구분하며, 공개 errorCode·status·operation·request_id만 기록한다.
unknown 판정은 새로운 코드가 나왔음을 보존해야 한다. 임의로 정상 field·권한 오류에 합치지 않는다.
FE 전용 호환 코드 4개가 실제 응답으로 오면 계약 확인 대상으로 보고 정상 제외를 확정하지 않는다.

## OAuth 실패의 현재 표시

FE `GitHubCallbackHandler`는 아래 실패를 모두 catch하여 회원가입 흐름 상태를 정리하고 `/`로 이동한다.
이동 전 화면은 **“로그인 처리 중입니다...”**이며 별도 오류 토스트·취소 메시지·재시도 화면은 없다.
현재 비밀번호 로그인/invalid credential 전용 흐름은 확인되지 않았다.

| 상황 | BE 응답 | 사용자 화면 |
| --- | --- | --- |
| callback에 `error`가 있음 (동의 취소 포함 가능) | 400 `OAUTH_REQUEST_FAILED` | 공통 처리 후 홈 이동 |
| `code` 또는 `state` 누락 | 400 `OAUTH_CALLBACK_PARAMETER_MISSING` | 공통 처리 후 홈 이동 |
| 저장된 로그인 시도를 찾지 못함 (만료·재사용 포함 가능) | 400 `INVALID_OAUTH_STATE` | 공통 처리 후 홈 이동 |
| GitHub 토큰 교환 실패 | 502 `GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED` | 공통 처리 후 홈 이동 |
| GitHub 사용자 조회 실패 | 502 `GITHUB_USER_FETCH_FAILED` | 공통 처리 후 홈 이동 |
| 네트워크·응답 구조·세션 등록 실패 | 원인에 따라 다름 | 공통 처리 후 홈 이동 |

- callback의 `error` 문자열이 있으면 BE는 값에 관계없이 `OAUTH_REQUEST_FAILED`로 합친다. FE는 access_denied 여부만 boolean으로 전달한다. `code`·`state` 원문은 수집하지 않는다.
- `github login failed` 분석 이벤트에 `failure_stage`, `error_code`를 남기는 호출은 있다. `apiRequest`에서 정규화한 오류를 분석 시 다시 감싸 `UNKNOWN_ERROR`로 바꾸던 문제는 수정했다. 이제 기존 오류코드를 유지한다.
- callback catch에서 apiErrorReporter.report를 호출한다. 정상 취소·INVALID_OAUTH_STATE는 예외 이벤트에서 제외하고 기존 github login failed 분석 이벤트로 집계한다.
- 홈으로 이동하는 UI는 유지한다. 별도 오류 안내 화면 개선은 이번 범위에 포함하지 않는다.

## 이미지 태깅: BE 확인 사항

태깅은 `AFTER_COMMIT` + `@Async`로 실행된다. `S3ObjectTagger`는 `SdkException`을 잡아 ERROR 수준의
`event=s3_object_tagging_failed`와 bucket/key/tagStatus 및 예외를 남긴다.
[CloudWatch 로그 문서](../backend/cloudwatch-logs.md)에도 해당 이벤트 조회 쿼리가 있다.
다음은 검토 중 작성했던 문의 초안이다. 사용자의 결정에 따라 별도 문의는 보내지 않는다.

> 이미지 태깅 실패가 `s3_object_tagging_failed` ERROR 로그로 남고 CloudWatch 조회 쿼리도 있는 것을 확인했습니다.
> 운영에서도 해당 로그가 정상 수집되고, 실패 시 알림을 받는 경로가 있나요?
> SDK 자체 재시도가 끝난 뒤에도 실패한 객체를 재처리하거나 정합성을 복구하는 절차가 있나요?
> CONFIRMED 태그를 붙이지 못한 이미지가 임시 객체 정리 정책으로 삭제될 수 있는지, 이를 방지·복구하는 방법도 확인 부탁드립니다.
> 비동기 로그의 requestId로 원래 저장·발행 요청까지 추적 가능한지도 운영에서 확인할 수 있을까요?

이미지 태깅 실패는 Sentry에 연동하지 않는다. BE 로그·알림·복구 정책으로 다룬다.

## 현재 429 처리

- 프로젝트 BE/FE 코드와 저장소 설정에서 429 응답 정의, `TOO_MANY_REQUESTS`, rate limit middleware, `Retry-After` 전용 분기, Nginx `limit_req` 설정을 찾지 못했다. 현재 열거할 수 있는 자사 API 429 종류는 없다.
- 현재 설치된 ky 2.0.2의 기본 재시도 목록에는 429가 있고 `Retry-After`를 처리한다. 기본 대상 method는 GET/PUT/HEAD/DELETE/OPTIONS/TRACE, 기본 limit는 2다. POST는 이 기본 대상에 없다. 개별 요청 override는 별도다.
- TanStack Query의 공통 `isRetryableError`는 네트워크·timeout·5xx만 재시도 대상으로 보므로 429를 추가 재시도하지 않는다. HTTP 계층 ky의 재시도와 별개다.
- GitHub API의 HTTP 실패는 BE의 RestClient 예외 처리에서 토큰 교환/사용자 조회 502 코드로 바뀐다. upstream 429가 발생해도 현재 FE까지 그대로 429로 전달되는 구조는 아니다.
- 운영 프록시·WAF 등 저장소 밖 제한은 확인하지 않았다. 실제 발생 여부·응답 계약을 BE/인프라에 확인하기 전 임의 임계치를 확정하지 않는다.
- 429는 발생한 로그를 확인한 항목이 아니라 정책 누락 검토 항목이다. 아래 수집 기준은 최종 실패 보고와 자동 수집 경계에 적용했다.

## OAuth 수집 분류

| 오류 / 조건 | 확정 기준 | 이유와 예외 |
| --- | --- | --- |
| `OAUTH_CALLBACK_PARAMETER_MISSING` | 수집 | 정상 로그인 callback에 필수 code/state가 없으면 흐름·설정 이상이다. 검증된 사용자 취소는 먼저 제외한다. 임의 직접 URL 접근으로 확인된 경우도 제외 가능하나 현재 이를 구분하는 근거는 없다 |
| `GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED` | 수집 | 사용자 입력 검증이 아니라 인증 코드 교환 실패다. 현재 BE는 502로 반환. GitHub 장애·제한·설정 오류·만료 또는 재사용된 code 등이 원인 후보이며 이 코드만으로 원인을 단정하지 않는다 |
| `GITHUB_USER_FETCH_FAILED` | 수집 | 토큰 교환 후 사용자 정보 획득 실패로 로그인 완료 불가. 현재 BE는 502. 외부 장애도 제품의 로그인 장애로 관측해야 한다 |
| `INVALID_OAUTH_STATE` | 기본 개별 예외 수집 제외, 집계 | Redis state 기본 TTL 5분 및 getAndDelete 기반 일회성 소비. 지연·재방문·중복 callback의 정상 거부와 실제 처리 오류가 같은 코드에 섞인다. 새로운 정상 로그인에서 반복 실패하거나 비정상 증가하면 대표 이벤트 수집. 구체적인 판단 근거·임계치는 구현 시 결정 |
| `OAUTH_REQUEST_FAILED` + 확인된 `access_denied` | 제외 | 사용자 동의 거부/취소. 브라우저 query에서 access_denied 여부만 판정하며 원문은 전송하지 않음 |
| 그 밖의 `OAUTH_REQUEST_FAILED` / 원인 불명 | 수집 | 취소라고 확인되지 않은 OAuth 실패를 전부 정상 취소로 숨기지 않는다. 원문 query를 보내지 않고 알려진 provider 사유만 분류 |
| `GITHUB_OAUTH_CONFIGURATION_INVALID` 등 5xx·온라인 통신 실패 | 수집 | 로그인 경로의 설정·서버·통신 장애 |

`INVALID_OAUTH_STATE` 자체가 Redis 장애를 뜻하지는 않는다. Redis 접근 실패는 현재 별도 500 오류로 변환되므로 수집한다.
위 OAuth 표는 callback 보고에 적용했으며 사용자 화면은 유지했다.

## 객체 정규화와 Sentry 전송 검토

### 원본 오류와 분류 정보의 차이

`Error`는 JavaScript의 오류 형식이며 보통 메시지와 발생 경로인 `stack`을 가진다. `HTTPError`는 ky가 만든 Error 계열이다.
정규화 객체는 UI가 처리하기 쉽도록 붙인 `type`, `kind`, `detail` 등의 분류 정보다.
객체 리터럴이라는 형식 자체가 잘못된 것은 아니다. 수정 전에는 API 분기에서 분류 정보만 새로 만들고 원본 HTTPError를 버렸다. 현재는 `cause: HTTPError`를 보관한다.

예를 들어 “발행 요청이 실패했다”는 분류 정보는 남지만, 그 요청 오류가 어느 코드 경로에서 만들어졌는지를 잃는다.
나중에 `new Error()`를 만들어 Sentry에 보내도 이미 잃은 원래 발생 경로를 되살릴 수 없고 새 Error를 만든 위치가 기록된다.

승인한 방식은 기존 UI용 분류를 유지하면서 원본 오류도 내부에 보관하는 것이다.
그 뒤 Sentry로 보낼 때 원본의 발생 경로를 활용하고, 메시지·태그는 개인정보가 없는 형태로 구성한다.
원본 오류를 보관하는 것과 원본을 그대로 외부에 보내는 것은 별개다.
따라서 전면적인 Error 클래스 교체는 필수가 아니다. 원본 보존·중복 정규화 방지·보고 변환이 필요한 세 가지 변화다.

### 수정 전 SDK 변환 검증

정확히는 ky 자체가 아니라 공통 `apiRequest`의 catch에서 `normalizeApiError`를 호출해 객체 리터럴을 던진다.
Sentry는 객체 리터럴도 처리하지만, 정규화 객체를 그대로 보내는 것은 진단 품질과 수집 범위 모두에 문제가 있다.

설치된 `@sentry/browser` 10.75.1의 `BrowserClient.eventFromException`으로 외부 전송 없이 검증했다.
가짜 응답·가짜 private marker·가짜 URL만 사용했으며 transport 호출은 0회였다.

| 전달한 값 | SDK가 만든 이벤트 | 문제 |
| --- | --- | --- |
| 수정 전 `type: api` 객체 | `Object captured as exception with keys: detail, kind, response, type`, capture 지점의 synthetic stack | api 분기는 원본 HTTPError를 보존하지 않는다. 서로 다른 원인이 유사하게 보이고 원래 오류 stack 복구 불가 |
| 같은 객체의 `detail` | `extra.__serialized__`에 message·invalidParams 포함 | 서버 메시지·검증 사유에 사용자 입력이 섞이면 전송될 수 있다. `sendDefaultPii: false`만으로 이 데이터를 제거하지 않음 |
| 원본 Error를 cause로 가진 객체 | SDK가 내부 Error의 stack을 사용하고 객체도 직렬화 | cause만 추가해 통째로 보내면 raw detail 유출 가능성이 그대로 남음 |
| 원본 ky HTTPError | 원본 stack을 사용 | HTTPError 메시지에 method와 전체 요청 URL이 들어가므로 query의 OAuth code 등이 포함될 수 있음 |

확정한 구현은 **정규화 시점을 유지하되 원본 오류 보존과 안전한 보고 변환을 분리**한다.

1. UI는 현재 `type/kind/detail` 계약을 계속 사용한다. `api`를 포함한 모든 분기에서 원본 Error를 내부적으로 보존한다.
2. 이미 정규화된 입력은 다시 감싸지 않도록 정규화를 멱등적으로 만든다. 분석 이벤트의 UNKNOWN_ERROR 문제도 이 경계에서 해결한다.
3. 수집 여부를 판단한 뒤 Sentry adapter에서 고정 제목의 안전한 Error와 허용된 metadata만 만든다. 원본 stack frame은 보존하되 URL query/fragment와 메시지에 민감값이 남지 않도록 정리한다.
4. 정규화 객체·Response·원본 HTTPError·raw cause를 그대로 capture 인수나 extra로 전달하지 않는다. Sentry의 LinkedErrors는 cause를 따라갈 수 있으므로 wrapper에 원본 cause를 달아 보내는 것만으로 안전해지지 않는다.
5. `beforeSend` 등 최종 전송 경계에서도 exception·cause chain·request URL·breadcrumbs·extra의 수집 계약을 검증한다. 본문/서버 메시지 전체 대신 feature·operation·공개 errorCode·httpStatus·request_id를 허용한다.

Error subclass로 정규화하는 대안도 가능하지만 Error 상속만으로 body·URL 문제가 해결되지는 않는다.
현재 구현은 `api-error.ts`의 api 분기에 cause를 추가하고 이미 정규화된 입력을 그대로 반환한다.
`sentry-error-tracker.ts`는 정규화 오류를 `sentry-api-error.ts`에서 별도 Error로 변환한다. 원본의 스택 위치를 보존하고 메시지는 고정 형식으로 생성하며 cause·Response·서버 메시지는 연결하지 않는다.
client/server/edge의 beforeSend는 이 경로의 이벤트에서 request·user·임의 breadcrumbs·extra·contexts를 제거하고 스택 URL의 query/fragment와 연결된 예외를 정리한다. 태그는 고정 feature·operation, errorCode·httpStatus·request_id, 분류용 error_type·error_kind와 기존 호환 별칭 error_code·status를 허용한다. 제목에는 feature·operation·errorCode·httpStatus·error_type을 넣고 요청별 request_id는 태그로만 보존한다. 계약과 누락 처리 기준은 [operation별 계약](api-error-operation-contracts.md)을 따른다. 429 breadcrumb는 method·retry_count만 재구성해 보존한다.
일반 Error/captureMessage의 기존 동작은 유지한다. report로 이미 처리한 오류는 상위 capture 및 SDK 자동 수집에서 중복 전송하지 않는다.

### 실제 연결과 상태 소유권

- 호출부는 apiErrorReporter.report(error, context)를 사용한다. ApiErrorReporter 클래스가 처리 결과 WeakMap과 operation별 429 전송 시각을 소유한다. 주입받은 ErrorTracker로 전송하며, SentryErrorTracker는 전송용 Error 변환과 SDK 호출을 담당한다. initialize-sentry.ts가 공통 SDK 초기화와 beforeSend 연결을 담당하며 client/server/edge 진입점은 환경별 설정만 전달한다. reporter 인스턴스 파일은 생성만 담당한다. beforeSend 연결부도 같은 reporter로 자동 수집 정책과 중복 여부를 판단한다.
- 수집 정책은 순수 함수다. API 입력 검증 helper가 기존 도메인 상수로 실제 요청의 사용자 입력 제약 위반을 확인해 필드명만 전달한다. UI/BE 메시지 문자열과 요청 본문은 정책에 전달하지 않는다. 정상 입력인데 서버가 거부하거나 앱 내부 필드가 누락되면 예상 밖 실패로 수집한다.
- 임시저장 생성/덮어쓰기, 초안/새 글 발행, 글 수정, Co-log 생성/초대는 mutation onError에서 보고한다. meta.errorTracking=local로 전역 MutationCache와 수집 소유권을 구분한다.
- presign·S3 PUT은 여러 화면이 공유하는 업로드 조합 함수에서 각 단계별로 보고한다. 상위 mutation은 동일 오류를 중복 보고하지 않는다. S3 403/404는 자사 API의 정상 권한·부재 계약으로 제외하지 않는다. BE 비동기 태깅은 연동하지 않는다.
- QueryCache는 재시도가 끝난 최종 5xx/통신/계약 밖 코드/429를 보고한다. 복구 UI의 ContentLoadFailureTracker는 추가로 예상 밖 조회 4xx를 판단한다. 동일 오류 객체와 cause는 인스턴스 내에서 중복 제거한다.
- 같은 operation의 최종 429는 인스턴스당 60초에 1건이다. 조회·일반 mutation은 warning, 핵심 작업은 error다. 자동 수집의 operation 불명 오류는 unhandled로 표시하며 429는 warning이다. 이는 탭/서버 프로세스를 아우르는 분산 제한이 아니다.
- ky afterResponse는 중간 429를 안전한 breadcrumb로만 기록한다. 재시도 후 복구된 요청은 예외 이벤트를 만들지 않는다. Sentry ingest는 이 ky 경로에 포함되지 않는다.
- INVALID_OAUTH_STATE의 비정상 증가 자동 탐지와 공급자별 세부 rate-limit 계약은 후속 운영 판단으로 남긴다.

## 429 발생 가능성과 수집 기준

429는 일정 시간 내 요청 제한을 뜻하며 선택적으로 Retry-After를 포함한다. HTTP 표준은 오류 응답 body의 자사 errorCode를 요구하지 않는다.
([RFC 6585 §4](https://www.rfc-editor.org/rfc/rfc6585.html#section-4))

현재 서비스에서 발생을 확인했다는 뜻은 아니지만 다음 경로가 가능하다.

| 상황 | 가능한 원인 | FE에서 보이는 형태 |
| --- | --- | --- |
| 자사 API 요청이 프록시·게이트웨이에서 제한 | 반복 클릭, 여러 탭, 자동저장/폴링 또는 재시도 루프, 공용 IP의 합산 제한 | 429 JSON 또는 HTML/빈 body. 프록시에 제한·응답 설정이 있는 경우이며 현재 구성 미확인 |
| 향후 BE에 사용자·IP별 제한 도입 | 정상 사용자 요청량 또는 전체 트래픽 한도 | 새 계약에 정의된 429 |
| GitHub upstream 제한 | 인증 주체의 quota, 짧은 시간 내 다수 요청 | GitHub는 일부 제한에 403/429 사용. 현재 Rilog BE는 HTTP 실패를 502 토큰 교환/사용자 조회 실패로 변환 |
| Sentry·분석 수집 endpoint 자체 제한 | 관측 도구의 quota·ingest 제한 | 서비스 API 오류와 별개. 그 실패를 다시 Sentry로 보내는 루프를 만들지 않음 |

GitHub의 403/429 rate limit과 Retry-After 지침은 [공식 문서](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)를 참고한다.
위 요청 패턴과 구성 경로는 가능한 원인에 대한 추론이며 현재 운영 발생 증거는 아니다.

**미정의 errorCode와 미문서화 HTTP status는 별개다.** 예를 들어 HTML 429는 `type: http`이며 errorCode가 없다.
따라서 “unknown errorCode 수집” 조건만으로 모든 429가 자동 수집된다고 가정하지 않고 HTTP 429 자체를 별도 판정한다.

| 범위 / 상태 | 확정 기준 |
| --- | --- |
| 현재 자사 API의 재시도 후 최종 429 | 예상 밖 rate limit 대표 이벤트 수집. 일반 조회는 warning, 발행·저장·로그인 최종 차단은 error. 버그/계약 위반으로 원인을 단정하지 않음 |
| 중간 429 후 정상 복구 | 매 재시도 예외 이벤트는 보내지 않음. 제한 횟수는 집계/안전한 breadcrumb로 관찰 |
| 같은 operation에서 연속 최종 429 | reporter 인스턴스의 같은 operation에서 60초당 대표 이벤트 1건. 그룹화만으로 이벤트 수가 줄지는 않으므로 실제 전송을 제한 |
| 알려진 정상 rate limit 계약 도입 후 | 정상 제한은 예외 이벤트에서 제외하고 집계. 장기 차단·요청 루프 등 비정상 조건만 재평가 |
| 자사 ErrorDetail의 실제 미정의 errorCode를 동반한 429 | 계약 위반도 수집하되 같은 실패를 rate limit 이벤트와 이중 전송하지 않음 |
| 외부 서비스의 429 | 해당 공급자 계약으로 판단. 자사 코드표에 없다는 이유로 계약 위반 처리하지 않음 |
| Sentry ingest의 429 | SDK backoff/도구 운영 지표로 다룸. Sentry captureException 재귀 호출 금지 |

결론: **현재 자사 API의 최종 429를 수집하는 것은 타당하지만, 모든 endpoint의 모든 429를 매번 error로 보내는 것은 부적절하다.**
Retry-After는 재시도 대기 기준이며 정상/비정상 판정을 단독으로 결정하는 신호는 아니다.

## 근거

- [FE 코드표](../../frontend/src/shared/api/error-codes.ts), [정규화](../../frontend/src/shared/api/api-error.ts), [공통 재시도](../../frontend/src/shared/query/query-client-config.ts)
- [OAuth FE 처리](../../frontend/src/features/login/ui/GitHubCallbackHandler.tsx), [분석 오류 추출](../../frontend/src/features/analytics/lib/get-analytics-error-properties.ts), [OAuth BE callback](../../backend/src/main/java/kr/rilog/domain/auth/presentation/GithubOAuthController.java)
- [임시저장 서비스](../../backend/src/main/java/kr/rilog/domain/post/service/DraftService.java), [발행 입력](../../backend/src/main/java/kr/rilog/domain/post/controller/dto/request/DraftPublishRequest.java)
- [태깅 listener](../../backend/src/main/java/kr/rilog/domain/upload/listener/TagAssetsListener.java), [태깅 실패 로그](../../backend/src/main/java/kr/rilog/domain/upload/service/S3ObjectTagger.java), [객체 key 처리](../../backend/src/main/java/kr/rilog/domain/upload/service/S3ObjectKeyResolver.java)
