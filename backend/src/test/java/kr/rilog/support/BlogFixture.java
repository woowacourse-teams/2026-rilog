package kr.rilog.support;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.user.entity.User;

import java.time.LocalDateTime;

public class BlogFixture {

    private BlogFixture() {
    }

    public static LocalDateTime pastDate() {
        return LocalDateTime.now().minusDays(1);
    }

    public static User createUser(Long id) {
        return User.builder()
                .id(id)
                .slug(Slug.from("jinriro"))
                .build();
    }

    public static Blog createRilog(User owner) {
        return Blog.builder()
                .id(1L)
                .owner(owner)
                .slug(Slug.from("jinriro"))
                .profile(rilogProfile())
                .blogType(BlogType.RILOG)
                .build();
    }

    public static Blog createColog(User owner) {
        return Blog.builder()
                .id(1L)
                .owner(owner)
                .slug(Slug.from("rilog"))
                .profile(cologProfile())
                .blogType(BlogType.COLOG)
                .build();
    }

    public static Profile rilogProfile() {
        return Profile.createRilog(
                "러로",
                "안녕하세요. 러로입니다.",
                "https://example.com/profile.png",
                "riro@example.com",
                "https://github.com/Wlsflfh"
        );
    }

    public static Profile cologProfile() {
        return Profile.createColog(
                "리로그",
                "세계 최고의 블로그 플랫폼 Rilog. 입니다.",
                "https://example.com/profile.png",
                "https://example.com/cover.png",
                "https://rilog.example.com",
                "https://github.com/2026-rilog"
        );
    }

}
