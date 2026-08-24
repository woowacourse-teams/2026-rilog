package kr.rilog.domain.auth.application.token.refresh;

import kr.rilog.domain.auth.application.port.token.RefreshTokenGenerator;
import kr.rilog.domain.auth.application.port.token.RefreshTokenHasher;
import kr.rilog.domain.auth.application.port.token.RefreshSessionStore;
import kr.rilog.domain.auth.config.RefreshTokenProperties;
import kr.rilog.domain.auth.entity.RefreshSession;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class RefreshTokenIssuerTest {

    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-08-13T00:00:00Z"),
            ZoneOffset.UTC
    );
    private static final Duration EXPIRATION = Duration.ofDays(14);

    @Test
    @DisplayName("Refresh Token을 발급하고 원문이 아닌 해시값을 세션에 저장한다")
    void issueCreatesRefreshSessionWithHashedToken() {
        // given
        RefreshSessionStore refreshSessionStore = mock(RefreshSessionStore.class);

        RefreshTokenIssuer refreshTokenIssuer = new RefreshTokenIssuer(
                new FixedRefreshTokenGenerator("raw-refresh-token"),
                new FixedRefreshTokenHasher("hashed-refresh-token"),
                refreshSessionStore,
                RefreshTokenProperties.of(EXPIRATION, "refresh_token", "/v1/auth", false, "Lax"),
                CLOCK
        );

        // when
        RefreshToken refreshToken = refreshTokenIssuer.issue(loginUser());

        // then
        assertThat(refreshToken.value()).isEqualTo("raw-refresh-token");
        verify(refreshSessionStore).save(any(RefreshSession.class), eq(EXPIRATION));
    }

    @Test
    @DisplayName("Refresh Session은 사용자, 해시값, 만료 시간을 가진다")
    void refreshSessionStoresUserHashAndExpiration() {
        // given
        RefreshSessionStore refreshSessionStore = mock(RefreshSessionStore.class);
        RefreshTokenIssuer refreshTokenIssuer = new RefreshTokenIssuer(
                new FixedRefreshTokenGenerator("raw-refresh-token"),
                new FixedRefreshTokenHasher("hashed-refresh-token"),
                refreshSessionStore,
                RefreshTokenProperties.of(EXPIRATION, "refresh_token", "/v1/auth", false, "Lax"),
                CLOCK
        );

        // when
        refreshTokenIssuer.issue(loginUser());

        // then
        ArgumentCaptor<RefreshSession> sessionCaptor = ArgumentCaptor.forClass(RefreshSession.class);
        verify(refreshSessionStore).save(sessionCaptor.capture(), eq(EXPIRATION));
        RefreshSession session = sessionCaptor.getValue();
        assertThat(session.getUserId()).isEqualTo(1L);
        assertThat(session.getTokenHash()).isEqualTo("hashed-refresh-token");
        assertThat(session.getTokenHash()).isNotEqualTo("raw-refresh-token");
        assertThat(session.getExpiresAt()).isEqualTo(LocalDateTime.of(2026, 8, 27, 0, 0));
    }

    private User loginUser() {
        return User.builder()
                .id(1L)
                .githubId(10L)
                .build();
    }

    private record FixedRefreshTokenGenerator(String value) implements RefreshTokenGenerator {

        @Override
        public RefreshToken generate() {
            return RefreshToken.of(value);
        }
    }

    private record FixedRefreshTokenHasher(String value) implements RefreshTokenHasher {

        @Override
        public String hash(RefreshToken refreshToken) {
            return value;
        }
    }
}
