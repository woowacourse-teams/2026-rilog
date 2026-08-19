package kr.rilog.domain.auth.presentation;

import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshTokenLogoutService;
import kr.rilog.domain.auth.application.token.refresh.RefreshTokenRotationResult;
import kr.rilog.domain.auth.application.token.refresh.RefreshTokenRotator;
import kr.rilog.domain.auth.exception.AuthException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.REFRESH_TOKEN_MISSING;

@RestController
@RequiredArgsConstructor
public class AuthTokenController {

    private static final String REFRESH_TOKEN_COOKIE_NAME = "refresh_token";

    private final RefreshTokenRotator refreshTokenRotator;
    private final RefreshTokenLogoutService refreshTokenLogoutService;
    private final RefreshTokenCookieFactory refreshTokenCookieFactory;

    @PostMapping("/v1/auth/token/refresh")
    public ResponseEntity<Void> refresh(
            @CookieValue(name = REFRESH_TOKEN_COOKIE_NAME, required = false) String refreshTokenValue
    ) {
        RefreshToken refreshToken = refreshTokenFrom(refreshTokenValue);
        RefreshTokenRotationResult result = refreshTokenRotator.rotate(refreshToken);
        ResponseCookie refreshTokenCookie = refreshTokenCookieFactory.create(result.refreshToken());

        return ResponseEntity.noContent()
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + result.accessToken().value())
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString())
                .build();
    }

    @PostMapping("/v1/auth/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = REFRESH_TOKEN_COOKIE_NAME, required = false) String refreshTokenValue
    ) {
        RefreshToken refreshToken = refreshTokenFromOrNull(refreshTokenValue);
        if (refreshToken != null) {
            refreshTokenLogoutService.logout(refreshToken);
        }

        ResponseCookie expiredCookie = refreshTokenCookieFactory.expire();
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, expiredCookie.toString())
                .build();
    }

    private RefreshToken refreshTokenFrom(String refreshTokenValue) {
        RefreshToken refreshToken = refreshTokenFromOrNull(refreshTokenValue);
        if (refreshToken != null) {
            return refreshToken;
        }

        throw new AuthException(REFRESH_TOKEN_MISSING);
    }

    private RefreshToken refreshTokenFromOrNull(String refreshTokenValue) {
        if (StringUtils.hasText(refreshTokenValue)) {
            return RefreshToken.of(refreshTokenValue);
        }

        return null;
    }
}
