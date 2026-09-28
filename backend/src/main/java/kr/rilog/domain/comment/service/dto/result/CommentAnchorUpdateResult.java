package kr.rilog.domain.comment.service.dto.result;

import kr.rilog.domain.comment.entity.CommentAnchor;

import java.time.LocalDateTime;

public record CommentAnchorUpdateResult(
        Long commentAnchorId,
        String content,
        boolean edited,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static CommentAnchorUpdateResult from(CommentAnchor commentAnchor) {
        return new CommentAnchorUpdateResult(
                commentAnchor.getId(),
                commentAnchor.getContent(),
                commentAnchor.isEdited(),
                commentAnchor.getCreatedAt(),
                commentAnchor.getUpdatedAt()
        );
    }

}
