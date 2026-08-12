package kr.rilog.auth.infrastructure.github;

import java.net.URI;
import kr.rilog.auth.application.port.GithubOAuthGateway;
import kr.rilog.auth.domain.GithubIdentity;
import kr.rilog.global.exception.AuthErrorInformation;
import kr.rilog.global.exception.AuthException;
import kr.rilog.global.exception.AuthFailureReason;
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
        GithubTokenResponse token = exchangeCodeSafely(code, codeVerifier);
        if (token == null || token.accessToken() == null || token.accessToken().isBlank()) {
            throw failure(AuthFailureReason.GITHUB_TOKEN_RESPONSE_INVALID);
        }

        GithubUserResponse user = fetchUserSafely(token.accessToken());
        if (user == null) {
            throw failure(AuthFailureReason.GITHUB_USER_RESPONSE_INVALID);
        }
        try {
            return new GithubIdentity(
                    user.id(), user.avatarUrl(), user.htmlUrl(), user.email()
            );
        } catch (IllegalArgumentException exception) {
            throw failure(AuthFailureReason.GITHUB_USER_RESPONSE_INVALID);
        }
    }

    private GithubTokenResponse exchangeCodeSafely(String code, String codeVerifier) {
        try {
            return exchangeCode(code, codeVerifier);
        } catch (RestClientException exception) {
            throw failure(AuthFailureReason.GITHUB_TOKEN_REQUEST_FAILED);
        }
    }

    private GithubUserResponse fetchUserSafely(String accessToken) {
        try {
            return restClient.get()
                    .uri(userEndpoint)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .header(HttpHeaders.ACCEPT, "application/vnd.github+json")
                    .header("X-GitHub-Api-Version", "2022-11-28")
                    .retrieve()
                    .body(GithubUserResponse.class);
        } catch (RestClientException exception) {
            throw failure(AuthFailureReason.GITHUB_USER_REQUEST_FAILED);
        }
    }

    private AuthException failure(AuthFailureReason reason) {
        return new AuthException(AuthErrorInformation.GITHUB_OAUTH_FAILED, reason);
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
