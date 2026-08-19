package kr.rilog.domain.auth.presentation;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshTokenLogoutService;
import kr.rilog.domain.auth.application.token.refresh.RefreshTokenRotationResult;
import kr.rilog.domain.auth.application.token.refresh.RefreshTokenRotator;
import kr.rilog.domain.auth.config.RefreshTokenProperties;
import kr.rilog.domain.auth.exception.AuthException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.REFRESH_TOKEN_MISSING;

@RestController
@RequiredArgsConstructor
public class AuthTokenController {

    private final RefreshTokenRotator refreshTokenRotator;
    private final RefreshTokenLogoutService refreshTokenLogoutService;
    private final RefreshTokenCookieFactory refreshTokenCookieFactory;
    private final RefreshTokenProperties properties;

    @PostMapping("/v1/auth/token/refresh")
    public ResponseEntity<Void> refresh(HttpServletRequest request) {
        RefreshToken refreshToken = refreshTokenFrom(request);
        RefreshTokenRotationResult result = refreshTokenRotator.rotate(refreshToken);
        ResponseCookie refreshTokenCookie = refreshTokenCookieFactory.create(result.refreshToken());

        return ResponseEntity.noContent()
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + result.accessToken().value())
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString())
                .build();
    }

    @PostMapping("/v1/auth/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        RefreshToken refreshToken = refreshTokenFromOrNull(request);
        if (refreshToken != null) {
            refreshTokenLogoutService.logout(refreshToken);
        }

        ResponseCookie expiredCookie = refreshTokenCookieFactory.expire();
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, expiredCookie.toString())
                .build();
    }

    private RefreshToken refreshTokenFrom(HttpServletRequest request) {
        RefreshToken refreshToken = refreshTokenFromOrNull(request);
        if (refreshToken != null) {
            return refreshToken;
        }

        throw new AuthException(REFRESH_TOKEN_MISSING);
    }

    private RefreshToken refreshTokenFromOrNull(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }

        for (Cookie cookie : cookies) {
            if (properties.cookieName().equals(cookie.getName()) && StringUtils.hasText(cookie.getValue())) {
                return RefreshToken.of(cookie.getValue());
            }
        }

        return null;
    }
}
