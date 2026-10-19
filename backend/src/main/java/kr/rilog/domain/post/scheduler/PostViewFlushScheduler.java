package kr.rilog.domain.post.scheduler;

import kr.rilog.domain.post.service.PostViewFlushService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "post.view.flush", name = "enabled", havingValue = "true", matchIfMissing = true)
public class PostViewFlushScheduler {

    private final PostViewFlushService flushService;

    @Scheduled(fixedDelayString = "${post.view.flush.interval:10m}",
            initialDelayString = "${post.view.flush.interval:10m}")
    public void flush() {
        flushService.flushPendingViews();
    }
}
