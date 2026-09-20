package kr.rilog.domain.comment.entity;

import kr.rilog.domain.comment.entity.enums.AnchorStatus;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.vo.TextBlock;
import kr.rilog.domain.post.entity.vo.TextRange;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.user.entity.User;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.CommentAnchorFixture;
import kr.rilog.support.fixure.PostFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_ANCHOR_BLOCK_NOT_COMMENTABLE;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_ANCHOR_NOT_ACTIVE;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_AUTHOR_FORBIDDEN;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_ANCHOR;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_CONTENT;
import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_TEXT_RANGE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CommentAnchorTest {

    private static final Long WRITER_ID = 1L;
    private static final Long OTHER_USER_ID = 2L;
    private static final String BLOCK_ID = "block-a";
    private static final String BLOCK_TEXT = "가나나다다라마";
    private static final TextBlock BLOCK = new TextBlock(BLOCK_ID, "paragraph", BLOCK_TEXT);
    private static final String SELECTED_TEXT = "나다";
    private static final TextRange SELECTED_RANGE = TextRange.of(2, 4);
    private static final String CONTENT = "좋은 설명이에요.";
    private static final int MAX_CONTENT_LENGTH = 1_000;

    private final Post post = PostFixture.publicPublishedRilogPost();
    private final User writer = BlogFixture.createUser(WRITER_ID);

    @Test
    @DisplayName("인라인 댓글을 작성하면 ACTIVE 상태이고 고아상태가 아니다.")
    void createStartsActive() {
        // when
        CommentAnchor anchor = CommentAnchor.create(post, writer, BLOCK, SELECTED_RANGE, SELECTED_TEXT, CONTENT);

        // then
        assertThat(anchor.getStatus()).isEqualTo(AnchorStatus.ACTIVE);
        assertThat(anchor.getOrphanedAt()).isNull();
    }

    @Test
    @DisplayName("인라인 댓글을 작성하면 블록과 선택 범위와 선택 문자열을 그대로 보존한다.")
    void createKeepsAnchorPosition() {
        // when
        CommentAnchor anchor = CommentAnchor.create(post, writer, BLOCK, SELECTED_RANGE, SELECTED_TEXT, CONTENT);

        // then
        assertThat(anchor.getBlockId()).isEqualTo(BLOCK_ID);
        assertThat(anchor.getRange()).isEqualTo(SELECTED_RANGE);
        assertThat(anchor.getSelectedText()).isEqualTo(SELECTED_TEXT);
    }

    @Test
    @DisplayName("선택 문자열의 길이가 범위의 길이보다 길면 인라인 댓글을 작성할 수 없다.")
    void createRejectsSelectedTextLongerThanRange() {
        // given
        TextRange shortRange = TextRange.of(0, 1);

        // when - then
        assertThatThrownBy(() -> CommentAnchor.create(post, writer, BLOCK, shortRange, SELECTED_TEXT, CONTENT))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @Test
    @DisplayName("선택 문자열의 길이가 범위의 길이보다 짧으면 인라인 댓글을 작성할 수 없다.")
    void createRejectsSelectedTextShorterThanRange() {
        // given
        TextRange longRange = TextRange.of(0, 3);

        // when - then
        assertThatThrownBy(() -> CommentAnchor.create(post, writer, BLOCK, longRange, SELECTED_TEXT, CONTENT))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @DisplayName("선택 문자열이 없으면 인라인 댓글을 작성할 수 없다.")
    void createRejectsMissingSelectedText(String selectedText) {
        // when - then
        assertThatThrownBy(() -> CommentAnchor.create(post, writer, BLOCK, SELECTED_RANGE, selectedText, CONTENT))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @Test
    @DisplayName("선택 범위가 없으면 인라인 댓글을 작성할 수 없다.")
    void createRejectsMissingRange() {
        // when - then
        assertThatThrownBy(() -> CommentAnchor.create(post, writer, BLOCK, null, SELECTED_TEXT, CONTENT))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @Test
    @DisplayName("본문이 없으면 인라인 댓글을 작성할 수 없다.")
    void createRejectsNullContent() {
        // given
        String nullContent = null;

        // when - then
        assertThatThrownBy(() -> CommentAnchor.create(post, writer, BLOCK, SELECTED_RANGE, SELECTED_TEXT, nullContent))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_CONTENT.getMessage());
    }

    @Test
    @DisplayName("공백만 있는 본문으로도 인라인 댓글을 작성할 수 있다.")
    void createAllowsBlankContent() {
        // given
        String blankContent = " ";

        // when
        CommentAnchor anchor = CommentAnchor.create(post, writer, BLOCK, SELECTED_RANGE, SELECTED_TEXT, blankContent);

        // then
        assertThat(anchor.getContent()).isEqualTo(blankContent);
    }

    @Test
    @DisplayName("본문이 최대 길이를 넘으면 인라인 댓글을 작성할 수 없다.")
    void createRejectsTooLongContent() {
        // given
        String tooLongContent = "가".repeat(MAX_CONTENT_LENGTH + 1);

        // when - then
        assertThatThrownBy(() -> CommentAnchor.create(post, writer, BLOCK, SELECTED_RANGE, SELECTED_TEXT, tooLongContent))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_CONTENT.getMessage());
    }

    @Test
    @DisplayName("본문이 최대 길이이면 인라인 댓글을 작성할 수 있다.")
    void createAllowsMaxLengthContent() {
        // given
        String maxLengthContent = "가".repeat(MAX_CONTENT_LENGTH);

        // when - then
        assertThatCode(() -> CommentAnchor.create(post, writer, BLOCK, SELECTED_RANGE, SELECTED_TEXT, maxLengthContent))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("텍스트 블록의 선택 범위에 작성하면 그 블록의 id를 보존한다.")
    void createFromBlockKeepsBlockId() {
        // given
        TextBlock block = new TextBlock(BLOCK_ID, "paragraph", BLOCK_TEXT);

        // when
        CommentAnchor anchor = CommentAnchor.create(post, writer, block, SELECTED_RANGE, SELECTED_TEXT, CONTENT);

        // then
        assertThat(anchor.getBlockId()).isEqualTo(BLOCK_ID);
    }

    @ParameterizedTest
    @ValueSource(strings = {"paragraph", "heading", "quote"})
    @DisplayName("문단과 제목과 인용 블록에는 인라인 댓글을 작성할 수 있다.")
    void createFromBlockAllowsCommentableBlockTypes(String blockType) {
        // given
        TextBlock block = new TextBlock(BLOCK_ID, blockType, BLOCK_TEXT);

        // when - then
        assertThatCode(() -> CommentAnchor.create(post, writer, block, SELECTED_RANGE, SELECTED_TEXT, CONTENT))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("댓글을 작성할 수 없는 타입의 블록에는 인라인 댓글을 작성할 수 없다.")
    void createFromBlockRejectsNotCommentableBlockType() {
        // given
        TextBlock codeBlock = new TextBlock(BLOCK_ID, "codeBlock", BLOCK_TEXT);

        // when - then
        assertThatThrownBy(() -> CommentAnchor.create(post, writer, codeBlock, SELECTED_RANGE, SELECTED_TEXT, CONTENT))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_BLOCK_NOT_COMMENTABLE.getMessage());
    }

    @Test
    @DisplayName("선택 문자열이 블록 텍스트의 해당 범위와 다르면 인라인 댓글을 작성할 수 없다.")
    void createFromBlockRejectsSelectedTextDifferentFromBlockText() {
        // given
        TextBlock block = new TextBlock(BLOCK_ID, "paragraph", BLOCK_TEXT);
        String differentSelectedText = "가나";

        // when - then
        assertThatThrownBy(() -> CommentAnchor.create(post, writer, block, SELECTED_RANGE, differentSelectedText, CONTENT))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @Test
    @DisplayName("선택 범위가 블록 텍스트의 길이를 넘으면 인라인 댓글을 작성할 수 없다.")
    void createFromBlockRejectsRangeBeyondBlockText() {
        // given
        TextBlock block = new TextBlock(BLOCK_ID, "paragraph", BLOCK_TEXT);
        TextRange rangeBeyondText = TextRange.of(BLOCK_TEXT.length(), BLOCK_TEXT.length() + 2);

        // when - then
        assertThatThrownBy(() -> CommentAnchor.create(post, writer, block, rangeBeyondText, SELECTED_TEXT, CONTENT))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_TEXT_RANGE.getMessage());
    }

    @Test
    @DisplayName("선택 범위가 없으면 텍스트 블록에 인라인 댓글을 작성할 수 없다.")
    void createFromBlockRejectsMissingRange() {
        // given
        TextBlock block = new TextBlock(BLOCK_ID, "paragraph", BLOCK_TEXT);

        // when - then
        assertThatThrownBy(() -> CommentAnchor.create(post, writer, block, null, SELECTED_TEXT, CONTENT))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @Test
    @DisplayName("작성자는 인라인 댓글 본문을 수정할 수 있다.")
    void updateContentAllowsWriter() {
        // given
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        // when
        anchor.updateContent(WRITER_ID, "수정한 댓글입니다.");

        // then
        assertThat(anchor.getContent()).isEqualTo("수정한 댓글입니다.");
    }

    @Test
    @DisplayName("고아 인라인 댓글도 작성자는 본문을 수정할 수 있다.")
    void updateContentAllowsWriterWhenOrphaned() {
        // given
        CommentAnchor anchor = CommentAnchorFixture.orphanedAnchor(post, writer);

        // when
        anchor.updateContent(WRITER_ID, "수정한 댓글입니다.");

        // then
        assertThat(anchor.getContent()).isEqualTo("수정한 댓글입니다.");
    }

    @Test
    @DisplayName("작성자가 아니면 인라인 댓글 본문을 수정할 수 없다.")
    void updateContentRejectsOtherUser() {
        // given
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        // when - then
        assertThatThrownBy(() -> anchor.updateContent(OTHER_USER_ID, "수정한 댓글입니다."))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_AUTHOR_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("ACTIVE 인라인 댓글은 선택 문자열과 길이가 같은 새 범위로 이동할 수 있다.")
    void relocateMovesToRangeOfSameLength() {
        // given
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);
        TextRange movedRange = TextRange.of(10, 12);

        // when
        anchor.relocate(movedRange);

        // then
        assertThat(anchor.getRange()).isEqualTo(movedRange);
    }

    @Test
    @DisplayName("선택 문자열과 길이가 다른 범위로는 인라인 댓글을 이동할 수 없다.")
    void relocateRejectsRangeOfDifferentLength() {
        // given
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);
        TextRange longerRange = TextRange.of(10, 13);

        // when - then
        assertThatThrownBy(() -> anchor.relocate(longerRange))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @Test
    @DisplayName("고아 인라인 댓글은 새 범위로 이동할 수 없다.")
    void relocateRejectsOrphanedAnchor() {
        // given
        CommentAnchor anchor = CommentAnchorFixture.orphanedAnchor(post, writer);
        TextRange sameLengthRange = TextRange.of(10, 12);

        // when - then
        assertThatThrownBy(() -> anchor.relocate(sameLengthRange))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_NOT_ACTIVE.getMessage());
    }

    @Test
    @DisplayName("위치를 잃으면 ORPHANED 상태가 되고 그 시각이 기록된다.")
    void orphanMarksStatusAndTime() {
        // given
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        // when
        anchor.orphan();

        // then
        assertThat(anchor.getStatus()).isEqualTo(AnchorStatus.ORPHANED);
        assertThat(anchor.getOrphanedAt()).isNotNull();
    }

    @Test
    @DisplayName("고아여도 마지막 선택 범위와 선택 문자열은 보존한다.")
    void orphanKeepsLastRangeAndSelectedText() {
        // given
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);
        TextRange lastRange = anchor.getRange();
        String lastSelectedText = anchor.getSelectedText();

        // when
        anchor.orphan();

        // then
        assertThat(anchor.getRange()).isEqualTo(lastRange);
        assertThat(anchor.getSelectedText()).isEqualTo(lastSelectedText);
    }

    @Test
    @DisplayName("고아 잃은 인라인 댓글은 다시 고아로 처리할 수 없다.")
    void orphanRejectsOrphanedAnchor() {
        // given
        CommentAnchor anchor = CommentAnchorFixture.orphanedAnchor(post, writer);

        // when - then
        assertThatThrownBy(anchor::orphan)
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_NOT_ACTIVE.getMessage());
    }

    @Test
    @DisplayName("삭제하면 삭제된 인라인 댓글이 된다.")
    void deleteMarksDeleted() {
        // given
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        // when
        anchor.delete();

        // then
        assertThat(anchor.isDeleted()).isTrue();
    }

    @Test
    @DisplayName("작성자 본인의 id이면 작성자로 판단한다.")
    void isWrittenByWriter() {
        // given
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        // when - then
        assertThat(anchor.isWrittenBy(WRITER_ID)).isTrue();
    }

    @Test
    @DisplayName("다른 사용자의 id이면 작성자로 판단하지 않는다.")
    void isWrittenByRejectsOtherUser() {
        // given
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        // when - then
        assertThat(anchor.isWrittenBy(OTHER_USER_ID)).isFalse();
    }

}
