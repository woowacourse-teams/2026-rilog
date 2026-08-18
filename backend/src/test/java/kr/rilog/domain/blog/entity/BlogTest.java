package kr.rilog.domain.blog.entity;

import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_POST_PUBLISH_FORBIDDEN;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BlogTest {

    private static final String ERROR_INFORMATION = "errorInformation";
    private static final Long OWNER_ID = 1L;
    private static final Long OTHER_USER_ID = 2L;

    @Test
    @DisplayName("사용자가 블로그 소유자이면 소유자 검증을 통과한다")
    void validateIsOwnerPassesWhenUserIsOwner() {
        // given
        User owner = createUser(OWNER_ID);
        User user = createUser(OWNER_ID);
        Blog blog = createRilog(owner);

        // when - then
        assertThatCode(() -> blog.validateIsOwner(user)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("사용자가 블로그 소유자가 아니면 예외가 발생한다")
    void validateIsOwnerFailsWhenUserIsNotOwner() {
        // given
        Blog blog = createRilog(createUser(OWNER_ID));
        User user = createUser(OTHER_USER_ID);

        // when - then
        assertThatThrownBy(() -> blog.validateIsOwner(user))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(RILOG_POST_PUBLISH_FORBIDDEN);
    }

    @Test
    @DisplayName("팀 블로그를 생성하면 COLOG 타입으로 소유자가 설정된다")
    void createCologCreatesTeamBlog() {
        // given
        User owner = createUser(OWNER_ID);

        // when
        Blog colog = Blog.createColog(
                owner,
                "리로그 팀",
                "rilog-team",
                "함께 쓰는 기술 블로그",
                "https://example.com/logo.png",
                "https://example.com/cover.png",
                "https://rilog.example.com",
                "https://github.com/rilog"
        );

        // then
        assertThat(colog)
                .extracting(
                        Blog::getOwner,
                        Blog::getName,
                        Blog::getSlug,
                        Blog::getIntroduction,
                        Blog::getProfileImageUrl,
                        Blog::getCoverImageUrl,
                        Blog::getServiceUrl,
                        Blog::getGithubUrl,
                        Blog::getBlogType
                )
                .containsExactly(
                        owner,
                        "리로그 팀",
                        "rilog-team",
                        "함께 쓰는 기술 블로그",
                        "https://example.com/logo.png",
                        "https://example.com/cover.png",
                        "https://rilog.example.com",
                        "https://github.com/rilog",
                        BlogType.COLOG
                );
    }

    private User createUser(Long id) {
        return User.builder()
                .id(id)
                .githubId(id)
                .build();
    }

    private Blog createRilog(User owner) {
        return Blog.builder()
                .id(1L)
                .owner(owner)
                .name("개인 블로그")
                .slug(Slug.from("rilog"))
                .blogType(BlogType.RILOG)
                .build();
    }
}
