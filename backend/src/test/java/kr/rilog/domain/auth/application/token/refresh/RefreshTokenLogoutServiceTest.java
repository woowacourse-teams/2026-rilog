package kr.rilog.domain.auth.application.token.refresh;

import kr.rilog.domain.auth.application.port.token.RefreshTokenHasher;
import kr.rilog.domain.auth.entity.RefreshSession;
import kr.rilog.domain.auth.repository.RefreshSessionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RefreshTokenLogoutServiceTest {

    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-08-13T00:00:00Z"),
            ZoneOffset.UTC
    );
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 8, 13, 0, 0);

    @Test
    @DisplayName("로그아웃하면 Refresh Token 해시로 세션을 찾아 폐기한다")
    void logoutRevokesRefreshSessionByHashedRefreshToken() {
        // given
        RefreshSession refreshSession = RefreshSession.create(1L, "refresh-token-hash", NOW.plusDays(1));
        RefreshSessionRepository refreshSessionRepository = mock(RefreshSessionRepository.class);
        when(refreshSessionRepository.findByTokenHashForUpdate("refresh-token-hash"))
                .thenReturn(Optional.of(refreshSession));

        RefreshTokenLogoutService logoutService = new RefreshTokenLogoutService(
                new FixedRefreshTokenHasher("refresh-token-hash"),
                refreshSessionRepository,
                CLOCK
        );

        // when
        logoutService.logout(RefreshToken.of("raw-refresh-token"));

        // then
        assertThat(refreshSession.isRevoked()).isTrue();
        assertThat(refreshSession.getRevokedAt()).isEqualTo(NOW);
        verify(refreshSessionRepository).findByTokenHashForUpdate("refresh-token-hash");
    }

    @Test
    @DisplayName("저장된 세션이 없는 Refresh Token으로 로그아웃해도 성공한다")
    void logoutIgnoresUnknownRefreshToken() {
        // given
        RefreshSessionRepository refreshSessionRepository = mock(RefreshSessionRepository.class);
        when(refreshSessionRepository.findByTokenHashForUpdate("unknown-token-hash"))
                .thenReturn(Optional.empty());

        RefreshTokenLogoutService logoutService = new RefreshTokenLogoutService(
                new FixedRefreshTokenHasher("unknown-token-hash"),
                refreshSessionRepository,
                CLOCK
        );

        // when - then
        assertThatCode(() -> logoutService.logout(RefreshToken.of("unknown-refresh-token")))
                .doesNotThrowAnyException();
        verify(refreshSessionRepository).findByTokenHashForUpdate("unknown-token-hash");
    }

    private record FixedRefreshTokenHasher(String tokenHash) implements RefreshTokenHasher {

        @Override
        public String hash(RefreshToken refreshToken) {
            return tokenHash;
        }
    }
}
