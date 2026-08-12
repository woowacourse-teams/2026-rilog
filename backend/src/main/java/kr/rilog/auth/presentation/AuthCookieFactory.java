package kr.rilog.auth.presentation;

import java.time.Duration;
import org.springframework.http.ResponseCookie;

public class AuthCookieFactory {

    public static final String REFRESH_COOKIE = "__Secure-rilog-refresh";
    public static final String OAUTH_BINDING_COOKIE = "__Secure-rilog-oauth-binding";

    private static final String REFRESH_PATH = "/api/auth";
    private static final String OAUTH_PATH = "/api/auth/github";

    private final boolean secure;
    private final String sameSite;
    private final Duration oauthBindingLifetime;

    public AuthCookieFactory(
            boolean secure,
            String sameSite,
            Duration oauthBindingLifetime
    ) {
        this.secure = secure;
        this.sameSite = sameSite;
        this.oauthBindingLifetime = oauthBindingLifetime;
    }

    public ResponseCookie oauthBinding(String value) {
        return cookie(OAUTH_BINDING_COOKIE, value, OAUTH_PATH, oauthBindingLifetime);
    }

    public ResponseCookie clearOAuthBinding() {
        return cookie(OAUTH_BINDING_COOKIE, "", OAUTH_PATH, Duration.ZERO);
    }

    public ResponseCookie refresh(String value, Duration maxAge) {
        return cookie(REFRESH_COOKIE, value, REFRESH_PATH, maxAge);
    }

    public ResponseCookie clearRefresh() {
        return cookie(REFRESH_COOKIE, "", REFRESH_PATH, Duration.ZERO);
    }

    private ResponseCookie cookie(
            String name,
            String value,
            String path,
            Duration maxAge
    ) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path(path)
                .maxAge(maxAge)
                .build();
    }
}
