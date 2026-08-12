package kr.rilog.domain.user.entity;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.persistence.Column;
import java.lang.reflect.Field;

import kr.rilog.auth.domain.GithubIdentity;
import kr.rilog.auth.domain.GlobalRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class UserTest {

    @Test
    @DisplayName("신규 사용자의 온보딩 상태는 PENDING이다.")
    void newUserStartsWithPendingOnboardingStatus() {
        // given
        User user = User.builder()
                .githubId(1L)
                .build();

        // when
        OnboardingStatus onboardingStatus = user.getOnboardingStatus();

        // then
        assertEquals(OnboardingStatus.PENDING, onboardingStatus);
    }

    @Test
    @DisplayName("온보딩을 완료하면 사용자 slug가 설정된다.")
    void slugCanBeUpdatedWhenOnboardingIsCompleted() throws NoSuchFieldException {
        // given
        Field slug = User.class.getDeclaredField("slug");

        // when
        Column column = slug.getAnnotation(Column.class);

        // then
        assertTrue(column.updatable());
    }

    @Test
    @DisplayName("온보딩을 완료하면 프로필 정보와 온보딩 상태가 갱신된다.")
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

    @Test
    @DisplayName("GitHub 신규 사용자는 USER 권한과 PENDING 상태로 생성된다.")
    void githubUserStartsWithUserRoleAndPendingOnboarding() {
        // given
        GithubIdentity githubIdentity = new GithubIdentity(
                1L,
                "https://github.com/avatar.png",
                "https://github.com/rilog",
                "rilog@example.com"
        );

        // when
        User user = User.registerFromGithub(githubIdentity);

        // then
        assertAll(
                () -> assertEquals(1L, user.getGithubId()),
                () -> assertEquals(GlobalRole.USER, user.getGlobalRole()),
                () -> assertEquals(OnboardingStatus.PENDING, user.getOnboardingStatus()),
                () -> assertEquals("https://github.com/avatar.png", user.getProfileImageUrl())
        );
    }

    @Test
    @DisplayName("GitHub 재로그인은 Rilog 소유 프로필과 역할을 보존한다.")
    void githubReloginPreservesRilogOwnedFields() {
        // given
        User user = User.registerFromGithub(new GithubIdentity(
                1L,
                "old.png",
                "https://github.com/old",
                "old@example.com"
        ));
        user.completeOnboarding(
                "릴로그",
                "rilog",
                "Rilog introduction",
                "custom.png",
                "https://github.com/custom",
                "custom@example.com"
        );

        // when
        user.synchronizeGithubProfile(new GithubIdentity(
                1L,
                "new.png",
                "https://github.com/new",
                "new@example.com"
        ));

        // then
        assertAll(
                () -> assertEquals("릴로그", user.getNickname()),
                () -> assertEquals("rilog", user.getSlug()),
                () -> assertEquals("Rilog introduction", user.getIntroduction()),
                () -> assertEquals(GlobalRole.USER, user.getGlobalRole()),
                () -> assertEquals(OnboardingStatus.COMPLETED, user.getOnboardingStatus()),
                () -> assertEquals("new.png", user.getProfileImageUrl()),
                () -> assertEquals("https://github.com/new", user.getGithubUrl()),
                () -> assertEquals("new@example.com", user.getEmail())
        );
    }

    @Test
    @DisplayName("ADMIN은 USER 요구사항을 허용하지만 USER는 ADMIN 요구사항을 허용하지 않는다.")
    void globalRoleUsesExplicitHierarchy() {
        // given
        GlobalRole admin = GlobalRole.ADMIN;
        GlobalRole user = GlobalRole.USER;

        // when
        boolean adminPermitsUser = admin.permits(user);
        boolean adminPermitsAdmin = admin.permits(admin);
        boolean userPermitsUser = user.permits(user);
        boolean userPermitsAdmin = user.permits(admin);

        // then
        assertAll(
                () -> assertTrue(adminPermitsUser),
                () -> assertTrue(adminPermitsAdmin),
                () -> assertTrue(userPermitsUser),
                () -> org.junit.jupiter.api.Assertions.assertFalse(userPermitsAdmin)
        );
    }

}
