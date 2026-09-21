package kr.rilog.domain.comment.entity;

import kr.rilog.domain.comment.entity.vo.Selection;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.user.entity.User;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.CommentAnchorFixture;
import kr.rilog.support.fixure.PostFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_AUTHOR_FORBIDDEN;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_ANCHOR;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_CONTENT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CommentAnchorTest {

    private static final Long WRITER_ID = 1L;
    private static final Long OTHER_USER_ID = 2L;
    private static final String CONTENT = "좋은 설명이에요.";
    private static final int MAX_CONTENT_LENGTH = 1_000;
    private static final Selection SELECTION = Selection.of("block-a", 2, 4, "나다");

    private final Post post = PostFixture.publicPublishedRilogPost();
    private final User writer = BlogFixture.createUser(WRITER_ID);

    @Test
    @DisplayName("인라인 댓글은 저장된 선택 범위를 참조한다.")
    void createKeepsAnchorSelection() {
        CommentAnchorSelection anchorSelection = activeSelection();

        CommentAnchor anchor = CommentAnchor.create(anchorSelection, writer, CONTENT);

        assertThat(anchor.getSelection()).isSameAs(anchorSelection);
    }

    @Test
    @DisplayName("저장된 선택 범위가 없으면 인라인 댓글을 작성할 수 없다.")
    void createRejectsMissingSelection() {
        assertThatThrownBy(() -> CommentAnchor.create(null, writer, CONTENT))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @Test
    @DisplayName("본문이 없으면 인라인 댓글을 작성할 수 없다.")
    void createRejectsNullContent() {
        assertThatThrownBy(() -> CommentAnchor.create(activeSelection(), writer, null))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_CONTENT.getMessage());
    }

    @Test
    @DisplayName("본문이 비어 있으면 인라인 댓글을 작성할 수 없다.")
    void createRejectsBlankContent() {
        assertThatThrownBy(() -> CommentAnchor.create(activeSelection(), writer, "    "))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_CONTENT.getMessage());
    }

    @Test
    @DisplayName("본문이 최대 길이를 넘으면 인라인 댓글을 작성할 수 없다.")
    void createRejectsTooLongContent() {
        String tooLongContent = "가".repeat(MAX_CONTENT_LENGTH + 1);

        assertThatThrownBy(() -> CommentAnchor.create(activeSelection(), writer, tooLongContent))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_CONTENT.getMessage());
    }

    @Test
    @DisplayName("본문이 최대 길이면 인라인 댓글을 작성할 수 있다.")
    void createAllowsMaxLengthContent() {
        String maxLengthContent = "가".repeat(MAX_CONTENT_LENGTH);

        assertThatCode(() -> CommentAnchor.create(activeSelection(), writer, maxLengthContent))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("작성자는 인라인 댓글 본문을 수정할 수 있다.")
    void updateContentAllowsWriter() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        anchor.updateContent(WRITER_ID, "수정한 댓글입니다.");

        assertThat(anchor.getContent()).isEqualTo("수정한 댓글입니다.");
    }

    @Test
    @DisplayName("ORPHANED 선택 범위의 댓글도 작성자는 본문을 수정할 수 있다.")
    void updateContentAllowsWriterWhenSelectionIsOrphaned() {
        CommentAnchorSelection anchorSelection = activeSelection();
        anchorSelection.orphan(LocalDateTime.of(2026, 9, 20, 12, 0));
        CommentAnchor anchor = CommentAnchor.create(anchorSelection, writer, CONTENT);

        anchor.updateContent(WRITER_ID, "수정한 댓글입니다.");

        assertThat(anchor.getContent()).isEqualTo("수정한 댓글입니다.");
    }

    @Test
    @DisplayName("작성자가 아니면 인라인 댓글 본문을 수정할 수 없다.")
    void updateContentRejectsOtherUser() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        assertThatThrownBy(() -> anchor.updateContent(OTHER_USER_ID, "수정한 댓글입니다."))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_AUTHOR_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("삭제하면 삭제된 인라인 댓글이 된다.")
    void deleteMarksDeleted() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        anchor.delete();

        assertThat(anchor.isDeleted()).isTrue();
    }

    @Test
    @DisplayName("작성자 본인의 id이면 작성자로 판단한다.")
    void isWrittenByWriter() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        assertThat(anchor.isWrittenBy(WRITER_ID)).isTrue();
    }

    @Test
    @DisplayName("다른 사용자의 id이면 작성자로 판단하지 않는다.")
    void isWrittenByRejectsOtherUser() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        assertThat(anchor.isWrittenBy(OTHER_USER_ID)).isFalse();
    }

    private CommentAnchorSelection activeSelection() {
        return CommentAnchorSelection.create(post, SELECTION);
    }

}
