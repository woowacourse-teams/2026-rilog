package kr.rilog.domain.auth.infrastructure.github;

import kr.rilog.domain.auth.application.oauth.OAuthAccessToken;
import kr.rilog.domain.auth.application.oauth.SocialLoginProvider;
import kr.rilog.domain.auth.config.GithubOAuthProperties;
import kr.rilog.domain.auth.exception.AuthErrorInformation;
import kr.rilog.domain.auth.exception.AuthException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class RestClientGithubAccessTokenClientTest {

    @Test
    @DisplayName("Authorization Code를 GitHub Access Token으로 교환한다")
    void exchangeRequestsGithubAccessToken() {
        // given
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RestClientGithubAccessTokenClient client = new RestClientGithubAccessTokenClient(
                builder.build(),
                properties()
        );
        MultiValueMap<String, String> expectedForm = new LinkedMultiValueMap<>();
        expectedForm.add("client_id", "github-client-id");
        expectedForm.add("client_secret", "github-client-secret");
        expectedForm.add("code", "github-code");
        expectedForm.add("redirect_uri", "http://localhost:8080/v1/auth/github/callback");

        server.expect(requestTo("https://github.example/login/oauth/access_token"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Accept", MediaType.APPLICATION_JSON_VALUE))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_FORM_URLENCODED))
                .andExpect(content().formData(expectedForm))
                .andRespond(withSuccess("""
                        {
                          "access_token": "github-access-token",
                          "token_type": "bearer",
                          "scope": "read:user,user:email"
                        }
                        """, MediaType.APPLICATION_JSON));

        // when
        OAuthAccessToken accessToken = client.exchange("github-code");

        // then
        assertThat(client.provider()).isEqualTo(SocialLoginProvider.GITHUB);
        assertThat(accessToken.value()).isEqualTo("github-access-token");
        server.verify();
    }

    @Test
    @DisplayName("GitHub Access Token 응답이 올바르지 않으면 예외를 던진다")
    void exchangeRejectsInvalidTokenResponse() {
        // given
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RestClientGithubAccessTokenClient client = new RestClientGithubAccessTokenClient(
                builder.build(),
                properties()
        );

        server.expect(requestTo("https://github.example/login/oauth/access_token"))
                .andRespond(withSuccess("""
                        {
                          "token_type": "bearer",
                          "scope": "read:user,user:email"
                        }
                        """, MediaType.APPLICATION_JSON));

        // when
        // when - then
        assertThatThrownBy(() -> client.exchange("github-code"))
                .isInstanceOf(AuthException.class)
                .hasMessageNotContaining("github-code")
                .hasMessageNotContaining("github-client-secret")
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED);
        server.verify();
    }

    @Test
    @DisplayName("GitHub Access Token 교환 실패 예외에는 code와 secret을 담지 않는다")
    void exchangeFailureDoesNotExposeSensitiveValues() {
        // given
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RestClientGithubAccessTokenClient client = new RestClientGithubAccessTokenClient(
                builder.build(),
                properties()
        );

        server.expect(requestTo("https://github.example/login/oauth/access_token"))
                .andRespond(withBadRequest());

        // when
        // when - then
        assertThatThrownBy(() -> client.exchange("github-code"))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED);
        server.verify();
    }

    private GithubOAuthProperties properties() {
        return GithubOAuthProperties.of(
                "github-client-id",
                "github-client-secret",
                URI.create("http://localhost:8080/v1/auth/github/callback"),
                Duration.ofMinutes(5),
                "read:user,user:email",
                URI.create("https://github.example/login/oauth/access_token"),
                URI.create("https://api.github.example/user"),
                Duration.ofSeconds(2),
                Duration.ofSeconds(3)
        );
    }
}
