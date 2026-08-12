package kr.rilog.domain.auth.application;

import kr.rilog.domain.auth.application.port.OAuthLoginAttemptStore;
import kr.rilog.domain.auth.application.port.GithubAccessTokenClient;
import kr.rilog.domain.auth.application.port.GithubUserClient;
import kr.rilog.domain.auth.exception.AuthErrorInformation;
import kr.rilog.domain.auth.exception.AuthException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CompleteGithubLoginTest {

    @Test
    @DisplayName("정상 callback state는 한 번만 소비되고 검증된 code를 반환한다")
    void completeConsumesValidStateOnlyOnce() {
        // given
        InMemoryOAuthLoginAttemptStore store = new InMemoryOAuthLoginAttemptStore();
        store.save("valid-state", Duration.ofMinutes(5));
        RecordingGithubAccessTokenClient accessTokenClient = new RecordingGithubAccessTokenClient();
        RecordingGithubUserClient userClient = new RecordingGithubUserClient();
        CompleteGithubLogin completeGithubLogin = new CompleteGithubLogin(store, accessTokenClient, userClient);

        // when
        GithubOAuthUser user = completeGithubLogin.complete("github-code", "valid-state");

        // then
        assertEquals(1L, user.id());
        assertEquals("octocat", user.login());
        assertEquals("https://github.com/images/error/octocat_happy.gif", user.avatarUrl());
        assertEquals("github-code", accessTokenClient.requestedCode);
        assertEquals("github-access-token", userClient.requestedAccessToken);

        AuthException exception = assertThrows(
                AuthException.class,
                () -> completeGithubLogin.complete("github-code", "valid-state")
        );
        assertEquals(AuthErrorInformation.INVALID_GITHUB_OAUTH_STATE, exception.getErrorInformation());
    }

    @Test
    @DisplayName("callback code가 없으면 요청을 거부한다")
    void completeRejectsMissingCode() {
        // given
        InMemoryOAuthLoginAttemptStore store = new InMemoryOAuthLoginAttemptStore();
        store.save("valid-state", Duration.ofMinutes(5));
        CompleteGithubLogin completeGithubLogin = new CompleteGithubLogin(
                store,
                new RecordingGithubAccessTokenClient(),
                new RecordingGithubUserClient()
        );

        // when
        AuthException exception = assertThrows(
                AuthException.class,
                () -> completeGithubLogin.complete(" ", "valid-state")
        );

        // then
        assertEquals(AuthErrorInformation.GITHUB_OAUTH_CALLBACK_PARAMETER_MISSING, exception.getErrorInformation());
    }

    @Test
    @DisplayName("callback state가 없으면 요청을 거부한다")
    void completeRejectsMissingState() {
        // given
        CompleteGithubLogin completeGithubLogin = new CompleteGithubLogin(
                new InMemoryOAuthLoginAttemptStore(),
                new RecordingGithubAccessTokenClient(),
                new RecordingGithubUserClient()
        );

        // when
        AuthException exception = assertThrows(
                AuthException.class,
                () -> completeGithubLogin.complete("github-code", null)
        );

        // then
        assertEquals(AuthErrorInformation.GITHUB_OAUTH_CALLBACK_PARAMETER_MISSING, exception.getErrorInformation());
    }

    @Test
    @DisplayName("만료되었거나 저장되지 않은 state는 요청을 거부한다")
    void completeRejectsExpiredOrUnknownState() {
        // given
        CompleteGithubLogin completeGithubLogin = new CompleteGithubLogin(
                new InMemoryOAuthLoginAttemptStore(),
                new RecordingGithubAccessTokenClient(),
                new RecordingGithubUserClient()
        );

        // when
        AuthException exception = assertThrows(
                AuthException.class,
                () -> completeGithubLogin.complete("github-code", "expired-state")
        );

        // then
        assertEquals(AuthErrorInformation.INVALID_GITHUB_OAUTH_STATE, exception.getErrorInformation());
    }

    @Test
    @DisplayName("유효하지 않은 state는 GitHub API 호출 전에 거부한다")
    void completeDoesNotCallGithubWhenStateIsInvalid() {
        // given
        RecordingGithubAccessTokenClient accessTokenClient = new RecordingGithubAccessTokenClient();
        RecordingGithubUserClient userClient = new RecordingGithubUserClient();
        CompleteGithubLogin completeGithubLogin = new CompleteGithubLogin(
                new InMemoryOAuthLoginAttemptStore(),
                accessTokenClient,
                userClient
        );

        // when
        assertThrows(
                AuthException.class,
                () -> completeGithubLogin.complete("github-code", "invalid-state")
        );

        // then
        assertEquals(0, accessTokenClient.requestCount);
        assertEquals(0, userClient.requestCount);
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

    private static class RecordingGithubAccessTokenClient implements GithubAccessTokenClient {

        private int requestCount;
        private String requestedCode;

        @Override
        public GithubAccessToken exchange(String code) {
            this.requestCount++;
            this.requestedCode = code;
            return new GithubAccessToken("github-access-token");
        }
    }

    private static class RecordingGithubUserClient implements GithubUserClient {

        private int requestCount;
        private String requestedAccessToken;

        @Override
        public GithubOAuthUser getUser(String accessToken) {
            this.requestCount++;
            this.requestedAccessToken = accessToken;
            return new GithubOAuthUser(
                    1L,
                    "octocat",
                    "https://github.com/images/error/octocat_happy.gif"
            );
        }
    }
}
