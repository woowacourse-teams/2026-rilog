package kr.rilog.domain.auth.infrastructure.github;

import kr.rilog.domain.auth.application.oauth.model.OAuthAccessToken;
import kr.rilog.domain.auth.application.oauth.model.SocialLoginProvider;
import kr.rilog.domain.auth.application.oauth.model.SocialLoginUser;
import kr.rilog.domain.auth.application.port.oauth.OAuthUserClient;
import kr.rilog.domain.auth.config.GithubOAuthProperties;
import kr.rilog.global.exception.RilogInfrastructureException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.ResourceAccessException;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

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
        long startedAt = System.nanoTime();
        try {
            ResponseEntity<GithubUserResponse> responseEntity = restClient.get()
                    .uri(properties.userUri())
                    .accept(GITHUB_JSON)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken.value())
                    .retrieve()
                    .toEntity(GithubUserResponse.class);
            GithubUserResponse response = responseEntity.getBody();

            if (isInvalid(response)) {
                throw userFetchFailure(startedAt, "INVALID_RESPONSE", responseEntity.getStatusCode().value(), null);
            }

            return new SocialLoginUser(
                    SocialLoginProvider.GITHUB,
                    String.valueOf(response.id()),
                    response.login(),
                    response.avatarUrl()
            );
        } catch (RestClientResponseException exception) {
            throw userFetchFailure(startedAt, "HTTP_ERROR", exception.getStatusCode().value(), exception);
        } catch (ResourceAccessException exception) {
            throw userFetchFailure(startedAt, "IO_ERROR", null, exception);
        } catch (RestClientException exception) {
            throw userFetchFailure(startedAt, "CLIENT_ERROR", null, exception);
        }
    }

    private RilogInfrastructureException userFetchFailure(
            long startedAt, String failureType, Integer externalStatus, Throwable cause
    ) {
        Map<String, Object> context = new HashMap<>(Map.of(
                "provider", provider().name(),
                "operation", "fetch_user",
                "durationMs", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt),
                "failureType", failureType
        ));
        if (externalStatus != null) {
            context.put("externalStatus", externalStatus);
        }
        return new RilogInfrastructureException(
                GITHUB_USER_FETCH_FAILED, GITHUB_USER_FETCH_FAILED.getMessage(), cause, context
        );
    }

    private boolean isInvalid(GithubUserResponse response) {
        return response == null
                || response.id() == null
                || !StringUtils.hasText(response.login())
                || !StringUtils.hasText(response.avatarUrl());
    }

}
