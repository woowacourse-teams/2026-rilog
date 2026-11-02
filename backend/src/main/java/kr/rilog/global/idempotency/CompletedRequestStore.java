package kr.rilog.global.idempotency;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.function.Supplier;

/**
 * 완료된 요청의 응답을 보관하는 저장소.
 * 같은 키의 동시 호출은 한 번만 실행하고 모두 같은 응답을 받는다.
 * 실행이 예외로 끝나면 응답을 저장하지 않고 그 예외를 그대로 던진다.
 */
@Component
public class CompletedRequestStore {

    private static final Duration RETENTION = Duration.ofMinutes(1);
    private static final long MAX_ENTRIES = 1_000;

    private final Cache<RequestKey, Object> completedRequests = Caffeine.newBuilder()
            .expireAfterWrite(RETENTION)
            .maximumSize(MAX_ENTRIES)
            .build();

    public Object getOrExecute(RequestKey key, Supplier<Object> execution) {
        return completedRequests.get(key, ignored -> execution.get());
    }
}
