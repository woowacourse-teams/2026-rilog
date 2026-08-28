package kr.rilog.domain.auth.application.oauth;

import kr.rilog.domain.auth.application.oauth.model.*;
import kr.rilog.domain.auth.application.oauth.service.OAuthLoginUserService;
import kr.rilog.domain.auth.application.oauth.usecase.CompleteOAuthLogin;
import kr.rilog.domain.auth.application.port.oauth.OAuthAccessTokenClient;
import kr.rilog.domain.auth.application.port.oauth.OAuthLoginAttemptStore;
import kr.rilog.domain.auth.application.port.oauth.OAuthUserClient;
import kr.rilog.domain.auth.exception.AuthErrorInformation;
import kr.rilog.domain.auth.exception.AuthException;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
        store.save(SocialLoginProvider.GITHUB, new OAuthLoginAttempt("valid-state", "/feeds"), Duration.ofMinutes(5));
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
        OAuthLoginResult result = completeOAuthLogin.complete(SocialLoginProvider.GITHUB, "github-code", "valid-state");

        // then
        assertThat(result.user()).isSameAs(loginUser);
        assertThat(result.redirectUrl()).isEqualTo("/feeds");
        assertThat(accessTokenClient.requestedCode).isEqualTo("github-code");
        assertThat(userClient.requestedAccessToken).isEqualTo("github-access-token");
        verify(loginUserService).findOrCreate(new SocialLoginUser(
                SocialLoginProvider.GITHUB,
                "1",
                "octocat",
                "https://github.com/images/error/octocat_happy.gif"
        ));

        assertThatThrownBy(() -> completeOAuthLogin.complete(SocialLoginProvider.GITHUB, "github-code", "valid-state"))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.INVALID_OAUTH_STATE);
    }

    @Test
    @DisplayName("callback code가 없으면 요청을 거부한다")
    void completeRejectsMissingCode() {
        // given
        InMemoryOAuthLoginAttemptStore store = new InMemoryOAuthLoginAttemptStore();
        store.save(SocialLoginProvider.GITHUB, new OAuthLoginAttempt("valid-state", "/feeds"), Duration.ofMinutes(5));
        CompleteOAuthLogin completeOAuthLogin = new CompleteOAuthLogin(
                store,
                List.of(new RecordingOAuthAccessTokenClient()),
                List.of(new RecordingOAuthUserClient()),
                loginUserService
        );

        // when
        // when - then
        assertThatThrownBy(() -> completeOAuthLogin.complete(SocialLoginProvider.GITHUB, " ", "valid-state"))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.OAUTH_CALLBACK_PARAMETER_MISSING);
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
        // when - then
        assertThatThrownBy(() -> completeOAuthLogin.complete(SocialLoginProvider.GITHUB, "github-code", null))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.OAUTH_CALLBACK_PARAMETER_MISSING);
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
        // when - then
        assertThatThrownBy(() -> completeOAuthLogin.complete(SocialLoginProvider.GITHUB, "github-code", "expired-state"))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.INVALID_OAUTH_STATE);
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
        assertThatThrownBy(() -> completeOAuthLogin.complete(SocialLoginProvider.GITHUB, "github-code", "invalid-state"))
                .isInstanceOf(AuthException.class);

        // then
        assertThat(accessTokenClient.requestCount).isZero();
        assertThat(userClient.requestCount).isZero();
        verify(loginUserService, never()).findOrCreate(any(SocialLoginUser.class));
    }

    private User loginUser() {
        return User.builder()
                .id(1L)
                .githubId(1L)
                .build();
    }

    private static class InMemoryOAuthLoginAttemptStore implements OAuthLoginAttemptStore {

        private final Map<String, OAuthLoginAttempt> attempts = new HashMap<>();

        @Override
        public void save(SocialLoginProvider provider, OAuthLoginAttempt attempt, Duration ttl) {
            attempts.put(key(provider, attempt.state()), attempt);
        }

        @Override
        public Optional<OAuthLoginAttempt> consume(SocialLoginProvider provider, String state) {
            return Optional.ofNullable(attempts.remove(key(provider, state)));
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
