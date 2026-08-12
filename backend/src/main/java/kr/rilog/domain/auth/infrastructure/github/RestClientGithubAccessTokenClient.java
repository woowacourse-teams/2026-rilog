package kr.rilog.domain.auth.infrastructure.github;

import kr.rilog.domain.auth.application.OAuthAccessToken;
import kr.rilog.domain.auth.application.SocialLoginProvider;
import kr.rilog.domain.auth.application.port.OAuthAccessTokenClient;
import kr.rilog.domain.auth.config.GithubOAuthProperties;
import kr.rilog.domain.auth.exception.AuthException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

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
        try {
            GithubAccessTokenResponse response = restClient.post()
                    .uri(properties.tokenUri())
                    .accept(MediaType.APPLICATION_JSON)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(tokenRequestForm(code))
                    .retrieve()
                    .body(GithubAccessTokenResponse.class);

            if (response == null || !StringUtils.hasText(response.accessToken())) {
                throw new AuthException(GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED);
            }

            return new OAuthAccessToken(response.accessToken());
        } catch (AuthException exception) {
            throw exception;
        } catch (RestClientException exception) {
            throw new AuthException(GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED);
        }
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
