package kr.rilog.domain.user.entity;

import jakarta.persistence.*;
import kr.rilog.auth.domain.GithubIdentity;
import kr.rilog.auth.domain.GlobalRole;
import kr.rilog.global.entity.BaseEntity;
import lombok.AccessLevel;
import lombok.Builder.Default;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "users")
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {

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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Default
    private GlobalRole globalRole = GlobalRole.USER;

    private LocalDateTime onboardingCompletedAt;

    public static User registerFromGithub(GithubIdentity identity) {
        return User.builder()
                .githubId(identity.githubId())
                .profileImageUrl(identity.profileImageUrl())
                .githubUrl(identity.githubUrl())
                .email(identity.publicEmail())
                .globalRole(GlobalRole.USER)
                .onboardingStatus(OnboardingStatus.PENDING)
                .build();
    }

    public void synchronizeGithubProfile(GithubIdentity identity) {
        if (!githubId.equals(identity.githubId())) {
            throw new IllegalArgumentException("GitHub identity cannot be changed");
        }
        this.profileImageUrl = identity.profileImageUrl();
        this.githubUrl = identity.githubUrl();
        this.email = identity.publicEmail();
    }

    public boolean hasRole(GlobalRole requiredRole) {
        return globalRole.permits(requiredRole);
    }

    public void completeOnboarding(
            String nickname,
            String slug,
            String introduction,
            String profileImageUrl,
            String githubUrl,
            String email
    ) {
        this.nickname = nickname;
        this.slug = slug;
        this.introduction = introduction;
        this.profileImageUrl = profileImageUrl;
        this.githubUrl = githubUrl;
        this.email = email;
        this.onboardingStatus = OnboardingStatus.COMPLETED;
        this.onboardingCompletedAt = LocalDateTime.now();
    }

}
