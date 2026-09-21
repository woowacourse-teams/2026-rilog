package kr.rilog.domain.comment.entity;

import kr.rilog.domain.comment.entity.enums.AnchorStatus;
import kr.rilog.domain.comment.entity.vo.Selection;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.post.entity.Post;
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
    private static final String SELECTED_TEXT = "나다";
    private static final Selection SELECTION = Selection.of(BLOCK_ID, 2, 4, SELECTED_TEXT);
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
                .isEqualTo(Selection.of(BLOCK_ID, 10, 12, SELECTED_TEXT));
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

}
