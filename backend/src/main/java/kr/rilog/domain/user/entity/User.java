package kr.rilog.domain.user.entity;

import jakarta.persistence.*;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.global.entity.BaseEntity;
import lombok.AccessLevel;
import lombok.Builder.Default;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

import static kr.rilog.domain.user.exception.UserErrorInformation.ONBOARDING_ALREADY_COMPLETED;

@Getter
@Entity
@Table(name = "users")
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {

    private static final String GITHUB_PROFILE_URL_FORMAT = "https://github.com/%s";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 20, unique = true)
    private String nickname;

    @Column(length = 50, unique = true)
    private String slug;

    @Column(length = 80)
    private String introduction;

    @Column(nullable = false, unique = true, updatable = false)
    private Long githubId;

    @Column(length = 512)
    private String profileImageUrl;

    @Column(length = 512)
    private String githubUrl;

    @Column(length = 256)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Default
    private OnboardingStatus onboardingStatus = OnboardingStatus.PENDING;

    private LocalDateTime onboardingCompletedAt;

    public static User createPendingGithubUser(Long githubId, String githubLogin, String profileImageUrl) {
        return User.builder()
                .githubId(githubId)
                .githubUrl(GITHUB_PROFILE_URL_FORMAT.formatted(githubLogin))
                .profileImageUrl(profileImageUrl)
                .build();
    }

    public void completeOnboarding(
            String nickname,
            String slug,
            String introduction,
            String profileImageUrl,
            String githubUrl,
            String email
    ) {
        if (isOnboardingCompleted()) {
            throw new UserException(ONBOARDING_ALREADY_COMPLETED);
        }

        this.nickname = nickname;
        this.slug = slug;
        this.introduction = introduction;
        this.profileImageUrl = profileImageUrl;
        this.githubUrl = githubUrl;
        this.email = email;
        this.onboardingStatus = OnboardingStatus.COMPLETED;
        this.onboardingCompletedAt = LocalDateTime.now();
    }

    private boolean isOnboardingCompleted() {
        return this.onboardingStatus == OnboardingStatus.COMPLETED || this.slug != null;
    }
}
