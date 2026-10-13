package kr.rilog.domain.therilog.service.dto.result;

import java.time.Instant;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.therilog.entity.enums.TheRilogContentType;

public record TheRilogProductionInput(
        String rowId,
        TheRilogContentType contentType,
        String sourceUrl,
        Category category,
        Instant scheduledAt
) {
}
