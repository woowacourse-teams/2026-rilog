package kr.rilog.domain.auth.infrastructure.github;

import kr.rilog.domain.auth.application.oauth.model.OAuthAccessToken;
import kr.rilog.domain.auth.application.oauth.model.SocialLoginProvider;
import kr.rilog.domain.auth.application.oauth.model.SocialLoginUser;
import kr.rilog.domain.auth.application.port.oauth.OAuthUserClient;
import kr.rilog.domain.auth.config.GithubOAuthProperties;
import kr.rilog.domain.auth.exception.AuthException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.GITHUB_USER_FETCH_FAILED;

@Component
public class RestClientGithubUserClient implements OAuthUserClient {

    private static final MediaType GITHUB_JSON = MediaType.valueOf("application/vnd.github+json");

    private final RestClient restClient;
    private final GithubOAuthProperties properties;

    public RestClientGithubUserClient(
            @Qualifier("githubOAuthRestClient") RestClient restClient,
            GithubOAuthProperties properties
    ) {
        this.restClient = restClient;
        this.properties = properties;
    }

    @Override
    public SocialLoginProvider provider() {
        return SocialLoginProvider.GITHUB;
    }

    @Override
    public SocialLoginUser getUser(OAuthAccessToken accessToken) {
        try {
            GithubUserResponse response = restClient.get()
                    .uri(properties.userUri())
                    .accept(GITHUB_JSON)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken.value())
                    .retrieve()
                    .body(GithubUserResponse.class);

            if (isInvalid(response)) {
                throw new AuthException(GITHUB_USER_FETCH_FAILED);
            }

            return new SocialLoginUser(
                    SocialLoginProvider.GITHUB,
                    String.valueOf(response.id()),
                    response.login(),
                    response.avatarUrl()
            );
        } catch (AuthException exception) {
            throw exception;
        } catch (RestClientException exception) {
            throw new AuthException(GITHUB_USER_FETCH_FAILED);
        }
    }

    private boolean isInvalid(GithubUserResponse response) {
        return response == null
                || response.id() == null
                || !StringUtils.hasText(response.login())
                || !StringUtils.hasText(response.avatarUrl());
    }

}
