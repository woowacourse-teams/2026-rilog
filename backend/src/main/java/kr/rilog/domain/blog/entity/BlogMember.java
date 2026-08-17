package kr.rilog.domain.blog.entity;

import jakarta.persistence.*;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.user.entity.User;
import kr.rilog.global.entity.BaseEntity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

import static kr.rilog.domain.blog.entity.enums.BlogMemberStatus.ACTIVE;
import static kr.rilog.domain.blog.entity.enums.BlogPermission.*;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_INVITE_FORBIDDEN;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_PERMISSION_INVALID;

@Getter
@Entity
@Table(name = "blog_member")
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BlogMember extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blog_id")
    private Blog blog;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(length = 50)
    private String blogRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BlogPermission permission;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BlogMemberStatus status;

    private LocalDateTime joinedAt;

    public static BlogMember createOwner(Blog blog, User user, LocalDateTime joinedAt) {
        return BlogMember.builder()
                .blog(blog)
                .user(user)
                .permission(OWNER)
                .status(ACTIVE)
                .joinedAt(joinedAt)
                .build();
    }

    public static BlogMember invite(
            Blog blog,
            User user,
            String blogRole,
            BlogPermission permission,
            LocalDateTime joinedAt
    ) {
        return BlogMember.builder()
                .blog(blog)
                .user(user)
                .blogRole(blogRole)
                .permission(permission)
                .status(ACTIVE)
                .joinedAt(joinedAt)
                .build();
    }

    public void validateCanInvite(BlogPermission inviteePermission) {
        if (status != ACTIVE || permission != OWNER && permission != ADMIN) {
            throw new BlogException(BLOG_MEMBER_INVITE_FORBIDDEN);
        }

        if (inviteePermission != ADMIN && inviteePermission != MEMBER) {
            throw new BlogException(BLOG_MEMBER_PERMISSION_INVALID);
        }
    }

}
