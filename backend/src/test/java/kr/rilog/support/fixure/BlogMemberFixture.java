package kr.rilog.support.fixure;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
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

}
