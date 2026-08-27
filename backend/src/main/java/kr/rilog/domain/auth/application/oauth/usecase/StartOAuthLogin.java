package kr.rilog.domain.auth.application.oauth.usecase;

import kr.rilog.domain.auth.application.oauth.model.OAuthLoginAttempt;
import kr.rilog.domain.auth.application.oauth.model.SocialLoginProvider;
import kr.rilog.domain.auth.application.port.oauth.OAuthAuthorizationUrlProvider;
import kr.rilog.domain.auth.application.port.oauth.OAuthLoginAttemptStore;
import kr.rilog.domain.auth.exception.AuthException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.INVALID_OAUTH_REDIRECT_URL;
import static kr.rilog.domain.auth.exception.AuthErrorInformation.OAUTH_PROVIDER_UNSUPPORTED;

@Service
public class StartOAuthLogin {

    private static final int STATE_BYTE_LENGTH = 32;
    private static final String DEFAULT_REDIRECT_URL = "/";

    private final OAuthLoginAttemptStore loginAttemptStore;
    private final Map<SocialLoginProvider, OAuthAuthorizationUrlProvider> authorizationUrlProviders;
    private final SecureRandom secureRandom = new SecureRandom();

    public StartOAuthLogin(
            OAuthLoginAttemptStore loginAttemptStore,
            List<OAuthAuthorizationUrlProvider> authorizationUrlProviders
    ) {
        this.loginAttemptStore = loginAttemptStore;
        this.authorizationUrlProviders = authorizationUrlProviders.stream()
                .collect(Collectors.toUnmodifiableMap(
                        OAuthAuthorizationUrlProvider::provider,
                        Function.identity()
                ));
    }

    public URI start(SocialLoginProvider provider, String redirectUrl) {
        OAuthAuthorizationUrlProvider authorizationUrlProvider = authorizationUrlProvider(provider);

        String state = generateState();
        OAuthLoginAttempt attempt = new OAuthLoginAttempt(state, normalizeRedirectUrl(redirectUrl));
        loginAttemptStore.save(provider, attempt, authorizationUrlProvider.stateTtl());

        return authorizationUrlProvider.createAuthorizationUri(state);
    }

    private String normalizeRedirectUrl(String redirectUrl) {
        if (!StringUtils.hasText(redirectUrl)) {
            return DEFAULT_REDIRECT_URL;
        }
        if (!redirectUrl.startsWith("/")
                || redirectUrl.startsWith("//")
                || containsLineBreak(redirectUrl)
                || containsBackslash(redirectUrl)) {
            throw new AuthException(INVALID_OAUTH_REDIRECT_URL);
        }
        return redirectUrl;
    }

    private boolean containsLineBreak(String value) {
        return value.indexOf('\n') >= 0 || value.indexOf('\r') >= 0;
    }

    private boolean containsBackslash(String value) {
        return value.indexOf('\\') >= 0;
    }

    private OAuthAuthorizationUrlProvider authorizationUrlProvider(SocialLoginProvider provider) {
        OAuthAuthorizationUrlProvider authorizationUrlProvider = authorizationUrlProviders.get(provider);
        if (authorizationUrlProvider == null) {
            throw new AuthException(OAUTH_PROVIDER_UNSUPPORTED);
        }
        return authorizationUrlProvider;
    }

    private String generateState() {
        byte[] bytes = new byte[STATE_BYTE_LENGTH];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(bytes);
    }

}
