package kr.rilog.domain.comment.controller.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorUpdateResult;

import java.time.LocalDateTime;

public record CommentAnchorUpdateResponse(
        Long commentAnchorId,
        String content,

        @Schema(name = "isEdited", description = "작성 후 본문 수정 여부")
        boolean isEdited,

        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static CommentAnchorUpdateResponse from(CommentAnchorUpdateResult result) {
        return new CommentAnchorUpdateResponse(
                result.commentAnchorId(),
                result.content(),
                result.edited(),
                result.createdAt(),
                result.updatedAt()
        );
    }

}
