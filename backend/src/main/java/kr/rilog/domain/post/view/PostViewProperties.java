package kr.rilog.domain.post.view;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "post.views")
public record PostViewProperties(Integer maxViewerRecords) {

    private static final int DEFAULT_MAX_VIEWER_RECORDS = 100_000;

    public PostViewProperties {
        maxViewerRecords = resolvePositiveLimit(maxViewerRecords, DEFAULT_MAX_VIEWER_RECORDS);
    }

    private int resolvePositiveLimit(Integer value, int defaultValue) {
        if (value == null) {
            return defaultValue;
        }

        if (value <= 0) {
            throw new IllegalArgumentException("독자 기록 한도는 양수여야 합니다.");
        }

        return value;
    }
}
