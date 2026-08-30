package kr.rilog.domain.comment.controller.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import kr.rilog.domain.comment.service.dto.command.CommentCreateCommand;

public record CommentCreateRequest(

        @NotBlank(message = "댓글 내용은 필수입니다.")
        @Size(max = 1000, message = "댓글 내용은 1000자 이하여야 합니다.")
        String content

) {

    public CommentCreateCommand toCommand() {
        return new CommentCreateCommand(content);
    }

}
