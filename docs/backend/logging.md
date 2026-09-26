# Backend Logging Guide

이 문서는 백엔드 애플리케이션 로그의 공통 필드와 민감정보 제외 규칙을 정의한다.

## 요청 ID

모든 HTTP 요청은 서버가 새 UUID를 생성해 `X-Request-ID` 응답 헤더와 SLF4J MDC의 `requestId`에 저장한다. 클라이언트가 `X-Request-ID`를 보내도 재사용하지 않는다. 요청 처리가 끝나면 정상 응답과 예외 응답 모두에서 MDC의 `requestId`를 제거한다.

프론트엔드는 허용된 Origin에서 CORS exposed headers를 통해 `X-Request-ID`를 읽을 수 있다. 장애 문의나 운영 조회에서는 응답 헤더의 값을 로그의 `requestId` 필드와 매칭한다.

## JSON 로그

개발 서버와 운영 프로필은 Spring Boot 구조화 로그 기본 기능의 `logstash` 콘솔 포맷을 사용한다. 로그는 한 줄 JSON으로 출력하며, MDC의 `requestId`는 JSON 최상위 필드로 포함된다. 로컬 프로필은 개발자 콘솔 가독성을 위해 일반 콘솔 로그를 유지한다.

공통으로 기대하는 주요 필드는 다음과 같다.

| 필드 | 설명 |
| --- | --- |
| `@timestamp` | 로그 생성 시각 |
| `message` | 로그 메시지 |
| `logger_name` | 로거 이름 |
| `thread_name` | 스레드 이름 |
| `level` | 로그 레벨 |
| `service` | 서비스 이름. 현재 값은 `rilog-backend` |
| `environment` | 배포 환경. 현재 값은 `dev` 또는 `prod` |
| `requestId` | 요청 단위 추적 ID |
| `stack_trace` | 예외와 함께 기록한 경우의 스택 |

로컬 프로필인 `local`은 애플리케이션 패키지 `kr.rilog`를 `debug` 이상으로 출력한다. 개발 서버 프로필인 `dev`는 `debug` 이상 앱 로그를 구조화 JSON으로 출력한다. 운영 프로필인 `prod`는 `kr.rilog`를 `info` 이상으로 출력한다. CloudWatch에 수집되는 `dev`, `prod` 프로필은 Hibernate SQL 및 바인딩 파라미터 상세 로그를 출력하지 않는다.

## 운영 이벤트

이벤트는 JSON 최상위 `event`로 구분하고, 요청 단위 조회에는 `requestId`를 사용한다. 아래 필드는 구조화 key-value이며 일반 콘솔의 메시지에 모두 표시되는 것은 아니다.

| 이벤트 | 레벨 | 발생 시점 | 구조화 필드 | 기록하지 않는 값 |
| --- | --- | --- | --- | --- |
| `oauth_login_completed` | `INFO` | OAuth 인증, 토큰 발급과 응답 구성이 완료된 후 | `provider`, `userId`, `onboardingStatus` | 토큰, 인증 `code`, OAuth `state`, 쿠키, redirect URL |
| `http_request_exception` | `INFO` 또는 `ERROR` | HTTP 요청 예외를 최종 핸들러에서 응답으로 변환할 때 | `errorCode`, `httpStatus`, `method`, `path`, 선택적 외부 실패 문맥 | query string, 요청 본문, 외부 응답 본문, 토큰, 쿠키 |
| `s3_object_tagging_failed` | `ERROR` | 비동기 S3 객체 태깅 중 객체 단위 SDK 실패가 발생할 때 | `bucket`, `key`, `tagStatus`, `durationMs`, 선택적 `externalStatus`, `awsErrorCode`, `awsRequestId` | AWS credential, presigned URL, 외부 응답 본문 |
| `s3_image_ownership_mismatch` | `WARN` | 이미지 소유권이 맞지 않아 태깅 대상에서 제외할 때 | `requesterId`, `key`, `tagStatus` | 원본 파일명, 인증 정보 |
| `async_uncaught_exception` | `ERROR` | `@Async` 메서드의 미처리 예외가 발생할 때 | `method` | 메서드 인자 원문, 토큰, 쿠키 |

## 예외 로그 레벨

HTTP 요청 처리 중 발생한 예상 가능한 4xx 예외는 `INFO`로 기록하고 stack trace를 남기지 않는다. 다음 두 오류는 `shouldLog()`에서 제외하고 기존 401 응답만 유지한다. **local/dev/prod 모두 동일하며 DEBUG 로그로 대체하지 않는다.**

- `EXPIRED_ACCESS_TOKEN`: 정상 갱신 흐름에서 반복되는 액세스 토큰 만료
- `REFRESH_TOKEN_MISSING`: 리프레시 토큰이 없는 요청

다른 인증 오류까지 일괄 제외하지 않는다. 미처리 예외, 미분류 데이터 무결성 예외, 외부 연동 실패와 설정 오류처럼 5xx로 응답하는 서버 장애는 최종 HTTP 예외 처리 지점에서 `ERROR`로 한 번 기록한다.

`method`와 `path`는 **들어온 HTTP 요청**의 메서드와 `HttpServletRequest.getRequestURI()`다. query string은 포함하지 않는다. `STATIC_RESOURCE_NOT_FOUND`도 같은 `http_request_exception`의 `path`로 확인하며 별도 이벤트를 만들지 않는다. 이 404는 우선 INFO를 유지하고 경로별 빈도를 확인한 뒤 제외 또는 샘플링 여부를 결정한다. 고정된 OAuth 성공/S3 결과 이벤트에는 HTTP `method/path`를 추가하지 않는다. `async_uncaught_exception.method`만 예외적으로 HTTP 메서드가 아닌 Java 메서드 이름이다.

HTTP 요청 처리 흐름에서 외부 연동 예외를 애플리케이션 예외로 변환할 때는 `RilogInfrastructureException`을 사용한다. 공개 응답에는 내부 context를 담지 않고, 로그 추적을 위해 안전한 작업 문맥과 원인 예외 `cause`만 보존한다. `logContext`는 변경 불가능한 복사본이며 전역 핸들러가 허용한 키만 출력한다. 외부 클라이언트에서 먼저 ERROR를 기록하고 재던지지 않는다.

비동기 S3 작업은 요청 스레드의 MDC를 작업 실행 시점까지 전달하고, 실행 종료 후 이전 MDC를 복원한다. S3 객체별 태깅 실패는 `event=s3_object_tagging_failed`와 안전한 대상 정보, 원인 예외를 `ERROR`로 한 번 기록하고 후속 객체 처리는 계속한다. `@Async` 메서드에서 처리되지 않은 예외는 `event=async_uncaught_exception`으로 기록한다.

## 외부 연동 실패 문맥

다음 값은 `http_request_exception`의 공통 HTTP 필드에 추가된다. `externalStatus`는 외부 서버의 응답 상태이며 우리 API의 `httpStatus`와 다르다.

| 대상 | provider / operation | 문맥 |
| --- | --- | --- |
| GitHub 토큰 교환 | `GITHUB` / `exchange_access_token` | `failureType`, `durationMs`, 취득한 경우 `externalStatus` |
| GitHub 사용자 조회 | `GITHUB` / `fetch_user` | `failureType`, `durationMs`, 취득한 경우 `externalStatus` |
| 업로드 URL 발급 | `S3` / `presign_put_object` | `failureType`, `durationMs`, `key`, `uploadType`, `contentType`, `size`, `expirationMinutes`, 설정된 경우 `bucket` |

GitHub의 `failureType`은 다음과 같다.

- `HTTP_ERROR`: `RestClientResponseException`. 실제 외부 오류 상태를 기록한다.
- `IO_ERROR`: 연결, 읽기 등 `ResourceAccessException`. 응답 상태를 추정하지 않는다.
- `CLIENT_ERROR`: 나머지 `RestClientException`. 역직렬화 실패 등을 포함하며 상태를 취득하지 못하면 생략한다.
- `INVALID_RESPONSE`: 정상 HTTP 응답이지만 본문이 없거나 필수 값이 유효하지 않은 경우. 취득한 실제 상태를 기록한다.

Presign 실패는 `SdkException`의 `SDK_ERROR`와 요청 구성/서명 과정의 `IllegalArgumentException`에 대한 `INVALID_CONFIGURATION`으로 구분한다. 기존 공개 `INTERNAL_SERVER_ERROR`와 HTTP 500을 유지한다. 파일 형식/크기 검증 실패는 기존 업로드 오류이며 외부 장애로 분류하지 않는다. `s3_presigned_url_creation_failed`라는 별도 이벤트 및 발급 성공 로그는 만들지 않는다.

Presigned URL 발급과 브라우저의 실제 S3 PUT은 다른 동작이다. 발급 결과로 사진 업로드 성공이나 S3 서비스 가용성을 판정하지 않는다. OAuth 역시 개별 외부 호출의 성공 로그를 추가하지 않고, 기존 `oauth_login_completed`로 백엔드의 인증/토큰 발급/응답 구성 완료를 기록한다. 브라우저 리다이렉트 완료를 뜻하지 않는다.

## S3 결과와 숫자 필드

비동기 태깅의 `CONFIRMED`, `TEMPORARY` 모두 성공 로그를 남기지 않는다. local/dev/prod에 동일하게 적용하며 DEBUG 또는 작업 완료 INFO로 대체하지 않는다. SDK 호출이 실패로 끝난 객체만 `s3_object_tagging_failed` ERROR를 한 번 기록하고 다음 객체 처리는 계속한다. 성공 여부나 복구 상태는 로그 부재로 판정하지 않고 현재 DB 참조와 실제 S3 태그를 확인한다.

`durationMs`는 `System.nanoTime()` 차이를 밀리초로 환산한 숫자다. 외부 작업의 응답/실패까지 측정하며 SDK 내부 재시도가 있다면 그 시간도 포함한다. 재시도 횟수를 추정하지 않는다. `size`, `expirationMinutes`, 상태 코드 역시 JSON 숫자로 출력한다.

태깅 실패의 `S3Exception`에서 확인한 양수 상태 코드와 실제 AWS 오류 코드/요청 ID만 추가하며, null/빈 문자열/`UNKNOWN`을 진단 값으로 남기지 않는다. 알 수 없는 외부 상태를 0, 200, 500 등으로 채우지 않는다.

## 민감정보 제외 규칙

로그에는 토큰, 인증 코드, OAuth state, 쿠키, 비밀번호, secret, API key, private key 원문을 남기지 않는다. dev/prod JSON 로그의 `SanitizingStackTracePrinter`는 원인/suppressed 예외와 stack frame을 유지하며 알려진 민감값 패턴을 `<redacted>`로 치환한다. `RestClientException`과 그 아래 원인/suppressed 예외는 파싱 오류를 포함해 메시지 전체를 제외하고 예외 클래스만 출력한다. `RestClientResponseException`은 취득한 HTTP 상태도 유지한다. 외부 오류의 상세 메시지 대신 작업 문맥, 예외 종류와 stack frame으로 진단한다.

마스킹은 키-값, JSON 문자열, 인증 헤더, 서명 URL 등 정의된 패턴에 대한 방어다. 임의 문자열의 모든 비밀을 식별하는 기능은 아니므로 호출부에서부터 본문과 인증 정보를 로그 인자로 넘기지 않는다. local의 일반 콘솔은 구조화 stack printer를 사용하지 않으므로 실제 자격 증명/개인정보가 담긴 응답으로 로그를 재현하지 않는다.

다음 값은 로그 메시지와 예외 메시지에 포함하지 않는다.

| 분류 | 예시 |
| --- | --- |
| 인증 헤더 | `Authorization`, `Bearer ...` |
| 토큰 | `access_token`, `refresh_token`, `id_token`, `token` |
| OAuth 입력값 | `code`, `state` |
| 쿠키 | `Cookie`, `Set-Cookie` |
| 자격 증명 | `password`, `secret`, `client_secret`, `api_key`, `private_key` |
| AWS 자격 증명과 서명 URL | `aws_access_key_id`, `aws_secret_access_key`, `aws_session_token`, `X-Amz-Credential`, `X-Amz-Signature`, `X-Amz-Security-Token` 및 presigned URL 전체 |
| 외부 응답 본문 | GitHub, Redis, AWS 등 외부 시스템의 원문 응답 |

운영 로그 이벤트를 추가할 때는 필요한 식별자와 상태만 남기고, 요청 본문 전체, 외부 응답 본문, 토큰, 쿠키, redirect URL, 내부 stack/context를 공개 응답에 노출하지 않는다.

CloudWatch Logs 수집과 조회 방법은 [CloudWatch Logs 운영 가이드](cloudwatch-logs.md)를 따른다.
