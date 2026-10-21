package kr.rilog.domain.post.trending;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "post.trending.enabled", havingValue = "true", matchIfMissing = true)
public class TrendingScheduler {

    private final TrendingRefreshService refreshService;
    private final TrendingProperties properties;
    private final Clock clock;

    @Scheduled(cron = "${post.trending.cron:0 0 */3 * * *}", zone = "Asia/Seoul")
    public void refresh() {
        LocalDateTime evaluatedAt = LocalDateTime.ofInstant(clock.instant(), properties.postTimeZone());
        int count = refreshService.refresh(evaluatedAt);
        log.info("트렌딩 갱신 완료: count={}, evaluatedAt={}", count, evaluatedAt);
    }
}
