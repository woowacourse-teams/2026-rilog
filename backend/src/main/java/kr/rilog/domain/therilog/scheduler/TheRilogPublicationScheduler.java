package kr.rilog.domain.therilog.scheduler;

import kr.rilog.domain.therilog.service.TheRilogPublicationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;

@Component
@Slf4j
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "the-rilog", name = "enabled", havingValue = "true")
public class TheRilogPublicationScheduler {

    private final TheRilogPublicationService publicationService;
    private final Clock clock;

    @Scheduled(cron = "${the-rilog.publication-cron}", zone = "Asia/Seoul")
    public void publishApprovedContent() {
        Instant now = Instant.now(clock);
        try {
            var articles = publicationService.publishDueContent(now);
            log.info("더 리로그 예약 발행 배치를 완료했습니다. executedAt={}, publishedCount={}", now, articles.size());
        } catch (RuntimeException exception) {
            log.error("더 리로그 예약 발행 배치에 실패했습니다. executedAt={}", now, exception);
        }
    }
}
