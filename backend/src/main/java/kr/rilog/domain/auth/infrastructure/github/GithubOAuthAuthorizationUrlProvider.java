package kr.rilog.domain.auth.infrastructure.github;

import kr.rilog.domain.auth.application.oauth.SocialLoginProvider;
import kr.rilog.domain.auth.application.port.oauth.OAuthAuthorizationUrlProvider;
import kr.rilog.domain.auth.config.GithubOAuthProperties;
import kr.rilog.domain.auth.exception.AuthException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.GITHUB_OAUTH_CONFIGURATION_INVALID;

@Component
public class GithubOAuthAuthorizationUrlProvider implements OAuthAuthorizationUrlProvider {

    private static final String GITHUB_AUTHORIZATION_ENDPOINT = "https://github.com/login/oauth/authorize";

    private final GithubOAuthProperties properties;

    public GithubOAuthAuthorizationUrlProvider(GithubOAuthProperties properties) {
        this.properties = properties;
    }

    @Override
    public SocialLoginProvider provider() {
        return SocialLoginProvider.GITHUB;
    }

    @Override
    public Duration stateTtl() {
        return properties.stateTtl();
    }

    @Override
    public URI createAuthorizationUri(String state) {
        validateConfiguration();

        return UriComponentsBuilder.fromUriString(GITHUB_AUTHORIZATION_ENDPOINT)
                .queryParam("client_id", properties.clientId())
                .queryParam("redirect_uri", properties.callbackUri())
                .queryParam("scope", properties.scope())
                .queryParam("state", state)
                .build()
                .encode()
                .toUri();
    }

    private void validateConfiguration() {
        if (!StringUtils.hasText(properties.clientId()) || properties.callbackUri() == null) {
            throw new AuthException(GITHUB_OAUTH_CONFIGURATION_INVALID);
        }
    }
}
