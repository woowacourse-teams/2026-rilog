package kr.rilog.auth.application;

import static java.time.temporal.ChronoUnit.DAYS;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import kr.rilog.auth.application.port.AccessTokenCodec;
import kr.rilog.auth.application.port.IssuedCredential;
import kr.rilog.auth.application.port.LoginExchangeCodeStore;
import kr.rilog.auth.application.port.RefreshSessionStore;
import kr.rilog.auth.application.port.RefreshTokenRecordStore;
import kr.rilog.auth.application.port.SecureCredentialService;
import kr.rilog.auth.application.port.UserStore;
import kr.rilog.auth.domain.AuthPrincipal;
import kr.rilog.auth.domain.GithubIdentity;
import kr.rilog.auth.domain.LoginExchangeCode;
import kr.rilog.auth.domain.RefreshSession;
import kr.rilog.auth.domain.RefreshTokenRecord;
import kr.rilog.auth.infrastructure.security.SecureCredentialManager;
import kr.rilog.domain.User;
import kr.rilog.global.exception.AuthException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TokenSessionUseCaseTest {

    private static final Instant NOW = Instant.parse("2026-08-12T00:00:00Z");
    private static final AuthPolicy POLICY = new AuthPolicy(
            Duration.ofMinutes(10),
            Duration.ofSeconds(90),
            Duration.ofDays(30),
            Duration.ofSeconds(4)
    );

    private final SecureCredentialService credentials = new SecureCredentialManager();
    private final InMemoryUserStore users = new InMemoryUserStore();
    private final InMemoryExchangeCodeStore exchangeCodes = new InMemoryExchangeCodeStore();
    private final InMemorySessionStore sessions = new InMemorySessionStore();
    private final InMemoryTokenStore tokens = new InMemoryTokenStore();
    private final AccessTokenCodec accessTokens = new TextAccessTokenCodec();

    private User user;
    private IssuedCredential exchangeCredential;

    @BeforeEach
    void setUp() {
        user = User.builder().id(7L).githubId(123L).build();
        users.save(user);
        exchangeCredential = credentials.issueCredential();
        exchangeCodes.save(LoginExchangeCode.issue(
                exchangeCredential.id(),
                user.getId(),
                exchangeCredential.secretHash(),
                NOW.plusSeconds(90)
        ));
    }

    @Test
    void exchangeConsumesCodeAndStartsThirtyDaySession() {
        ExchangeLoginCode useCase = exchangeUseCase(clockAt(NOW));

        ExchangeLoginCode.Result result = useCase.exchange(exchangeCredential.value());

        assertEquals("access:7:USER", result.accessToken());
        assertNotNull(result.refreshToken());
        assertEquals(Duration.ofDays(30), result.refreshMaxAge());
        assertEquals(user.getOnboardingStatus(), result.onboardingStatus());
        assertEquals(1, sessions.values.size());
        assertEquals(1, tokens.values.size());
        assertThrows(AuthException.class,
                () -> useCase.exchange(exchangeCredential.value()));
    }

    @Test
    void rotationUsesRemainingAbsoluteLifetimeAndGraceDoesNotOverwriteCookie() {
        ExchangeLoginCode.Result issued = exchangeUseCase(clockAt(NOW))
                .exchange(exchangeCredential.value());
        Instant rotationTime = NOW.plus(10, DAYS);
        RefreshLoginSession rotation = refreshUseCase(clockAt(rotationTime));

        RefreshLoginSession.Result rotated = rotation.refresh(issued.refreshToken());
        RefreshLoginSession.Result concurrent = refreshUseCase(
                clockAt(rotationTime.plusSeconds(4))
        ).refresh(issued.refreshToken());

        assertEquals(Duration.ofDays(20), rotated.refreshMaxAge());
        assertNotNull(rotated.refreshToken());
        assertEquals("access:7:USER", rotated.accessToken());
        assertNull(concurrent.refreshToken());
        assertNull(concurrent.refreshMaxAge());
        assertFalse(sessions.values.values().iterator().next().isRevoked());
    }

    @Test
    void replayOutsideGraceRevokesSessionButWrongSecretDoesNot() {
        ExchangeLoginCode.Result issued = exchangeUseCase(clockAt(NOW))
                .exchange(exchangeCredential.value());
        Instant rotationTime = NOW.plus(1, DAYS);
        refreshUseCase(clockAt(rotationTime)).refresh(issued.refreshToken());

        String wrongSecret = issued.refreshToken().substring(
                0, issued.refreshToken().indexOf('.') + 1
        ) + "wrong-secret";
        assertThrows(AuthException.class,
                () -> refreshUseCase(clockAt(rotationTime.plusSeconds(1))).refresh(wrongSecret));
        RefreshSession session = sessions.values.values().iterator().next();
        assertFalse(session.isRevoked());

        assertThrows(AuthException.class,
                () -> refreshUseCase(clockAt(rotationTime.plusSeconds(5)))
                        .refresh(issued.refreshToken()));
        assertTrue(session.isRevoked());
        assertEquals(rotationTime.plusSeconds(5), session.getReuseDetectedAt());
    }

    @Test
    void logoutRevokesOnlySessionWhoseSecretMatches() {
        ExchangeLoginCode.Result issued = exchangeUseCase(clockAt(NOW))
                .exchange(exchangeCredential.value());
        String wrongSecret = issued.refreshToken().substring(
                0, issued.refreshToken().indexOf('.') + 1
        ) + "wrong-secret";
        Logout logout = new Logout(
                sessions, tokens, credentials, clockAt(NOW.plusSeconds(1))
        );

        assertThrows(AuthException.class, () -> logout.logout(wrongSecret));
        RefreshSession session = sessions.values.values().iterator().next();
        assertFalse(session.isRevoked());

        logout.logout(issued.refreshToken());
        assertTrue(session.isRevoked());
    }

    private ExchangeLoginCode exchangeUseCase(Clock clock) {
        return new ExchangeLoginCode(
                exchangeCodes,
                sessions,
                tokens,
                users,
                credentials,
                accessTokens,
                clock,
                POLICY
        );
    }

    private RefreshLoginSession refreshUseCase(Clock clock) {
        RefreshRotationExecutor executor = new RefreshRotationExecutor(
                sessions, tokens, POLICY
        );
        return new RefreshLoginSession(
                executor, users, credentials, accessTokens, clock
        );
    }

    private Clock clockAt(Instant instant) {
        return Clock.fixed(instant, ZoneOffset.UTC);
    }

    private static final class TextAccessTokenCodec implements AccessTokenCodec {
        @Override
        public String issue(AuthPrincipal principal) {
            return "access:" + principal.userId() + ":" + principal.role();
        }

        @Override
        public AuthPrincipal verify(String token) {
            throw new UnsupportedOperationException();
        }
    }

    private static final class InMemoryUserStore implements UserStore {
        private final Map<Long, User> values = new HashMap<>();

        @Override
        public User save(User user) {
            values.put(user.getId(), user);
            return user;
        }

        @Override
        public Optional<User> findById(Long id) {
            return Optional.ofNullable(values.get(id));
        }

        @Override
        public Optional<User> findByGithubId(Long githubId) {
            return values.values().stream()
                    .filter(user -> githubId.equals(user.getGithubId()))
                    .findFirst();
        }

        @Override
        public Optional<User> findBySlug(String slug) {
            return values.values().stream()
                    .filter(user -> slug.equals(user.getSlug()))
                    .findFirst();
        }
    }

    private static final class InMemoryExchangeCodeStore implements LoginExchangeCodeStore {
        private final Map<UUID, LoginExchangeCode> values = new HashMap<>();

        @Override
        public LoginExchangeCode save(LoginExchangeCode code) {
            values.put(code.getId(), code);
            return code;
        }

        @Override
        public Optional<LoginExchangeCode> findByIdForUpdate(UUID id) {
            return Optional.ofNullable(values.get(id));
        }
    }

    private static final class InMemorySessionStore implements RefreshSessionStore {
        private final Map<UUID, RefreshSession> values = new HashMap<>();

        @Override
        public RefreshSession save(RefreshSession session) {
            values.put(session.getId(), session);
            return session;
        }

        @Override
        public Optional<RefreshSession> findByIdForUpdate(UUID id) {
            return Optional.ofNullable(values.get(id));
        }
    }

    private static final class InMemoryTokenStore implements RefreshTokenRecordStore {
        private final Map<UUID, RefreshTokenRecord> values = new HashMap<>();

        @Override
        public RefreshTokenRecord save(RefreshTokenRecord record) {
            values.put(record.getId(), record);
            return record;
        }

        @Override
        public Optional<RefreshTokenRecord> findById(UUID id) {
            return Optional.ofNullable(values.get(id));
        }
    }
}
