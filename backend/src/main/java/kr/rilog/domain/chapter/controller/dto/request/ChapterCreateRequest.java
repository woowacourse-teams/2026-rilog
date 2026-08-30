package kr.rilog.domain.chapter.controller.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import kr.rilog.domain.chapter.service.dto.command.ChapterCreateCommand;

public record ChapterCreateRequest(

        @NotBlank(message = "챕터 이름은 필수입니다.")
        @Size(max = 50, message = "챕터 이름은 50자 이하여야 합니다.")
        String name

) {

    public ChapterCreateCommand toCommand() {
        return new ChapterCreateCommand(name);
    }

}
