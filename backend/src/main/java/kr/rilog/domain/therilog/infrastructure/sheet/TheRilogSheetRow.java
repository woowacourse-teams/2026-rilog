package kr.rilog.domain.therilog.infrastructure.sheet;

import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.therilog.exception.TheRilogSheetException;
import kr.rilog.domain.therilog.service.dto.result.TheRilogProductionInput;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.util.Arrays;

import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.INVALID_THE_RILOG_SHEET_INPUT;

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
                && "SPOTLIGHT".equals(contentType);
    }

    public TheRilogProductionInput toProductionInput() {
        validateProductionInput();
        return new TheRilogProductionInput(
                rowId,
                sourceUrl,
                parseCategory(category),
                LocalDateTime.parse(scheduledAt, SCHEDULED_AT_FORMAT)
                        .atZone(SEOUL)
                        .toInstant()
        );
    }

    private void validateProductionInput() {
        if (!StringUtils.hasText(rowId) || rowId.length() > 128 || !rowId.equals(rowId.strip())
                || !isHttpUrl(sourceUrl) || !StringUtils.hasText(category) || !StringUtils.hasText(scheduledAt)) {
            throw new TheRilogSheetException(INVALID_THE_RILOG_SHEET_INPUT);
        }
    }

    private boolean isHttpUrl(String value) {
        if (!StringUtils.hasText(value) || value.length() > 2048) {
            return false;
        }
        try {
            URI uri = URI.create(value);
            return ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null && uri.getUserInfo() == null;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private Category parseCategory(String value) {
        return Arrays.stream(Category.values())
                .filter(category -> category.name().equals(value) || category.getName().equals(value))
                .findFirst()
                .orElseThrow(() -> new TheRilogSheetException(INVALID_THE_RILOG_SHEET_INPUT));
    }
}
