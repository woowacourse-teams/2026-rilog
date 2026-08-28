package kr.rilog.domain.auth.application.token;

import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshTokenProvider;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthTokenPairIssuerTest {

    @Test
    @DisplayName("사용자 정보로 Access Token과 Refresh Token을 함께 발급한다")
    void issueCreatesAccessAndRefreshTokenPair() {
        // given
        User user = User.builder()
                .id(1L)
                .githubId(10L)
                .slug(Slug.from("jinriro"))
                .globalRole(GlobalRole.ADMIN)
                .onboardingStatus(OnboardingStatus.COMPLETED)
                .build();
        RefreshTokenProvider refreshTokenProvider = mock(RefreshTokenProvider.class);
        when(refreshTokenProvider.issue(user)).thenReturn(RefreshToken.of("refresh-token"));

        AuthTokenPairIssuer issuer = new AuthTokenPairIssuer(
                new FixedAccessTokenProvider(),
                refreshTokenProvider
        );

        // when
        AuthTokenPair pair = issuer.issue(user);

        // then
        assertThat(pair.accessToken().value()).isEqualTo("access-token:1:ADMIN:jinriro");
        assertThat(pair.refreshToken().value()).isEqualTo("refresh-token");
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
