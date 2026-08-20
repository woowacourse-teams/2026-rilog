package kr.rilog.domain.blog.entity;

import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_POST_PUBLISH_FORBIDDEN;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BlogTest {

    private static final Long OWNER_ID = 1L;
    private static final Long OTHER_USER_ID = 2L;

    @Test
    @DisplayName("개인 블로그를 생성하면 사용자 프로필 정보와 RILOG 타입이 설정된다")
    void createRilogCreatesPersonalBlogFromOwnerProfile() {
        // given
        User owner = createUser(OWNER_ID);

        // when
        Blog rilog = Blog.createRilog(owner);

        // then
        assertThat(rilog.getBlogType()).isEqualTo(BlogType.RILOG);
    }

    @Test
    @DisplayName("팀 블로그를 생성하면 COLOG 타입으로 소유자가 설정된다")
    void createCologCreatesTeamBlog() {
        // given
        User owner = createUser(OWNER_ID);

        // when
        Blog colog = Blog.createColog(
                owner,
                createCologProfile()
        );

        // then
        assertThat(colog.getBlogType()).isEqualTo(BlogType.COLOG);
    }

    @Test
    @DisplayName("사용자가 블로그 소유자이면 소유자 검증을 통과한다")
    void validateIsOwnerPassesWhenUserIsOwner() {
        // given
        User owner = createUser(OWNER_ID);
        User user = createUser(OWNER_ID);

        // when
        Blog blog = createRilog(owner);

        // then
        assertThatCode(() -> blog.validateIsOwner(user)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("사용자가 블로그 소유자가 아니면 예외가 발생한다")
    void validateIsOwnerFailsWhenUserIsNotOwner() {
        // given
        User owner = createUser(OWNER_ID);
        User user = createUser(OTHER_USER_ID);

        // when
        Blog blog = createRilog(owner);

        // then
        assertThatThrownBy(() -> blog.validateIsOwner(user))
                .isInstanceOf(BlogException.class)
                .hasMessage(RILOG_POST_PUBLISH_FORBIDDEN.getMessage());
    }

    private User createUser(Long id) {
        return User.builder()
                .id(id)
                .slug(Slug.from("rilog"))
                .build();
    }

    private Blog createRilog(User owner) {
        return Blog.builder()
                .id(1L)
                .owner(owner)
                .profile(createRilogProfile())
                .blogType(BlogType.RILOG)
                .build();
    }

    private Profile createRilogProfile() {
        return Profile.createColog(
                "러로",
                "jinriro",
                "안녕하세요. 러로입니다. ",
                "https://example.com/profile.png",
                "https://example.com/cover.png",
                "https://jinriro.example.com",
                "https://github.com/Wlsflfh"
        );
    }

    private Profile createCologProfile() {
        return Profile.createColog(
                "리로그",
                "team_rilog",
                "세계 최고의 블로그 플랫폼 Rilog. 입니다.",
                "https://example.com/profile.png",
                "https://example.com/cover.png",
                "https://rilog.example.com",
                "https://github.com/rilog"
        );
    }

}
