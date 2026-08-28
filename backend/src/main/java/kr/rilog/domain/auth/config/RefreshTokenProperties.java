package kr.rilog.domain.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "auth.refresh-token")
public record RefreshTokenProperties(
        Duration expiration,
        String cookieName,
        String cookiePath,
        boolean cookieSecure,
        String cookieSameSite
) {

    private static final Duration DEFAULT_EXPIRATION = Duration.ofDays(14);
    private static final String DEFAULT_COOKIE_NAME = "refresh_token";
    private static final String DEFAULT_COOKIE_PATH = "/v1/auth";
    private static final String DEFAULT_COOKIE_SAME_SITE = "Lax";

    public RefreshTokenProperties {
        expiration = defaultExpiration(expiration);
        cookieName = defaultCookieName(cookieName);
        cookiePath = defaultCookiePath(cookiePath);
        cookieSameSite = defaultCookieSameSite(cookieSameSite);
    }

    public static RefreshTokenProperties of(
            Duration expiration,
            String cookieName,
            String cookiePath,
            boolean cookieSecure,
            String cookieSameSite
    ) {
        return new RefreshTokenProperties(
                expiration,
                cookieName,
                cookiePath,
                cookieSecure,
                cookieSameSite
        );
    }

    private static Duration defaultExpiration(Duration expiration) {
        if (expiration == null) {
            return DEFAULT_EXPIRATION;
        }
        return expiration;
    }

    private static String defaultCookieName(String cookieName) {
        if (cookieName == null || cookieName.isBlank()) {
            return DEFAULT_COOKIE_NAME;
        }
        return cookieName;
    }

    private static String defaultCookiePath(String cookiePath) {
        if (cookiePath == null || cookiePath.isBlank()) {
            return DEFAULT_COOKIE_PATH;
        }
        return cookiePath;
    }

    private static String defaultCookieSameSite(String cookieSameSite) {
        if (cookieSameSite == null || cookieSameSite.isBlank()) {
            return DEFAULT_COOKIE_SAME_SITE;
        }
        return cookieSameSite;
    }

}
