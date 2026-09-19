package kr.rilog.domain.comment.controller.dto.response;

import kr.rilog.domain.comment.service.dto.result.CommentAnchorCreateResult;

public record CommentAnchorCreateResponse(
        Long commentAnchorId
) {

    public static CommentAnchorCreateResponse from(CommentAnchorCreateResult result) {
        return new CommentAnchorCreateResponse(result.commentAnchorId());
    }

}
