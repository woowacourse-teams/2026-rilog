package kr.rilog.domain.user.entity;

import jakarta.persistence.Column;
import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.user.exception.UserErrorInformation;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserTest {

    @Test
    @DisplayName("신규 사용자의 온보딩 상태는 PENDING이다")
    void newUserStartsWithPendingOnboardingStatus() {
        // given
        User user = User.builder()
                .githubId(1L)
                .build();

        // when - then
        assertThat(user.getOnboardingStatus()).isEqualTo(OnboardingStatus.PENDING);
    }

    @Test
    @DisplayName("신규 사용자의 기본 역할은 USER이다")
    void newUserStartsWithUserRole() {
        // given
        User user = User.builder()
                .githubId(1L)
                .build();

        // when - then
        assertThat(user.getGlobalRole()).isEqualTo(GlobalRole.USER);
    }

    @Test
    @DisplayName("온보딩 완료 시 사용자 slug를 처음 저장할 수 있다")
    void slugCanBeUpdatedWhenOnboardingIsCompleted() throws NoSuchFieldException {
        // given
        Field slug = User.class.getDeclaredField("slug");
        Column column = slug.getAnnotation(Column.class);

        // when - then
        assertThat(column.updatable()).isTrue();
    }

    @Test
    @DisplayName("온보딩을 완료하면 프로필 정보와 온보딩 상태가 갱신된다")
    void completingOnboardingUpdatesProfileAndStatus() {
        // given
        User user = User.builder()
                .githubId(1L)
                .build();

        // when
        user.completeOnboarding(
                "러로",
                "jinriro",
                "안녕하세요.",
                "www.example.com",
                "www.githubExample.com",
                "riro@gmail.com"
        );

        // then
        assertThat(user)
                .extracting(
                        User::getNickname,
                        User::getSlug,
                        User::getIntroduction,
                        User::getProfileImageUrl,
                        User::getGithubUrl,
                        User::getEmail,
                        User::getOnboardingStatus
                )
                .containsExactly(
                        "러로",
                        "jinriro",
                        "안녕하세요.",
                        "www.example.com",
                        "www.githubExample.com",
                        "riro@gmail.com",
                        OnboardingStatus.COMPLETED
                );
        assertThat(user.getOnboardingCompletedAt()).isNotNull();
    }

    @Test
    @DisplayName("온보딩 완료 후 사용자 slug는 다시 변경할 수 없다")
    void slugCannotBeChangedAfterOnboardingCompleted() {
        // given
        User user = User.builder()
                .githubId(1L)
                .build();
        user.completeOnboarding(
                "러로",
                "jinriro",
                "안녕하세요.",
                "www.example.com",
                "www.githubExample.com",
                "riro@gmail.com"
        );

        // when - then
        assertThatThrownBy(() -> user.completeOnboarding(
                        "러로2",
                        "changed-slug",
                        "변경 소개",
                        "www.changed.com",
                        "www.changedGithub.com",
                        "changed@gmail.com"
                ))
                .extracting("errorInformation")
                .isEqualTo(UserErrorInformation.ONBOARDING_ALREADY_COMPLETED);
        assertThat(user.getSlug()).isEqualTo("jinriro");
    }
}
