package kr.rilog.auth.infrastructure.github;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withUnauthorizedRequest;

import java.net.URI;
import kr.rilog.auth.domain.GithubIdentity;
import kr.rilog.global.exception.AuthException;
import kr.rilog.global.exception.AuthFailureReason;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class GithubHttpClientTest {

    @Test
    @DisplayName("GitHub 인가 URL은 state와 PKCE를 포함하고 저장소 권한을 요청하지 않는다.")
    void authorizationUriUsesStatePkceAndNoRepositoryScope() {
        // given
        GithubHttpClient client = client(RestClient.builder());

        // when
        URI uri = client.buildAuthorizationUri("state-value", "challenge-value");
        String value = uri.toString();

        // then
        assertAll(
                () -> assertTrue(value.startsWith("https://github.test/oauth/authorize?")),
                () -> assertTrue(value.contains("client_id=client-id")),
                () -> assertTrue(value.contains("state=state-value")),
                () -> assertTrue(value.contains("code_challenge=challenge-value")),
                () -> assertTrue(value.contains("code_challenge_method=S256")),
                () -> assertFalse(value.contains("scope=repo"))
        );
    }

    @Test
    @DisplayName("GitHub 인가 코드를 토큰으로 교환한 뒤 사용자 정보를 조회한다.")
    void exchangesCodeThenLoadsGithubUserWithBearerToken() {
        // given
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GithubHttpClient client = client(builder);

        server.expect(once(), requestTo("https://github.test/oauth/token"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().string(containsString("client_id=client-id")))
                .andExpect(content().string(containsString("code=github-code")))
                .andExpect(content().string(containsString("code_verifier=pkce-verifier")))
                .andRespond(withSuccess(
                        "{\"access_token\":\"github-token\",\"token_type\":\"bearer\"}",
                        MediaType.APPLICATION_JSON
                ));
        server.expect(once(), requestTo("https://api.github.test/user"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer github-token"))
                .andRespond(withSuccess(
                        "{\"id\":123,\"avatar_url\":\"avatar.png\","
                                + "\"html_url\":\"https://github.test/rilog\",\"email\":null}",
                        MediaType.APPLICATION_JSON
                ));

        // when
        GithubIdentity identity = client.fetchIdentity("github-code", "pkce-verifier");

        // then
        assertEquals(123L, identity.githubId());
        assertEquals("avatar.png", identity.profileImageUrl());
        assertEquals("https://github.test/rilog", identity.githubUrl());
        assertEquals(null, identity.publicEmail());
        server.verify();
    }

    @Test
    @DisplayName("GitHub 토큰 발급 실패를 응답 값 노출 없이 구분한다.")
    void distinguishesTokenEndpointFailureWithoutLeakingResponseValues() {
        // given
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GithubHttpClient client = client(builder);
        server.expect(once(), requestTo("https://github.test/oauth/token"))
                .andRespond(withUnauthorizedRequest());

        // when
        AuthException exception = assertThrows(
                AuthException.class,
                () -> client.fetchIdentity("github-code", "pkce-verifier")
        );

        // then
        assertEquals(
                AuthFailureReason.GITHUB_TOKEN_REQUEST_FAILED,
                exception.getFailureReason()
        );
        server.verify();
    }

    @Test
    @DisplayName("GitHub 사용자 정보 조회 실패를 구분한다.")
    void distinguishesGithubUserEndpointFailure() {
        // given
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GithubHttpClient client = client(builder);
        server.expect(once(), requestTo("https://github.test/oauth/token"))
                .andRespond(withSuccess(
                        "{\"access_token\":\"github-token\",\"token_type\":\"bearer\"}",
                        MediaType.APPLICATION_JSON
                ));
        server.expect(once(), requestTo("https://api.github.test/user"))
                .andRespond(withUnauthorizedRequest());

        // when
        AuthException exception = assertThrows(
                AuthException.class,
                () -> client.fetchIdentity("github-code", "pkce-verifier")
        );

        // then
        assertEquals(
                AuthFailureReason.GITHUB_USER_REQUEST_FAILED,
                exception.getFailureReason()
        );
        server.verify();
    }

    private GithubHttpClient client(RestClient.Builder builder) {
        return new GithubHttpClient(
                builder.build(),
                URI.create("https://github.test/oauth/authorize"),
                URI.create("https://github.test/oauth/token"),
                URI.create("https://api.github.test/user"),
                "client-id",
                "client-secret",
                URI.create("https://api.rilog.test/api/auth/github/callback")
        );
    }

}
