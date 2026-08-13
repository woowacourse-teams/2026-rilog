package kr.rilog.domain.auth.application;

import kr.rilog.domain.auth.application.port.OAuthAccessTokenClient;
import kr.rilog.domain.auth.application.port.OAuthLoginAttemptStore;
import kr.rilog.domain.auth.application.port.OAuthUserClient;
import kr.rilog.domain.auth.exception.AuthErrorInformation;
import kr.rilog.domain.auth.exception.AuthException;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CompleteOAuthLoginTest {

    @Mock
    private OAuthLoginUserService loginUserService;

    @Test
    @DisplayName("정상 callback state는 provider별로 한 번만 소비되고 로그인 사용자를 조회한다")
    void completeConsumesValidStateOnlyOnce() {
        // given
        User loginUser = loginUser();
        InMemoryOAuthLoginAttemptStore store = new InMemoryOAuthLoginAttemptStore();
        store.save(SocialLoginProvider.GITHUB, "valid-state", Duration.ofMinutes(5));
        RecordingOAuthAccessTokenClient accessTokenClient = new RecordingOAuthAccessTokenClient();
        RecordingOAuthUserClient userClient = new RecordingOAuthUserClient();
        when(loginUserService.findOrCreate(any(SocialLoginUser.class))).thenReturn(loginUser);
        CompleteOAuthLogin completeOAuthLogin = new CompleteOAuthLogin(
                store,
                List.of(accessTokenClient),
                List.of(userClient),
                loginUserService
        );

        // when
        User user = completeOAuthLogin.complete(SocialLoginProvider.GITHUB, "github-code", "valid-state");

        // then
        assertSame(loginUser, user);
        assertEquals("github-code", accessTokenClient.requestedCode);
        assertEquals("github-access-token", userClient.requestedAccessToken);
        verify(loginUserService).findOrCreate(new SocialLoginUser(
                SocialLoginProvider.GITHUB,
                "1",
                "octocat",
                "https://github.com/images/error/octocat_happy.gif"
        ));

        AuthException exception = assertThrows(
                AuthException.class,
                () -> completeOAuthLogin.complete(SocialLoginProvider.GITHUB, "github-code", "valid-state")
        );
        assertEquals(AuthErrorInformation.INVALID_OAUTH_STATE, exception.getErrorInformation());
    }

    @Test
    @DisplayName("callback code가 없으면 요청을 거부한다")
    void completeRejectsMissingCode() {
        // given
        InMemoryOAuthLoginAttemptStore store = new InMemoryOAuthLoginAttemptStore();
        store.save(SocialLoginProvider.GITHUB, "valid-state", Duration.ofMinutes(5));
        CompleteOAuthLogin completeOAuthLogin = new CompleteOAuthLogin(
                store,
                List.of(new RecordingOAuthAccessTokenClient()),
                List.of(new RecordingOAuthUserClient()),
                loginUserService
        );

        // when
        AuthException exception = assertThrows(
                AuthException.class,
                () -> completeOAuthLogin.complete(SocialLoginProvider.GITHUB, " ", "valid-state")
        );

        // then
        assertEquals(AuthErrorInformation.OAUTH_CALLBACK_PARAMETER_MISSING, exception.getErrorInformation());
    }

    @Test
    @DisplayName("callback state가 없으면 요청을 거부한다")
    void completeRejectsMissingState() {
        // given
        CompleteOAuthLogin completeOAuthLogin = new CompleteOAuthLogin(
                new InMemoryOAuthLoginAttemptStore(),
                List.of(new RecordingOAuthAccessTokenClient()),
                List.of(new RecordingOAuthUserClient()),
                loginUserService
        );

        // when
        AuthException exception = assertThrows(
                AuthException.class,
                () -> completeOAuthLogin.complete(SocialLoginProvider.GITHUB, "github-code", null)
        );

        // then
        assertEquals(AuthErrorInformation.OAUTH_CALLBACK_PARAMETER_MISSING, exception.getErrorInformation());
    }

    @Test
    @DisplayName("만료되었거나 저장되지 않은 state는 요청을 거부한다")
    void completeRejectsExpiredOrUnknownState() {
        // given
        CompleteOAuthLogin completeOAuthLogin = new CompleteOAuthLogin(
                new InMemoryOAuthLoginAttemptStore(),
                List.of(new RecordingOAuthAccessTokenClient()),
                List.of(new RecordingOAuthUserClient()),
                loginUserService
        );

        // when
        AuthException exception = assertThrows(
                AuthException.class,
                () -> completeOAuthLogin.complete(SocialLoginProvider.GITHUB, "github-code", "expired-state")
        );

        // then
        assertEquals(AuthErrorInformation.INVALID_OAUTH_STATE, exception.getErrorInformation());
    }

    @Test
    @DisplayName("유효하지 않은 state는 GitHub API 호출 전에 거부한다")
    void completeDoesNotCallGithubWhenStateIsInvalid() {
        // given
        RecordingOAuthAccessTokenClient accessTokenClient = new RecordingOAuthAccessTokenClient();
        RecordingOAuthUserClient userClient = new RecordingOAuthUserClient();
        CompleteOAuthLogin completeOAuthLogin = new CompleteOAuthLogin(
                new InMemoryOAuthLoginAttemptStore(),
                List.of(accessTokenClient),
                List.of(userClient),
                loginUserService
        );

        // when
        assertThrows(
                AuthException.class,
                () -> completeOAuthLogin.complete(SocialLoginProvider.GITHUB, "github-code", "invalid-state")
        );

        // then
        assertEquals(0, accessTokenClient.requestCount);
        assertEquals(0, userClient.requestCount);
        verify(loginUserService, never()).findOrCreate(any(SocialLoginUser.class));
    }

    private User loginUser() {
        return User.builder()
                .id(1L)
                .githubId(1L)
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

    private static class RecordingOAuthAccessTokenClient implements OAuthAccessTokenClient {

        private int requestCount;
        private String requestedCode;

        @Override
        public SocialLoginProvider provider() {
            return SocialLoginProvider.GITHUB;
        }

        @Override
        public OAuthAccessToken exchange(String code) {
            this.requestCount++;
            this.requestedCode = code;
            return new OAuthAccessToken("github-access-token");
        }
    }

    private static class RecordingOAuthUserClient implements OAuthUserClient {

        private int requestCount;
        private String requestedAccessToken;

        @Override
        public SocialLoginProvider provider() {
            return SocialLoginProvider.GITHUB;
        }

        @Override
        public SocialLoginUser getUser(OAuthAccessToken accessToken) {
            this.requestCount++;
            this.requestedAccessToken = accessToken.value();
            return new SocialLoginUser(
                    SocialLoginProvider.GITHUB,
                    "1",
                    "octocat",
                    "https://github.com/images/error/octocat_happy.gif"
            );
        }
    }
}
