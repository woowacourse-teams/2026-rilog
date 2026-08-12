package kr.rilog.domain.auth.presentation;

import kr.rilog.domain.auth.application.CompleteGithubLogin;
import kr.rilog.domain.auth.application.StartGithubLogin;
import kr.rilog.domain.auth.application.port.OAuthLoginAttemptStore;
import kr.rilog.domain.auth.config.GithubOAuthProperties;
import kr.rilog.global.advice.GlobalExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.net.URI;
import java.time.Duration;
import java.util.HashSet;
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
        store.save("valid-state", Duration.ofMinutes(5));
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
        store.save("valid-state", Duration.ofMinutes(5));
        MockMvc mockMvc = mockMvc(store);

        // when - then
        mockMvc.perform(get("/v1/auth/github/callback")
                        .queryParam("state", "valid-state"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("GITHUB_OAUTH_CALLBACK_PARAMETER_MISSING"));
    }

    @Test
    @DisplayName("재사용된 callback state는 요청을 거부한다")
    void callbackRejectsReusedState() throws Exception {
        // given
        InMemoryOAuthLoginAttemptStore store = new InMemoryOAuthLoginAttemptStore();
        store.save("valid-state", Duration.ofMinutes(5));
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
                .andExpect(jsonPath("$.errorCode").value("INVALID_GITHUB_OAUTH_STATE"));
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
                .andExpect(jsonPath("$.errorCode").value("GITHUB_OAUTH_REQUEST_FAILED"));
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
                new StartGithubLogin(store, properties),
                new CompleteGithubLogin(store)
        );

        return MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private static class InMemoryOAuthLoginAttemptStore implements OAuthLoginAttemptStore {

        private final Set<String> states = new HashSet<>();

        @Override
        public void save(String state, Duration ttl) {
            states.add(state);
        }

        @Override
        public boolean consume(String state) {
            return states.remove(state);
        }
    }
}
