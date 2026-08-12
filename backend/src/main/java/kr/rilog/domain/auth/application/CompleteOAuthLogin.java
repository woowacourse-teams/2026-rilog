package kr.rilog.domain.auth.application;

import kr.rilog.domain.auth.application.port.OAuthAccessTokenClient;
import kr.rilog.domain.auth.application.port.OAuthLoginAttemptStore;
import kr.rilog.domain.auth.application.port.OAuthUserClient;
import kr.rilog.domain.auth.exception.AuthException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.INVALID_OAUTH_STATE;
import static kr.rilog.domain.auth.exception.AuthErrorInformation.OAUTH_CALLBACK_PARAMETER_MISSING;
import static kr.rilog.domain.auth.exception.AuthErrorInformation.OAUTH_PROVIDER_UNSUPPORTED;

@Service
public class CompleteOAuthLogin {

    private final OAuthLoginAttemptStore loginAttemptStore;
    private final Map<SocialLoginProvider, OAuthAccessTokenClient> accessTokenClients;
    private final Map<SocialLoginProvider, OAuthUserClient> userClients;

    public CompleteOAuthLogin(
            OAuthLoginAttemptStore loginAttemptStore,
            List<OAuthAccessTokenClient> accessTokenClients,
            List<OAuthUserClient> userClients
    ) {
        this.loginAttemptStore = loginAttemptStore;
        this.accessTokenClients = accessTokenClients.stream()
                .collect(Collectors.toUnmodifiableMap(
                        OAuthAccessTokenClient::provider,
                        Function.identity()
                ));
        this.userClients = userClients.stream()
                .collect(Collectors.toUnmodifiableMap(
                        OAuthUserClient::provider,
                        Function.identity()
                ));
    }

    public SocialLoginUser complete(SocialLoginProvider provider, String code, String state) {
        if (!StringUtils.hasText(code) || !StringUtils.hasText(state)) {
            throw new AuthException(OAUTH_CALLBACK_PARAMETER_MISSING);
        }

        OAuthAccessTokenClient accessTokenClient = accessTokenClient(provider);
        OAuthUserClient userClient = userClient(provider);

        boolean consumed = loginAttemptStore.consume(provider, state);
        if (!consumed) {
            throw new AuthException(INVALID_OAUTH_STATE);
        }

        OAuthAccessToken accessToken = accessTokenClient.exchange(code);
        return userClient.getUser(accessToken);
    }

    private OAuthAccessTokenClient accessTokenClient(SocialLoginProvider provider) {
        OAuthAccessTokenClient accessTokenClient = accessTokenClients.get(provider);
        if (accessTokenClient == null) {
            throw new AuthException(OAUTH_PROVIDER_UNSUPPORTED);
        }
        return accessTokenClient;
    }

    private OAuthUserClient userClient(SocialLoginProvider provider) {
        OAuthUserClient userClient = userClients.get(provider);
        if (userClient == null) {
            throw new AuthException(OAUTH_PROVIDER_UNSUPPORTED);
        }
        return userClient;
    }

}
