package kr.rilog.domain.auth.application;

import kr.rilog.domain.auth.application.port.OAuthLoginAttemptStore;
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
        CompleteGithubLogin completeGithubLogin = new CompleteGithubLogin(store);

        // when
        GithubOAuthCallback callback = completeGithubLogin.complete("github-code", "valid-state");

        // then
        assertEquals("github-code", callback.code());

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
        CompleteGithubLogin completeGithubLogin = new CompleteGithubLogin(store);

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
        CompleteGithubLogin completeGithubLogin = new CompleteGithubLogin(new InMemoryOAuthLoginAttemptStore());

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
        CompleteGithubLogin completeGithubLogin = new CompleteGithubLogin(new InMemoryOAuthLoginAttemptStore());

        // when
        AuthException exception = assertThrows(
                AuthException.class,
                () -> completeGithubLogin.complete("github-code", "expired-state")
        );

        // then
        assertEquals(AuthErrorInformation.INVALID_GITHUB_OAUTH_STATE, exception.getErrorInformation());
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
