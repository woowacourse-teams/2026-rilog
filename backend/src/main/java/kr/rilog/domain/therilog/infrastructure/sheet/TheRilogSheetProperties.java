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
        String productionCron,
        String credentialsPath,
        Duration connectTimeout,
        Duration readTimeout
) {

    private static final Duration DEFAULT_CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration DEFAULT_READ_TIMEOUT = Duration.ofSeconds(5);

    public TheRilogSheetProperties {
        connectTimeout = connectTimeout == null ? DEFAULT_CONNECT_TIMEOUT : connectTimeout;
        readTimeout = readTimeout == null ? DEFAULT_READ_TIMEOUT : readTimeout;
        if (enabled) {
            validateRequired(spreadsheetId, "spreadsheetId");
            validateRequired(sheetRange, "sheetRange");
            validateRequired(newsSheetRange, "newsSheetRange");
            validateRequired(credentialsPath, "credentialsPath");
            validateDailyCron(productionCron);
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

    private static void validateDailyCron(String cron) {
        validateRequired(cron, "productionCron");
        String[] fields = cron.trim().split("\\s+");
        if (fields.length != 6
                || !isNumber(fields[0])
                || !isNumber(fields[1])
                || !isNumber(fields[2])
                || !"*".equals(fields[3])
                || !"*".equals(fields[4])
                || !"*".equals(fields[5])) {
            throw new IllegalArgumentException("더 리로그 제작 배치는 하루 한 번 실행되는 6필드 cron이어야 합니다.");
        }
    }

    private static boolean isNumber(String value) {
        return value.matches("\\d+");
    }
}
