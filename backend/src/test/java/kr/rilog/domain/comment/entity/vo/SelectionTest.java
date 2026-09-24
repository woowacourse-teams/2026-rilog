package kr.rilog.domain.comment.entity.vo;

import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.post.entity.vo.TextBlock;
import kr.rilog.domain.post.entity.vo.TextRange;
import kr.rilog.domain.post.exception.PostException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_ANCHOR_BLOCK_NOT_COMMENTABLE;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_ANCHOR;
import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_TEXT_RANGE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SelectionTest {

    private static final String BLOCK_ID = "block-a";
    private static final String BLOCK_TEXT = "가나나다다라마";
    private static final String SELECTED_TEXT = "나다";
    private static final TextBlock BLOCK = new TextBlock(BLOCK_ID, "paragraph", BLOCK_TEXT);

    @Test
    @DisplayName("텍스트 블록에서 선택하면 블록과 범위와 선택 문자열을 보존한다.")
    void selectKeepsSelectionValues() {
        // given
        Selection selection = Selection.select(BLOCK, 2, 4, SELECTED_TEXT);

        // when & then
        assertThat(selection).isEqualTo(Selection.of(BLOCK_ID, 2, 4, SELECTED_TEXT));
    }

    @ParameterizedTest
    @ValueSource(strings = {"paragraph", "heading", "quote"})
    @DisplayName("문단과 제목과 인용 블록을 선택할 수 있다.")
    void selectAllowsCommentableBlockTypes(String blockType) {
        // given
        TextBlock block = new TextBlock(BLOCK_ID, blockType, BLOCK_TEXT);

        // when & then
        assertThatCode(() -> Selection.select(block, 2, 4, SELECTED_TEXT))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("댓글을 작성할 수 없는 타입의 블록은 선택할 수 없다.")
    void selectRejectsNotCommentableBlockType() {
        // given
        TextBlock codeBlock = new TextBlock(BLOCK_ID, "codeBlock", BLOCK_TEXT);

        // when & then
        assertThatThrownBy(() -> Selection.select(codeBlock, 2, 4, SELECTED_TEXT))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_BLOCK_NOT_COMMENTABLE.getMessage());
    }

    @Test
    @DisplayName("블록이 없으면 선택 정보를 만들 수 없다.")
    void selectRejectsMissingBlock() {
        assertThatThrownBy(() -> Selection.select(null, 2, 4, SELECTED_TEXT))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @Test
    @DisplayName("선택 문자열이 블록 텍스트의 해당 범위와 다르면 선택할 수 없다.")
    void selectRejectsTextDifferentFromBlockText() {
        assertThatThrownBy(() -> Selection.select(BLOCK, 2, 4, "가나"))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @DisplayName("선택 문자열이 없으면 선택 정보를 만들 수 없다.")
    void selectRejectsMissingSelectedText(String selectedText) {
        assertThatThrownBy(() -> Selection.select(BLOCK, 2, 4, selectedText))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @Test
    @DisplayName("선택 범위가 블록 텍스트의 길이를 넘으면 선택할 수 없다.")
    void selectRejectsRangeBeyondBlockText() {
        assertThatThrownBy(() -> Selection.select(
                BLOCK,
                BLOCK_TEXT.length(),
                BLOCK_TEXT.length() + 2,
                SELECTED_TEXT
        ))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_TEXT_RANGE.getMessage());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = "   ")
    @DisplayName("블록 id가 없으면 선택 정보를 만들 수 없다.")
    void ofRejectsMissingBlockId(String blockId) {
        assertThatThrownBy(() -> Selection.of(blockId, 2, 4, SELECTED_TEXT))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @Test
    @DisplayName("선택 문자열의 길이가 범위와 다르면 선택 정보를 만들 수 없다.")
    void ofRejectsSelectedTextOfDifferentLength() {
        assertThatThrownBy(() -> Selection.of(BLOCK_ID, 2, 4, "나다라"))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @Test
    @DisplayName("선택 문자열이 공백이어도 범위 길이와 같으면 선택 정보를 만들 수 있다.")
    void ofAllowsWhitespaceSelectedText() {
        assertThatCode(() -> Selection.of(BLOCK_ID, 2, 4, "  "))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("재배치하면 블록과 선택 문자열은 유지하고 범위만 바뀐다.")
    void relocateChangesOnlyRange() {
        // given
        Selection selection = Selection.of(BLOCK_ID, 2, 4, SELECTED_TEXT);

        // when
        Selection relocated = selection.relocate(TextRange.of(10, 12));

        // then
        assertThat(relocated).isEqualTo(Selection.of(BLOCK_ID, 10, 12, SELECTED_TEXT));
    }

    @Test
    @DisplayName("선택 문자열과 길이가 다른 범위로 재배치할 수 없다.")
    void relocateRejectsRangeOfDifferentLength() {
        // given
        Selection selection = Selection.of(BLOCK_ID, 2, 4, SELECTED_TEXT);

        // when & then
        assertThatThrownBy(() -> selection.relocate(TextRange.of(10, 13)))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

}
