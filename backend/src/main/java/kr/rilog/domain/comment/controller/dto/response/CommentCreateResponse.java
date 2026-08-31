package kr.rilog.domain.comment.controller.dto.response;

import kr.rilog.domain.comment.entity.Comment;

public record CommentCreateResponse(
        Long commentId
) {

    public static CommentCreateResponse from(Comment comment) {
        return new CommentCreateResponse(comment.getId());
    }
}
