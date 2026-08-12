package kr.rilog.domain.auth.application;

import kr.rilog.domain.auth.application.port.OAuthAuthorizationUrlProvider;
import kr.rilog.domain.auth.application.port.OAuthLoginAttemptStore;
import kr.rilog.domain.auth.exception.AuthException;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.OAUTH_PROVIDER_UNSUPPORTED;

@Service
public class StartOAuthLogin {

    private static final int STATE_BYTE_LENGTH = 32;

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

    public URI start(SocialLoginProvider provider) {
        OAuthAuthorizationUrlProvider authorizationUrlProvider = authorizationUrlProvider(provider);

        String state = generateState();
        loginAttemptStore.save(provider, state, authorizationUrlProvider.stateTtl());

        return authorizationUrlProvider.createAuthorizationUri(state);
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
