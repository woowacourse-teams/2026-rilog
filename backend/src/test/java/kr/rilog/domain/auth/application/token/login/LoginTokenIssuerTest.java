package kr.rilog.domain.auth.application.token.login;

import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.auth.application.port.token.OnboardingTokenProvider;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.application.token.access.AccessTokenService;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingToken;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingTokenClaims;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingTokenService;
import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshTokenIssuer;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class LoginTokenIssuerTest {

    @Test
    @DisplayName("PENDING 사용자는 Onboarding Token만 발급한다")
    void issueReturnsPendingResultForPendingUser() {
        // given
        RefreshTokenIssuer refreshTokenIssuer = mock(RefreshTokenIssuer.class);
        LoginTokenIssuer issuer = new LoginTokenIssuer(
                new OnboardingTokenService(new FixedOnboardingTokenProvider()),
                new AccessTokenService(new FixedAccessTokenProvider()),
                refreshTokenIssuer
        );

        // when
        LoginTokenResult result = issuer.issue(pendingUser());

        // then
        assertThat(result).isInstanceOf(LoginTokenResult.Pending.class);
        LoginTokenResult.Pending pending = (LoginTokenResult.Pending) result;
        assertThat(pending.onboardingToken().value()).isEqualTo("onboarding-token:1");
        verifyNoInteractions(refreshTokenIssuer);
    }

    @Test
    @DisplayName("COMPLETED 사용자는 Access Token과 Refresh Token을 발급한다")
    void issueReturnsCompletedResultForCompletedUser() {
        // given
        User user = completedUser();
        RefreshTokenIssuer refreshTokenIssuer = mock(RefreshTokenIssuer.class);
        when(refreshTokenIssuer.issue(user)).thenReturn(RefreshToken.of("refresh-token"));
        LoginTokenIssuer issuer = new LoginTokenIssuer(
                new OnboardingTokenService(new FixedOnboardingTokenProvider()),
                new AccessTokenService(new FixedAccessTokenProvider()),
                refreshTokenIssuer
        );

        // when
        LoginTokenResult result = issuer.issue(user);

        // then
        assertThat(result).isInstanceOf(LoginTokenResult.Completed.class);
        LoginTokenResult.Completed completed = (LoginTokenResult.Completed) result;
        assertThat(completed.accessToken().value()).isEqualTo("access-token:1:USER:jinriro");
        assertThat(completed.refreshToken().value()).isEqualTo("refresh-token");
    }

    private User pendingUser() {
        return User.builder()
                .id(1L)
                .githubId(10L)
                .build();
    }

    private User completedUser() {
        return User.builder()
                .id(1L)
                .githubId(10L)
                .slug(Slug.from("jinriro"))
                .globalRole(GlobalRole.USER)
                .onboardingStatus(OnboardingStatus.COMPLETED)
                .build();
    }

    private static class FixedOnboardingTokenProvider implements OnboardingTokenProvider {

        @Override
        public OnboardingToken issue(Long userId) {
            return OnboardingToken.of("onboarding-token:%d".formatted(userId));
        }

        @Override
        public OnboardingTokenClaims parse(String onboardingToken) {
            throw new UnsupportedOperationException("Not used in this test");
        }
    }

    private static class FixedAccessTokenProvider implements AccessTokenProvider {

        @Override
        public AccessToken issue(Long userId, GlobalRole role, String slug) {
            return AccessToken.of("access-token:%d:%s:%s".formatted(userId, role, slug));
        }

        @Override
        public AccessTokenClaims parse(String accessToken) {
            throw new UnsupportedOperationException("Not used in this test");
        }
    }
}
