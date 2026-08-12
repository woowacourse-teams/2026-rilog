package kr.rilog.domain.auth.application;

import kr.rilog.domain.auth.application.port.OAuthLoginAttemptStore;
import kr.rilog.domain.auth.config.GithubOAuthProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StartGithubLoginTest {

    @Test
    @DisplayName("GitHub 로그인 시작은 state를 TTL과 함께 저장하고 GitHub 인증 URL을 만든다")
    void startSavesStateWithTtlAndBuildsGithubAuthorizationUri() {
        // given
        RecordingOAuthLoginAttemptStore store = new RecordingOAuthLoginAttemptStore();
        GithubOAuthProperties properties = new GithubOAuthProperties(
                "github-client-id",
                "github-client-secret",
                URI.create("http://localhost:8080/v1/auth/github/callback"),
                Duration.ofMinutes(5),
                "read:user,user:email"
        );
        StartGithubLogin startGithubLogin = new StartGithubLogin(store, properties);

        // when
        URI redirectUri = startGithubLogin.start();

        // then
        MultiValueMap<String, String> queryParams = UriComponentsBuilder.fromUri(redirectUri)
                .build()
                .getQueryParams();

        assertEquals("https", redirectUri.getScheme());
        assertEquals("github.com", redirectUri.getHost());
        assertEquals("/login/oauth/authorize", redirectUri.getPath());
        assertEquals("github-client-id", queryParams.getFirst("client_id"));
        assertEquals("http://localhost:8080/v1/auth/github/callback", queryParams.getFirst("redirect_uri"));
        assertEquals("read:user,user:email", queryParams.getFirst("scope"));
        assertNotNull(queryParams.getFirst("state"));
        assertFalse(queryParams.getFirst("state").isBlank());
        assertEquals(queryParams.getFirst("state"), store.savedState);
        assertEquals(Duration.ofMinutes(5), store.savedTtl);
    }

    @Test
    @DisplayName("GitHub OAuth state는 URL-safe 형식으로 충분히 길게 생성된다")
    void startGeneratesLongUrlSafeState() {
        // given
        RecordingOAuthLoginAttemptStore store = new RecordingOAuthLoginAttemptStore();
        GithubOAuthProperties properties = new GithubOAuthProperties(
                "github-client-id",
                "github-client-secret",
                URI.create("http://localhost:8080/v1/auth/github/callback"),
                Duration.ofMinutes(5),
                "read:user,user:email"
        );
        StartGithubLogin startGithubLogin = new StartGithubLogin(store, properties);

        // when
        URI redirectUri = startGithubLogin.start();

        // then
        String state = UriComponentsBuilder.fromUri(redirectUri)
                .build()
                .getQueryParams()
                .getFirst("state");

        assertNotNull(state);
        assertTrue(state.length() >= 43);
        assertTrue(state.matches("[A-Za-z0-9_-]+"));
    }

    private static class RecordingOAuthLoginAttemptStore implements OAuthLoginAttemptStore {

        private String savedState;
        private Duration savedTtl;

        @Override
        public void save(String state, Duration ttl) {
            this.savedState = state;
            this.savedTtl = ttl;
        }

        @Override
        public boolean consume(String state) {
            return false;
        }
    }
}
