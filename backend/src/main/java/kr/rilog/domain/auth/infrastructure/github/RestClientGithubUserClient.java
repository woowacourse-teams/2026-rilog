package kr.rilog.domain.auth.infrastructure.github;

import kr.rilog.domain.auth.application.GithubOAuthUser;
import kr.rilog.domain.auth.application.port.GithubUserClient;
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
public class RestClientGithubUserClient implements GithubUserClient {

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
    public GithubOAuthUser getUser(String accessToken) {
        try {
            GithubUserResponse response = restClient.get()
                    .uri(properties.userUri())
                    .accept(GITHUB_JSON)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(GithubUserResponse.class);

            if (isInvalid(response)) {
                throw new AuthException(GITHUB_USER_FETCH_FAILED);
            }

            return new GithubOAuthUser(response.id(), response.login(), response.avatarUrl());
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
