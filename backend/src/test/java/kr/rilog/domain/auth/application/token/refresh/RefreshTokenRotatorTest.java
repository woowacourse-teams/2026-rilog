package kr.rilog.domain.auth.application.token.refresh;

import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.auth.application.port.token.RefreshTokenGenerator;
import kr.rilog.domain.auth.application.port.token.RefreshTokenHasher;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.application.token.access.AccessTokenService;
import kr.rilog.domain.auth.config.RefreshTokenProperties;
import kr.rilog.domain.auth.entity.RefreshSession;
import kr.rilog.domain.auth.exception.AuthErrorInformation;
import kr.rilog.domain.auth.exception.AuthException;
import kr.rilog.domain.auth.repository.RefreshSessionRepository;
import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RefreshTokenRotatorTest {

    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-08-13T00:00:00Z"),
            ZoneOffset.UTC
    );
    private static final Duration EXPIRATION = Duration.ofDays(14);
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 8, 13, 0, 0);

    @Test
    @DisplayName("유효한 Refresh Token이면 기존 세션을 폐기하고 새 Access Token과 Refresh Token을 발급한다")
    void rotateRevokesCurrentSessionAndIssuesNewTokens() {
        // given
        RefreshSession currentSession = RefreshSession.create(1L, "old-hash", NOW.plusDays(1));
        RefreshSessionRepository refreshSessionRepository = mock(RefreshSessionRepository.class);
        when(refreshSessionRepository.findByTokenHashForUpdate("old-hash"))
                .thenReturn(Optional.of(currentSession));
        when(refreshSessionRepository.save(any(RefreshSession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.findById(1L)).thenReturn(Optional.of(completedUser()));

        RefreshTokenRotator rotator = rotator(
                refreshSessionRepository,
                userRepository,
                new MappingRefreshTokenHasher(),
                new FixedRefreshTokenGenerator("new-refresh-token")
        );

        // when
        RefreshTokenRotationResult result = rotator.rotate(RefreshToken.of("old-refresh-token"));

        // then
        assertThat(result.accessToken().value()).isEqualTo("access-token:1:USER:jinriro");
        assertThat(result.refreshToken().value()).isEqualTo("new-refresh-token");
        assertThat(currentSession.isRevoked()).isTrue();
        assertThat(currentSession.getRevokedAt()).isEqualTo(NOW);

        ArgumentCaptor<RefreshSession> sessionCaptor = ArgumentCaptor.forClass(RefreshSession.class);
        verify(refreshSessionRepository).save(sessionCaptor.capture());
        RefreshSession newSession = sessionCaptor.getValue();
        assertThat(newSession.getUserId()).isEqualTo(1L);
        assertThat(newSession.getTokenHash()).isEqualTo("new-hash");
        assertThat(newSession.getExpiresAt()).isEqualTo(NOW.plus(EXPIRATION));
        assertThat(newSession.isRevoked()).isFalse();
    }

    @Test
    @DisplayName("Refresh Token 원문이 아닌 해시값으로 세션을 조회한다")
    void rotateFindsSessionByHashedRefreshToken() {
        // given
        RefreshSessionRepository refreshSessionRepository = mock(RefreshSessionRepository.class);
        when(refreshSessionRepository.findByTokenHashForUpdate("old-hash"))
                .thenReturn(Optional.empty());
        UserRepository userRepository = mock(UserRepository.class);
        RefreshTokenRotator rotator = rotator(
                refreshSessionRepository,
                userRepository,
                new MappingRefreshTokenHasher(),
                new FixedRefreshTokenGenerator("new-refresh-token")
        );

        // when - then
        assertThatThrownBy(() -> rotator.rotate(RefreshToken.of("old-refresh-token")))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.INVALID_REFRESH_TOKEN);
        verify(refreshSessionRepository).findByTokenHashForUpdate("old-hash");
    }

    @Test
    @DisplayName("만료된 Refresh Session은 거부한다")
    void rotateRejectsExpiredSession() {
        // given
        RefreshSession expiredSession = RefreshSession.create(1L, "old-hash", NOW.minusSeconds(1));
        RefreshSessionRepository refreshSessionRepository = mock(RefreshSessionRepository.class);
        when(refreshSessionRepository.findByTokenHashForUpdate("old-hash"))
                .thenReturn(Optional.of(expiredSession));
        UserRepository userRepository = mock(UserRepository.class);
        RefreshTokenRotator rotator = rotator(
                refreshSessionRepository,
                userRepository,
                new MappingRefreshTokenHasher(),
                new FixedRefreshTokenGenerator("new-refresh-token")
        );

        // when - then
        assertThatThrownBy(() -> rotator.rotate(RefreshToken.of("old-refresh-token")))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.EXPIRED_REFRESH_TOKEN);
    }

    @Test
    @DisplayName("폐기된 Refresh Session은 재사용으로 감지하고 사용자의 활성 세션을 폐기한다")
    void rotateRejectsRevokedSessionAsReuseAndRevokesActiveSessions() {
        // given
        RefreshSession revokedSession = RefreshSession.create(1L, "old-hash", NOW.plusDays(1));
        revokedSession.revoke(NOW.minusSeconds(1));
        RefreshSessionRepository refreshSessionRepository = mock(RefreshSessionRepository.class);
        when(refreshSessionRepository.findByTokenHashForUpdate("old-hash"))
                .thenReturn(Optional.of(revokedSession));
        UserRepository userRepository = mock(UserRepository.class);
        RefreshTokenRotator rotator = rotator(
                refreshSessionRepository,
                userRepository,
                new MappingRefreshTokenHasher(),
                new FixedRefreshTokenGenerator("new-refresh-token")
        );

        // when - then
        assertThatThrownBy(() -> rotator.rotate(RefreshToken.of("old-refresh-token")))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.REUSED_REFRESH_TOKEN);
        verify(refreshSessionRepository).revokeActiveSessionsByUserId(1L, NOW);
    }

    @Test
    @DisplayName("같은 Refresh Session은 한 번만 재발급에 사용할 수 있다")
    void rotateAllowsOnlyOneUseOfSameRefreshSession() {
        // given
        RefreshSession currentSession = RefreshSession.create(1L, "old-hash", NOW.plusDays(1));
        RefreshSessionRepository refreshSessionRepository = mock(RefreshSessionRepository.class);
        when(refreshSessionRepository.findByTokenHashForUpdate("old-hash"))
                .thenReturn(Optional.of(currentSession));
        when(refreshSessionRepository.save(any(RefreshSession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.findById(1L)).thenReturn(Optional.of(completedUser()));

        RefreshTokenRotator rotator = rotator(
                refreshSessionRepository,
                userRepository,
                new MappingRefreshTokenHasher(),
                new FixedRefreshTokenGenerator("new-refresh-token")
        );

        // when
        RefreshTokenRotationResult result = rotator.rotate(RefreshToken.of("old-refresh-token"));

        // then
        assertThat(result.refreshToken().value()).isEqualTo("new-refresh-token");
        assertThatThrownBy(() -> rotator.rotate(RefreshToken.of("old-refresh-token")))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.REUSED_REFRESH_TOKEN);
    }

    @Test
    @DisplayName("온보딩이 완료되지 않은 사용자의 Refresh Token은 거부한다")
    void rotateRejectsPendingUser() {
        // given
        RefreshSession currentSession = RefreshSession.create(1L, "old-hash", NOW.plusDays(1));
        RefreshSessionRepository refreshSessionRepository = mock(RefreshSessionRepository.class);
        when(refreshSessionRepository.findByTokenHashForUpdate("old-hash"))
                .thenReturn(Optional.of(currentSession));

        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.findById(1L)).thenReturn(Optional.of(pendingUser()));

        RefreshTokenRotator rotator = rotator(
                refreshSessionRepository,
                userRepository,
                new MappingRefreshTokenHasher(),
                new FixedRefreshTokenGenerator("new-refresh-token")
        );

        // when - then
        assertThatThrownBy(() -> rotator.rotate(RefreshToken.of("old-refresh-token")))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.INVALID_REFRESH_TOKEN);
        assertThat(currentSession.isRevoked()).isTrue();
    }

    @Test
    @DisplayName("Refresh Token 재사용 감지로 폐기한 세션은 예외가 발생해도 롤백하지 않는다")
    void rotateDoesNotRollbackRefreshSessionRevocationOnAuthException() throws NoSuchMethodException {
        // given
        Method method = RefreshTokenRotator.class.getMethod("rotate", RefreshToken.class);

        // when
        Transactional transactional = method.getAnnotation(Transactional.class);

        // then
        assertThat(transactional.noRollbackFor()).contains(AuthException.class);
    }

    private RefreshTokenRotator rotator(
            RefreshSessionRepository refreshSessionRepository,
            UserRepository userRepository,
            RefreshTokenHasher refreshTokenHasher,
            RefreshTokenGenerator refreshTokenGenerator
    ) {
        return new RefreshTokenRotator(
                refreshTokenHasher,
                refreshTokenGenerator,
                refreshSessionRepository,
                userRepository,
                new AccessTokenService(new FixedAccessTokenProvider()),
                RefreshTokenProperties.of(EXPIRATION, "refresh_token", "/v1/auth", false, "Lax"),
                CLOCK
        );
    }

    private User completedUser() {
        return User.builder()
                .id(1L)
                .githubId(10L)
                .slug("jinriro")
                .globalRole(GlobalRole.USER)
                .onboardingStatus(OnboardingStatus.COMPLETED)
                .build();
    }

    private User pendingUser() {
        return User.builder()
                .id(1L)
                .githubId(10L)
                .build();
    }

    private static class MappingRefreshTokenHasher implements RefreshTokenHasher {

        @Override
        public String hash(RefreshToken refreshToken) {
            if ("old-refresh-token".equals(refreshToken.value())) {
                return "old-hash";
            }
            if ("new-refresh-token".equals(refreshToken.value())) {
                return "new-hash";
            }
            return "unknown-hash";
        }
    }

    private record FixedRefreshTokenGenerator(String value) implements RefreshTokenGenerator {

        @Override
        public RefreshToken generate() {
            return RefreshToken.of(value);
        }
    }

    private static class FixedAccessTokenProvider implements AccessTokenProvider {

        @Override
        public AccessToken issue(Long userId, GlobalRole role, String slug) {
            return AccessToken.of("access-token:%d:%s:%s".formatted(userId, role, slug));
        }

        @Override
        public AccessTokenClaims parse(String accessToken) {
            throw new UnsupportedOperationException("Not used in this test");
        }
    }
}
