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
import static kr.rilog.domain.blog.exception.BlogErrorInformation.*;

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

    public Blog transfer(BlogMember targetMember) {
        validateActiveMember();
        targetMember.validateActiveMember();
        return targetMember.getBlog();
    }

    public void remove(BlogMember target) {
        validateActiveMember();
        target.validateActiveMember();

        if (isSameMember(target)) {
            throw new BlogException(COLOG_SELF_REMOVE_FORBIDDEN);
        }

        if (canRemove(target)) {
            target.markAsLeft();
            return;
        }

        throw new BlogException(COLOG_MEMBER_REMOVE_FORBIDDEN);
    }

    public void changeAuthorityOf(BlogMember target, BlogPermission newPermission, String newBlogRole) {
        this.validateActiveMember();
        target.validateActiveMember();
        validateCanUpdateBlogRole(target, newBlogRole);
        validateCanUpdatePermission(target, newPermission);

        target.blogRole = newBlogRole;
        updatePermission(target, newPermission);
    }

    public void validateActiveMember() {
        if (status != ACTIVE) {
            throw new BlogException(ALREADY_BLOG_MEMBER_LEFT);
        }
    }

    public void validateCanLeave() {
        validateActiveMember();

        if (isOwner()) {
            throw new BlogException(COLOG_OWNER_LEAVE_FORBIDDEN);
        }
    }

    public void validateCanDeleteColog() {
        validateActiveMember();

        if (!isCologMember() || !isOwner()) {
            throw new BlogException(COLOG_DELETE_FORBIDDEN);
        }
    }

    public boolean hasDeletePermission() {
        return isAdminPermission() && getDeletedAt() == null;
    }

    public void leaveBySelf() {
        validateCanLeave();
        markAsLeft();
    }

    // AdminPermission 은 Owner + Admin 권한
    public void validateAdminPermission() {
        if (!isAdminPermission()) {
            throw new BlogException(ADMIN_PERMISSION_REQUIRED);
        }
    }

    private void markAsLeft() {
        delete();
        this.status = BlogMemberStatus.LEFT;
    }

    private boolean isSameMember(BlogMember target) {
        return id.equals(target.id);
    }

    private boolean isOwner() {
        return permission == OWNER;
    }

    private boolean canRemove(BlogMember target) {
        if (permission == OWNER) {
            return target.permission == ADMIN || target.permission == MEMBER;
        }

        return permission == ADMIN && target.permission == MEMBER;
    }

    private void validateCanUpdateBlogRole(BlogMember target, String newBlogRole) {
        if (newBlogRole == null) {
            return;
        }
        if (canUpdateBlogRole(target)) {
            return;
        }

        throw new BlogException(COLOG_MEMBER_UPDATE_FORBIDDEN);
    }

    private boolean canUpdateBlogRole(BlogMember target) {
        if (permission == OWNER) {
            return target.permission == ADMIN || target.permission == MEMBER;
        }

        return permission == ADMIN && target.permission == MEMBER;
    }

    private void validateCanUpdatePermission(BlogMember target, BlogPermission newPermission) {
        if (newPermission == null) {
            return;
        }
        if (isSameMember(target)) {
            throw new BlogException(COLOG_SELF_PERMISSION_UPDATE_FORBIDDEN);
        }
        if (target.permission == newPermission) {
            return;
        }
        if (!isOwner() || target.isOwner()) {
            throw new BlogException(COLOG_MEMBER_UPDATE_FORBIDDEN);
        }
    }

    private void updatePermission(BlogMember target, BlogPermission newPermission) {
        if (newPermission == OWNER) {
            transferOwnershipTo(target);
            return;
        }

        target.permission = newPermission;
    }

    private void transferOwnershipTo(BlogMember target) {
        this.permission = ADMIN;
        target.permission = OWNER;
    }

    private boolean isCologMember() {
        return blog.isColog();
    }

    private boolean isAdminPermission() {
        return status == ACTIVE && (permission == OWNER || permission == ADMIN);
    }

}
