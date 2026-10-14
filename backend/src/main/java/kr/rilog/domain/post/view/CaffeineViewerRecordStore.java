package kr.rilog.domain.post.view;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

import java.util.Objects;

public final class CaffeineViewerRecordStore implements ViewerRecordStore {

    private final Cache<ViewerIdentity, Long> lastAcceptedTicks;

    public CaffeineViewerRecordStore(ElapsedTimeSource timeSource) {
        Objects.requireNonNull(timeSource);
        this.lastAcceptedTicks = Caffeine.newBuilder()
                .expireAfterWrite(ViewPolicy.DUPLICATE_WINDOW)
                .ticker(timeSource::readNanos)
                .build();
    }

    @Override
    public Long lastAcceptedTick(ViewerIdentity viewer) {
        return lastAcceptedTicks.getIfPresent(viewer);
    }

    @Override
    public void recordAccepted(ViewerIdentity viewer, long acceptedTick) {
        lastAcceptedTicks.put(viewer, acceptedTick);
    }

    @Override
    public void cleanupExpired(long nowTick) {
        // Caffeine이 쓰기와 일부 읽기 시 만료 기록 유지보수를 수행한다.
    }
}
