package kr.rilog.domain.comment.entity;

import kr.rilog.domain.comment.entity.enums.AnchorStatus;
import kr.rilog.domain.comment.entity.vo.Selection;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.vo.TextBlock;
import kr.rilog.domain.post.entity.vo.TextBlockDiff;
import kr.rilog.domain.post.entity.vo.TextRange;
import kr.rilog.support.fixure.PostFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_ANCHOR_NOT_ACTIVE;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_ANCHOR;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CommentAnchorSelectionTest {

    private static final String BLOCK_ID = "block-a";
    private static final Selection SELECTION = Selection.of(BLOCK_ID, 2, 4, "나다");
    private static final LocalDateTime ORPHANED_AT = LocalDateTime.of(2026, 9, 20, 12, 0);

    private final Post post = PostFixture.publicPublishedRilogPost();

    @Test
    @DisplayName("선택 범위를 저장하면 ACTIVE 상태로 시작한다.")
    void createStartsActive() {
        // given & when
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, SELECTION);

        // then
        assertThat(anchorSelection.getStatus()).isEqualTo(AnchorStatus.ACTIVE);
        assertThat(anchorSelection.getOrphanedAt()).isNull();
    }

    @Test
    @DisplayName("선택 범위는 게시글을 보존한다.")
    void createKeepsPost() {
        // given & when
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, SELECTION);

        // then
        assertThat(anchorSelection.getPost()).isSameAs(post);
    }

    @Test
    @DisplayName("선택 범위는 Selection 값을 보존한다.")
    void createKeepsSelection() {
        // given & when
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, SELECTION);

        // then
        assertThat(anchorSelection.getSelection()).isEqualTo(SELECTION);
    }

    @Test
    @DisplayName("게시글이 없으면 선택 범위를 저장할 수 없다.")
    void createRejectsMissingPost() {
        assertThatThrownBy(() -> CommentAnchorSelection.create(null, SELECTION))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @Test
    @DisplayName("Selection 값이 없으면 선택 범위를 저장할 수 없다.")
    void createRejectsMissingSelection() {
        assertThatThrownBy(() -> CommentAnchorSelection.create(post, null))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @Test
    @DisplayName("ACTIVE 선택 범위는 선택 문자열과 길이가 같은 새 범위로 이동할 수 있다.")
    void relocateMovesToRangeOfSameLength() {
        // given
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, SELECTION);

        // when
        anchorSelection.relocate(TextRange.of(10, 12));

        // then
        assertThat(anchorSelection.getSelection())
                .isEqualTo(Selection.of(BLOCK_ID, 10, 12, "나다"));
    }

    @Test
    @DisplayName("선택 문자열과 길이가 다른 범위로는 이동할 수 없다.")
    void relocateRejectsRangeOfDifferentLength() {
        // given
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, SELECTION);

        // when & then
        assertThatThrownBy(() -> anchorSelection.relocate(TextRange.of(10, 13)))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @Test
    @DisplayName("선택 위치를 잃으면 ORPHANED 상태와 발생 시각을 기록한다.")
    void orphanMarksStatusAndTime() {
        // given
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, SELECTION);

        // when
        anchorSelection.orphan(ORPHANED_AT);

        // then
        assertThat(anchorSelection.getStatus()).isEqualTo(AnchorStatus.ORPHANED);
        assertThat(anchorSelection.getOrphanedAt()).isEqualTo(ORPHANED_AT);
    }

    @Test
    @DisplayName("고아가 되어도 마지막 Selection 값을 보존한다.")
    void orphanKeepsLastSelection() {
        // given
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, SELECTION);

        // when
        anchorSelection.orphan(ORPHANED_AT);

        // then
        assertThat(anchorSelection.getSelection()).isEqualTo(SELECTION);
    }

    @Test
    @DisplayName("고아 처리 시각이 없으면 ORPHANED 상태로 바뀌지 않는다.")
    void orphanRejectsMissingTime() {
        // given
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, SELECTION);

        // when & then
        assertThatThrownBy(() -> anchorSelection.orphan(null))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
        assertThat(anchorSelection.getStatus()).isEqualTo(AnchorStatus.ACTIVE);
    }

    @Test
    @DisplayName("ORPHANED 선택 범위는 다시 고아로 처리할 수 없다.")
    void orphanRejectsOrphanedSelection() {
        // given
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, SELECTION);
        anchorSelection.orphan(ORPHANED_AT);

        // when & then
        assertThatThrownBy(() -> anchorSelection.orphan(ORPHANED_AT.plusMinutes(1)))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_NOT_ACTIVE.getMessage());
    }

    @Test
    @DisplayName("ORPHANED 선택 범위는 이동할 수 없다.")
    void relocateRejectsOrphanedSelection() {
        // given
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, SELECTION);
        anchorSelection.orphan(ORPHANED_AT);

        // when & then
        assertThatThrownBy(() -> anchorSelection.relocate(TextRange.of(10, 12)))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_NOT_ACTIVE.getMessage());
    }

    @Test
    @DisplayName("선택 범위가 공통 접두사 안에 있으면 기존 위치를 유지한다.")
    void recalculateKeepsSelectionInsideCommonPrefix() {
        // given
        Selection selection = Selection.of(BLOCK_ID, 2, 4, "나다");
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, selection);
        TextBlockDiff difference = calculateDifference(
                "가가나다라",
                "가가나다마"
        );

        // when
        anchorSelection.recalculate(difference);

        // then
        Selection expected = Selection.of(BLOCK_ID, 2, 4, "나다");
        assertThat(anchorSelection.getSelection()).isEqualTo(expected);
    }

    @Test
    @DisplayName("선택 문자열 앞에 텍스트가 삽입되면 선택 범위를 뒤로 이동한다.")
    void recalculateMovesSelectionBackwardAfterInsertion() {
        // given
        Selection selection = Selection.of(BLOCK_ID, 2, 4, "나다");
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, selection);
        TextBlockDiff difference = calculateDifference(
                "가가나다라",
                "새가가나다라"
        );

        // when
        anchorSelection.recalculate(difference);

        // then
        Selection expected = Selection.of(BLOCK_ID, 3, 5, "나다");
        assertThat(anchorSelection.getSelection()).isEqualTo(expected);
    }

    @Test
    @DisplayName("선택 문자열 앞의 텍스트가 삭제되면 선택 범위를 앞으로 이동한다.")
    void recalculateMovesSelectionForwardAfterDeletion() {
        // given
        Selection selection = Selection.of(BLOCK_ID, 2, 4, "나다");
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, selection);
        TextBlockDiff difference = calculateDifference(
                "가가나다라",
                "가나다라"
        );

        // when
        anchorSelection.recalculate(difference);

        // then
        Selection expected = Selection.of(BLOCK_ID, 1, 3, "나다");
        assertThat(anchorSelection.getSelection()).isEqualTo(expected);
    }

    @Test
    @DisplayName("수정된 블록에서 선택 문자열을 찾을 수 없으면 고아로 처리한다.")
    void recalculateOrphansMissingSelection() {
        // given
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, SELECTION);
        TextBlockDiff difference = calculateDifference(
                "가가나다라",
                "가가라마"
        );

        // when
        anchorSelection.recalculate(difference);

        // then
        assertThat(anchorSelection.getStatus()).isEqualTo(AnchorStatus.ORPHANED);
    }

    @Test
    @DisplayName("선택 문자열이 여러 개이면 첫 번째 문자열의 범위로 이동한다.")
    void recalculateMovesToFirstMatchingSelection() {
        // given
        Selection secondSelection = Selection.of(BLOCK_ID, 3, 5, "나다");
        TextBlockDiff difference = calculateDifference(
                "나다가나다",
                "나다나다"
        );
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, secondSelection);

        // when
        anchorSelection.recalculate(difference);

        // then
        Selection expected = Selection.of(BLOCK_ID, 0, 2, "나다");
        assertThat(anchorSelection.getSelection()).isEqualTo(expected);
    }

    @Test
    @DisplayName("블록 변경 정보가 없으면 선택 범위를 재계산할 수 없다.")
    void recalculateRejectsMissingDifference() {
        // given
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, SELECTION);

        // when & then
        assertThatThrownBy(() -> anchorSelection.recalculate(null))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @Test
    @DisplayName("다른 블록의 변경 정보로는 선택 범위를 재계산할 수 없다.")
    void recalculateRejectsDifferenceFromAnotherBlock() {
        // given
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, SELECTION);
        TextBlockDiff difference = calculateDifference("block-b",
                "가가나다라",
                "새가가나다라"
        );

        // when & then
        assertThatThrownBy(() -> anchorSelection.recalculate(difference))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @Test
    @DisplayName("ORPHANED 선택 범위는 블록 변경 정보로 재계산할 수 없다.")
    void recalculateRejectsOrphanedSelection() {
        // given
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, SELECTION);
        anchorSelection.orphan(ORPHANED_AT);
        TextBlockDiff difference = calculateDifference(
                "가가나다라",
                "가가나다마"
        );

        // when & then
        assertThatThrownBy(() -> anchorSelection.recalculate(difference))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_NOT_ACTIVE.getMessage());
    }

    private static TextBlockDiff calculateDifference(String previousText, String updatedText) {
        return calculateDifference(BLOCK_ID, previousText, updatedText);
    }

    private static TextBlockDiff calculateDifference(
            String blockId,
            String previousText,
            String updatedText
    ) {
        TextBlock previous = new TextBlock(blockId, "paragraph", previousText);
        TextBlock updated = new TextBlock(blockId, "paragraph", updatedText);
        return previous.calculateDifference(updated);
    }

}
