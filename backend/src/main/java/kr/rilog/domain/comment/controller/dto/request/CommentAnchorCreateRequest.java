package kr.rilog.domain.comment.controller.dto.request;

import jakarta.validation.constraints.NotNull;
import kr.rilog.domain.comment.service.dto.command.CommentAnchorCreateCommand;

public record CommentAnchorCreateRequest(

        @NotNull(message = "블록 ID는 필수입니다.")
        String blockId,

        @NotNull(message = "선택 시작 위치는 필수입니다.")
        Integer startOffset,

        @NotNull(message = "선택 끝 위치는 필수입니다.")
        Integer endOffset,

        @NotNull(message = "선택한 문자열은 필수입니다.")
        String selectedText,

        @NotNull(message = "댓글 내용은 필수입니다.")
        String content

) {

    public CommentAnchorCreateCommand toCommand() {
        return new CommentAnchorCreateCommand(blockId, startOffset, endOffset, selectedText, content);
    }

}
