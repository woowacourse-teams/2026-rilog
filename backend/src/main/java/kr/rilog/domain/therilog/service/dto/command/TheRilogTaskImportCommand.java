package kr.rilog.domain.therilog.service.dto.command;

import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.therilog.entity.enums.TheRilogContentType;

import java.time.Instant;

public record TheRilogTaskImportCommand(
        String spreadsheetId,
        String rowId,
        TheRilogContentType contentType,
        String sourceUrl,
        Category category,
        Instant scheduledAt
) {
}
