package kr.rilog.global.idempotency;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.function.Supplier;

@Component
public class CaffeineCompletedRequestStore implements CompletedRequestStore {

    private static final Duration RETENTION = Duration.ofMinutes(1);
    private static final long MAX_ENTRIES = 1_000;

    private final Cache<RequestKey, Object> completedRequests = Caffeine.newBuilder()
            .expireAfterWrite(RETENTION)
            .maximumSize(MAX_ENTRIES)
            .build();

    @Override
    public Object getOrExecute(RequestKey key, Supplier<Object> execution) {
        return completedRequests.get(key, ignored -> execution.get());
    }
}
