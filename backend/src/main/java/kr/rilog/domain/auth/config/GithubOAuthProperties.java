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
        String scope
) {

    private static final URI DEFAULT_CALLBACK_URI = URI.create("http://localhost:8080/v1/auth/github/callback");
    private static final Duration DEFAULT_STATE_TTL = Duration.ofMinutes(5);
    private static final String DEFAULT_SCOPE = "read:user,user:email";

    public GithubOAuthProperties {
        if (callbackUri == null) {
            callbackUri = DEFAULT_CALLBACK_URI;
        }
        if (stateTtl == null) {
            stateTtl = DEFAULT_STATE_TTL;
        }
        if (!StringUtils.hasText(scope)) {
            scope = DEFAULT_SCOPE;
        }
    }

}
