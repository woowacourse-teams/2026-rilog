package kr.rilog.domain.post.view;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "post.views")
public record PostViewProperties(Integer maxCounters, Integer maxViewerRecords) {

    private static final int DEFAULT_MAX_COUNTERS = 10_000;
    private static final int DEFAULT_MAX_VIEWER_RECORDS = 100_000;

    public PostViewProperties {
        maxCounters = resolvePositiveLimit(maxCounters, DEFAULT_MAX_COUNTERS);
        maxViewerRecords = resolvePositiveLimit(maxViewerRecords, DEFAULT_MAX_VIEWER_RECORDS);
    }

    private int resolvePositiveLimit(Integer value, int defaultValue) {
        if (value == null) {
            return defaultValue;
        }

        if (value <= 0) {
            throw new IllegalArgumentException("조회수 카운터와 독자 기록 한도는 양수여야 합니다.");
        }

        return value;
    }
}
