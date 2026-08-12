# ADR-0001: Spring Security 없이 GitHub 인증 구현

## 상태

승인됨 — 2026-08-12

## 맥락

Rilog는 GitHub 소셜 로그인, 자체 token 발급, 전역 역할 인가와 로그인 사용자 주입이 필요하다. 현재 필요한 기능은 제한적이지만 Spring Security를 도입하면 FilterChain 중심의 넓은 추상화와 실행 경로를 함께 수용해야 한다. 팀은 인증 과정의 예외를 기존 Spring MVC `DispatcherServlet`·`HandlerExceptionResolver`·`GlobalExceptionHandler` 흐름에서 추적하고 싶다.

Frontend는 Access token을 `Authorization: Bearer`로 보내고 401에서 한 번 Refresh 후 재시도하는 구조를 이미 갖고 있다. 운영 frontend와 API는 같은 site의 서로 다른 HTTPS subdomain으로 배포할 예정이다.

## 결정

### GitHub 인증

- GitHub OAuth App의 authorization-code web flow를 backend가 직접 처리한다.
- Spring Security와 OAuth client library를 사용하지 않는다.
- 일반 HTTP client로 authorization URL, code 교환과 `/user` 호출을 구현한다.
- OAuth state와 PKCE S256을 사용한다.
- 단기 API host-only secure OAuth binding cookie로 state를 로그인 시작 브라우저에 묶고 callback 이후 즉시 만료한다.
- GitHub access token은 사용자 조회 직후 폐기하고 저장·전달·로깅하지 않는다.
- Callback 성공 후 frontend에는 Rilog token이 아니라 단기 single-use exchange code를 전달한다.

### Rilog token

- Access token은 15분 JWT이며 `Authorization` header로 전달한다.
- Access token에는 userId와 전역 `USER`·`ADMIN` 역할을 포함한다.
- Refresh token은 30일 절대 만료의 opaque token이며 API host-only secure `HttpOnly` cookie로 전달한다.
- Refresh Token Rotation과 reuse detection을 적용한다.
- Rotation은 PostgreSQL row lock으로 직렬화하고 모든 회전 token hash 이력을 session 절대 만료까지 유지해 오래된 세대의 재사용도 탐지한다.
- 정상 멀티탭 경쟁을 위해 사용 완료 token에 4초 concurrency grace를 둔다.
- Rotation으로 30일 절대 만료를 연장하지 않는다.
- Redis는 첫 구현에 도입하지 않는다.

### MVC 인증·인가

- Servlet authentication Filter를 사용하지 않는다.
- Spring MVC `HandlerInterceptor`가 클래스·메서드 인증/인가 어노테이션을 해석하고 JWT를 검증한다.
- 검증된 `AuthPrincipal`을 request에 저장한다.
- `HandlerMethodArgumentResolver`는 principal에서 userId를, 필요할 때 DB에서 현재 slug를 조회해 주입한다.
- 인증 예외는 기존 MVC 예외 처리 흐름과 공통 `ErrorDetail` 계약을 사용한다.

### 역할 경계

- 첫 전역 역할은 `USER`, `ADMIN`이다.
- 신규 사용자는 `USER`이며 `ADMIN`은 운영자가 DB에서만 부여한다.
- 팀 Blog `MEMBER`·`OWNER`·`ADMIN`과 Post 소유권은 이번 결정에 포함하지 않는다.
- 리소스별 권한은 관련 도메인이 완성된 뒤 DB 상태를 기준으로 검사한다.

## 대안

### Spring Security와 OAuth2 Client

표준 기능과 보안 생태계의 장점이 있으나 현재 필요한 기능보다 범위가 넓고 Filter 중심 예외 추적이라는 팀의 문제를 해결하지 않는다.

### Argument Resolver만 사용

구현량은 적지만 클래스 단위 인증과 전역 역할 인가를 표현하기 어렵고 인증 규칙이 Controller 파라미터 형태에 종속된다.

### AOP와 Argument Resolver

어노테이션 표현은 가능하지만 argument resolution이 Controller AOP보다 먼저 실행돼 인증 책임과 검증 순서가 둘로 나뉜다.

### Redis 기반 Refresh session

TTL과 ephemeral state 처리에는 편리하지만 현재 PostgreSQL만 사용하는 초기 서비스에 새로운 운영 의존성, 장애 지점과 영속성 정책을 추가한다. 첫 구현의 RTR는 PostgreSQL transaction과 row lock으로 충족할 수 있다.

### Session cookie 또는 BFF 단일 cookie

브라우저 token 노출을 줄이는 장점이 있지만 Access token header와 Refresh cookie를 분리하기로 한 frontend/backend 계약과 다르다.

## 결과

긍정적 결과:

- 인증 흐름과 예외가 Spring MVC 경계 안에 남는다.
- 필요한 인증·인가 기능만 명시적으로 구현한다.
- Global role과 resource role의 생명주기를 분리한다.
- PostgreSQL 한 종류로 초기 운영 복잡도를 제한한다.
- GitHub 인증과 Rilog session을 분리해 다른 identity provider로 확장할 수 있다.

비용과 위험:

- Security framework가 제공하던 token 검증, CORS, CSRF, cookie와 보안 기본값을 팀이 직접 검증해야 한다.
- OAuth state, PKCE, token rotation과 동시성 테스트가 필수다.
- Access token은 로그아웃·역할 변경 후 최대 15분 동안 즉시 폐기할 수 없다.
- Hash-only RTR에서 첫 rotation 응답이 유실되면 사용자가 다시 로그인해야 할 수 있다.
- 인증·인가 요구가 크게 확장되면 Spring Security 또는 다른 표준 프레임워크 도입을 다시 평가해야 한다.

## 재검토 조건

다음 중 하나가 발생하면 이 결정을 재검토한다.

- 여러 identity provider 또는 enterprise SSO 도입
- 복잡한 permission·policy engine 요구
- Method security와 표준 보안 통합 요구 증가
- 인증 관련 취약점 또는 운영 사고
- OAuth state/code 및 Refresh session 규모가 PostgreSQL 운영 목표를 초과
- 별도 resource server나 다수의 token 검증 서비스 도입
