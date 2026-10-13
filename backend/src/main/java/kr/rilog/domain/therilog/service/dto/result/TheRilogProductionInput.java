package kr.rilog.domain.therilog.service.dto.result;

import java.time.Instant;
import kr.rilog.domain.post.entity.enums.Category;

public record TheRilogProductionInput(
        String rowId,
        String sourceUrl,
        Category category,
        Instant scheduledAt
) {
}
