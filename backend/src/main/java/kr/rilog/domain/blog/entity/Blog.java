package kr.rilog.domain.blog.entity;

import jakarta.persistence.*;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.user.entity.User;
import kr.rilog.global.entity.BaseEntity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.Objects;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_POST_PUBLISH_FORBIDDEN;

@Getter
@Entity
@Table(name = "blog")
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Blog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Embedded
    private Profile profile;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BlogType blogType;

    public static Blog createColog(User owner, Profile profile) {
        return Blog.builder()
                .owner(owner)
                .profile(profile)
                .blogType(BlogType.COLOG)
                .build();
    }

    public static Blog createRilog(User owner) {
        return Blog.builder()
                .owner(owner)
                .profile(Profile.createRilog(
                        owner.getNickname(),
                        owner.getSlug(),
                        owner.getIntroduction(),
                        owner.getProfileImageUrl(),
                        owner.getEmail(),
                        owner.getGithubUrl()
                ))
                .blogType(BlogType.RILOG)
                .build();
    }

    public boolean isColog() {
        return this.blogType == BlogType.COLOG;
    }

    public void validateIsOwner(User user) {
        if (!isOwner(user)) {
            throw new BlogException(RILOG_POST_PUBLISH_FORBIDDEN);
        }
    }

    private boolean isOwner(User user) {
        if (owner == null || user == null) {
            return false;
        }

        return owner == user || owner.getId() != null && Objects.equals(owner.getId(), user.getId());
    }

    public String getName() {
        return profile == null ? null : profile.getName();
    }

    public String getSlug() {
        return profile == null ? null : profile.getSlug();
    }

    public String getIntroduction() {
        return profile == null ? null : profile.getIntroduction();
    }

    public String getProfileImageUrl() {
        return profile == null ? null : profile.getProfileImageUrl();
    }

    public String getCoverImageUrl() {
        return profile == null ? null : profile.getCoverImageUrl();
    }

    public String getEmail() {
        return profile == null ? null : profile.getEmail();
    }

    public String getServiceUrl() {
        return profile == null ? null : profile.getServiceUrl();
    }

    public String getGithubUrl() {
        return profile == null ? null : profile.getGithubUrl();
    }

}
