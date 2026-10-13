package kr.rilog.domain.therilog.infrastructure.sheet;

import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.therilog.entity.enums.TheRilogContentType;
import kr.rilog.domain.therilog.exception.TheRilogTaskException;
import kr.rilog.domain.therilog.service.dto.command.TheRilogTaskImportCommand;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.util.Arrays;

import static kr.rilog.domain.therilog.exception.TheRilogTaskErrorInformation.INVALID_THE_RILOG_TASK_INPUT;

public record TheRilogSheetRow(
        String rowId,
        String contentType,
        String sourceUrl,
        String category,
        String scheduledAt,
        String status
) {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter SCHEDULED_AT_FORMAT = DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm")
            .withResolverStyle(ResolverStyle.STRICT);
    private static final String PRODUCTION_PENDING = "제작대기";

    public boolean isProductionPendingSpotlight() {
        return PRODUCTION_PENDING.equals(status)
                && TheRilogContentType.SPOTLIGHT.name().equals(contentType)
                && StringUtils.hasText(rowId)
                && StringUtils.hasText(sourceUrl)
                && StringUtils.hasText(category)
                && StringUtils.hasText(scheduledAt);
    }

    public TheRilogTaskImportCommand toImportCommand(String spreadsheetId) {
        return new TheRilogTaskImportCommand(
                spreadsheetId,
                rowId,
                TheRilogContentType.valueOf(contentType),
                sourceUrl,
                parseCategory(category),
                LocalDateTime.parse(scheduledAt, SCHEDULED_AT_FORMAT)
                        .atZone(SEOUL)
                        .toInstant()
        );
    }

    private Category parseCategory(String value) {
        return Arrays.stream(Category.values())
                .filter(category -> category.name().equals(value) || category.getName().equals(value))
                .findFirst()
                .orElseThrow(() -> new TheRilogTaskException(INVALID_THE_RILOG_TASK_INPUT));
    }
}
