package kr.rilog.domain.therilog.infrastructure.sheet;

import kr.rilog.domain.therilog.entity.enums.TheRilogContentType;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

import java.time.Duration;

@ConfigurationProperties(prefix = "the-rilog")
public record TheRilogSheetProperties(
        boolean enabled,
        String spreadsheetId,
        String sheetRange,
        String newsSheetRange,
        String credentialsPath,
        Duration connectTimeout,
        Duration readTimeout
) {

    private static final Duration DEFAULT_CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration DEFAULT_READ_TIMEOUT = Duration.ofSeconds(60);

    public TheRilogSheetProperties {
        connectTimeout = connectTimeout == null ? DEFAULT_CONNECT_TIMEOUT : connectTimeout;
        readTimeout = readTimeout == null ? DEFAULT_READ_TIMEOUT : readTimeout;
        if (enabled) {
            validateRequired(spreadsheetId, "spreadsheetId");
            validateRequired(sheetRange, "sheetRange");
            validateRequired(newsSheetRange, "newsSheetRange");
            validateRequired(credentialsPath, "credentialsPath");
        }
    }

    public String rangeFor(TheRilogContentType type) {
        return switch (type) {
            case NEWS -> newsSheetRange;
            case SPOTLIGHT -> sheetRange;
        };
    }

    private static void validateRequired(String value, String name) {
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException("더 리로그 시트 설정이 필요합니다: " + name);
        }
    }

}
