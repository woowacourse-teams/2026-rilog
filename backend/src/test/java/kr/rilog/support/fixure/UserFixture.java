package kr.rilog.support.fixure;

import kr.rilog.domain.user.entity.User;

public final class UserFixture {

    private static final long PENDING_USER_GITHUB_ID = 100L;
    private static final long COMPLETED_USER_GITHUB_ID = 200L;
    private static final String PROFILE_IMAGE_URL = "https://example.com/profile.png";
    private static final String INTRODUCTION = "기록하는 개발자입니다.";
    private static final String GITHUB_URL = "https://github.com/rilog";
    private static final String EMAIL = "rilog@example.com";

    private UserFixture() {
    }

    public static User user(long githubId, String githubLogin) {
        return User.createPendingGithubUser(
                githubId,
                githubLogin,
                "https://example.com/" + githubLogin + ".png"
        );
    }

    public static User pending() {
        return User.createPendingGithubUser(
                PENDING_USER_GITHUB_ID,
                "pending-user",
                PROFILE_IMAGE_URL
        );
    }

    public static User completedWithNicknameAndSlug(String nickname, String slug) {
        User user = User.createPendingGithubUser(
                COMPLETED_USER_GITHUB_ID,
                "completed-user",
                PROFILE_IMAGE_URL
        );
        user.completeOnboarding(
                nickname,
                slug,
                INTRODUCTION,
                PROFILE_IMAGE_URL,
                GITHUB_URL,
                EMAIL
        );
        return user;
    }

}
