package kr.rilog.domain.auth.infrastructure.github;

import kr.rilog.domain.auth.application.oauth.model.OAuthAccessToken;
import kr.rilog.domain.auth.application.oauth.model.SocialLoginProvider;
import kr.rilog.domain.auth.application.port.oauth.OAuthAccessTokenClient;
import kr.rilog.domain.auth.config.GithubOAuthProperties;
import kr.rilog.global.exception.RilogInfrastructureException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.ResourceAccessException;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED;

@Component
public class RestClientGithubAccessTokenClient implements OAuthAccessTokenClient {

    private final RestClient restClient;
    private final GithubOAuthProperties properties;

    public RestClientGithubAccessTokenClient(
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
    public OAuthAccessToken exchange(String code) {
        long startedAt = System.nanoTime();
        try {
            ResponseEntity<GithubAccessTokenResponse> responseEntity = restClient.post()
                    .uri(properties.tokenUri())
                    .accept(MediaType.APPLICATION_JSON)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(tokenRequestForm(code))
                    .retrieve()
                    .toEntity(GithubAccessTokenResponse.class);
            GithubAccessTokenResponse response = responseEntity.getBody();

            if (response == null || !StringUtils.hasText(response.accessToken())) {
                throw exchangeFailure(startedAt, "INVALID_RESPONSE", responseEntity.getStatusCode().value(), null);
            }

            return new OAuthAccessToken(response.accessToken());
        } catch (RestClientResponseException exception) {
            throw exchangeFailure(startedAt, "HTTP_ERROR", exception.getStatusCode().value(), exception);
        } catch (ResourceAccessException exception) {
            throw exchangeFailure(startedAt, "IO_ERROR", null, exception);
        } catch (RestClientException exception) {
            throw exchangeFailure(startedAt, "CLIENT_ERROR", null, exception);
        }
    }

    private RilogInfrastructureException exchangeFailure(
            long startedAt, String failureType, Integer externalStatus, Throwable cause
    ) {
        Map<String, Object> context = new HashMap<>(Map.of(
                "provider", provider().name(),
                "operation", "exchange_access_token",
                "durationMs", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt),
                "failureType", failureType
        ));
        if (externalStatus != null) {
            context.put("externalStatus", externalStatus);
        }
        return new RilogInfrastructureException(
                GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED, GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED.getMessage(), cause, context
        );
    }

    private MultiValueMap<String, String> tokenRequestForm(String code) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", properties.clientId());
        form.add("client_secret", properties.clientSecret());
        form.add("code", code);
        form.add("redirect_uri", properties.callbackUri().toString());
        return form;
    }

}
