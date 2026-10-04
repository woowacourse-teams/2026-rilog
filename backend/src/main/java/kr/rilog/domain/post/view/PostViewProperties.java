package kr.rilog.domain.post.view;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "post.views")
public record PostViewProperties(Integer maxCounters, Integer maxViewerRecords) {

    public PostViewProperties {
        maxCounters = maxCounters == null ? 10_000 : maxCounters;
        maxViewerRecords = maxViewerRecords == null ? 100_000 : maxViewerRecords;
        if (maxCounters <= 0 || maxViewerRecords <= 0) {
            throw new IllegalArgumentException("조회수 카운터와 독자 기록 한도는 양수여야 합니다.");
        }
    }
}
