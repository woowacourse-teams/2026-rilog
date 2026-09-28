package kr.rilog.domain.comment.service.dto.result;

import kr.rilog.domain.comment.entity.CommentAnchor;

public record CommentAnchorCreateResult(
        Long commentAnchorId
) {

    public static CommentAnchorCreateResult from(CommentAnchor commentAnchor) {
        return new CommentAnchorCreateResult(commentAnchor.getId());
    }

}
