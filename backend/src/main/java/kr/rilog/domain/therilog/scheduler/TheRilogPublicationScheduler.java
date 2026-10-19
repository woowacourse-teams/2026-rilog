package kr.rilog.domain.therilog.scheduler;

import kr.rilog.domain.therilog.exception.TheRilogPublicationResultWriteException;
import kr.rilog.domain.therilog.service.TheRilogPublicationService;
import kr.rilog.domain.therilog.service.dto.result.TheRilogPublishedArticle;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "the-rilog", name = "enabled", havingValue = "true")
public class TheRilogPublicationScheduler {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final TheRilogPublicationService publicationService;
    private final Clock clock;

    private FailedPublication failedPublication;

    @Scheduled(cron = "${the-rilog.publication-cron}", zone = "Asia/Seoul")
    public synchronized void publishApprovedContent() {
        Instant now = Instant.now(clock);
        failedPublication = null;
        try {
            List<TheRilogPublishedArticle> articles = publicationService.publishDueContent(now);
            log.info("더 리로그 예약 발행 배치를 완료했습니다. executedAt={}, publishedCount={}", now, articles.size());
        } catch (TheRilogPublicationResultWriteException exception) {
            failedPublication = new FailedPublication(now.atZone(SEOUL).toLocalDate(), exception.getPublishedArticles());
            log.error("더 리로그 발행 결과 기록이 실패하여 후속 시각에 시트 기록만 다시 시도합니다. executedAt={}", now, exception);
        } catch (RuntimeException exception) {
            failedPublication = new FailedPublication(now.atZone(SEOUL).toLocalDate(), List.of());
            log.error("더 리로그 예약 발행 배치에 실패했습니다. executedAt={}", now, exception);
        }
    }

    @Scheduled(cron = "${the-rilog.publication-fallback-cron:0 30 5 * * *}", zone = "Asia/Seoul")
    public synchronized void publishFailedContent() {
        Instant now = Instant.now(clock);
        FailedPublication failed = failedPublication;
        failedPublication = null;
        if (failed == null || !failed.date().equals(now.atZone(SEOUL).toLocalDate())) {
            return;
        }
        try {
            if (failed.publishedArticles().isEmpty()) {
                List<TheRilogPublishedArticle> articles = publicationService.publishDueContent(now);
                log.info("더 리로그 후속 발행 배치를 완료했습니다. executedAt={}, publishedCount={}", now, articles.size());
            } else {
                publicationService.completePublication(failed.publishedArticles());
                log.info("더 리로그 후속 시트 기록을 완료했습니다. executedAt={}, articles={}", now, failed.publishedArticles());
            }
        } catch (RuntimeException exception) {
            log.error("더 리로그 후속 발행 배치에 실패했습니다. 추가 실행 없이 확인이 필요합니다. executedAt={}", now, exception);
        }
    }

    private record FailedPublication(LocalDate date, List<TheRilogPublishedArticle> publishedArticles) {
    }
}
