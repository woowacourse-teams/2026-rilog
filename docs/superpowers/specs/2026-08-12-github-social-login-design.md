# GitHub 소셜 로그인 설계

## 1. 문서 상태

- 상태: 승인됨
- 작성일: 2026-08-12
- 대상: Rilog backend 인증·인가 기반
- 인터뷰 결과: `.omx/specs/deep-interview-github-social-login.md`
- 관련 ADR: `docs/adr/0001-custom-github-authentication.md`

## 2. 배경

Rilog는 GitHub 계정으로 사용자를 인증하고 자체 Access/Refresh token을 발급해야 한다. Spring Security의 Filter 중심 실행 경로는 현재 필요한 기능보다 범위가 넓고, 인증 과정에서 발생한 예외를 기존 Spring MVC 예외 처리 흐름으로 추적하기 어렵다는 문제가 있다.

따라서 Spring Security와 OAuth client 라이브러리를 사용하지 않고 GitHub OAuth web application flow에 필요한 HTTP 통신과 Rilog 인증·인가 기능만 구현한다. 단, JWT와 암호학 규격 자체는 직접 구현하지 않고 검증된 최소 JWT 라이브러리를 사용한다.

## 3. 목표

- Backend가 GitHub 로그인 시작, callback, authorization code 교환과 사용자 조회를 담당한다.
- GitHub 인증 결과로 Rilog 사용자를 생성하거나 GitHub 소유 프로필 필드만 동기화한다.
- Rilog Access token은 JWT로 발급해 `Authorization` 헤더로 전달한다.
- Rilog Refresh token은 opaque token으로 발급해 secure `HttpOnly` cookie로 전달한다.
- Refresh Token Rotation, 재사용 탐지, 로그아웃과 다중 기기 세션을 지원한다.
- 클래스·메서드 인증 및 전역 역할 인가를 커스텀 어노테이션으로 표현한다.
- 로그인 사용자 ID와 slug를 Controller 파라미터에 주입한다.
- 인증 실패를 Spring MVC와 기존 `GlobalExceptionHandler` 경계에서 처리한다.
- 아직 구현 중인 Post, Blog와 팀 멤버십 도메인에 의존하지 않는다.

## 4. 비목표

- Spring Security와 Spring Security FilterChain
- OAuth client 라이브러리
- GitHub 이외의 소셜 로그인
- 이메일·비밀번호 로그인
- GitHub repository 또는 private organization scope
- GitHub App 설치와 repository 자동화
- 팀 블로그 `MEMBER`·`OWNER`·`ADMIN` 인가
- Post 작성자·소유권 인가
- 계정 연결·해제, 회원 탈퇴와 GitHub deauthorization 처리
- 관리자 역할 변경 API와 관리자 UI
- 로그인 기기 목록 및 원격 세션 종료
- Access token blacklist와 즉시 강제 폐기
- 온보딩 완료 여부에 따른 전역 API 접근 통제
- 프론트 로그인 화면
- Redis

## 5. 핵심 설계 원칙

### 5.1 상태를 가진 객체가 규칙을 소유한다

Controller와 application service는 흐름과 트랜잭션을 조정한다. `User`, `OAuthLoginAttempt`, `LoginExchangeCode`, `RefreshSession`은 자신의 불변식과 상태 전이를 직접 책임진다.

Application service가 entity의 getter를 조합해 만료·폐기·rotation 여부를 판단하거나 여러 setter로 상태를 조립하지 않는다.

### 5.2 외부 기술은 port로 격리한다

GitHub HTTP, JWT codec, 데이터베이스, 시간과 난수 생성은 교체 가능한 외부 경계다. 인터페이스는 이 경계에만 두고 모든 내부 클래스에 형식적인 인터페이스를 만들지 않는다.

### 5.3 인증과 인가를 분리한다

- 인증: Access token을 검증해 `AuthPrincipal`을 만든다.
- 전역 인가: `USER`와 `ADMIN`을 검사한다.
- 리소스 인가: 팀 블로그 역할과 Post 소유권을 실제 도메인이 완성된 뒤 DB 상태로 검사한다.

변경 가능한 리소스 역할은 JWT에 넣지 않는다.

### 5.4 보안 결정을 숨은 기본값으로 두지 않는다

Token lifetime, cookie 속성, issuer, audience, frontend origin, callback URL과 secret은 명시적인 설정으로 관리한다. 운영 환경에서 누락된 secret을 개발 기본값으로 대체하지 않는다.

## 6. 패키지와 컴포넌트

세부 package명은 구현 시 기존 backend 구조와 맞출 수 있지만 책임 경계는 유지한다.

```text
auth/
├─ domain/
│  ├─ OAuthLoginAttempt
│  ├─ LoginExchangeCode
│  ├─ RefreshSession
│  ├─ RefreshTokenRecord
│  ├─ RotationResult
│  ├─ GlobalRole
│  ├─ AuthPrincipal
│  └─ AuthRequirement
├─ application/
│  ├─ StartGithubLogin
│  ├─ CompleteGithubLogin
│  ├─ ExchangeLoginCode
│  ├─ RefreshLoginSession
│  └─ Logout
├─ infrastructure/
│  ├─ GithubHttpClient
│  ├─ JwtAccessTokenCodec
│  ├─ SecureRandomTokenGenerator
│  └─ JPA adapters
└─ presentation/
   ├─ AuthController
   ├─ AuthInterceptor
   ├─ AuthRequirementResolver
   └─ LoginUserArgumentResolvers
```

기존 `User`는 사용자 도메인에 유지한다. 인증 application service가 `User.registerFromGithub()`와 `user.synchronizeGithubProfile()`을 호출한다.

### 6.1 외부 port

| Port | 책임 | Adapter |
| --- | --- | --- |
| `GithubOAuthGateway` | GitHub authorization URL, code 교환과 사용자 조회 | `GithubHttpClient` |
| `AccessTokenCodec` | Rilog JWT 생성과 검증 | JWT library adapter |
| `SecureTokenGenerator` | state, code와 Refresh secret 생성 | `SecureRandom` adapter |
| `Clock` | 보안 시간 기준 | system/test clock |
| Repository ports | auth entity 조회·저장·행 잠금 | Spring Data JPA adapters |

## 7. 객체 모델

### 7.1 `User`

추가 상태:

```text
globalRole: USER | ADMIN
```

행동:

```java
User.registerFromGithub(GithubIdentity identity)
user.synchronizeGithubProfile(GithubIdentity identity)
user.completeOnboarding(OnboardingProfile profile)
user.hasRole(GlobalRole required)
```

불변식:

- `githubId`는 필수이고 변경하지 않는다.
- 신규 사용자는 항상 `USER/PENDING`이다.
- GitHub 동기화는 `profileImageUrl`, `githubUrl`, 공개 `email`만 변경한다.
- GitHub 재로그인은 `nickname`, `slug`, `introduction`, `onboardingStatus`, `globalRole`을 변경하지 않는다.
- 애플리케이션 생성 경로는 의미 있는 factory를 사용한다. JPA 기본 생성자는 `protected`로 유지한다.

전역 역할은 사용자 subtype이 아니라 변경 가능한 상태다. `AdminUser extends User` 구조를 사용하지 않는다.

```java
public enum GlobalRole {
    USER,
    ADMIN;

    public boolean permits(GlobalRole required) {
        // 명시적인 권한 계층
    }
}
```

`ADMIN`은 `USER`와 `ADMIN` 요구사항을 허용하고 `USER`는 `ADMIN` 요구사항을 허용하지 않는다. 역할 계층은 enum ordinal에 의존하지 않는다.

### 7.2 `GithubIdentity`

GitHub 응답을 Rilog 도메인으로 전달하는 불변 값 객체다.

```text
GithubIdentity
- githubId
- profileImageUrl
- githubUrl
- publicEmail
```

GitHub access token이나 GitHub 전용 응답 DTO를 포함하지 않는다.

### 7.3 `OAuthLoginAttempt`

```text
- id
- stateHash (unique)
- browserBindingHash
- pkceVerifier
- expiresAt
- consumedAt
```

`consume(presentedBrowserBindingHash, now)`가 시작 브라우저, 만료와 중복 사용을 검사한다. 기본 만료는 10분이다. `state` 원문은 저장하지 않으며 PKCE verifier는 callback에 필요하므로 만료 전까지 서버에 저장한다.

로그인 시작 응답은 별도의 10분짜리 `HttpOnly`, `Secure`, `SameSite=Lax`, API host-only OAuth binding cookie를 설정한다. Callback은 GitHub가 반환한 state뿐 아니라 이 cookie의 secret hash가 attempt의 `browserBindingHash`와 일치하는지 검사한다. 서버 DB에 유효한 state가 존재한다는 사실만 확인하지 않고 로그인 시도를 시작한 브라우저까지 묶어 login CSRF를 방지한다. Callback 완료 시 binding cookie를 만료한다.

### 7.4 `LoginExchangeCode`

```text
- id
- userId
- secretHash
- expiresAt
- consumedAt
```

`consume(presentedHash, now)`가 secret, 만료와 중복 사용을 검사한다. 기본 만료는 90초다.

### 7.5 `RefreshSession`

브라우저·기기 로그인 한 건과 하나의 Refresh token family를 표현한다.

```text
- id
- userId
- currentTokenId
- absoluteExpiresAt
- revokedAt
- reuseDetectedAt
- createdAt
- updatedAt
```

회전된 모든 token의 재사용을 탐지하기 위해 token hash를 두 개만 보관하지 않고 session 수명 동안 token 이력을 유지한다.

```text
RefreshTokenRecord
- id
- sessionId
- secretHash
- issuedAt
- usedAt
- concurrencyGraceUntil
- replacedByTokenId
```

행동:

```java
RefreshSession.start(userId, initialTokenId, absoluteExpiresAt)
session.rotate(presentedTokenRecord, nextTokenId, now)
session.revoke(now)
session.detectReuse(now)
```

`rotate()` 결과:

```text
RotationResult
├─ Rotated
├─ ConcurrentRequest
├─ ReuseDetected
├─ Expired
└─ Revoked
```

불변식:

- 절대 만료는 로그인 시각부터 30일이며 rotation으로 연장하지 않는다.
- `currentTokenId`와 일치하는 사용 전 token만 rotation할 수 있다.
- rotation 시 기존 token record를 사용 완료 처리하고 replacement record를 생성한다.
- 사용 완료된 직전 token record는 기본 4초 동안 동시 요청 판별에만 사용한다.
- 유예시간 이후 사용 완료 token을 다시 사용하면 세대와 관계없이 reuse로 판정하고 해당 세션을 폐기한다.
- 존재하는 token ID에 잘못된 secret을 제시한 요청은 401로 거부하지만, 임의 요청으로 세션을 폐기하는 DoS를 막기 위해 reuse로 판정하지 않는다.
- 폐기·만료·reuse 세션은 다시 활성화하지 않는다.

## 8. Token과 code 형식

Login exchange code와 Refresh token은 다음 opaque 형식을 사용한다.

```text
<public-id>.<256-bit-random-secret>
```

- public ID로 인덱스 조회한다.
- secret은 실제 credential이다.
- DB에는 secret의 SHA-256 또는 동등한 one-way hash만 저장한다.
- hash 비교는 constant-time 비교를 사용한다.
- 원문 secret은 생성 응답을 만드는 동안에만 존재한다.

Refresh 동시 요청에서 첫 rotation 응답만 새 cookie를 보낸다. 유예시간 안에 들어온 두 번째 요청은 사용된 token record의 `replacedByTokenId`가 현재 token인지 확인한 뒤 Access token만 반환하고 cookie를 덮어쓰지 않는다.

첫 rotation이 DB에는 반영됐지만 HTTP 응답이 유실된 경우, hash-only 저장 원칙상 새 Refresh secret을 복구할 수 없다. 초기 구현에서는 원문을 단기간 암호화해 저장하는 복잡성을 추가하지 않고 재로그인이 필요할 수 있음을 수용한다.

## 9. API 계약

| Method | Path | 책임 | 성공 응답 |
| --- | --- | --- | --- |
| GET | `/api/auth/github/login` | 로그인 attempt 생성 및 GitHub 이동 | 302 |
| GET | `/api/auth/github/callback` | state/code 검증, 사용자 동기화, one-time code 생성 | frontend로 302 |
| POST | `/api/auth/token/exchange` | one-time code 소비 및 최초 Rilog token 발급 | 200 |
| POST | `/api/auth/token/refresh` | RTR 및 새 Access token 발급 | 204 |
| POST | `/api/auth/logout` | Refresh session 폐기 및 cookie 만료 | 204 |

### 9.1 로그인 시작

```http
GET /api/auth/github/login
```

Backend는 state와 PKCE S256 challenge를 포함한 GitHub authorization URL로 redirect한다. 동시에 로그인 시작 브라우저를 묶는 단기 OAuth binding cookie를 설정한다. Repository scope는 요청하지 않는다.

### 9.2 callback

```http
GET /api/auth/github/callback?code=...&state=...
```

Callback은 state, OAuth binding cookie, 만료와 중복 사용을 모두 검증한다. 성공 시:

```http
302 Location: https://rilog.com/auth/callback?code=<one-time-code>
```

GitHub access token은 callback use case의 지역 값으로만 사용하며 DB, 로그와 브라우저에 전달하지 않는다.
Frontend callback 화면은 code를 즉시 교환한 뒤 browser history의 URL에서 query string을 제거한다. 이 code는 90초 single-use이므로 외부 resource를 불러오기 전에 교환·제거해 referrer와 client log 노출 시간을 최소화한다.

### 9.3 one-time code 교환

```http
POST /api/auth/token/exchange
Origin: https://rilog.com
Content-Type: application/json

{
  "code": "<one-time-code>"
}
```

```http
HTTP/1.1 200 OK
Authorization: Bearer <access-token>
Set-Cookie: __Secure-rilog-refresh=<token-id>.<secret>;
            HttpOnly;
            Secure;
            SameSite=Lax;
            Path=/api/auth;
            Max-Age=2592000
Access-Control-Expose-Headers: Authorization
Content-Type: application/json

{
  "onboardingStatus": "PENDING"
}
```

Token을 JSON body에 중복해 넣지 않는다.

### 9.4 refresh

```http
POST /api/auth/token/refresh
Origin: https://rilog.com
Cookie: __Secure-rilog-refresh=<token-id>.<secret>
```

정상 rotation은 `Authorization`과 새 `Set-Cookie`를 반환한다. Refresh cookie의 `Max-Age`는 30일로 다시 설정하지 않고 최초 session 절대 만료까지 남은 초를 사용한다. 유예 내 동시 요청은 새 `Authorization`만 반환한다.

### 9.5 logout

```http
POST /api/auth/logout
Origin: https://rilog.com
Cookie: __Secure-rilog-refresh=...
```

서버 세션을 폐기하고 동일한 이름·Path로 cookie를 만료한다. 프론트는 메모리의 Access token을 즉시 제거한다.

## 10. Access token

- 형식: JWT
- 기본 유효기간: 15분
- 전송: `Authorization: Bearer`
- 프론트 저장: JavaScript memory
- 서버 저장과 개별 blacklist: 없음

필수 claim:

```text
iss  Rilog issuer
aud  Rilog API audience
sub  userId
role USER | ADMIN
iat  issued at
exp  expires at
jti  unique JWT id
```

JWT 검증:

- 검증된 최소 JWT 라이브러리를 사용한다.
- 단일 Rilog backend 구조에서는 HS256을 사용한다.
- 서명 secret은 최소 256-bit 난수이며 운영 secret storage에서 주입한다.
- 허용 알고리즘을 서버 설정으로 고정하고 token의 `alg`에 따라 검증 전략을 선택하지 않는다.
- 서명, issuer, audience, subject, role, issued-at, expiry와 JWT ID를 검증한다.
- `USER`, `ADMIN` 외 역할은 거부한다.
- 시간은 주입된 `Clock`을 사용한다.

Refresh와 최초 exchange는 DB의 현재 역할로 Access token을 발급한다. 역할 변경 직전 Access token은 최대 남은 15분 동안 이전 역할을 유지할 수 있다.

## 11. MVC 인증·인가 통합

Servlet authentication Filter와 Spring Security FilterChain을 사용하지 않는다.

```text
HTTP request
→ DispatcherServlet
→ AuthInterceptor
   ├─ AuthRequirement 해석
   ├─ Access token 검증
   ├─ 전역 역할 인가
   └─ AuthPrincipal request 저장
→ Argument Resolver
→ Controller
```

### 11.1 인증 요구사항 해석

`AuthRequirementResolver`는 다음 정보를 하나의 값 객체로 만든다.

```text
AuthRequirement
- authenticationRequired
- requiredGlobalRole
```

인증이 필요한 조건:

- 클래스에 `@LoginRequired`
- 메서드에 `@LoginRequired`
- 클래스·메서드에 `@RequireRole`
- 파라미터에 `@LoginUserId` 또는 `@LoginUserSlug`

규칙:

- `@RequireRole`은 로그인 필수를 포함한다.
- 메서드 요구사항은 클래스 요구사항을 강화할 수 있다.
- 클래스 인가를 메서드에서 약화하는 기능은 제공하지 않는다.
- 공개 API는 별도 Controller로 분리한다.

### 11.2 인증 주체

```java
public record AuthPrincipal(
        Long userId,
        GlobalRole role
) {}
```

`AuthInterceptor`가 JWT를 한 번 검증해 principal을 request에 저장한다. Argument Resolver는 JWT를 다시 검증하지 않는다.

- `@LoginUserId`: principal의 userId 반환
- `@LoginUserSlug`: userId로 현재 User를 조회해 slug 반환

온보딩 전 사용자에게 slug가 없으면 `409 USER_SLUG_NOT_ASSIGNED`를 반환한다. 이는 전역 온보딩 접근 통제가 아니라 해당 파라미터의 선행조건이다.

기존 `X-Test-User-Id`, `X-Test-User-Slug` fallback은 제거한다. 기존 slug resolver가 `@LoginUserId`를 검사하는 오류도 수정한다.

## 12. 트랜잭션과 동시성

### 12.1 GitHub callback

외부 HTTP 중에는 DB 트랜잭션이나 connection을 유지하지 않는다.

```text
transaction 1
└─ OAuthLoginAttempt consume

GitHub HTTP
├─ code exchange
└─ /user fetch

transaction 2
├─ User create/synchronize
└─ LoginExchangeCode create
```

GitHub HTTP가 실패하면 해당 attempt는 재사용하지 않고 로그인 흐름을 다시 시작한다.

### 12.2 code 교환

```text
LoginExchangeCode SELECT FOR UPDATE
→ consume
→ RefreshSession create
→ commit
```

### 12.3 refresh

```text
token ID로 RefreshTokenRecord와 session ID 확인
→ RefreshSession SELECT FOR UPDATE
→ RefreshTokenRecord 재조회·검증
→ session.rotate()
→ replacement RefreshTokenRecord 생성
→ User current globalRole 조회
→ commit
→ response
```

PostgreSQL 행 잠금으로 여러 backend instance에서도 동일 세션 rotation을 직렬화한다.

### 12.4 logout

```text
RefreshSession SELECT FOR UPDATE
→ session.revoke()
→ commit
→ cookie expire
```

## 13. Cookie, CORS와 CSRF

운영 frontend와 API는 같은 site의 서로 다른 HTTPS subdomain이다.

Refresh cookie:

- 이름: `__Secure-rilog-refresh`
- `HttpOnly`
- `Secure`
- 명시적 `SameSite=Lax`
- `Path=/api/auth`
- `Domain` 미설정으로 API host-only
- 최초 발급 시 `Max-Age=30일`, rotation 시 최초 session 절대 만료까지 남은 시간

OAuth browser binding cookie:

- 이름: `__Secure-rilog-oauth-binding`
- `HttpOnly`, `Secure`, `SameSite=Lax`
- `Path=/api/auth/github`
- `Domain` 미설정으로 API host-only
- `Max-Age=10분`
- Callback 성공·실패 시 동일 속성으로 즉시 만료

Credentialed CORS:

- 설정된 frontend origin만 정확히 허용
- wildcard origin 금지
- `Access-Control-Allow-Credentials: true`
- `Authorization`, `Content-Type` 요청 헤더 허용
- `Authorization` 응답 헤더 expose

`exchange`, `refresh`, `logout`은 브라우저의 `Origin`을 exact allowlist와 비교한다. 운영에서는 누락되거나 허용되지 않은 Origin을 거부한다. 같은 site의 공격자 subdomain을 고려해 `SameSite`만 CSRF 방어로 신뢰하지 않는다.

로컬 개발의 HTTP cookie 설정은 별도 profile에서만 완화하며 운영 기본값을 바꾸지 않는다.

## 14. 오류와 관측성

### 14.1 상태 코드

| 오류 | 상태 |
| --- | ---: |
| Access token 누락·형식 오류·만료·검증 실패 | 401 |
| 인증됐지만 전역 역할 부족 | 403 |
| Refresh token 누락·불일치·만료·reuse | 401 |
| Login exchange code 오류 | 401 |
| `@LoginUserSlug` 요구 시 slug 없음 | 409 |

예상 가능한 인증 오류는 `AuthErrorInformation`과 하나의 `AuthException`으로 표현하고 기존 `RilogBusinessException`·`GlobalExceptionHandler` 흐름을 사용한다.

```text
AuthInterceptor
→ AuthException
→ DispatcherServlet
→ HandlerExceptionResolver
→ GlobalExceptionHandler
→ ErrorDetail
```

### 14.2 callback 오류

Callback은 브라우저 navigation이므로 인증 실패 시 configured frontend error URL로 redirect한다.

```http
302 Location: https://rilog.com/auth/callback?error=OAUTH_FAILED&traceId=...
```

외부에는 일반 오류만 제공하고 server log에서 state mismatch, expiry, user denial, GitHub token/user API 오류를 구분한다. Callback 전용 advice 응답을 사용하되 예외 기록은 중앙화한다.

### 14.3 민감정보 로깅 금지

다음 값은 로그와 API 오류 body에 기록하지 않는다.

- Rilog Access token과 Refresh secret
- GitHub access token
- GitHub authorization code
- Login exchange code secret
- OAuth state
- PKCE verifier
- Cookie header
- GitHub 원본 오류 body
- JWT 전체 문자열

로그에는 내부 enum 상수명, trace ID, endpoint, GitHub HTTP status, 식별 이후 Rilog userId와 session public ID, rotation/revoke/reuse 이벤트를 기록할 수 있다.

## 15. 데이터베이스 계약

필수 제약과 인덱스:

```text
users
- UNIQUE(github_id)
- global_role NOT NULL

oauth_login_attempt
- UNIQUE(state_hash)
- INDEX(expires_at)

login_exchange_code
- PRIMARY KEY(id)
- INDEX(expires_at)

refresh_session
- PRIMARY KEY(id)
- INDEX(user_id)
- INDEX(absolute_expires_at)
- INDEX(revoked_at)

refresh_token_record
- PRIMARY KEY(id)
- INDEX(session_id)
- INDEX(used_at)
```

만료·소비된 OAuth attempt와 exchange code는 주기적으로 삭제한다. Refresh token record는 session 절대 만료 전까지 유지해 모든 세대의 reuse를 식별한다. 만료·폐기된 RefreshSession과 token record는 보안 감사 보존기간 이후 삭제한다. Migration 도구와 배포 절차는 backend 팀의 공통 DB 정책에 맞추며, schema 제약 자체는 이 설계의 필수 계약이다.

## 16. 테스트 전략

### 16.1 도메인 단위 테스트

- 최초 GitHub 사용자 `USER/PENDING`
- 재로그인 시 Rilog 프로필·역할·온보딩 상태 보존
- 전역 역할 계층
- OAuth attempt 만료·중복 소비
- OAuth state와 시작 브라우저 binding 불일치
- Login exchange code secret·만료·중복 소비
- RefreshSession의 rotation, concurrent request, reuse, expiry와 revoke
- 모든 rotation에서 절대 만료 유지
- 고정 `Clock`을 사용한 경계값

### 16.2 JWT 계약 테스트

- 정상 claim 생성·검증
- 변조된 서명
- 잘못된 알고리즘
- 만료와 비정상 issued-at
- 잘못된 issuer·audience
- 필수 claim 누락
- 허용되지 않은 role

JWT 라이브러리 자체가 아니라 Rilog token 계약을 검증한다.

### 16.3 GitHub HTTP 계약 테스트

- authorization URL의 state, PKCE S256, callback과 최소 scope
- token 교환 요청
- `/user` Bearer 요청
- 공개 email 부재
- GitHub 4xx·5xx, timeout과 잘못된 JSON
- 원본 GitHub 오류 비노출

### 16.4 PostgreSQL 통합·동시성 테스트

행 잠금과 transaction 의미가 핵심이므로 H2로 대체하지 않는다. Testcontainers PostgreSQL을 테스트 전용 의존성으로 사용한다.

- 동일 Refresh token의 동시 요청에서 하나만 rotation
- 다른 요청은 grace 내 `ConcurrentRequest`
- grace 이후 previous token reuse가 세션 폐기
- 두 세대 이상 지난 token reuse도 세션 폐기
- 잘못된 secret은 세션을 임의 폐기하지 않음
- Exchange code와 OAuth state 동시 소비에서 하나만 성공
- 동일 githubId 중복 생성 방지
- Logout과 refresh 경쟁의 최종 상태가 revoked
- Rotation이 절대 만료를 연장하지 않음

### 16.5 MVC 계약 테스트

- 공개 API
- 클래스·메서드 `@LoginRequired`
- 클래스·메서드 `@RequireRole`
- USER의 ADMIN 접근 403
- 누락·만료·변조 token 401와 `ErrorDetail`
- `@LoginUserId`, `@LoginUserSlug` 주입
- slug 없는 사용자의 409
- Header/cookie/CORS 속성
- 허용·비허용 Origin
- Logout cookie 만료

### 16.6 OAuth 수직 흐름 테스트

Fake GitHub HTTP endpoint를 사용한다.

```text
login redirect
→ callback
→ User create/synchronize
→ one-time exchange
→ Access/Refresh issuance
→ protected request
→ refresh rotation
→ logout
```

## 17. 운영 설정

운영에서 반드시 외부 설정으로 제공한다.

- GitHub client ID와 client secret
- Backend callback URL
- Frontend callback URL
- JWT issuer와 audience
- 최소 256-bit JWT signing secret
- frontend allowed origin
- Access lifetime 15분
- Refresh absolute lifetime 30일
- Login exchange lifetime 90초
- Refresh concurrency grace 4초
- Refresh 및 OAuth binding cookie의 secure/same-site/path 설정

Secret과 실제 credential은 repository 또는 test fixture에 저장하지 않는다.

## 18. 완료 조건

- Spring Security와 OAuth client library가 없다.
- GitHub token이 DB, 로그와 브라우저에 남지 않는다.
- Access token은 Authorization header로만 전달한다.
- Refresh token은 secure HttpOnly cookie로만 전달한다.
- RTR, grace와 reuse detection이 실제 PostgreSQL 동시성 테스트를 통과한다.
- 401과 403 계약을 구분한다.
- 클래스·메서드 인증·인가와 로그인 사용자 파라미터 주입이 동작한다.
- 기존 `GlobalExceptionHandler` 오류 계약을 유지한다.
- 기존 backend 테스트와 신규 인증 테스트가 모두 통과한다.
- 인증·권한·token·cookie 결정이 ADR과 실제 설정에 일치한다.

## 19. 알려진 위험과 후속 확장

- Access token은 로그아웃이나 역할 하향 후에도 최대 15분 유효할 수 있다.
- 첫 RTR 응답 유실 시 원문 Refresh secret을 복구하지 않으므로 재로그인이 필요할 수 있다.
- JavaScript memory의 Access token은 XSS에서 완전히 보호되지 않는다. Frontend CSP와 XSS 방어는 별도 frontend 보안 작업이다.
- 팀 Blog 역할과 Post 소유권은 JWT role이 아니라 향후 리소스 DB 상태로 검사한다.
- Redis는 OAuth state/code 규모나 분산 coordination 비용이 PostgreSQL 정리 비용을 초과할 때만 검토한다.
- GitHub deauthorization와 Rilog 계정 연결 해제는 별도 요구사항으로 설계한다.
