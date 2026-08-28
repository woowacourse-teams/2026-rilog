package kr.rilog.domain.user.entity;

import jakarta.persistence.*;
import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.user.entity.vo.Email;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.global.entity.BaseEntity;
import kr.rilog.domain.blog.entity.vo.Slug;
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

    @Embedded
    private Nickname nickname;

    @Embedded
    private Slug slug;

    @Column(length = 80)
    private String introduction;

    @Column(nullable = false, unique = true, updatable = false)
    private Long githubId;

    @Column(length = 512)
    private String profileImageUrl;

    @Column(length = 512)
    private String githubUrl;

    @Embedded
    private Email email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Default
    private OnboardingStatus onboardingStatus = OnboardingStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Default
    private GlobalRole globalRole = GlobalRole.USER;

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

        this.nickname = Nickname.from(nickname);
        this.slug = Slug.from(slug);
        this.introduction = introduction;
        this.profileImageUrl = profileImageUrl;
        this.githubUrl = githubUrl;
        this.email = toEmailOrNull(email);
        this.onboardingStatus = OnboardingStatus.COMPLETED;
        this.onboardingCompletedAt = LocalDateTime.now();
    }

    public void synchronizeRilogProfile(
            String nickname,
            String introduction,
            String profileImageUrl,
            String githubUrl,
            String email
    ) {
        this.nickname = Nickname.from(nickname);
        this.introduction = introduction;
        this.profileImageUrl = profileImageUrl;
        this.githubUrl = githubUrl;
        this.email = toEmailOrNull(email);
    }

    public boolean isOnboardingCompleted() {
        return this.onboardingStatus == OnboardingStatus.COMPLETED || this.slug != null;
    }

    private Email toEmailOrNull(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }

        return Email.from(email);
    }

    public String getNickname() {
        return nickname == null ? null : nickname.getValue();
    }

    public String getSlug() {
        return slug == null ? null : slug.getValue();
    }

    public String getEmail() {
        return email == null ? null : email.getValue();
    }

}
