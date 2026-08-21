package kr.rilog.domain.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.net.URI;
import java.time.Duration;

@ConfigurationProperties(prefix = "github.oauth")
public record GithubOAuthProperties(
        String clientId,
        String clientSecret,
        URI callbackUri,
        Duration stateTtl,
        String scope,
        URI tokenUri,
        URI userUri,
        Duration connectTimeout,
        Duration readTimeout
) {

    private static final URI DEFAULT_CALLBACK_URI = URI.create("http://localhost:5173/auth/github/callback");
    private static final URI DEFAULT_TOKEN_URI = URI.create("https://github.com/login/oauth/access_token");
    private static final URI DEFAULT_USER_URI = URI.create("https://api.github.com/user");
    private static final Duration DEFAULT_STATE_TTL = Duration.ofMinutes(5);
    private static final Duration DEFAULT_CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration DEFAULT_READ_TIMEOUT = Duration.ofSeconds(3);
    private static final String DEFAULT_SCOPE = "read:user,user:email";

    public static GithubOAuthProperties of(
            String clientId, String clientSecret, URI callbackUri, Duration stateTtl, String scope
    ) {
        return of(
                clientId,
                clientSecret,
                callbackUri,
                stateTtl,
                scope,
                null,
                null,
                null,
                null
        );
    }

    public static GithubOAuthProperties of(
            String clientId,
            String clientSecret,
            URI callbackUri,
            Duration stateTtl,
            String scope,
            URI tokenUri,
            URI userUri,
            Duration connectTimeout,
            Duration readTimeout
    ) {
        return new GithubOAuthProperties(
                clientId,
                clientSecret,
                defaultCallbackUri(callbackUri),
                defaultStateTtl(stateTtl),
                defaultScope(scope),
                defaultTokenUri(tokenUri),
                defaultUserUri(userUri),
                defaultConnectTimeout(connectTimeout),
                defaultReadTimeout(readTimeout)
        );
    }

    private static URI defaultCallbackUri(URI callbackUri) {
        if (callbackUri == null) {
            return DEFAULT_CALLBACK_URI;
        }
        return callbackUri;
    }

    private static Duration defaultStateTtl(Duration stateTtl) {
        if (stateTtl == null) {
            return DEFAULT_STATE_TTL;
        }
        return stateTtl;
    }

    private static String defaultScope(String scope) {
        if (scope == null || scope.isBlank()) {
            return DEFAULT_SCOPE;
        }
        return scope;
    }

    private static URI defaultTokenUri(URI tokenUri) {
        if (tokenUri == null) {
            return DEFAULT_TOKEN_URI;
        }
        return tokenUri;
    }

    private static URI defaultUserUri(URI userUri) {
        if (userUri == null) {
            return DEFAULT_USER_URI;
        }
        return userUri;
    }

    private static Duration defaultConnectTimeout(Duration connectTimeout) {
        if (connectTimeout == null) {
            return DEFAULT_CONNECT_TIMEOUT;
        }
        return connectTimeout;
    }

    private static Duration defaultReadTimeout(Duration readTimeout) {
        if (readTimeout == null) {
            return DEFAULT_READ_TIMEOUT;
        }
        return readTimeout;
    }

}
