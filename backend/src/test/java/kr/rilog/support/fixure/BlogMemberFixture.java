package kr.rilog.support.fixure;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.user.entity.User;

import java.time.LocalDateTime;

public final class BlogMemberFixture {

    private BlogMemberFixture() {
    }

    public static BlogMember owner(Blog blog, User user) {
        return BlogMember.createOwner(
                blog,
                user,
                LocalDateTime.of(2026, 8, 18, 12, 0)
        );
    }

    public static BlogMember leftMember() {
        return BlogMember.builder()
                .permission(BlogPermission.MEMBER)
                .status(BlogMemberStatus.LEFT)
                .build();
    }

    public static BlogMember leftMember(Blog blog, User user) {
        return BlogMember.builder()
                .blog(blog)
                .user(user)
                .permission(BlogPermission.MEMBER)
                .status(BlogMemberStatus.LEFT)
                .build();
    }

    public static BlogMember blogMember(Blog blog, User user) {
        return BlogMember.builder()
                .blog(blog)
                .user(user)
                .permission(BlogPermission.MEMBER)
                .status(BlogMemberStatus.ACTIVE)
                .build();
    }

}
