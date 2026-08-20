package kr.rilog.domain.user.entity;

import kr.rilog.domain.auth.application.GlobalRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static kr.rilog.support.fixure.BlogFixture.createUser;
import static org.assertj.core.api.Assertions.assertThat;

class UserTest {

    private static final Long OWNER_ID = 1L;

    @Test
    @DisplayName("신규 사용자의 온보딩 상태는 PENDING이다")
    void newUserStartsWithPendingOnboardingStatus() {
        // given
        User user = createUser(OWNER_ID);

        // when & then
        assertThat(user.getOnboardingStatus()).isEqualTo(OnboardingStatus.PENDING);
    }

    @Test
    @DisplayName("신규 사용자의 기본 역할은 USER이다")
    void newUserStartsWithUserRole() {
        // given
        User user = createUser(OWNER_ID);

        // when & then
        assertThat(user.getGlobalRole()).isEqualTo(GlobalRole.USER);
    }

    @Test
    @DisplayName("온보딩을 완료하면 프로필 정보와 온보딩 상태가 갱신된다")
    void completingOnboardingUpdatesProfileAndStatus() {
        // given
        User onboardingCompletedUser = createOnboardingCompletedUser();

        // when & then
        assertThat(onboardingCompletedUser.getOnboardingStatus()).isEqualTo(OnboardingStatus.COMPLETED);
    }

    private User createOnboardingCompletedUser() {
        User user = createUser(OWNER_ID);

        user.completeOnboarding(
                "러로",
                "jinriro",
                "안녕하세요. 러로입니다.",
                "www.example.com",
                "www.githubExample.com",
                "wlsflfh@gmail.com"
        );

        return user;
    }

}
