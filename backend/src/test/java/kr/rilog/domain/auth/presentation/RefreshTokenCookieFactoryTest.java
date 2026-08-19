package kr.rilog.domain.auth.presentation;

import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.auth.config.RefreshTokenProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshTokenCookieFactoryTest {

    @Test
    @DisplayName("Refresh Token 쿠키는 HttpOnly, SameSite, Path, Max-Age를 포함한다")
    void createBuildsHttpOnlyCookie() {
        // given
        RefreshTokenCookieFactory cookieFactory = new RefreshTokenCookieFactory(
                RefreshTokenProperties.of(Duration.ofDays(14), "refresh_token", "/v1/auth", false, "Lax")
        );

        // when
        ResponseCookie cookie = cookieFactory.create(RefreshToken.of("raw-refresh-token"));

        // then
        assertThat(cookie.toString())
                .contains("refresh_token=raw-refresh-token")
                .contains("Path=/v1/auth")
                .contains("Max-Age=1209600")
                .contains("HttpOnly")
                .contains("SameSite=Lax")
                .doesNotContain("Secure");
    }

    @Test
    @DisplayName("Secure 설정이 켜져 있으면 Refresh Token 쿠키에 Secure를 포함한다")
    void createBuildsSecureCookieWhenConfigured() {
        // given
        RefreshTokenCookieFactory cookieFactory = new RefreshTokenCookieFactory(
                RefreshTokenProperties.of(Duration.ofDays(14), "refresh_token", "/v1/auth", true, "None")
        );

        // when
        ResponseCookie cookie = cookieFactory.create(RefreshToken.of("raw-refresh-token"));

        // then
        assertThat(cookie.toString())
                .contains("Secure")
                .contains("SameSite=None");
    }

    @Test
    @DisplayName("Refresh Token 만료 쿠키는 값을 비우고 Max-Age를 0으로 설정한다")
    void expireBuildsExpiredCookie() {
        // given
        RefreshTokenCookieFactory cookieFactory = new RefreshTokenCookieFactory(
                RefreshTokenProperties.of(Duration.ofDays(14), "refresh_token", "/v1/auth", false, "Lax")
        );

        // when
        ResponseCookie cookie = cookieFactory.expire();

        // then
        assertThat(cookie.toString())
                .contains("refresh_token=")
                .contains("Path=/v1/auth")
                .contains("Max-Age=0")
                .contains("HttpOnly")
                .contains("SameSite=Lax");
    }
}
