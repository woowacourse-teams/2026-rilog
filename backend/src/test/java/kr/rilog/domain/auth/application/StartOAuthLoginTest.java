package kr.rilog.domain.auth.application;

import kr.rilog.domain.auth.application.port.OAuthAuthorizationUrlProvider;
import kr.rilog.domain.auth.application.port.OAuthLoginAttemptStore;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StartOAuthLoginTest {

    @Test
    @DisplayName("OAuth 로그인 시작은 provider별 state를 TTL과 함께 저장하고 인증 URL을 만든다")
    void startSavesProviderScopedStateWithTtlAndBuildsAuthorizationUri() {
        // given
        RecordingOAuthLoginAttemptStore store = new RecordingOAuthLoginAttemptStore();
        StartOAuthLogin startOAuthLogin = new StartOAuthLogin(
                store,
                List.of(new StubOAuthAuthorizationUrlProvider())
        );

        // when
        URI redirectUri = startOAuthLogin.start(SocialLoginProvider.GITHUB);

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
        assertEquals(SocialLoginProvider.GITHUB, store.savedProvider);
        assertEquals(queryParams.getFirst("state"), store.savedState);
        assertEquals(Duration.ofMinutes(5), store.savedTtl);
    }

    @Test
    @DisplayName("OAuth state는 URL-safe 형식으로 충분히 길게 생성된다")
    void startGeneratesLongUrlSafeState() {
        // given
        RecordingOAuthLoginAttemptStore store = new RecordingOAuthLoginAttemptStore();
        StartOAuthLogin startOAuthLogin = new StartOAuthLogin(
                store,
                List.of(new StubOAuthAuthorizationUrlProvider())
        );

        // when
        URI redirectUri = startOAuthLogin.start(SocialLoginProvider.GITHUB);

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

        private SocialLoginProvider savedProvider;
        private String savedState;
        private Duration savedTtl;

        @Override
        public void save(SocialLoginProvider provider, String state, Duration ttl) {
            this.savedProvider = provider;
            this.savedState = state;
            this.savedTtl = ttl;
        }

        @Override
        public boolean consume(SocialLoginProvider provider, String state) {
            return false;
        }
    }

    private static class StubOAuthAuthorizationUrlProvider implements OAuthAuthorizationUrlProvider {

        @Override
        public SocialLoginProvider provider() {
            return SocialLoginProvider.GITHUB;
        }

        @Override
        public Duration stateTtl() {
            return Duration.ofMinutes(5);
        }

        @Override
        public URI createAuthorizationUri(String state) {
            return UriComponentsBuilder.fromUriString("https://github.com/login/oauth/authorize")
                    .queryParam("client_id", "github-client-id")
                    .queryParam("redirect_uri", "http://localhost:8080/v1/auth/github/callback")
                    .queryParam("scope", "read:user,user:email")
                    .queryParam("state", state)
                    .build()
                    .encode()
                    .toUri();
        }
    }
}
