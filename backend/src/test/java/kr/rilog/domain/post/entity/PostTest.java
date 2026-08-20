package kr.rilog.domain.post.entity;

import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static kr.rilog.domain.post.exception.PostErrorInformation.PRIVATE_POST_READ_FORBIDDEN;
import static kr.rilog.support.BlogFixture.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PostTest {

    private static final Long WRITER_ID = 1L;
    private static final Long OTHER_USER_ID = 2L;

    @Test
    @DisplayName("공개 게시글은 인증하지 않은 사용자도 읽을 수 있다")
    void nonAuthenticatedUserCanReadPublicPost() {
        // given
        Post post = createPost(PostVisibility.PUBLIC);

        // when & then
        assertThatCode(() -> post.validateReadableBy(null))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("비공개 게시글은 작성자가 읽을 수 있다")
    void writerCanReadPrivatePost() {
        // given
        Post post = createPost(PostVisibility.PRIVATE);

        // when & then
        assertThatCode(() -> post.validateReadableBy(WRITER_ID))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("비공개 게시글은 인증하지 않은 사용자가 읽을 수 없다")
    void nonAuthenticatedUserCannotReadPrivatePost() {
        // given
        Post post = createPost(PostVisibility.PRIVATE);

        // when & then
        assertThatThrownBy(() -> post.validateReadableBy(null))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("비공개 게시글은 작성자가 아닌 사용자가 읽을 수 없다")
    void nonWriterCannotReadPrivatePost() {
        // given
        Post post = createPost(PostVisibility.PRIVATE);

        // when & then
        assertThatThrownBy(() -> post.validateReadableBy(OTHER_USER_ID))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("Colog가 연결된 게시글은 Colog 소속이다")
    void postWithCologIsCologAffiliated() {
        // given
        Post post = createCologPost();

        // when & then
        assertThat(post.isCologAffiliated()).isTrue();
    }

    @Test
    @DisplayName("Colog가 연결되지 않은 게시글은 Colog 소속이 아니다")
    void postWithoutCologIsNotCologAffiliated() {
        // given
        Post post = createRilogPost();

        // when & then
        assertThat(post.isCologAffiliated()).isFalse();
    }

    private Post createRilogPost() {
        User author = createUser(WRITER_ID);
        return Post.builder()
                .user(author)
                .rilog(createRilog(author))
                .colog(null)
                .visibility(PostVisibility.PUBLIC)
                .build();
    }

    private Post createCologPost() {
        User author = createUser(WRITER_ID);
        return Post.builder()
                .user(createUser(WRITER_ID))
                .rilog(createRilog(author))
                .colog(createColog(author))
                .visibility(PostVisibility.PUBLIC)
                .build();
    }

    private Post createPost(PostVisibility visibility) {
        return Post.builder()
                .user(createUser(WRITER_ID))
                .visibility(visibility)
                .build();
    }

}
