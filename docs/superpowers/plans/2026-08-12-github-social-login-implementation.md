# GitHub Social Login Implementation Plan

**Status:** Implemented and verified on 2026-08-12 (`./gradlew clean test`, 54 tests)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Spring Security와 OAuth client library 없이 GitHub OAuth 로그인, JWT Access token, PostgreSQL 기반 Refresh Token Rotation, MVC 인증·인가 어노테이션을 구현한다.

**Architecture:** 인증 도메인 객체가 만료·소비·회전·폐기 불변식을 소유하고, application use case가 트랜잭션과 외부 호출을 조정한다. GitHub HTTP, JWT, 난수·hash와 JPA는 port/adapter 경계로 격리하며 MVC `HandlerInterceptor`와 argument resolver가 Controller 인증 계약을 제공한다.

**Tech Stack:** Java 21, Spring Boot 4.1.0, Spring MVC, Spring Data JPA, PostgreSQL, Auth0 java-jwt 4.6.0, Testcontainers 2.0.5, JUnit 5, MockMvc

## Global Constraints

- Spring Security와 OAuth client library를 추가하지 않는다.
- Access token은 15분 JWT이고 응답·요청 `Authorization: Bearer` header로만 전달한다.
- Refresh token은 30일 절대 만료 opaque token이고 API host-only secure `HttpOnly` cookie로만 전달한다.
- Refresh rotation은 절대 만료를 연장하지 않으며 4초 grace와 전체 token 이력 기반 reuse detection을 제공한다.
- GitHub state와 PKCE S256을 사용하고 state를 10분 OAuth binding cookie로 시작 브라우저에 묶는다.
- Global role은 `USER`, `ADMIN`만 JWT에 포함하며 팀 Blog 역할과 resource ownership은 구현하지 않는다.
- GitHub 재로그인은 GitHub 소유 필드만 동기화하고 Rilog 프로필·역할·온보딩 상태를 보존한다.
- 외부 HTTP 도중 DB transaction과 connection을 유지하지 않는다.
- 기존 `GlobalExceptionHandler`와 `ErrorDetail` 계약을 유지한다.
- 운영 secret에는 repository 기본값을 제공하지 않는다.

---

### Task 1: User identity와 전역 역할 도메인

**Files:**
- Create: `backend/src/main/java/kr/rilog/auth/domain/GlobalRole.java`
- Create: `backend/src/main/java/kr/rilog/auth/domain/GithubIdentity.java`
- Modify: `backend/src/main/java/kr/rilog/domain/User.java`
- Modify: `backend/src/test/java/kr/rilog/domain/UserTest.java`

**Interfaces:**
- Consumes: 기존 `User`, `OnboardingStatus`
- Produces: `User.registerFromGithub(GithubIdentity)`, `User.synchronizeGithubProfile(GithubIdentity)`, `User.hasRole(GlobalRole)`, `GlobalRole.permits(GlobalRole)`

- [x] **Step 1: 신규·재로그인과 역할 계층의 실패 테스트 작성**

```java
@Test
void githubReloginPreservesRilogOwnedFields() {
    User user = User.registerFromGithub(new GithubIdentity(1L, "old.png", "old", "old@mail"));
    user.completeOnboarding("rilog", "rilog", "intro", "custom.png", "custom", "custom@mail");

    user.synchronizeGithubProfile(new GithubIdentity(1L, "new.png", "new", "new@mail"));

    assertAll(
        () -> assertEquals("rilog", user.getNickname()),
        () -> assertEquals("rilog", user.getSlug()),
        () -> assertEquals(GlobalRole.USER, user.getGlobalRole()),
        () -> assertEquals(OnboardingStatus.COMPLETED, user.getOnboardingStatus()),
        () -> assertEquals("new.png", user.getProfileImageUrl())
    );
}
```

- [x] **Step 2: 테스트가 factory·동기화·role 부재로 실패하는지 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.domain.UserTest'`

Expected: `registerFromGithub`, `synchronizeGithubProfile` 또는 `GlobalRole`을 찾지 못해 FAIL

- [x] **Step 3: 최소 도메인 구현**

```java
public enum GlobalRole {
    USER, ADMIN;
    public boolean permits(GlobalRole required) {
        return this == ADMIN || required == USER;
    }
}

public static User registerFromGithub(GithubIdentity identity) {
    return User.builder()
        .githubId(identity.githubId())
        .profileImageUrl(identity.profileImageUrl())
        .githubUrl(identity.githubUrl())
        .email(identity.publicEmail())
        .globalRole(GlobalRole.USER)
        .onboardingStatus(OnboardingStatus.PENDING)
        .build();
}
```

- [x] **Step 4: User 단위 테스트 통과 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.domain.UserTest'`

Expected: PASS

- [x] **Step 5: User 도메인 변경 커밋**

```bash
git add backend/src/main/java/kr/rilog/auth/domain/GlobalRole.java backend/src/main/java/kr/rilog/auth/domain/GithubIdentity.java backend/src/main/java/kr/rilog/domain/User.java backend/src/test/java/kr/rilog/domain/UserTest.java
git commit -m "feature: GitHub 사용자와 전역 역할 도메인 제공"
```

### Task 2: 일회성 credential과 Refresh family 도메인

**Files:**
- Create: `backend/src/main/java/kr/rilog/auth/domain/AuthDomainException.java`
- Create: `backend/src/main/java/kr/rilog/auth/domain/OAuthLoginAttempt.java`
- Create: `backend/src/main/java/kr/rilog/auth/domain/LoginExchangeCode.java`
- Create: `backend/src/main/java/kr/rilog/auth/domain/RefreshSession.java`
- Create: `backend/src/main/java/kr/rilog/auth/domain/RefreshTokenRecord.java`
- Create: `backend/src/main/java/kr/rilog/auth/domain/RotationResult.java`
- Test: `backend/src/test/java/kr/rilog/auth/domain/OAuthLoginAttemptTest.java`
- Test: `backend/src/test/java/kr/rilog/auth/domain/LoginExchangeCodeTest.java`
- Test: `backend/src/test/java/kr/rilog/auth/domain/RefreshSessionTest.java`

**Interfaces:**
- Consumes: `Instant`, `Duration`, hashed presented secrets
- Produces: `consume(bindingHash, now)`, `consume(secretHash, now)`, `rotate(record, presentedHash, nextTokenId, now, grace)`, `revoke(now)`

- [x] **Step 1: 만료·중복 소비·rotation·reuse 실패 테스트 작성**

```java
@Test
void oldGenerationReuseRevokesWholeSession() {
    RefreshSession session = RefreshSession.start(USER_ID, FIRST_ID, NOW.plus(30, DAYS));
    RefreshTokenRecord first = RefreshTokenRecord.issue(FIRST_ID, session.getId(), "hash-1", NOW);
    assertEquals(RotationResult.ROTATED,
        session.rotate(first, "hash-1", SECOND_ID, NOW, Duration.ofSeconds(4)));

    assertEquals(RotationResult.REUSE_DETECTED,
        session.rotate(first, "hash-1", THIRD_ID, NOW.plusSeconds(5), Duration.ofSeconds(4)));
    assertTrue(session.isRevoked());
}
```

- [x] **Step 2: 도메인 타입 부재로 예상대로 실패하는지 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.auth.domain.*'`

Expected: auth domain class를 찾지 못해 FAIL

- [x] **Step 3: JPA entity factory와 상태 전이 구현**

```java
public RotationResult rotate(RefreshTokenRecord record, String presentedHash,
                             UUID nextTokenId, Instant now, Duration grace) {
    if (revokedAt != null) return RotationResult.REVOKED;
    if (!now.isBefore(absoluteExpiresAt)) return RotationResult.EXPIRED;
    if (!record.matches(presentedHash)) return RotationResult.INVALID_CREDENTIAL;
    if (record.wasUsed()) {
        if (record.isConcurrent(currentTokenId, now)) return RotationResult.CONCURRENT_REQUEST;
        detectReuse(now);
        return RotationResult.REUSE_DETECTED;
    }
    if (!record.getId().equals(currentTokenId)) {
        detectReuse(now);
        return RotationResult.REUSE_DETECTED;
    }
    record.markUsed(nextTokenId, now, grace);
    currentTokenId = nextTokenId;
    return RotationResult.ROTATED;
}
```

- [x] **Step 4: auth domain 테스트 통과 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.auth.domain.*'`

Expected: PASS

- [x] **Step 5: 인증 상태 객체 커밋**

```bash
git add backend/src/main/java/kr/rilog/auth/domain backend/src/test/java/kr/rilog/auth/domain
git commit -m "feature: 인증 credential 상태 전이 제공"
```

### Task 3: 인증 오류 계약

**Files:**
- Create: `backend/src/main/java/kr/rilog/global/exception/AuthErrorInformation.java`
- Create: `backend/src/main/java/kr/rilog/global/exception/AuthException.java`
- Test: `backend/src/test/java/kr/rilog/global/exception/AuthExceptionTest.java`

**Interfaces:**
- Consumes: 기존 `ErrorInformation`, `RilogBusinessException`, `GlobalExceptionHandler`
- Produces: 401 `MISSING_ACCESS_TOKEN`, `INVALID_ACCESS_TOKEN`, `INVALID_REFRESH_TOKEN`, `INVALID_EXCHANGE_CODE`; 403 `INSUFFICIENT_ROLE`; 409 `USER_SLUG_NOT_ASSIGNED`; 400 `INVALID_OAUTH_REQUEST`, `UNTRUSTED_ORIGIN`

- [x] **Step 1: HTTP 상태와 공통 handler 호환 실패 테스트 작성**

```java
@Test
void insufficientRoleUsesForbiddenContract() {
    AuthException exception = new AuthException(AuthErrorInformation.INSUFFICIENT_ROLE);
    assertAll(
        () -> assertEquals(HttpStatus.FORBIDDEN, exception.getErrorInformation().getHttpStatus()),
        () -> assertEquals("AUTH_003", exception.getErrorInformation().getErrorCode())
    );
}
```

- [x] **Step 2: auth exception 부재로 실패 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.global.exception.AuthExceptionTest'`

Expected: `AuthException`과 `AuthErrorInformation`을 찾지 못해 FAIL

- [x] **Step 3: 기존 공통 예외 흐름을 확장하는 최소 구현**

```java
public final class AuthException extends RilogBusinessException {
    public AuthException(AuthErrorInformation information) {
        super(information);
    }
}
```

- [x] **Step 4: 인증 오류 계약 테스트 통과 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.global.exception.AuthExceptionTest'`

Expected: PASS

- [x] **Step 5: 인증 오류 계약 커밋**

```bash
git add backend/src/main/java/kr/rilog/global/exception backend/src/test/java/kr/rilog/global/exception/AuthExceptionTest.java
git commit -m "feature: 인증 오류 응답 계약 제공"
```

### Task 4: Credential 생성·hash와 JWT codec

**Files:**
- Modify: `backend/build.gradle.kts`
- Create: `backend/src/main/java/kr/rilog/auth/application/port/AccessTokenCodec.java`
- Create: `backend/src/main/java/kr/rilog/auth/application/port/SecureCredentialService.java`
- Create: `backend/src/main/java/kr/rilog/auth/domain/AuthPrincipal.java`
- Create: `backend/src/main/java/kr/rilog/auth/infrastructure/security/OpaqueCredential.java`
- Create: `backend/src/main/java/kr/rilog/auth/infrastructure/security/SecureCredentialManager.java`
- Create: `backend/src/main/java/kr/rilog/auth/infrastructure/security/JwtAccessTokenCodec.java`
- Test: `backend/src/test/java/kr/rilog/auth/infrastructure/security/SecureCredentialManagerTest.java`
- Test: `backend/src/test/java/kr/rilog/auth/infrastructure/security/JwtAccessTokenCodecTest.java`

**Interfaces:**
- Consumes: `AuthPrincipal`, `Clock`, issuer, audience, 256-bit signing secret, lifetime
- Produces: `String issue(AuthPrincipal)`, `AuthPrincipal verify(String)`, `OpaqueCredential issueOpaque()`, `String hash(String)`, `boolean matches(String,String)`

- [x] **Step 1: opaque credential와 JWT 계약 실패 테스트 작성**

```java
@Test
void jwtRejectsUnexpectedAudience() {
    JwtAccessTokenCodec issuer = codec("rilog-api");
    String token = issuer.issue(new AuthPrincipal(7L, GlobalRole.ADMIN));

    assertThrows(AuthException.class, () -> codec("other-api").verify(token));
}
```

- [x] **Step 2: codec와 dependency 부재로 실패 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.auth.infrastructure.security.*'`

Expected: `com.auth0:java-jwt` 또는 security class 부재로 FAIL

- [x] **Step 3: 검증된 JWT adapter와 256-bit random credential 구현**

```kotlin
implementation("com.auth0:java-jwt:4.6.0")
```

```java
String token = JWT.create()
    .withIssuer(issuer)
    .withAudience(audience)
    .withSubject(principal.userId().toString())
    .withClaim("role", principal.role().name())
    .withIssuedAt(now)
    .withExpiresAt(now.plus(lifetime))
    .withJWTId(UUID.randomUUID().toString())
    .sign(Algorithm.HMAC256(secret));
```

- [x] **Step 4: security 단위 테스트 통과 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.auth.infrastructure.security.*'`

Expected: PASS

- [x] **Step 5: credential와 JWT adapter 커밋**

```bash
git add backend/build.gradle.kts backend/src/main/java/kr/rilog/auth/application/port backend/src/main/java/kr/rilog/auth/domain/AuthPrincipal.java backend/src/main/java/kr/rilog/auth/infrastructure/security backend/src/main/java/kr/rilog/global/exception backend/src/test/java/kr/rilog/auth/infrastructure/security
git commit -m "feature: Rilog credential와 JWT 검증 제공"
```

### Task 5: Repository port와 PostgreSQL 잠금 adapter

**Files:**
- Create: `backend/src/main/java/kr/rilog/auth/application/port/UserStore.java`
- Create: `backend/src/main/java/kr/rilog/auth/application/port/OAuthLoginAttemptStore.java`
- Create: `backend/src/main/java/kr/rilog/auth/application/port/LoginExchangeCodeStore.java`
- Create: `backend/src/main/java/kr/rilog/auth/application/port/RefreshSessionStore.java`
- Create: `backend/src/main/java/kr/rilog/auth/application/port/RefreshTokenRecordStore.java`
- Create: `backend/src/main/java/kr/rilog/auth/infrastructure/persistence/UserJpaRepository.java`
- Create: `backend/src/main/java/kr/rilog/auth/infrastructure/persistence/OAuthLoginAttemptJpaRepository.java`
- Create: `backend/src/main/java/kr/rilog/auth/infrastructure/persistence/LoginExchangeCodeJpaRepository.java`
- Create: `backend/src/main/java/kr/rilog/auth/infrastructure/persistence/RefreshSessionJpaRepository.java`
- Create: `backend/src/main/java/kr/rilog/auth/infrastructure/persistence/RefreshTokenRecordJpaRepository.java`
- Create: `backend/src/main/java/kr/rilog/auth/infrastructure/persistence/JpaUserStore.java`
- Create: `backend/src/main/java/kr/rilog/auth/infrastructure/persistence/JpaOAuthLoginAttemptStore.java`
- Create: `backend/src/main/java/kr/rilog/auth/infrastructure/persistence/JpaLoginExchangeCodeStore.java`
- Create: `backend/src/main/java/kr/rilog/auth/infrastructure/persistence/JpaRefreshSessionStore.java`
- Create: `backend/src/main/java/kr/rilog/auth/infrastructure/persistence/JpaRefreshTokenRecordStore.java`
- Modify: `backend/build.gradle.kts`
- Test: `backend/src/test/java/kr/rilog/auth/infrastructure/persistence/PostgresAuthPersistenceTest.java`

**Interfaces:**
- Consumes: Task 1·2 entity
- Produces: state hash 조회, exchange/session pessimistic lock 조회, token record 조회·저장, githubId/userId 조회·저장

- [x] **Step 1: 실제 PostgreSQL에서 단일 소비와 row lock을 요구하는 실패 테스트 작성**

```java
@Test
void exchangeCodeIsLoadedWithPessimisticWriteLock() {
    LoginExchangeCode saved = store.save(LoginExchangeCode.issue(USER_ID, "hash", NOW.plusSeconds(90)));
    LoginExchangeCode locked = transactionTemplate.execute(
        ignored -> store.findByIdForUpdate(saved.getId()).orElseThrow());
    assertEquals(saved.getId(), locked.getId());
}
```

- [x] **Step 2: Testcontainers/JPA adapter 부재로 실패 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.auth.infrastructure.persistence.*'`

Expected: repository adapter 또는 Testcontainers dependency 부재로 FAIL

- [x] **Step 3: PostgreSQL adapter와 테스트 dependency 구현**

```kotlin
testImplementation("org.springframework.boot:spring-boot-testcontainers")
testImplementation("org.testcontainers:testcontainers-junit-jupiter:2.0.5")
testImplementation("org.testcontainers:testcontainers-postgresql:2.0.5")
```

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select s from RefreshSession s where s.id = :id")
Optional<RefreshSession> findByIdForUpdate(UUID id);
```

- [x] **Step 4: PostgreSQL persistence 테스트 통과 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.auth.infrastructure.persistence.*'`

Expected: Docker 사용 가능 환경에서 PASS

- [x] **Step 5: persistence adapter 커밋**

```bash
git add backend/build.gradle.kts backend/src/main/java/kr/rilog/auth/application/port backend/src/main/java/kr/rilog/auth/infrastructure/persistence backend/src/test/java/kr/rilog/auth/infrastructure/persistence
git commit -m "feature: 인증 상태의 PostgreSQL 영속화 제공"
```

### Task 6: GitHub HTTP gateway와 로그인 시작·callback

**Files:**
- Create: `backend/src/main/java/kr/rilog/auth/application/port/GithubOAuthGateway.java`
- Create: `backend/src/main/java/kr/rilog/auth/application/StartGithubLogin.java`
- Create: `backend/src/main/java/kr/rilog/auth/application/CompleteGithubLogin.java`
- Create: `backend/src/main/java/kr/rilog/auth/application/OAuthAttemptConsumer.java`
- Create: `backend/src/main/java/kr/rilog/auth/application/GithubIdentityRegistrar.java`
- Create: `backend/src/main/java/kr/rilog/auth/infrastructure/github/GithubHttpClient.java`
- Create: `backend/src/main/java/kr/rilog/auth/infrastructure/github/GithubTokenResponse.java`
- Create: `backend/src/main/java/kr/rilog/auth/infrastructure/github/GithubUserResponse.java`
- Test: `backend/src/test/java/kr/rilog/auth/infrastructure/github/GithubHttpClientTest.java`
- Test: `backend/src/test/java/kr/rilog/auth/application/GithubLoginUseCaseTest.java`

**Interfaces:**
- Consumes: credential service, attempt/user/exchange stores, GitHub code/state/binding
- Produces: `StartGithubLogin.Result(URI,String)`, `CompleteGithubLogin.Result(String)`

- [x] **Step 1: PKCE URL, GitHub request와 transaction 분리 실패 테스트 작성**

```java
@Test
void authorizationUriContainsStateAndS256Challenge() {
    StartGithubLogin.Result result = useCase.start();
    assertAll(
        () -> assertTrue(result.authorizationUri().toString().contains("code_challenge_method=S256")),
        () -> assertFalse(result.browserBinding().isBlank())
    );
}
```

- [x] **Step 2: gateway/use case 부재로 실패 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.auth.application.GithubLoginUseCaseTest' --tests 'kr.rilog.auth.infrastructure.github.GithubHttpClientTest'`

Expected: login use case 또는 GitHub adapter 부재로 FAIL

- [x] **Step 3: Spring `RestClient` 기반 직접 OAuth HTTP와 분리 transaction 구현**

```java
public Result complete(String code, String state, String binding) {
    String verifier = attemptConsumer.consume(state, binding);
    GithubIdentity identity = githubOAuthGateway.fetchIdentity(code, verifier);
    return identityRegistrar.registerAndIssueCode(identity);
}
```

- [x] **Step 4: GitHub contract와 use case 테스트 통과 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.auth.application.GithubLoginUseCaseTest' --tests 'kr.rilog.auth.infrastructure.github.GithubHttpClientTest'`

Expected: PASS

- [x] **Step 5: GitHub OAuth 흐름 커밋**

```bash
git add backend/src/main/java/kr/rilog/auth/application backend/src/main/java/kr/rilog/auth/infrastructure/github backend/src/test/java/kr/rilog/auth/application/GithubLoginUseCaseTest.java backend/src/test/java/kr/rilog/auth/infrastructure/github/GithubHttpClientTest.java
git commit -m "feature: GitHub OAuth 로그인 흐름 제공"
```

### Task 7: Exchange, RTR refresh와 logout use case

**Files:**
- Create: `backend/src/main/java/kr/rilog/auth/application/ExchangeLoginCode.java`
- Create: `backend/src/main/java/kr/rilog/auth/application/RefreshLoginSession.java`
- Create: `backend/src/main/java/kr/rilog/auth/application/Logout.java`
- Create: `backend/src/main/java/kr/rilog/auth/application/UserQueryService.java`
- Test: `backend/src/test/java/kr/rilog/auth/application/TokenSessionUseCaseTest.java`
- Test: `backend/src/test/java/kr/rilog/auth/application/RefreshConcurrencyIntegrationTest.java`

**Interfaces:**
- Consumes: opaque `<public-id>.<secret>`, locked stores, current `User.globalRole`
- Produces: Access token, optional rotated Refresh token, remaining absolute cookie lifetime, onboarding status

- [x] **Step 1: 최초 교환, grace, 오래된 reuse, logout 경쟁 실패 테스트 작성**

```java
@Test
void rotationUsesRemainingAbsoluteLifetime() {
    RefreshLoginSession.Result result = useCase.refresh(refreshToken, NOW.plus(Duration.ofDays(10)));
    assertEquals(Duration.ofDays(20), result.refreshMaxAge());
}
```

- [x] **Step 2: session use case 부재로 실패 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.auth.application.TokenSessionUseCaseTest'`

Expected: exchange/refresh/logout class 부재로 FAIL

- [x] **Step 3: transaction 경계와 rotation 결과 mapping 구현**

```java
return switch (session.rotate(record, presentedHash, next.id(), now, grace)) {
    case ROTATED -> rotated(session, next, user, now);
    case CONCURRENT_REQUEST -> accessOnly(user);
    case REUSE_DETECTED, EXPIRED, REVOKED, INVALID_CREDENTIAL ->
        throw new AuthException(AuthErrorInformation.INVALID_REFRESH_TOKEN);
};
```

- [x] **Step 4: use case와 PostgreSQL concurrency 테스트 통과 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.auth.application.*'`

Expected: PASS

- [x] **Step 5: Rilog session use case 커밋**

```bash
git add backend/src/main/java/kr/rilog/auth/application backend/src/test/java/kr/rilog/auth/application
git commit -m "feature: 로그인 token 교환과 회전 세션 제공"
```

### Task 8: MVC 인증·인가 어노테이션과 principal 주입

**Files:**
- Create: `backend/src/main/java/kr/rilog/global/auth/annotation/LoginRequired.java`
- Create: `backend/src/main/java/kr/rilog/global/auth/annotation/RequireRole.java`
- Create: `backend/src/main/java/kr/rilog/global/auth/AuthRequirement.java`
- Create: `backend/src/main/java/kr/rilog/global/auth/AuthRequirementResolver.java`
- Create: `backend/src/main/java/kr/rilog/global/auth/AuthInterceptor.java`
- Modify: `backend/src/main/java/kr/rilog/global/auth/resolver/LoginUserIdArgumentResolver.java`
- Modify: `backend/src/main/java/kr/rilog/global/auth/resolver/LoginUserSlugArgumentResolver.java`
- Create: `backend/src/main/java/kr/rilog/global/config/WebMvcConfig.java`
- Test: `backend/src/test/java/kr/rilog/global/auth/AuthMvcTest.java`

**Interfaces:**
- Consumes: `AccessTokenCodec`, `UserQueryService`, class/method/parameter annotations
- Produces: request attribute `AuthPrincipal`, 401/403, `Long` userId와 current slug resolver

- [x] **Step 1: class·method role과 resolver 실패 MVC 테스트 작성**

```java
mockMvc.perform(get("/test/admin").header(AUTHORIZATION, "Bearer " + userToken))
    .andExpect(status().isForbidden());

mockMvc.perform(get("/test/me").header(AUTHORIZATION, "Bearer " + adminToken))
    .andExpect(status().isOk())
    .andExpect(content().string("7"));
```

- [x] **Step 2: interceptor와 실제 principal resolver 부재로 실패 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.global.auth.AuthMvcTest'`

Expected: 보호 endpoint가 통과하거나 annotation class 부재로 FAIL

- [x] **Step 3: requirement 해석, JWT 단일 검증과 resolver 구현**

```java
AuthRequirement requirement = requirementResolver.resolve(handlerMethod);
AuthPrincipal principal = accessTokenCodec.verify(bearerToken(request));
if (!principal.role().permits(requirement.requiredRole())) {
    throw new AuthException(AuthErrorInformation.INSUFFICIENT_ROLE);
}
request.setAttribute(AuthPrincipal.class.getName(), principal);
```

- [x] **Step 4: MVC auth 테스트 통과 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.global.auth.AuthMvcTest'`

Expected: PASS

- [x] **Step 5: MVC 인증·인가 통합 커밋**

```bash
git add backend/src/main/java/kr/rilog/global/auth backend/src/main/java/kr/rilog/global/config/WebMvcConfig.java backend/src/test/java/kr/rilog/global/auth/AuthMvcTest.java
git commit -m "feature: MVC 인증과 전역 역할 인가 제공"
```

### Task 9: HTTP controller, cookie, CORS와 오류 계약

**Files:**
- Create: `backend/src/main/java/kr/rilog/auth/config/AuthProperties.java`
- Create: `backend/src/main/java/kr/rilog/auth/config/AuthConfiguration.java`
- Create: `backend/src/main/java/kr/rilog/auth/presentation/GithubOAuthController.java`
- Create: `backend/src/main/java/kr/rilog/auth/presentation/AuthTokenController.java`
- Create: `backend/src/main/java/kr/rilog/auth/presentation/AuthCookieFactory.java`
- Create: `backend/src/main/java/kr/rilog/auth/presentation/AuthOriginInterceptor.java`
- Create: `backend/src/main/java/kr/rilog/auth/presentation/GithubCallbackExceptionHandler.java`
- Create: `backend/src/main/java/kr/rilog/auth/presentation/dto/ExchangeTokenRequest.java`
- Create: `backend/src/main/java/kr/rilog/auth/presentation/dto/ExchangeTokenResponse.java`
- Modify: `backend/src/main/resources/application.yaml`
- Test: `backend/src/test/java/kr/rilog/auth/presentation/AuthControllerMvcTest.java`

**Interfaces:**
- Consumes: Tasks 5·6 use cases와 exact frontend origin
- Produces: 302 login/callback, 200 exchange, 204 refresh/logout, Authorization header, secure cookies, callback generic error redirect

- [x] **Step 1: endpoint header/cookie/origin/error 실패 테스트 작성**

```java
mockMvc.perform(post("/api/auth/token/exchange")
        .header(ORIGIN, "https://rilog.com")
        .contentType(APPLICATION_JSON)
        .content("{\"code\":\"id.secret\"}"))
    .andExpect(status().isOk())
    .andExpect(header().string(AUTHORIZATION, startsWith("Bearer ")))
    .andExpect(header().string(SET_COOKIE, allOf(
        containsString("HttpOnly"), containsString("Secure"),
        containsString("SameSite=Lax"), containsString("Path=/api/auth"))));
```

- [x] **Step 2: controller/config/error 타입 부재로 실패 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.auth.presentation.AuthControllerMvcTest'`

Expected: controller route를 찾지 못해 FAIL

- [x] **Step 3: endpoint, exact Origin, cookie와 callback advice 구현**

```java
ResponseCookie refresh = ResponseCookie.from("__Secure-rilog-refresh", token)
    .httpOnly(true).secure(true).sameSite("Lax")
    .path("/api/auth").maxAge(remaining).build();
```

- [x] **Step 4: presentation 계약 테스트 통과 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.auth.presentation.AuthControllerMvcTest'`

Expected: PASS

- [x] **Step 5: 인증 HTTP 계약 커밋**

```bash
git add backend/src/main/java/kr/rilog/auth/config backend/src/main/java/kr/rilog/auth/presentation backend/src/main/resources/application.yaml backend/src/test/java/kr/rilog/auth/presentation
git commit -m "feature: GitHub 로그인과 token HTTP 계약 제공"
```

### Task 10: 수직 흐름, 회귀 검증과 문서 동기화

**Files:**
- Create: `backend/src/test/java/kr/rilog/auth/AuthVerticalFlowTest.java`
- Modify: `docs/superpowers/specs/2026-08-12-github-social-login-design.md`
- Modify: `docs/adr/0001-custom-github-authentication.md`

**Interfaces:**
- Consumes: 전체 auth HTTP/application/domain/persistence 경계
- Produces: login → callback → exchange → protected request → refresh → logout 검증 증거

- [x] **Step 1: Fake GitHub를 통한 수직 흐름 실패 테스트 작성**

```java
@Test
void completeAuthenticationLifecycle() {
    String exchangeCode = loginAndCallback(fakeGithubIdentity);
    IssuedTokens issued = exchange(exchangeCode);
    accessProtectedEndpoint(issued.accessToken(), 200);
    IssuedTokens rotated = refresh(issued.refreshCookie());
    logout(rotated.refreshCookie());
    refreshExpectingUnauthorized(rotated.refreshCookie());
}
```

- [x] **Step 2: 전체 연결 누락으로 실패 확인**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'kr.rilog.auth.AuthVerticalFlowTest'`

Expected: 빠진 bean, route 또는 persistence contract 때문에 FAIL

- [x] **Step 3: 연결 오류만 최소 수정하고 설계 문서의 확정 class명·dependency 반영**

```text
검증 대상: state/browser binding, GitHub identity 동기화, single-use exchange,
JWT principal, absolute refresh expiry, rotation/reuse, logout revoke
```

- [x] **Step 4: 전체 backend 검증**

Run: `JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew clean test`

Expected: `BUILD SUCCESSFUL`, 실패 테스트 0개

- [x] **Step 5: 변경 범위와 secret 유출 검사**

Run: `git diff --check && rg -n 'gho_|github-client-secret: [^$]|jwt-signing-secret: [^$]' backend docs`

Expected: whitespace 오류 없음, 실제 credential pattern 없음

- [x] **Step 6: 수직 흐름과 문서 동기화 커밋**

```bash
git add backend/src/test/java/kr/rilog/auth/AuthVerticalFlowTest.java docs/superpowers/specs/2026-08-12-github-social-login-design.md docs/adr/0001-custom-github-authentication.md
git commit -m "test: GitHub 인증 수직 흐름 검증"
```
