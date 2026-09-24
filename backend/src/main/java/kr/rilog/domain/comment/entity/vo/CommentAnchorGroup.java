package kr.rilog.domain.comment.entity.vo;

import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.entity.CommentAnchorSelection;

import java.util.List;

public record CommentAnchorGroup(
        CommentAnchorSelection anchorSelection,
        List<CommentAnchor> commentAnchors
) {

    public CommentAnchorGroup {
        commentAnchors = List.copyOf(commentAnchors);
    }

}
