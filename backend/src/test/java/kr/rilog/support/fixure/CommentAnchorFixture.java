package kr.rilog.support.fixure;

import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import kr.rilog.domain.comment.entity.vo.Selection;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.vo.TextBlock;
import kr.rilog.domain.user.entity.User;

import java.time.LocalDateTime;

public final class CommentAnchorFixture {

    private static final String BLOCK_ID = "block-a";
    private static final TextBlock BLOCK = new TextBlock(BLOCK_ID, "paragraph", "가나나다다라마");
    private static final int START_OFFSET = 2;
    private static final int END_OFFSET = 4;
    private static final String SELECTED_TEXT = "나다";
    private static final Selection SELECTION = Selection.select(
            BLOCK,
            START_OFFSET,
            END_OFFSET,
            SELECTED_TEXT
    );
    private static final String CONTENT = "좋은 설명이에요.";

    private CommentAnchorFixture() {
    }

    public static CommentAnchor activeAnchor(Post post, User writer) {
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, SELECTION);
        return CommentAnchor.create(anchorSelection, writer, CONTENT);
    }

    public static CommentAnchor orphanedAnchor(Post post, User writer) {
        CommentAnchorSelection anchorSelection = CommentAnchorSelection.create(post, SELECTION);
        anchorSelection.orphan(LocalDateTime.of(2026, 9, 20, 12, 0));
        return CommentAnchor.create(anchorSelection, writer, CONTENT);
    }

}
