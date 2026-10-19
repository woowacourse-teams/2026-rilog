package kr.rilog.domain.post.repository.projection;

import kr.rilog.domain.post.exception.PostException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import static kr.rilog.domain.post.entity.enums.PostVisibility.PRIVATE;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;
import static kr.rilog.domain.post.exception.PostErrorInformation.PRIVATE_POST_READ_FORBIDDEN;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PostViewTargetTest {

    @ParameterizedTest
    @NullSource
    @ValueSource(longs = {1L, 2L})
    @DisplayName("공개 게시글은 로그인 여부와 관계없이 조회 등록 대상으로 읽을 수 있다.")
    void publicPostCanBeRead(Long requesterId) {
        // given
        var target = new PostViewTarget(10L, 1L, PUBLIC);

        // when & then
        assertThatCode(() -> target.validateReadableBy(requesterId)).doesNotThrowAnyException();
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(longs = {2L})
    @DisplayName("비공개 게시글은 작성자가 아니면 조회 등록 대상으로 읽을 수 없다.")
    void privatePostRejectsOtherReaders(Long requesterId) {
        // given
        var target = new PostViewTarget(10L, 1L, PRIVATE);

        // when & then
        assertThatThrownBy(() -> target.validateReadableBy(requesterId))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
    }

    @ParameterizedTest
    @ValueSource(longs = {1L})
    @DisplayName("작성자는 비공개 게시글을 조회 등록 대상으로 읽을 수 있다.")
    void privatePostAllowsAuthor(Long requesterId) {
        // given
        var target = new PostViewTarget(10L, 1L, PRIVATE);

        // when & then
        assertThatCode(() -> target.validateReadableBy(requesterId)).doesNotThrowAnyException();
    }
}
