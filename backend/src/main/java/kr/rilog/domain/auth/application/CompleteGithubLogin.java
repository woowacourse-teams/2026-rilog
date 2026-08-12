package kr.rilog.domain.auth.application;

import kr.rilog.domain.auth.application.port.OAuthLoginAttemptStore;
import kr.rilog.domain.auth.application.port.GithubAccessTokenClient;
import kr.rilog.domain.auth.application.port.GithubUserClient;
import kr.rilog.domain.auth.exception.AuthException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.GITHUB_OAUTH_CALLBACK_PARAMETER_MISSING;
import static kr.rilog.domain.auth.exception.AuthErrorInformation.INVALID_GITHUB_OAUTH_STATE;

@Service
public class CompleteGithubLogin {

    private final OAuthLoginAttemptStore loginAttemptStore;
    private final GithubAccessTokenClient accessTokenClient;
    private final GithubUserClient userClient;

    public CompleteGithubLogin(
            OAuthLoginAttemptStore loginAttemptStore,
            GithubAccessTokenClient accessTokenClient,
            GithubUserClient userClient
    ) {
        this.loginAttemptStore = loginAttemptStore;
        this.accessTokenClient = accessTokenClient;
        this.userClient = userClient;
    }

    public GithubOAuthUser complete(String code, String state) {
        if (!StringUtils.hasText(code) || !StringUtils.hasText(state)) {
            throw new AuthException(GITHUB_OAUTH_CALLBACK_PARAMETER_MISSING);
        }

        boolean consumed = loginAttemptStore.consume(state);
        if (!consumed) {
            throw new AuthException(INVALID_GITHUB_OAUTH_STATE);
        }

        GithubAccessToken accessToken = accessTokenClient.exchange(code);
        return userClient.getUser(accessToken.value());
    }

}
