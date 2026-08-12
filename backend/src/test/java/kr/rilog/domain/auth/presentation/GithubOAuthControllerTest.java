package kr.rilog.domain.auth.presentation;

import kr.rilog.domain.auth.application.CompleteOAuthLogin;
import kr.rilog.domain.auth.application.OAuthAccessToken;
import kr.rilog.domain.auth.application.SocialLoginProvider;
import kr.rilog.domain.auth.application.SocialLoginUser;
import kr.rilog.domain.auth.application.StartOAuthLogin;
import kr.rilog.domain.auth.application.port.OAuthAccessTokenClient;
import kr.rilog.domain.auth.application.port.OAuthLoginAttemptStore;
import kr.rilog.domain.auth.application.port.OAuthUserClient;
import kr.rilog.domain.auth.config.GithubOAuthProperties;
import kr.rilog.domain.auth.infrastructure.github.GithubOAuthAuthorizationUrlProvider;
import kr.rilog.global.advice.GlobalExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.net.URI;
import java.time.Duration;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GithubOAuthControllerTest {

    @Test
    @DisplayName("GET /v1/auth/github는 GitHub 인증 페이지로 redirect한다")
    void startGithubLoginRedirectsToGithubAuthorizationPage() throws Exception {
        // given
        InMemoryOAuthLoginAttemptStore store = new InMemoryOAuthLoginAttemptStore();
        MockMvc mockMvc = mockMvc(store);

        // when - then
        mockMvc.perform(get("/v1/auth/github"))
                .andExpect(status().isFound())
                .andExpect(header().string(
                        "Location",
                        startsWith("https://github.com/login/oauth/authorize?")
                ));
    }

    @Test
    @DisplayName("GET /v1/auth/github/callback은 정상 code와 state를 검증한다")
    void callbackVerifiesCodeAndState() throws Exception {
        // given
        InMemoryOAuthLoginAttemptStore store = new InMemoryOAuthLoginAttemptStore();
        store.save(SocialLoginProvider.GITHUB, "valid-state", Duration.ofMinutes(5));
        MockMvc mockMvc = mockMvc(store);

        // when - then
        mockMvc.perform(get("/v1/auth/github/callback")
                        .queryParam("code", "github-code")
                        .queryParam("state", "valid-state"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("callback code 또는 state가 없으면 요청을 거부한다")
    void callbackRejectsMissingCodeOrState() throws Exception {
        // given
        InMemoryOAuthLoginAttemptStore store = new InMemoryOAuthLoginAttemptStore();
        store.save(SocialLoginProvider.GITHUB, "valid-state", Duration.ofMinutes(5));
        MockMvc mockMvc = mockMvc(store);

        // when - then
        mockMvc.perform(get("/v1/auth/github/callback")
                        .queryParam("state", "valid-state"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("OAUTH_CALLBACK_PARAMETER_MISSING"));
    }

    @Test
    @DisplayName("재사용된 callback state는 요청을 거부한다")
    void callbackRejectsReusedState() throws Exception {
        // given
        InMemoryOAuthLoginAttemptStore store = new InMemoryOAuthLoginAttemptStore();
        store.save(SocialLoginProvider.GITHUB, "valid-state", Duration.ofMinutes(5));
        MockMvc mockMvc = mockMvc(store);

        mockMvc.perform(get("/v1/auth/github/callback")
                        .queryParam("code", "github-code")
                        .queryParam("state", "valid-state"))
                .andExpect(status().isNoContent());

        // when - then
        mockMvc.perform(get("/v1/auth/github/callback")
                        .queryParam("code", "github-code")
                        .queryParam("state", "valid-state"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_OAUTH_STATE"));
    }

    @Test
    @DisplayName("GitHub OAuth 실패 callback은 요청을 거부한다")
    void callbackRejectsGithubOAuthError() throws Exception {
        // given
        MockMvc mockMvc = mockMvc(new InMemoryOAuthLoginAttemptStore());

        // when - then
        mockMvc.perform(get("/v1/auth/github/callback")
                .queryParam("error", "access_denied")
                .queryParam("state", "valid-state"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("OAUTH_REQUEST_FAILED"));
    }

    private MockMvc mockMvc(OAuthLoginAttemptStore store) {
        GithubOAuthProperties properties = new GithubOAuthProperties(
                "github-client-id",
                "github-client-secret",
                URI.create("http://localhost:8080/v1/auth/github/callback"),
                Duration.ofMinutes(5),
                "read:user,user:email"
        );
        GithubOAuthController controller = new GithubOAuthController(
                new StartOAuthLogin(
                        store,
                        List.of(new GithubOAuthAuthorizationUrlProvider(properties))
                ),
                new CompleteOAuthLogin(
                        store,
                        List.of(new StubOAuthAccessTokenClient()),
                        List.of(new StubOAuthUserClient())
                )
        );

        return MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private static class InMemoryOAuthLoginAttemptStore implements OAuthLoginAttemptStore {

        private final Set<String> states = new HashSet<>();

        @Override
        public void save(SocialLoginProvider provider, String state, Duration ttl) {
            states.add(key(provider, state));
        }

        @Override
        public boolean consume(SocialLoginProvider provider, String state) {
            return states.remove(key(provider, state));
        }

        private String key(SocialLoginProvider provider, String state) {
            return provider.name() + ":" + state;
        }
    }

    private static class StubOAuthAccessTokenClient implements OAuthAccessTokenClient {

        @Override
        public SocialLoginProvider provider() {
            return SocialLoginProvider.GITHUB;
        }

        @Override
        public OAuthAccessToken exchange(String code) {
            return new OAuthAccessToken("github-access-token");
        }
    }

    private static class StubOAuthUserClient implements OAuthUserClient {

        @Override
        public SocialLoginProvider provider() {
            return SocialLoginProvider.GITHUB;
        }

        @Override
        public SocialLoginUser getUser(OAuthAccessToken accessToken) {
            return new SocialLoginUser(
                    SocialLoginProvider.GITHUB,
                    "1",
                    "octocat",
                    "https://github.com/images/error/octocat_happy.gif"
            );
        }
    }
}
