package kr.rilog.domain.auth.presentation;

import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.auth.config.RefreshTokenProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RefreshTokenCookieFactory {

    private final RefreshTokenProperties properties;

    public ResponseCookie create(RefreshToken refreshToken) {
        return ResponseCookie.from(properties.cookieName(), refreshToken.value())
                .httpOnly(true)
                .secure(properties.cookieSecure())
                .sameSite(properties.cookieSameSite())
                .path(properties.cookiePath())
                .maxAge(properties.expiration())
                .build();
    }
}
