package kr.rilog.domain.auth.application.oauth;

import kr.rilog.domain.auth.application.oauth.model.OAuthLoginAttempt;
import kr.rilog.domain.auth.application.oauth.model.SocialLoginProvider;
import kr.rilog.domain.auth.application.oauth.usecase.StartOAuthLogin;
import kr.rilog.domain.auth.application.port.oauth.OAuthAuthorizationUrlProvider;
import kr.rilog.domain.auth.application.port.oauth.OAuthLoginAttemptStore;
import kr.rilog.domain.auth.exception.AuthErrorInformation;
import kr.rilog.domain.auth.exception.AuthException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
        URI redirectUri = startOAuthLogin.start(SocialLoginProvider.GITHUB, "/feeds");

        // then
        MultiValueMap<String, String> queryParams = UriComponentsBuilder.fromUri(redirectUri)
                .build()
                .getQueryParams();

        assertThat(redirectUri.getScheme()).isEqualTo("https");
        assertThat(redirectUri.getHost()).isEqualTo("github.com");
        assertThat(redirectUri.getPath()).isEqualTo("/login/oauth/authorize");
        assertThat(queryParams.getFirst("client_id")).isEqualTo("github-client-id");
        assertThat(queryParams.getFirst("redirect_uri")).isEqualTo("http://localhost:5173/auth/github/callback");
        assertThat(queryParams.getFirst("scope")).isEqualTo("read:user,user:email");
        assertThat(queryParams.getFirst("state")).isNotBlank();
        assertThat(store.savedProvider).isEqualTo(SocialLoginProvider.GITHUB);
        assertThat(store.savedAttempt.state()).isEqualTo(queryParams.getFirst("state"));
        assertThat(store.savedAttempt.redirectUrl()).isEqualTo("/feeds");
        assertThat(store.savedTtl).isEqualTo(Duration.ofMinutes(5));
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
        URI redirectUri = startOAuthLogin.start(SocialLoginProvider.GITHUB, "/feeds");

        // then
        String state = UriComponentsBuilder.fromUri(redirectUri)
                .build()
                .getQueryParams()
                .getFirst("state");

        assertThat(state)
                .isNotNull()
                .hasSizeGreaterThanOrEqualTo(43)
                .matches("[A-Za-z0-9_-]+");
    }

    @Test
    @DisplayName("redirectUrl이 없으면 기본 내부 경로를 저장한다")
    void startStoresDefaultRedirectUrlWhenRedirectUrlIsMissing() {
        // given
        RecordingOAuthLoginAttemptStore store = new RecordingOAuthLoginAttemptStore();
        StartOAuthLogin startOAuthLogin = new StartOAuthLogin(
                store,
                List.of(new StubOAuthAuthorizationUrlProvider())
        );

        // when
        startOAuthLogin.start(SocialLoginProvider.GITHUB, null);

        // then
        assertThat(store.savedAttempt.redirectUrl()).isEqualTo("/");
    }

    @Test
    @DisplayName("외부 redirectUrl은 거부한다")
    void startRejectsExternalRedirectUrl() {
        // given
        StartOAuthLogin startOAuthLogin = new StartOAuthLogin(
                new RecordingOAuthLoginAttemptStore(),
                List.of(new StubOAuthAuthorizationUrlProvider())
        );

        // when - then
        assertThatThrownBy(() -> startOAuthLogin.start(SocialLoginProvider.GITHUB, "https://evil.test/feeds"))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.INVALID_OAUTH_REDIRECT_URL);
    }

    @Test
    @DisplayName("백슬래시를 포함한 redirectUrl은 거부한다")
    void startRejectsRedirectUrlContainingBackslash() {
        // given
        StartOAuthLogin startOAuthLogin = new StartOAuthLogin(
                new RecordingOAuthLoginAttemptStore(),
                List.of(new StubOAuthAuthorizationUrlProvider())
        );

        // when - then
        assertThatThrownBy(() -> startOAuthLogin.start(SocialLoginProvider.GITHUB, "/\\evil.com"))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.INVALID_OAUTH_REDIRECT_URL);
    }

    private static class RecordingOAuthLoginAttemptStore implements OAuthLoginAttemptStore {

        private SocialLoginProvider savedProvider;
        private OAuthLoginAttempt savedAttempt;
        private Duration savedTtl;

        @Override
        public void save(SocialLoginProvider provider, OAuthLoginAttempt attempt, Duration ttl) {
            this.savedProvider = provider;
            this.savedAttempt = attempt;
            this.savedTtl = ttl;
        }

        @Override
        public Optional<OAuthLoginAttempt> consume(SocialLoginProvider provider, String state) {
            return Optional.empty();
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
                    .queryParam("redirect_uri", "http://localhost:5173/auth/github/callback")
                    .queryParam("scope", "read:user,user:email")
                    .queryParam("state", state)
                    .build()
                    .encode()
                    .toUri();
        }
    }
}
