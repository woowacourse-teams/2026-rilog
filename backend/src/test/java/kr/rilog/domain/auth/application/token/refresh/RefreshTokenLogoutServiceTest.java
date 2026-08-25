package kr.rilog.domain.auth.application.token.refresh;

import kr.rilog.domain.auth.application.port.token.RefreshTokenHasher;
import kr.rilog.domain.auth.application.port.token.RefreshSessionStore;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

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
        RefreshSessionStore refreshSessionStore = mock(RefreshSessionStore.class);

        RefreshTokenLogoutService logoutService = new RefreshTokenLogoutService(
                new FixedRefreshTokenHasher("refresh-token-hash"),
                refreshSessionStore,
                CLOCK
        );

        // when
        logoutService.logout(RefreshToken.of("raw-refresh-token"));

        // then
        verify(refreshSessionStore).revoke("refresh-token-hash", NOW);
    }

    @Test
    @DisplayName("저장된 세션이 없는 Refresh Token으로 로그아웃해도 성공한다")
    void logoutIgnoresUnknownRefreshToken() {
        // given
        RefreshSessionStore refreshSessionStore = mock(RefreshSessionStore.class);

        RefreshTokenLogoutService logoutService = new RefreshTokenLogoutService(
                new FixedRefreshTokenHasher("unknown-token-hash"),
                refreshSessionStore,
                CLOCK
        );

        // when - then
        assertThatCode(() -> logoutService.logout(RefreshToken.of("unknown-refresh-token")))
                .doesNotThrowAnyException();
        verify(refreshSessionStore).revoke("unknown-token-hash", NOW);
    }

    private record FixedRefreshTokenHasher(String tokenHash) implements RefreshTokenHasher {

        @Override
        public String hash(RefreshToken refreshToken) {
            return tokenHash;
        }
    }
}
