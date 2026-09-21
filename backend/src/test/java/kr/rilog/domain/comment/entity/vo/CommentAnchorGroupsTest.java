package kr.rilog.domain.comment.entity.vo;

import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.user.entity.User;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CommentAnchorGroupsTest {

    @Test
    @DisplayName("같은 선택 영역의 인라인 댓글은 하나의 그룹으로 묶는다.")
    void groupCommentAnchorsBySelection() {
        // given
        Post post = PostFixture.publicPublishedRilogPost();
        User writer = UserFixture.completedWithNicknameAndSlug("댓글작성자", "commenter");
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(
                post,
                Selection.of("block-a", 0, 2, "가나")
        );
        CommentAnchor first = CommentAnchor.create(anchorSelection, writer, "첫 번째 댓글");
        CommentAnchor second = CommentAnchor.create(anchorSelection, writer, "두 번째 댓글");

        // when
        CommentAnchorGroups groups = CommentAnchorGroups.from(List.of(first, second));

        // then
        assertThat(groups.values()).containsExactly(
                new CommentAnchorGroup(anchorSelection, List.of(first, second))
        );
    }

    @Test
    @DisplayName("서로 다른 선택 영역의 인라인 댓글은 처음 등장한 순서대로 별도 그룹을 만든다.")
    void preserveSelectionOrder() {
        // given
        Post post = PostFixture.publicPublishedRilogPost();
        User writer = UserFixture.completedWithNicknameAndSlug("댓글작성자", "commenter");
        CommentAnchorSelection firstSelection = CommentAnchorSelection.create(
                post,
                Selection.of("block-a", 0, 2, "가나")
        );
        CommentAnchorSelection secondSelection = CommentAnchorSelection.create(
                post,
                Selection.of("block-b", 2, 4, "나다")
        );
        CommentAnchor first = CommentAnchor.create(firstSelection, writer, "첫 번째 댓글");
        CommentAnchor second = CommentAnchor.create(secondSelection, writer, "두 번째 댓글");

        // when
        CommentAnchorGroups groups = CommentAnchorGroups.from(List.of(first, second));

        // then
        assertThat(groups.values()).containsExactly(
                new CommentAnchorGroup(firstSelection, List.of(first)),
                new CommentAnchorGroup(secondSelection, List.of(second))
        );
    }

}
