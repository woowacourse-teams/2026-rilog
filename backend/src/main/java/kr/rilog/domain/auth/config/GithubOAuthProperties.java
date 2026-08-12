package kr.rilog.domain.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

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

    private static final URI DEFAULT_CALLBACK_URI = URI.create("http://localhost:8080/v1/auth/github/callback");
    private static final URI DEFAULT_TOKEN_URI = URI.create("https://github.com/login/oauth/access_token");
    private static final URI DEFAULT_USER_URI = URI.create("https://api.github.com/user");
    private static final Duration DEFAULT_STATE_TTL = Duration.ofMinutes(5);
    private static final Duration DEFAULT_CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration DEFAULT_READ_TIMEOUT = Duration.ofSeconds(3);
    private static final String DEFAULT_SCOPE = "read:user,user:email";

    public GithubOAuthProperties(
            String clientId,
            String clientSecret,
            URI callbackUri,
            Duration stateTtl,
            String scope
    ) {
        this(clientId, clientSecret, callbackUri, stateTtl, scope, null, null, null, null);
    }

    public GithubOAuthProperties {
        if (callbackUri == null) {
            callbackUri = DEFAULT_CALLBACK_URI;
        }
        if (tokenUri == null) {
            tokenUri = DEFAULT_TOKEN_URI;
        }
        if (userUri == null) {
            userUri = DEFAULT_USER_URI;
        }
        if (stateTtl == null) {
            stateTtl = DEFAULT_STATE_TTL;
        }
        if (connectTimeout == null) {
            connectTimeout = DEFAULT_CONNECT_TIMEOUT;
        }
        if (readTimeout == null) {
            readTimeout = DEFAULT_READ_TIMEOUT;
        }
        if (!StringUtils.hasText(scope)) {
            scope = DEFAULT_SCOPE;
        }
    }

}
