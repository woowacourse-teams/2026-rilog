package kr.rilog.support.fixure;

import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.vo.TextRange;
import kr.rilog.domain.user.entity.User;

public final class CommentAnchorFixture {

    private static final String BLOCK_ID = "block-a";
    private static final TextRange RANGE = TextRange.of(2, 4);
    private static final String SELECTED_TEXT = "나다";
    private static final String CONTENT = "좋은 설명이에요.";

    private CommentAnchorFixture() {
    }

    public static CommentAnchor activeAnchor(Post post, User writer) {
        return CommentAnchor.create(post, writer, BLOCK_ID, RANGE, SELECTED_TEXT, CONTENT);
    }

    public static CommentAnchor orphanedAnchor(Post post, User writer) {
        CommentAnchor anchor = activeAnchor(post, writer);
        anchor.orphan();
        return anchor;
    }

}
