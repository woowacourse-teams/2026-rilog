package kr.rilog.support.fixure;

import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.vo.TextBlock;
import kr.rilog.domain.user.entity.User;

public final class CommentAnchorFixture {

    private static final String BLOCK_ID = "block-a";
    private static final TextBlock BLOCK = new TextBlock(BLOCK_ID, "paragraph", "가나나다다라마");
    private static final int START_OFFSET = 2;
    private static final int END_OFFSET = 4;
    private static final String SELECTED_TEXT = "나다";
    private static final CommentAnchorSelection SELECTION = CommentAnchorSelection.select(
            BLOCK,
            START_OFFSET,
            END_OFFSET,
            SELECTED_TEXT
    );
    private static final String CONTENT = "좋은 설명이에요.";

    private CommentAnchorFixture() {
    }

    public static CommentAnchor activeAnchor(Post post, User writer) {
        return CommentAnchor.create(post, writer, SELECTION, CONTENT);
    }

    public static CommentAnchor orphanedAnchor(Post post, User writer) {
        CommentAnchor anchor = activeAnchor(post, writer);
        anchor.orphan();
        return anchor;
    }

}
