package kr.rilog.domain.auth.application;

import kr.rilog.domain.auth.application.port.OAuthLoginAttemptStore;
import kr.rilog.domain.auth.config.GithubOAuthProperties;
import kr.rilog.domain.auth.exception.AuthException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.security.SecureRandom;
import java.util.Base64;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.GITHUB_OAUTH_CONFIGURATION_INVALID;

@Service
public class StartGithubLogin {

    private static final String GITHUB_AUTHORIZATION_ENDPOINT = "https://github.com/login/oauth/authorize";
    private static final int STATE_BYTE_LENGTH = 32;

    private final OAuthLoginAttemptStore loginAttemptStore;
    private final GithubOAuthProperties properties;
    private final SecureRandom secureRandom;

    @Autowired
    public StartGithubLogin(OAuthLoginAttemptStore loginAttemptStore, GithubOAuthProperties properties) {
        this(loginAttemptStore, properties, new SecureRandom());
    }

    StartGithubLogin(
            OAuthLoginAttemptStore loginAttemptStore,
            GithubOAuthProperties properties,
            SecureRandom secureRandom
    ) {
        this.loginAttemptStore = loginAttemptStore;
        this.properties = properties;
        this.secureRandom = secureRandom;
    }

    public URI start() {
        validateConfiguration();

        String state = generateState();
        loginAttemptStore.save(state, properties.stateTtl());

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

    private String generateState() {
        byte[] bytes = new byte[STATE_BYTE_LENGTH];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(bytes);
    }

}
