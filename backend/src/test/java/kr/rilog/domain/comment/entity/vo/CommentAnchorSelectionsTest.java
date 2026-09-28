package kr.rilog.domain.comment.entity.vo;

import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.entity.vo.TextBlock;
import kr.rilog.support.fixure.PostFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static kr.rilog.support.fixure.PostContentFixture.PARAGRAPH_BLOCK_ID;
import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.paragraph;
import static org.assertj.core.api.Assertions.assertThat;

class CommentAnchorSelectionsTest {

    private final Post post = PostFixture.publicPublishedRilogPost();

    @Test
    @DisplayName("수정된 블록에서 선택 문자열이 사라지면 선택 범위를 고아로 처리한다.")
    void recalculateOrphansSelectionWhenSelectedTextDisappears() {
        // given
        PostContent previous = content(paragraph("가나다라"));
        TextBlock previousBlock = previous.findTextBlock(PARAGRAPH_BLOCK_ID);
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(
                post,
                Selection.select(previousBlock, 2, 4, "다라")
        );
        CommentAnchorSelections anchorSelections = CommentAnchorSelections.from(List.of(anchorSelection));
        PostContent updated = content(paragraph("가나마바"));

        // when
        anchorSelections.recalculate(previous, updated);

        // then
        assertThat(anchorSelection.isOrphaned()).isTrue();
    }

    @Test
    @DisplayName("선택 범위가 속한 블록이 삭제되면 해당 블록의 모든 선택 범위를 고아로 처리한다.")
    void recalculateOrphansAllSelectionsWhenBlockIsDeleted() {
        // given
        PostContent previous = content(paragraph("가나다라마바사"));
        TextBlock previousBlock = previous.findTextBlock(PARAGRAPH_BLOCK_ID);
        CommentAnchorSelection firstAnchorSelection = CommentAnchorSelection.create(
                post,
                Selection.select(previousBlock, 0, 2, "가나")
        );
        CommentAnchorSelection secondAnchorSelection = CommentAnchorSelection.create(
                post,
                Selection.select(previousBlock, 4, 6, "마바")
        );
        CommentAnchorSelections anchorSelections = CommentAnchorSelections.from(
                List.of(firstAnchorSelection, secondAnchorSelection)
        );
        PostContent updated = content();

        // when
        anchorSelections.recalculate(previous, updated);

        // then
        assertThat(List.of(firstAnchorSelection, secondAnchorSelection))
                .allMatch(CommentAnchorSelection::isOrphaned);
    }

    @Test
    @DisplayName("선택 범위가 속한 블록의 텍스트가 같으면 선택 범위와 활성 상태를 유지한다.")
    void recalculateKeepsSelectionWhenBlockTextIsUnchanged() {
        // given
        PostContent previous = content(paragraph("가나다라"));
        TextBlock previousBlock = previous.findTextBlock(PARAGRAPH_BLOCK_ID);
        Selection originalSelection = Selection.select(previousBlock, 2, 4, "다라");
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, originalSelection);
        CommentAnchorSelections anchorSelections = CommentAnchorSelections.from(List.of(anchorSelection));
        PostContent updated = content(paragraph("가나다라"));

        // when
        anchorSelections.recalculate(previous, updated);

        // then
        assertThat(anchorSelection.getSelection()).isEqualTo(originalSelection);
        assertThat(anchorSelection.isActive()).isTrue();
    }

    @Test
    @DisplayName("댓글을 달 수 있던 블록이 달 수 없는 타입으로 바뀌면 해당 블록의 모든 선택 범위를 고아로 처리한다.")
    void recalculateOrphansAllSelectionsWhenBlockBecomesNonCommentable() {
        // given
        PostContent previous = content(paragraph("가나다라마바사"));
        TextBlock previousBlock = previous.findTextBlock(PARAGRAPH_BLOCK_ID);
        CommentAnchorSelection firstAnchorSelection = CommentAnchorSelection.create(
                post,
                Selection.select(previousBlock, 0, 2, "가나")
        );
        CommentAnchorSelection secondAnchorSelection = CommentAnchorSelection.create(
                post,
                Selection.select(previousBlock, 4, 6, "마바")
        );
        CommentAnchorSelections anchorSelections = CommentAnchorSelections.from(
                List.of(firstAnchorSelection, secondAnchorSelection)
        );
        PostContent updated = content("""
                {
                  "id": "p-1",
                  "type": "codeBlock",
                  "props": {},
                  "content": [ { "type": "text", "text": "가나다라마바사", "styles": {} } ],
                  "children": []
                }
                """);

        // when
        anchorSelections.recalculate(previous, updated);

        // then
        assertThat(List.of(firstAnchorSelection, secondAnchorSelection))
                .allMatch(CommentAnchorSelection::isOrphaned);
    }

}
