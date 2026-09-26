package kr.rilog.domain.auth.infrastructure.github;

import kr.rilog.domain.auth.application.oauth.model.OAuthAccessToken;
import kr.rilog.domain.auth.application.oauth.model.SocialLoginProvider;
import kr.rilog.domain.auth.config.GithubOAuthProperties;
import kr.rilog.domain.auth.exception.AuthErrorInformation;
import kr.rilog.global.exception.RilogInfrastructureException;
import kr.rilog.global.logging.SanitizingStackTracePrinter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.ResponseCreator;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.URI;
import java.io.IOException;
import java.time.Duration;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class RestClientGithubAccessTokenClientTest {

    @Test
    @DisplayName("GitHub 토큰 응답 파싱 실패 로그에는 원문 응답 조각이 남지 않는다.")
    void malformedTokenResponseDoesNotLeakBodyInStack() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        var client = new RestClientGithubAccessTokenClient(builder.build(), properties());
        server.expect(requestTo(properties().tokenUri()))
                .andRespond(withSuccess("TEST_PRIVATE_BODY", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.exchange("TEST_CODE"))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasMessage(AuthErrorInformation.GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED.getMessage())
                .satisfies(error -> assertThat(new SanitizingStackTracePrinter().printStackTraceToString(error))
                        .contains("RestClientException", "tools.jackson", "Caused by:")
                        .doesNotContain("TEST_PRIVATE_BODY", "TEST_CODE"));
        server.verify();
    }

    @ParameterizedTest
    @MethodSource("failedResponses")
    @DisplayName("GitHub 토큰 교환 실패는 원인 유형과 취득 가능한 외부 상태를 보존한다.")
    void exchangeFailureIncludesOperationContext(String failureType, Integer externalStatus, ResponseCreator response) {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        var client = new RestClientGithubAccessTokenClient(builder.build(), properties());
        server.expect(requestTo(properties().tokenUri())).andRespond(response);

        assertThatThrownBy(() -> client.exchange("TEST_CODE"))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasMessage(AuthErrorInformation.GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED.getMessage())
                .satisfies(error -> {
                    var failure = (RilogInfrastructureException) error;
                    assertThat(failure.getErrorInformation()).isEqualTo(AuthErrorInformation.GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED);
                    assertThat(failure.getLogContext()).containsEntry("provider", "GITHUB")
                            .containsEntry("operation", "exchange_access_token")
                            .containsEntry("failureType", failureType);
                    assertThat((Long) failure.getLogContext().get("durationMs")).isGreaterThanOrEqualTo(0L);
                    if (externalStatus == null) {
                        assertThat(failure.getLogContext()).doesNotContainKey("externalStatus");
                    } else {
                        assertThat(failure.getLogContext()).containsEntry("externalStatus", externalStatus);
                    }
                    assertThat(failure.getLogContext().toString()).doesNotContain("TEST_CODE", "TEST_BODY");
                });
        server.verify();
    }

    private static Stream<Arguments> failedResponses() {
        return Stream.of(
                Arguments.of("HTTP_ERROR", 400, withBadRequest().body("TEST_BODY")),
                Arguments.of("IO_ERROR", null, withException(new IOException("connection failed"))),
                Arguments.of("INVALID_RESPONSE", 200, withSuccess("", MediaType.APPLICATION_JSON)),
                Arguments.of("INVALID_RESPONSE", 200, withSuccess("{}", MediaType.APPLICATION_JSON)),
                Arguments.of("CLIENT_ERROR", null, withSuccess("{", MediaType.APPLICATION_JSON))
        );
    }

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
        expectedForm.add("redirect_uri", "http://localhost:5173/auth/github/callback");

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
                .isInstanceOf(RilogInfrastructureException.class)
                .hasMessageNotContaining("github-code")
                .hasMessageNotContaining("github-client-secret")
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED);
        server.verify();
    }

    @Test
    @DisplayName("GitHub Access Token 교환 실패 예외에는 code와 secret을 담지 않는다")
    void exchangeFailurePreservesCauseAndDoesNotExposeSensitiveValues() {
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
                .isInstanceOf(RilogInfrastructureException.class)
                .hasCauseInstanceOf(RestClientException.class)
                .hasMessageNotContaining("github-code")
                .hasMessageNotContaining("github-client-secret")
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED);
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
