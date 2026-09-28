package kr.rilog.domain.comment.controller.dto.response;

import kr.rilog.domain.comment.service.dto.result.CommentAnchorDeleteResult;

public record CommentAnchorDeleteResponse(
        Long commentAnchorId,
        Long selectionId
) {

    public static CommentAnchorDeleteResponse from(CommentAnchorDeleteResult result) {
        return new CommentAnchorDeleteResponse(result.commentAnchorId(), result.selectionId());
    }

}
