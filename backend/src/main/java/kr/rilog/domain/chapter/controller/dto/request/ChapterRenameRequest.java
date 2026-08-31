package kr.rilog.domain.chapter.controller.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import kr.rilog.domain.chapter.service.dto.command.ChapterRenameCommand;

public record ChapterRenameRequest(

        @NotBlank(message = "챕터 이름은 필수입니다.")
        @Size(max = 25, message = "챕터 이름은 20자 이하여야 합니다.")
        String name

) {

    public ChapterRenameCommand toCommand() {
        return new ChapterRenameCommand(name);
    }

}
