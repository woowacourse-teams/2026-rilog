package kr.rilog.domain.post.controller.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import kr.rilog.domain.post.service.dto.command.DraftOverwriteCommand;
import tools.jackson.databind.JsonNode;

public record DraftOverwriteRequest(

        @NotBlank(message = "제목은 필수입니다.")
        @Size(max = 512, message = "제목은 512자 이하여야 합니다.")
        String title,

        @NotNull(message = "본문은 필수입니다.")
        JsonNode content

) {

    public DraftOverwriteCommand toCommand() {
        return new DraftOverwriteCommand(title, content);
    }

}
