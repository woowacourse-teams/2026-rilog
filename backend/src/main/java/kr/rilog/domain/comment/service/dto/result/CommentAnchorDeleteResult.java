package kr.rilog.domain.comment.service.dto.result;

import kr.rilog.domain.comment.entity.CommentAnchor;

public record CommentAnchorDeleteResult(
        Long commentAnchorId,
        Long selectionId
) {

    public static CommentAnchorDeleteResult from(CommentAnchor commentAnchor) {
        return new CommentAnchorDeleteResult(
                commentAnchor.getId(),
                commentAnchor.getCommentAnchorSelection().getId()
        );
    }

}
