# Backend Logging Guide

이 문서는 백엔드 애플리케이션 로그의 공통 필드와 민감정보 제외 규칙을 정의한다.

## 요청 ID

모든 HTTP 요청은 서버가 새 UUID를 생성해 `X-Request-ID` 응답 헤더와 SLF4J MDC의 `requestId`에 저장한다. 클라이언트가 `X-Request-ID`를 보내도 재사용하지 않는다. 요청 처리가 끝나면 정상 응답과 예외 응답 모두에서 MDC의 `requestId`를 제거한다.

프론트엔드는 허용된 Origin에서 CORS exposed headers를 통해 `X-Request-ID`를 읽을 수 있다. 장애 문의나 운영 조회에서는 응답 헤더의 값을 로그의 `requestId` 필드와 매칭한다.

## JSON 로그

운영 프로필은 Spring Boot 구조화 로그 기본 기능의 `logstash` 콘솔 포맷을 사용한다. 로그는 한 줄 JSON으로 출력하며, MDC의 `requestId`는 JSON 최상위 필드로 포함된다.

공통으로 기대하는 주요 필드는 다음과 같다.

| 필드 | 설명 |
| --- | --- |
| `@timestamp` | 로그 생성 시각 |
| `message` | 로그 메시지 |
| `logger_name` | 로거 이름 |
| `thread_name` | 스레드 이름 |
| `level` | 로그 레벨 |
| `requestId` | 요청 단위 추적 ID |
| `stack_trace` | 예외와 함께 기록한 경우의 스택 |

개발 프로필인 `local`, `dev`는 애플리케이션 패키지 `kr.rilog`를 `debug` 이상으로 출력한다. 운영 프로필인 `prod`는 `kr.rilog`를 `info` 이상으로 출력하고 Hibernate SQL 및 바인딩 파라미터 상세 로그를 출력하지 않는다.

## 민감정보 제외 규칙

로그에는 토큰, 인증 코드, OAuth state, 쿠키, 비밀번호, secret, API key, private key 원문을 남기지 않는다. 예외를 함께 기록할 때는 원인 예외, suppressed 예외와 stack frame은 유지하되 예외 메시지 안의 민감값만 `<redacted>`로 치환한다.

다음 값은 로그 메시지와 예외 메시지에 포함하지 않는다.

| 분류 | 예시 |
| --- | --- |
| 인증 헤더 | `Authorization`, `Bearer ...` |
| 토큰 | `access_token`, `refresh_token`, `id_token`, `token` |
| OAuth 입력값 | `code`, `state` |
| 쿠키 | `Cookie`, `Set-Cookie` |
| 자격 증명 | `password`, `secret`, `client_secret`, `api_key`, `private_key` |
| 외부 응답 본문 | GitHub, Redis, AWS 등 외부 시스템의 원문 응답 |

운영 로그 이벤트를 추가할 때는 필요한 식별자와 상태만 남기고, 요청 본문 전체, 외부 응답 본문, 토큰, 쿠키, redirect URL, 내부 stack/context를 공개 응답에 노출하지 않는다.
