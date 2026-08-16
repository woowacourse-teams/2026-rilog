package kr.rilog.domain.user.entity;

import jakarta.persistence.*;
import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.user.entity.vo.Email;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.global.entity.BaseEntity;
import kr.rilog.global.vo.Slug;
import lombok.AccessLevel;
import lombok.Builder.Default;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

import static kr.rilog.domain.user.exception.UserErrorInformation.ONBOARDING_ALREADY_COMPLETED;

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
        this.email = Email.from(email);
        this.onboardingStatus = OnboardingStatus.COMPLETED;
        this.onboardingCompletedAt = LocalDateTime.now();
    }

    public boolean isOnboardingCompleted() {
        return this.onboardingStatus == OnboardingStatus.COMPLETED || this.slug != null;
    }

    public Long getId() {
        return id;
    }

    public String getNickname() {
        if (nickname == null) {
            return null;
        }

        return nickname.getValue();
    }

    public String getSlug() {
        if (slug == null) {
            return null;
        }

        return slug.getValue();
    }

    public String getIntroduction() {
        return introduction;
    }

    public Long getGithubId() {
        return githubId;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public String getGithubUrl() {
        return githubUrl;
    }

    public String getEmail() {
        if (email == null) {
            return null;
        }

        return email.getValue();
    }

    public OnboardingStatus getOnboardingStatus() {
        return onboardingStatus;
    }

    public GlobalRole getGlobalRole() {
        return globalRole;
    }

    public LocalDateTime getOnboardingCompletedAt() {
        return onboardingCompletedAt;
    }

    public abstract static class UserBuilder<C extends User, B extends UserBuilder<C, B>>
            extends BaseEntity.BaseEntityBuilder<C, B> {

        public B nickname(String nickname) {
            this.nickname = nickname == null ? null : Nickname.from(nickname);
            return self();
        }

        public B slug(String slug) {
            this.slug = slug == null ? null : Slug.from(slug);
            return self();
        }

        public B email(String email) {
            this.email = email == null ? null : Email.from(email);
            return self();
        }
    }
}
