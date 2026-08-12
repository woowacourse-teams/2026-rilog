package kr.rilog.domain;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.persistence.Column;
import java.lang.reflect.Field;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class UserTest {

    @Test
    @DisplayName("신규 사용자의 온보딩 상태는 PENDING이다")
    void newUserStartsWithPendingOnboardingStatus() {
        // given
        User user = User.builder()
                .githubId(1L)
                .build();

        // when - then
        assertEquals(OnboardingStatus.PENDING, user.getOnboardingStatus());
    }

    @Test
    @DisplayName("온보딩을 완료하면 사용자 slug가 설정된다")
    void slugCanBeUpdatedWhenOnboardingIsCompleted() throws NoSuchFieldException {
        // given
        Field slug = User.class.getDeclaredField("slug");
        Column column = slug.getAnnotation(Column.class);

        // when - then
        assertTrue(column.updatable());
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
        assertAll(
                () -> assertEquals("러로", user.getNickname()),
                () -> assertEquals("jinriro", user.getSlug()),
                () -> assertEquals("안녕하세요.", user.getIntroduction()),
                () -> assertEquals("www.example.com", user.getProfileImageUrl()),
                () -> assertEquals("www.githubExample.com", user.getGithubUrl()),
                () -> assertEquals("riro@gmail.com", user.getEmail()),
                () -> assertEquals(OnboardingStatus.COMPLETED, user.getOnboardingStatus()),
                () -> assertNotNull(user.getOnboardingCompletedAt())
        );
    }
}
