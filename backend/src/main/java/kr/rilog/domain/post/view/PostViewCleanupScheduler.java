package kr.rilog.domain.post.view;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public final class PostViewCleanupScheduler {

    private static final int MAX_EXPIRED_RECORDS_PER_COUNTER = 1_000;

    private final PostViewCounterRegistry registry;

    public PostViewCleanupScheduler(PostViewCounterRegistry registry) {
        this.registry = registry;
    }

    @Scheduled(fixedDelayString = "${post.views.cleanup-interval:PT1M}",
            initialDelayString = "${post.views.cleanup-interval:PT1M}")
    void removeExpiredViewerRecords() {
        registry.removeExpiredViewerRecords(MAX_EXPIRED_RECORDS_PER_COUNTER);
    }
}
