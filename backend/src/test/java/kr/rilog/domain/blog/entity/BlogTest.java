package kr.rilog.domain.blog.entity;

import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

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
                .slug("rilog")
                .blogType(BlogType.RILOG)
                .build();
    }
}
