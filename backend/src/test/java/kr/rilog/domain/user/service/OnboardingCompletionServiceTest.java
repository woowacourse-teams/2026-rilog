package kr.rilog.domain.user.service;

import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.token.AuthTokenPair;
import kr.rilog.domain.auth.application.token.AuthTokenPairIssuer;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.service.dto.command.OnboardingCompleteCommand;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OnboardingCompletionServiceTest {

    @Test
    @DisplayName("인증된 사용자 ID로 온보딩을 완료하고 Access/Refresh 발급을 조합한다")
    void completeUsesAuthenticatedUserIdAndIssuesTokenPair() {
        // given
        UserService userService = mock(UserService.class);
        AuthTokenPairIssuer authTokenPairIssuer = mock(AuthTokenPairIssuer.class);
        OnboardingCompleteCommand command = command();
        User completedUser = completedUser();

        when(userService.completeOnboarding(1L, command))
                .thenReturn(completedUser);
        when(authTokenPairIssuer.issue(completedUser))
                .thenReturn(new AuthTokenPair(
                        AccessToken.of("access-token"),
                        RefreshToken.of("refresh-token")
                ));

        OnboardingCompletionService service = new OnboardingCompletionService(
                userService,
                authTokenPairIssuer
        );

        // when
        AuthTokenPair result = service.complete(1L, command);

        // then
        assertThat(result.accessToken().value()).isEqualTo("access-token");
        assertThat(result.refreshToken().value()).isEqualTo("refresh-token");
    }

    private User completedUser() {
        return User.builder()
                .id(1L)
                .githubId(10L)
                .slug(Slug.from("ri_log-01"))
                .globalRole(GlobalRole.USER)
                .onboardingStatus(OnboardingStatus.COMPLETED)
                .build();
    }

    private OnboardingCompleteCommand command() {
        return new OnboardingCompleteCommand(
                "러로",
                "ri_log-01",
                "기록하는 개발자입니다.",
                "https://example.com/profile.png",
                "https://github.com/jinriro",
                "riro@example.com"
        );
    }
}
