package kr.rilog.domain.auth.infrastructure.github;

import kr.rilog.domain.auth.application.OAuthAccessToken;
import kr.rilog.domain.auth.application.SocialLoginProvider;
import kr.rilog.domain.auth.application.SocialLoginUser;
import kr.rilog.domain.auth.config.GithubOAuthProperties;
import kr.rilog.domain.auth.exception.AuthErrorInformation;
import kr.rilog.domain.auth.exception.AuthException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withUnauthorizedRequest;

class RestClientGithubUserClientTest {

    @Test
    @DisplayName("GitHub Access Token으로 인증된 사용자 정보를 조회한다")
    void getUserRequestsAuthenticatedGithubUser() {
        // given
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RestClientGithubUserClient client = new RestClientGithubUserClient(builder.build(), properties());

        server.expect(requestTo("https://api.github.example/user"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Accept", "application/vnd.github+json"))
                .andExpect(header("Authorization", "Bearer github-access-token"))
                .andRespond(withSuccess("""
                        {
                          "id": 1,
                          "login": "octocat",
                          "avatar_url": "https://github.com/images/error/octocat_happy.gif"
                        }
                        """, MediaType.APPLICATION_JSON));

        // when
        SocialLoginUser user = client.getUser(new OAuthAccessToken("github-access-token"));

        // then
        assertThat(client.provider()).isEqualTo(SocialLoginProvider.GITHUB);
        assertThat(user)
                .extracting(
                        SocialLoginUser::provider,
                        SocialLoginUser::providerUserId,
                        SocialLoginUser::username,
                        SocialLoginUser::profileImageUrl
                )
                .containsExactly(
                        SocialLoginProvider.GITHUB,
                        "1",
                        "octocat",
                        "https://github.com/images/error/octocat_happy.gif"
                );
        server.verify();
    }

    @Test
    @DisplayName("GitHub 사용자 응답이 올바르지 않으면 예외를 던진다")
    void getUserRejectsInvalidUserResponse() {
        // given
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RestClientGithubUserClient client = new RestClientGithubUserClient(builder.build(), properties());

        server.expect(requestTo("https://api.github.example/user"))
                .andRespond(withSuccess("""
                        {
                          "login": "octocat",
                          "avatar_url": "https://github.com/images/error/octocat_happy.gif"
                        }
                        """, MediaType.APPLICATION_JSON));

        // when
        // when - then
        assertThatThrownBy(() -> client.getUser(new OAuthAccessToken("github-access-token")))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.GITHUB_USER_FETCH_FAILED);
        server.verify();
    }

    @Test
    @DisplayName("GitHub 사용자 조회 실패 예외에는 access token을 담지 않는다")
    void getUserFailureDoesNotExposeAccessToken() {
        // given
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RestClientGithubUserClient client = new RestClientGithubUserClient(builder.build(), properties());

        server.expect(requestTo("https://api.github.example/user"))
                .andRespond(withUnauthorizedRequest());

        // when
        // when - then
        assertThatThrownBy(() -> client.getUser(new OAuthAccessToken("github-access-token")))
                .isInstanceOf(AuthException.class)
                .hasMessageNotContaining("github-access-token")
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.GITHUB_USER_FETCH_FAILED);
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
