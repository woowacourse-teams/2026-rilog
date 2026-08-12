package kr.rilog.auth.infrastructure.github;

import java.net.URI;
import java.util.Objects;
import kr.rilog.auth.application.port.GithubOAuthGateway;
import kr.rilog.auth.domain.GithubIdentity;
import kr.rilog.global.exception.AuthErrorInformation;
import kr.rilog.global.exception.AuthException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

public class GithubHttpClient implements GithubOAuthGateway {

    private final RestClient restClient;
    private final URI authorizationEndpoint;
    private final URI tokenEndpoint;
    private final URI userEndpoint;
    private final String clientId;
    private final String clientSecret;
    private final URI callbackUri;

    public GithubHttpClient(
            RestClient restClient,
            URI authorizationEndpoint,
            URI tokenEndpoint,
            URI userEndpoint,
            String clientId,
            String clientSecret,
            URI callbackUri
    ) {
        this.restClient = restClient;
        this.authorizationEndpoint = authorizationEndpoint;
        this.tokenEndpoint = tokenEndpoint;
        this.userEndpoint = userEndpoint;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.callbackUri = callbackUri;
    }

    @Override
    public URI buildAuthorizationUri(String state, String codeChallenge) {
        return UriComponentsBuilder.fromUri(authorizationEndpoint)
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", callbackUri)
                .queryParam("state", state)
                .queryParam("code_challenge", codeChallenge)
                .queryParam("code_challenge_method", "S256")
                .encode()
                .build()
                .toUri();
    }

    @Override
    public GithubIdentity fetchIdentity(String code, String codeVerifier) {
        try {
            GithubTokenResponse token = exchangeCode(code, codeVerifier);
            if (token == null || token.accessToken() == null || token.accessToken().isBlank()) {
                throw new AuthException(AuthErrorInformation.GITHUB_OAUTH_FAILED);
            }
            GithubUserResponse user = restClient.get()
                    .uri(userEndpoint)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token.accessToken())
                    .header(HttpHeaders.ACCEPT, "application/vnd.github+json")
                    .header("X-GitHub-Api-Version", "2022-11-28")
                    .retrieve()
                    .body(GithubUserResponse.class);
            Objects.requireNonNull(user, "GitHub user response must not be null");
            return new GithubIdentity(
                    user.id(), user.avatarUrl(), user.htmlUrl(), user.email()
            );
        } catch (RestClientException | IllegalArgumentException | NullPointerException exception) {
            throw new AuthException(AuthErrorInformation.GITHUB_OAUTH_FAILED);
        }
    }

    private GithubTokenResponse exchangeCode(String code, String codeVerifier) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("code", code);
        form.add("redirect_uri", callbackUri.toString());
        form.add("code_verifier", codeVerifier);
        return restClient.post()
                .uri(tokenEndpoint)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .accept(MediaType.APPLICATION_JSON)
                .body(form)
                .retrieve()
                .body(GithubTokenResponse.class);
    }
}
