# Backend Logging Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 반복적인 인증 로그를 줄이고 HTTP 예외와 외부 연동 실패를 요청 및 작업 단위로 추적하며, S3 태깅 결과를 운영자가 확인할 수 있게 한다.

**Architecture:** 기존 SLF4J 구조화 로그, 요청 ID, 전역 예외 처리와 비동기 태깅 구조를 활용한다. HTTP 처리 중 외부 연동 실패는 예외에 안전한 문맥을 담아 전역 핸들러에서 한 번 기록하고, 응답 이후 실행되는 S3 태깅은 객체별 실행 지점에서 결과를 기록한다.

**Tech Stack:** Java 21, Spring Boot 4.1.0, Spring MVC/RestClient, SLF4J/Logback, AWS SDK for Java 2.25.0, JUnit 5, Mockito, MockMvc, MockRestServiceServer.

**Spec:** 이 대화에서 합의한 요구사항을 아래 [Agreed Scope](#agreed-scope)에 정리했다. 기존 기준은 [로깅 가이드](../../backend/logging.md)와 [CloudWatch 가이드](../../backend/cloudwatch-logs.md)다.

## Agreed Scope

- `EXPIRED_ACCESS_TOKEN`, `REFRESH_TOKEN_MISSING`은 local/dev/prod 모두 `shouldLog()`에서 제외하고 기존 401 응답은 유지한다. DEBUG 로그로 대체하지 않는다.
- `http_request_exception`에 `method`, `path`를 추가한다. `STATIC_RESOURCE_NOT_FOUND`의 경로 확인은 이 작업의 완료 조건이다.
- 로그인 성공은 기존 `oauth_login_completed`를 활용한다. 고정된 성공 이벤트에 `method/path`를 추가하지 않는다.
- Presigned URL은 발급 실패만 기록한다. 발급 성공 로그는 추가하지 않는다.
- GitHub 실패를 토큰 교환과 사용자 조회로 구분하고, 실패 원인과 소요 시간을 조회할 수 있게 한다.
- S3 태깅 실패는 대상 객체와 요청한 태그를 식별하고 수동 복구 판단에 필요한 정보를 보강한다.
- S3 태깅 성공도 객체별 `INFO`로 기록한다. `CONFIRMED`와 `TEMPORARY` 모두 실제 SDK 호출 성공 후 기록한다.

## Global Constraints

- 영향 범위는 backend와 운영 문서다. HTTP 상태, 공개 오류 코드, 응답 본문 및 인증 동작을 유지한다.
- 새 의존성, 공통 HTTP 로깅 인터셉터, DB 테이블, outbox, 애플리케이션 재시도 및 운영 인프라 변경은 포함하지 않는다.
- HTTP 오류 한 건의 ERROR 및 stack trace는 최종 핸들러에서 한 번 기록한다. 외부 클라이언트에서 기록하고 재던지는 중복을 만들지 않는다.
- 기존 `requestId`, `event`, `errorCode`, `httpStatus`, S3의 `key/tagStatus` 필드 이름을 유지한다.
- `method/path`는 들어온 HTTP 요청을 의미한다. `externalStatus`는 외부 응답 상태이며 우리 API의 `httpStatus`와 구분한다.
- `path`는 `HttpServletRequest.getRequestURI()`를 사용한다. query string, 요청 본문, 인증 헤더, 쿠키, 파일명 원문, redirect URL, presigned URL 및 signed headers를 기록하지 않는다.
- `durationMs`는 `System.nanoTime()`의 차이를 밀리초로 환산한 숫자다. SDK 호출이 반환하거나 실패할 때까지 측정하며, 내부 재시도가 있다면 그 시간도 포함한다. 재시도 횟수를 추정해 기록하지 않는다.
- 외부 상태 및 AWS 요청 ID를 얻지 못하면 해당 필드를 생략한다. 알 수 없는 값을 0, 200, 500 등으로 채우지 않는다.
- 404는 우선 기존 INFO 수준을 유지한다. 경로 확인 후 반복 요청의 제외 또는 샘플링 정책을 별도 결정한다.
- 기존 사용자 변경인 `backend/.agents/`, `docs/adr/0001-inline-comment-anchoring.md`는 이번 계획의 수정 대상이 아니다.

## Review Focus

- 쿼리에 OAuth `code/state`가 포함된 404 및 미처리 500에서도 path만 기록되어야 한다. Task 1에서 검증한다.
- 오류 문맥이 공통 필드를 덮어쓰거나 외부 응답 본문이 cause를 통해 출력되지 않아야 한다. Task 2에서 검증한다.
- GitHub가 정상 HTTP 상태로 빈 값 또는 잘못된 본문을 반환해도 성공으로 분류하지 않아야 한다. Task 3에서 검증한다.
- 파일 형식/크기 검증 실패가 presign 장애로 분류되지 않고, 발급 성공에 INFO가 추가되지 않아야 한다. Task 4에서 검증한다.
- S3 객체 일부만 실패하면 실패 객체에 성공 로그가 없어야 하며 다음 객체 처리는 계속되고 요청 ID가 연결되어야 한다. Task 5에서 검증한다.

## Planning Baseline

| 위치 | 현재 상태와 구현 판단 |
| --- | --- |
| `backend/src/main/java/kr/rilog/global/advice/GlobalExceptionHandler.java` | `EXPIRED_ACCESS_TOKEN`만 제외한다. INFO/ERROR helper와 미처리 예외의 별도 로깅 분기에 method/path가 없다. |
| `backend/src/main/java/kr/rilog/domain/auth/presentation/GithubOAuthController.java` | `POST /v1/auth/github/callback`에서 토큰 발급 및 응답 구성 후 `oauth_login_completed`가 이미 있다. 브라우저의 리다이렉트 완료를 관측하는 로그는 아니다. |
| `backend/src/main/java/kr/rilog/domain/upload/service/UploadService.java` | `createUploadUrl()`에 presign 전용 실패 문맥이 없다. `confirm/markTemporary` 직접 태깅 메서드는 현재 검색된 외부 호출부가 없다. |
| `backend/src/main/java/kr/rilog/domain/upload/listener/TagAssetsListener.java` | 실제 자산 태깅은 트랜잭션 AFTER_COMMIT 이벤트에서 비동기로 실행된다. |
| `backend/src/main/java/kr/rilog/domain/upload/service/S3ObjectTagger.java` | 객체별 SDK 실패를 기록하고 다음 객체를 처리한다. 성공 로그는 없다. |
| `frontend/src/shared/api/uploads/api.ts` | 파일 PUT은 브라우저가 presigned URL로 직접 수행한다. 백엔드 발급 로그로 이 PUT의 성공/실패를 알 수 없다. |

## Event Contract

모든 이벤트의 요청 연결에는 기존 MDC `requestId`를 사용한다.

| 상황 | event / level | 추가 또는 유지할 문맥 |
| --- | --- | --- |
| 일반 HTTP 예외 및 리소스 404 | `http_request_exception` / 기존 INFO 또는 ERROR | `errorCode`, `httpStatus`, **`method`, `path`** |
| GitHub 연동 실패 | `http_request_exception` / ERROR | 공통 HTTP 필드 + `provider=GITHUB`, `operation=exchange_access_token` 또는 `fetch_user`, `durationMs`, `failureType`, 취득 가능한 `externalStatus` |
| Presigned URL 발급 실패 | `http_request_exception` / ERROR | 공통 HTTP 필드 + `provider=S3`, `operation=presign_put_object`, `durationMs`, `failureType=SDK_ERROR` 또는 `INVALID_CONFIGURATION`, `bucket`, `key`, `uploadType`, `contentType`, `size`, `expirationMinutes` |
| OAuth 로그인 완료 | `oauth_login_completed` / INFO | 기존 `provider`, `userId`, `onboardingStatus` |
| S3 태깅 성공 | **`s3_object_tagging_completed` / INFO** | `bucket`, `key`, `tagStatus`, `durationMs`, 취득 가능한 `awsRequestId` |
| S3 태깅 실패 | `s3_object_tagging_failed` / ERROR | 기존 `bucket`, `key`, `tagStatus`, cause + `durationMs`, 취득 가능한 `externalStatus`, `awsErrorCode`, `awsRequestId` |
| S3 소유권 불일치 | `s3_image_ownership_mismatch` / WARN | 기존 `requesterId`, `key`, `tagStatus` |

앞서 논의한 `s3_presigned_url_creation_failed`라는 별도 이벤트 대신 `event=http_request_exception AND provider=S3 AND operation=presign_put_object`로 발급 실패만 조회한다. 기존 HTTP 오류 조회를 유지하면서 중복 ERROR와 새 공개 오류 코드를 추가하지 않는 선택이다.

## Task 1: HTTP 예외 문맥과 인증 로그 소음

**Files:**
- Modify: `backend/src/main/java/kr/rilog/global/advice/GlobalExceptionHandler.java`
- Test: `backend/src/test/java/kr/rilog/global/advice/GlobalExceptionHandlerTest.java`
- Regression: `backend/src/test/java/kr/rilog/domain/auth/presentation/AuthTokenControllerTest.java`

**Interfaces:** 각 `@ExceptionHandler`에 `HttpServletRequest request`를 명시적으로 추가하고 기존 private 로깅 helper에 전달한다. `logInfoException(ErrorInformation, Object, HttpServletRequest)`, `logErrorException(ErrorInformation, String, Exception, HttpServletRequest)`, `logExceptionByStatus(ErrorInformation, Exception, HttpServletRequest)`가 요청 필드를 기록한다. 미처리 예외 분기에도 동일하게 적용한다. 요청 필드를 MDC에 넣어 모든 성공 로그로 확산시키지 않는다.

- [x] 다음 회귀 테스트를 추가하고 기존 직접 handler 호출 테스트에 `MockHttpServletRequest`를 전달한다.

```java
// refreshTokenMissingRespondsUnauthorizedWithoutLog
// 실제 refresh endpoint의 쿠키 없는 요청은 401/REFRESH_TOKEN_MISSING 유지.
assertThat(logCapture.appender().list).isEmpty();

// staticResourceNotFoundIncludesMethodAndPathWithoutQuery
// GET /missing.js?code=TEST_CODE&state=TEST_STATE
assertThat(logFields(event)).containsEntry("method", "GET")
        .containsEntry("path", "/missing.js")
        .containsEntry("errorCode", "STATIC_RESOURCE_NOT_FOUND");
// message 및 모든 key-value에는 TEST_CODE/TEST_STATE가 없어야 한다.
```

- [x] 4xx 검증 오류, 405, infrastructure 5xx, 미처리 500에도 요청 method/path가 붙는 사례를 추가한다. 정적 리소스 404는 합성 예외 테스트 외에 MVC 리소스 handler를 거치는 요청도 검증한다. `RequestIdFilter`를 붙인 요청 테스트에서 응답 헤더와 로그 MDC의 ID가 일치하는지 확인한다.
- [x] backend에서 `./gradlew test --tests '*GlobalExceptionHandlerTest' --tests '*AuthTokenControllerTest'` 실행: 신규 no-log/요청 필드 assertion이 실패하는지 확인한다.
- [x] `shouldLog()`에서 `REFRESH_TOKEN_MISSING`도 제외하고 위 요청 전달을 구현한다. 기존 access token 만료 제외, 다른 인증 실패 로그, HTTP 응답을 유지한다.
- [x] 같은 명령을 실행해 통과를 확인한다. 문서의 HTTP 필드와 제외 목록 갱신은 Task 6에 반영한다.

## Task 2: 외부 실패 문맥 전달과 출력 경계

**Files:**
- Modify: `backend/src/main/java/kr/rilog/global/exception/RilogInfrastructureException.java`
- Modify: `backend/src/main/java/kr/rilog/global/advice/GlobalExceptionHandler.java`
- Modify: `backend/src/main/java/kr/rilog/global/logging/SensitiveDataMasker.java`
- Create: `backend/src/test/java/kr/rilog/global/exception/RilogInfrastructureExceptionTest.java`
- Test: `backend/src/test/java/kr/rilog/global/advice/GlobalExceptionHandlerTest.java`
- Test: `backend/src/test/java/kr/rilog/global/logging/SanitizingStackTracePrinterTest.java`
- Regression: `backend/src/test/java/kr/rilog/global/logging/SensitiveDataMaskerTest.java`

**Interfaces:** `RilogInfrastructureException(ErrorInformation, String message, Throwable cause, Map<String, Object> logContext)` 생성자와 `Map<String, Object> getLogContext()`를 추가한다. 기존 생성자는 빈 map을 사용한다. `Map.copyOf()`로 문맥을 보존하고, 값이 없는 선택 필드는 map 생성 전에 생략한다.

- [x] 테스트 추가: 기존 생성자는 빈 문맥, 새 생성자는 cause와 불변 문맥을 보존하며 외부에서 원본 map을 수정해도 바뀌지 않는다.
- [x] 핸들러 테스트 추가: 문맥이 JSON key-value로 한 번 출력되고 응답 본문에는 포함되지 않는다. 문맥에 `event`, `path`, `requestId`, `token`을 넣어도 공통 필드를 덮어쓰거나 추가 출력하지 않는다.
- [x] `RestClientResponseException`의 root/cause/suppressed 메시지에 테스트용 원문 본문을 넣어 실제 stack printer 출력에서 본문 전체가 빠지는지 검증한다. class/cause/stack frame과 숫자 HTTP 상태는 보존한다.
- [x] `./gradlew test --tests '*RilogInfrastructureExceptionTest' --tests '*GlobalExceptionHandlerTest' --tests '*SanitizingStackTracePrinterTest' --tests '*SensitiveDataMaskerTest'` 실행: 신규 문맥/본문 제외 assertion 실패 확인.
- [x] 전역 핸들러는 문맥 중 `provider`, `operation`, `durationMs`, `failureType`, `externalStatus`, `bucket`, `key`, `uploadType`, `contentType`, `size`, `expirationMinutes`만 추가한다. 서비스에서 임의 본문을 넣지 않고 알려진 문자열/숫자/enum만 전달한다. 기존 생성자를 쓰는 Redis 등 다른 인프라 예외는 기존 방식으로 처리한다.
- [x] `SensitiveDataMasker.formatThrowable(Throwable)`에서 `RestClientResponseException`은 원문 `getMessage()` 대신 클래스명과 숫자 상태만 포맷한다. 나머지 예외는 기존 마스킹을 유지한다. SDK 예외의 credential 및 signed query 값에 대한 회귀 fixture도 추가하고 실제 누락이 확인된 패턴만 보강한다.
- [x] 같은 테스트 명령을 실행해 통과를 확인한다. 이후 작업은 이 문맥 전달 경로를 사용하며 별도 ERROR를 찍지 않는다.

## Task 3: GitHub 연동 실패 식별

**Files:**
- Modify: `backend/src/main/java/kr/rilog/domain/auth/infrastructure/github/RestClientGithubAccessTokenClient.java`
- Modify: `backend/src/main/java/kr/rilog/domain/auth/infrastructure/github/RestClientGithubUserClient.java`
- Test: `backend/src/test/java/kr/rilog/domain/auth/infrastructure/github/RestClientGithubAccessTokenClientTest.java`
- Test: `backend/src/test/java/kr/rilog/domain/auth/infrastructure/github/RestClientGithubUserClientTest.java`
- Regression: `backend/src/test/java/kr/rilog/domain/auth/presentation/GithubOAuthControllerTest.java`

**Interfaces:** 기존 `OAuthAccessToken exchange(String code)`와 `SocialLoginUser getUser(OAuthAccessToken accessToken)`를 유지하고, 실패 예외에 Task 2의 문맥을 전달한다. `provider=GITHUB`; operation은 각각 `exchange_access_token`, `fetch_user`다.

- [x] 기존 MockRestServiceServer 테스트를 확장한다: non-2xx, I/O 실패, 정상 상태의 빈/필수값 누락 응답, 파싱 불가능한 응답을 검증한다. 공개 오류 코드는 기존 `GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED` / `GITHUB_USER_FETCH_FAILED`다.

```java
// exchangeFailureIncludesExternalContext
assertThat(failure.getLogContext()).containsEntry("provider", "GITHUB")
        .containsEntry("operation", "exchange_access_token")
        .containsEntry("failureType", "HTTP_ERROR")
        .containsEntry("externalStatus", 400);
assertThat((Long) failure.getLogContext().get("durationMs")).isGreaterThanOrEqualTo(0L);
```

- [x] `./gradlew test --tests '*RestClientGithub*Test' --tests '*GithubOAuthControllerTest'` 실행: 신규 context assertion 실패 확인.
- [x] `.toEntity(ResponseDto.class)`로 반환된 응답의 상태와 body를 분리한다. 상태 오류는 `HTTP_ERROR`, `ResourceAccessException`은 `IO_ERROR`, 정상 상태의 빈/필수값 누락은 `INVALID_RESPONSE`, 그 밖의 `RestClientException`은 `CLIENT_ERROR`로 기록한다. 상태를 실제로 얻은 경우만 `externalStatus`를 넣는다. 파싱 예외에서 상태를 얻지 못하면 생략한다.
- [x] 입력 code/state/token, 응답 DTO 및 외부 응답 본문은 문맥에 담지 않는다. 성공 시 연동 단계별 INFO를 추가하지 않고 기존 로그인 완료 이벤트를 활용한다.
- [x] 같은 명령을 실행해 통과를 확인한다. 기존 로그인 성공 테스트에서 INFO 한 건과 기존 필드, 실패 시 로그인 성공 로그 부재를 검증한다.

## Task 4: Presigned URL 발급 실패만 기록

**Files:**
- Modify: `backend/src/main/java/kr/rilog/domain/upload/service/UploadService.java`
- Test: `backend/src/test/java/kr/rilog/domain/upload/service/UploadServiceTest.java`
- Test: `backend/src/test/java/kr/rilog/global/advice/GlobalExceptionHandlerTest.java`

**Interfaces:** 기존 `PresignedUrlCreateResult createUploadUrl(Long userId, PresignedUrlCreateCommand command)`를 유지한다. Task 2 문맥을 사용하고 공개 오류는 기존 `INTERNAL_SERVER_ERROR`/500을 유지한다. `UploadErrorInformation`에 새 공개 코드를 추가하지 않는다.

- [x] SDK 실패 테스트에서 예외의 `provider=S3`, `operation=presign_put_object`, `failureType=SDK_ERROR`, bucket/key/type/contentType/size/expirationMinutes와 cause를 검증한다. `externalStatus`는 없다.
- [x] presign 설정 오류와 이미지 형식/크기 검증 실패를 구분한다. 전자는 `INVALID_CONFIGURATION`, 후자는 기존 UploadException과 400 응답을 유지한다. 발급 성공 및 입력 검증 실패에 presign 전용 로그가 없어야 한다.
- [x] `./gradlew test --tests '*UploadServiceTest' --tests '*GlobalExceptionHandlerTest'` 실행: 신규 실패 문맥 assertion 실패 확인.
- [x] 입력 검증 및 object key 생성 후, presign 요청 구성과 `s3Presigner.presignPutObject(...)` 범위에서 `SdkException`을 문맥 있는 인프라 예외로 변환한다. 해당 좁은 범위의 `IllegalArgumentException`은 설정 실패로 분류한다. 전체 메서드의 임의 RuntimeException을 포괄적으로 잡지 않는다.
- [x] `GlobalExceptionHandlerTest`의 테스트 endpoint에서 mock presigner가 실패하는 실제 UploadService를 호출한다. `event=http_request_exception`, `operation=presign_put_object`, 요청 method/path가 있는 ERROR 한 건과 기존 500 응답을 검증한다.
- [x] 같은 명령을 실행해 통과를 확인한다. 반환된 presigned URL, signed headers, 원본 파일명은 로그에 포함하지 않는다.

Presigning은 요청 서명 생성 단계이며 실제 PUT과 구분된다. 발급 성공을 업로드 성공으로 해석하지 않는다. [AWS S3Presigner 공식 문서](https://docs.aws.amazon.com/java/api/latest/software/amazon/awssdk/services/s3/presigner/S3Presigner.html)도 서명 생성과 서명된 요청 실행을 별도 단계로 설명한다. credential 취득 중 외부 통신이 발생할 수 있으므로 발급을 항상 무통신 작업이라고 단정하지 않는다.

## Task 5: 실제 S3 태깅 결과 기록

**Files:**
- Modify: `backend/src/main/java/kr/rilog/domain/upload/service/S3ObjectTagger.java`
- Test: `backend/src/test/java/kr/rilog/domain/upload/service/S3ObjectTaggerTest.java`
- Regression: `backend/src/test/java/kr/rilog/domain/upload/service/S3TagAssetsLifecycleTest.java`
- Regression: `backend/src/test/java/kr/rilog/domain/upload/listener/TagAssetsListenerIntegrationTest.java`
- Regression: `backend/src/test/java/kr/rilog/global/logging/MdcTaskDecoratorTest.java`

**Interfaces:** `void tag(List<S3TagTarget> uploadTargets)`와 객체별 후속 처리 동작을 유지한다. `changeS3ObjectTag(S3TagTarget)`에서 SDK 호출이 반환한 직후 성공 로그를, SDK 예외 catch에서 실패 로그를 기록한다.

- [x] `TagStatus` 파라미터 테스트에 성공 INFO 한 건, `event=s3_object_tagging_completed`, 요청한 `tagStatus`, bucket/key, 숫자 durationMs를 검증한다. mock은 실제 성공을 표현하는 `PutObjectTaggingResponse`를 반환하게 한다.
- [x] 혼합 결과 테스트는 이벤트 종류/객체 키로 검증한다. 첫 객체 실패 후 두 번째 성공이면 ERROR 한 건과 INFO 한 건이며, 실패 객체의 성공 로그는 없다. 빈 목록은 로그도 SDK 호출도 없다.
- [x] S3Exception에는 취득 가능한 `externalStatus/awsErrorCode/awsRequestId`, SdkClientException에는 취득 불가능한 필드의 생략을 검증한다. MDC에 테스트 requestId를 넣고 결과 로그에서 같은 값이 보존되는지 확인한다.
- [x] `./gradlew test --tests '*S3ObjectTaggerTest' --tests '*S3TagAssetsLifecycleTest' --tests '*TagAssetsListenerIntegrationTest' --tests '*MdcTaskDecoratorTest'` 실행: 신규 성공 이벤트/상세 필드 assertion 실패 확인.
- [x] Event Contract대로 기록한다. 성공은 객체별 실제 호출 결과이고, `tagStatus`는 이번에 설정한 값이다. 이전 태그를 조회하지 않았으므로 `fromStatus` 또는 검증되지 않은 상태 전환은 기록하지 않는다. 고정 S3 이벤트에 provider/operation/method/path를 중복 추가하지 않는다.
- [x] 같은 명령을 실행해 통과를 확인한다. 기존 AFTER_COMMIT 실행, rollback 시 미실행, 요청 ID 전파, 소유권 불일치 WARN과 대상 제외를 유지한다.

`UploadService.confirm/markTemporary`의 현재 미사용 직접 태깅 경로를 이번에 제거하거나 비동기 tagger로 위임하지 않는다. 위임은 예외 전파/실패 처리 의미를 바꿀 수 있다. 구현 시 사용처 검색을 다시 확인하고 활성 호출부가 새로 발견되면 그 경로를 별도로 평가한다.

## Task 6: 운영 조회와 복구 절차, 최종 검증

**Files:**
- Modify: `docs/backend/logging.md`
- Modify: `docs/backend/cloudwatch-logs.md`

**Interfaces:** Task 1~5의 Event Contract를 문서와 쿼리에 그대로 사용한다. 문서상 절차 작성과 실제 운영 알람/복구 실행을 구분한다.

- [x] 로깅 가이드에 인증 제외 목록, HTTP 요청 필드, 외부 작업 문맥, S3 성공/실패 이벤트, 기존 소유권 WARN을 반영한다. failureType과 선택 필드 생략 규칙도 명시한다.
- [x] CloudWatch 쿼리를 추가한다: 404 경로별 건수, GitHub operation/failureType별 실패, presign 실패, S3 객체별 태깅 이력, requestId로 HTTP 및 비동기 이벤트 연결. 예시:

```sql
fields @timestamp, requestId, method, path, bucket, key, failureType, durationMs
| filter event = "http_request_exception"
    and provider = "S3" and operation = "presign_put_object"
| sort @timestamp desc
| limit 50
```

- [x] 수동 복구 절차를 작성한다: 실패 로그의 bucket/key 식별 -> 해당 객체의 현재 DB 참조, 현재 S3 태그와 이후 성공 이력 확인 -> 현재 의도에 맞는 status 재설정 -> 결과 재확인 및 처리 기록. 오래된 실패 로그의 tagStatus를 그대로 재적용하지 않는다. 태그 변경 시 다른 태그를 보존해야 하는지도 확인한다.
- [x] 운영 확인 항목을 명시한다: TEMPORARY 객체 삭제 규칙과 실제 유예 기간, 실패 발견 담당자와 확인 주기, 기존 모니터링 담당자의 ERROR 알림 연결 여부. 운영 AWS 설정을 이 작업에서 임의 변경하지 않는다.
- [x] 한계를 명시한다: AFTER_COMMIT 이후 프로세스 종료/실행 전 유실/로그 전송 실패는 결과 로그 자체가 없을 수 있다. 로그는 복구 큐가 아니다. 삭제 전 복구를 보장할 수 없거나 미처리 누적/작업 유실이 허용되지 않으면 영속 작업 저장, 재조정 또는 outbox를 후속 설계한다. S3 전체 장애 이력만으로 실패 가능성을 판단하지 않는다.
- [x] backend에서 `./gradlew build`를 실행한다. 이는 전체 테스트와 실제 빌드 검증을 포함한다. 현재 CI는 `build -x test`이므로 CI 성공을 테스트 통과 근거로 대체하지 않는다. 실제 build 설정에 별도 lint/static-analysis task는 없으므로 새 도구를 도입하지 않는다.
- [x] 테스트에서 구조화 key-value의 숫자 타입, 실제 sanitizing stack 출력, HTTP 오류당 ERROR 한 건을 확인한다. dev/prod의 기존 JSON 및 stack printer 설정 테스트를 포함한다. 외부 서비스는 mock으로 검증하고 AWS/GitHub 실제 장애를 유발하지 않는다.
- [x] `git diff --check`와 변경 파일 검토 후 각 Task의 완료 조건을 확인한다. 구현 완료 보고에는 수정 파일, 실행한 테스트/빌드, 실행하지 못한 항목을 명시한다. 운영 배포 및 CloudWatch 실조회는 배포 후 검증 항목으로 구분한다.

## Execution Order and Completion

Task 1 -> Task 2 -> Task 3 -> Task 4 -> Task 5 -> Task 6 순서로 한 작업자가 구현한다. Task 3/4는 공통 예외 인터페이스에 의존하고 Task 1/2/4가 handler 테스트를 공유하므로 순차 실행이 단순하다.

사용자 요청에 따라 Task마다 독립된 로컬 커밋을 남기고 `docs/harness/lore-commit.md`를 따른다. 기존 이슈 작업 브랜치에서 구현하며 관련 없는 사용자 파일은 보존한다. Push, PR, 운영 배포 및 인프라 설정 변경은 수행하지 않는다.

완료 기준은 원래 응답 동작을 유지하면서 필요한 로그만 생성되고, 정적 리소스 경로 및 외부 실패 작업이 조회되며, S3 객체 결과와 수동 복구 판단 근거가 남는 것이다. 자동 복구나 작업 실행 보장은 이번 완료 기준에 포함하지 않는다.

## Verification Record

- 2026-09-26: Task 1~5에서 신규 회귀 테스트의 실패를 먼저 확인하고 구현 후 해당 테스트 통과를 확인했다.
- Task 6: Java 21 환경에서 `./gradlew build`와 전체 테스트가 통과했다. `git diff --check`도 통과했다.
- S3 메타데이터가 null이거나 AWS 요청 ID가 미취득인 성공 응답도 검증했다. 설정된 bucket이 없는 presign 실패는 원인 예외를 유지하고 없는 문맥을 생략한다.
- 외부 호출은 mock 검증이며 운영 배포, 실제 AWS/GitHub 호출, CloudWatch 실조회 및 알람/수명주기 설정 확인은 수행하지 않았다.
