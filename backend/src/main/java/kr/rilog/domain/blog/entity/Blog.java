package kr.rilog.domain.blog.entity;

import jakarta.persistence.*;
import kr.rilog.domain.blog.entity.enums.BlogType;
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

    @Column(length = 20, nullable = false)
    private String name; // NOTE - 팀블로그명 or 개인블로그명(사용자명)

    @Column(length = 20, nullable = false, unique = true, updatable = false)
    private String slug;

    @Column(length = 80)
    private String introduction;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BlogType blogType;

    @Column(length = 512)
    private String logoUrl;

    @Column(length = 512)
    private String coverImageUrl;

    @Column(length = 512)
    private String email;

    @Column(length = 512)
    private String serviceUrl;

    @Column(length = 512)
    private String githubUrl;

    public static Blog createColog(
            User owner,
            String name,
            String slug,
            String introduction,
            String logoUrl,
            String coverImageUrl,
            String serviceUrl,
            String githubUrl
    ) {
        return Blog.builder()
                .owner(owner)
                .name(name)
                .slug(slug)
                .introduction(introduction)
                .logoUrl(logoUrl)
                .coverImageUrl(coverImageUrl)
                .serviceUrl(serviceUrl)
                .githubUrl(githubUrl)
                .blogType(BlogType.COLOG)
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

}
