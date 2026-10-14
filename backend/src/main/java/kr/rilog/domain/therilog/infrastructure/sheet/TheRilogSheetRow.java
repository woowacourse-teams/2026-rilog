package kr.rilog.domain.therilog.infrastructure.sheet;

import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.therilog.exception.TheRilogSheetException;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.Instant;
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

    public void validate() {
        if (!StringUtils.hasText(rowId) || rowId.length() > 128 || !rowId.equals(rowId.strip())
                || (!"NEWS".equals(contentType) && !"SPOTLIGHT".equals(contentType))
                || ("SPOTLIGHT".equals(contentType) && !isHttpUrl(sourceUrl))
                || !StringUtils.hasText(category) || !StringUtils.hasText(scheduledAt)) {
            throw new TheRilogSheetException(INVALID_THE_RILOG_SHEET_INPUT);
        }
        parseCategory();
        parseScheduledAt();
    }

    public Instant parseScheduledAt() {
        return LocalDateTime.parse(scheduledAt, SCHEDULED_AT_FORMAT).atZone(SEOUL).toInstant();
    }

    public Category parseCategory() {
        return Arrays.stream(Category.values())
                .filter(candidate -> candidate.name().equals(category) || candidate.getName().equals(category))
                .findFirst()
                .orElseThrow(() -> new TheRilogSheetException(INVALID_THE_RILOG_SHEET_INPUT));
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

}
