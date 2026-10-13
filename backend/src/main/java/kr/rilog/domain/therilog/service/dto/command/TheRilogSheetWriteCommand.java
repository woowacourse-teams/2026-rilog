package kr.rilog.domain.therilog.service.dto.command;

import kr.rilog.domain.therilog.entity.enums.TheRilogContentType;

public record TheRilogSheetWriteCommand(
        String rowId,
        TheRilogContentType contentType,
        String title,
        String content,
        Spotlight spotlight
) {

    public record Spotlight(
            String articleType,
            String description,
            String thumbnailImageUrl,
            String sourceProfileName,
            String sourceProfileImage
    ) {
    }
}
