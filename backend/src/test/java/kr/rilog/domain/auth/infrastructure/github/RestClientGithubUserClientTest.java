package kr.rilog.domain.auth.infrastructure.github;

import kr.rilog.domain.auth.application.oauth.model.OAuthAccessToken;
import kr.rilog.domain.auth.application.oauth.model.SocialLoginProvider;
import kr.rilog.domain.auth.application.oauth.model.SocialLoginUser;
import kr.rilog.domain.auth.config.GithubOAuthProperties;
import kr.rilog.domain.auth.exception.AuthErrorInformation;
import kr.rilog.global.exception.RilogInfrastructureException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.ResponseCreator;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.URI;
import java.io.IOException;
import java.time.Duration;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withUnauthorizedRequest;

class RestClientGithubUserClientTest {

    @ParameterizedTest
    @MethodSource("failedResponses")
    @DisplayName("GitHub 사용자 조회 실패는 원인 유형과 취득 가능한 외부 상태를 보존한다.")
    void userFetchFailureIncludesOperationContext(String failureType, Integer externalStatus, ResponseCreator response) {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        var client = new RestClientGithubUserClient(builder.build(), properties());
        server.expect(requestTo(properties().userUri())).andRespond(response);

        assertThatThrownBy(() -> client.getUser(new OAuthAccessToken("TEST_TOKEN")))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasMessage(AuthErrorInformation.GITHUB_USER_FETCH_FAILED.getMessage())
                .satisfies(error -> {
                    var failure = (RilogInfrastructureException) error;
                    assertThat(failure.getErrorInformation()).isEqualTo(AuthErrorInformation.GITHUB_USER_FETCH_FAILED);
                    assertThat(failure.getLogContext()).containsEntry("provider", "GITHUB")
                            .containsEntry("operation", "fetch_user")
                            .containsEntry("failureType", failureType);
                    assertThat((Long) failure.getLogContext().get("durationMs")).isGreaterThanOrEqualTo(0L);
                    if (externalStatus == null) {
                        assertThat(failure.getLogContext()).doesNotContainKey("externalStatus");
                    } else {
                        assertThat(failure.getLogContext()).containsEntry("externalStatus", externalStatus);
                    }
                    assertThat(failure.getLogContext().toString()).doesNotContain("TEST_TOKEN", "TEST_BODY");
                });
        server.verify();
    }

    private static Stream<Arguments> failedResponses() {
        return Stream.of(
                Arguments.of("HTTP_ERROR", 401, withUnauthorizedRequest().body("TEST_BODY")),
                Arguments.of("IO_ERROR", null, withException(new IOException("connection failed"))),
                Arguments.of("INVALID_RESPONSE", 200, withSuccess("", MediaType.APPLICATION_JSON)),
                Arguments.of("INVALID_RESPONSE", 200, withSuccess("{}", MediaType.APPLICATION_JSON)),
                Arguments.of("CLIENT_ERROR", null, withSuccess("{", MediaType.APPLICATION_JSON))
        );
    }

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
                .isInstanceOf(RilogInfrastructureException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.GITHUB_USER_FETCH_FAILED);
        server.verify();
    }

    @Test
    @DisplayName("GitHub 사용자 조회 실패 예외에는 access token을 담지 않는다")
    void getUserFailurePreservesCauseAndDoesNotExposeAccessToken() {
        // given
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RestClientGithubUserClient client = new RestClientGithubUserClient(builder.build(), properties());

        server.expect(requestTo("https://api.github.example/user"))
                .andRespond(withUnauthorizedRequest());

        // when
        // when - then
        assertThatThrownBy(() -> client.getUser(new OAuthAccessToken("github-access-token")))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasCauseInstanceOf(RestClientException.class)
                .hasMessageNotContaining("github-access-token")
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.GITHUB_USER_FETCH_FAILED);
        server.verify();
    }

    private GithubOAuthProperties properties() {
        return GithubOAuthProperties.of(
                "github-client-id",
                "github-client-secret",
                URI.create("http://localhost:5173/auth/github/callback"),
                Duration.ofMinutes(5),
                "read:user,user:email",
                URI.create("https://github.example/login/oauth/access_token"),
                URI.create("https://api.github.example/user"),
                Duration.ofSeconds(2),
                Duration.ofSeconds(3)
        );
    }
}
