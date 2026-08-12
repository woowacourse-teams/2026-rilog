# Error Code Removal Design

## Goal

공통 예외 계약에서 별도의 문자열 오류 코드를 제거하고 HTTP 상태와 사용자 메시지만 반환한다.

## Scope

- `ErrorInformation#getErrorCode()`를 제거한다.
- `GlobalExceptionInformation`, `AuthErrorInformation`의 오류 코드 생성자 인자와 필드를 제거한다.
- `ErrorDetail`의 `errorCode` JSON 필드와 관련 factory 인자를 제거한다.
- 오류 로그는 문자열 오류 코드 대신 enum 이름을 내부 식별자로 사용한다.
- 테스트에서 `errorCode` 응답과 getter 검증을 제거하고 상태·메시지 계약을 검증한다.
- `User`와 `OnboardingStatus` 패키지 이동으로 남은 오래된 import를 현재 패키지로 갱신한다.

## Non-goals

- HTTP 상태와 오류 메시지는 변경하지 않는다.
- 인증 흐름과 권한 정책은 변경하지 않는다.
- 새로운 오류 식별자 체계를 만들지 않는다.

## Verification

- `errorCode`, `getErrorCode()` 잔존 사용처가 없어야 한다.
- 전체 backend 테스트가 통과해야 한다.
