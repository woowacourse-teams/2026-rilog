package kr.rilog.domain.post.view;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.PriorityQueue;

public final class QueueViewerRecordStore implements ViewerRecordStore {

    private static final int MAX_EXPIRED_ENTRIES_PER_REQUEST = 100;

    private final ViewPolicy policy = new ViewPolicy();
    private final Map<ViewerIdentity, Long> lastAcceptedTicks = new HashMap<>();
    // nanoTime의 long 경계 순환을 고려해 tick 차이로 정렬한다.
    private final PriorityQueue<ExpiryEntry> expiryEntries = new PriorityQueue<>(
            (first, second) -> Long.compare(first.acceptedTick() - second.acceptedTick(), 0));

    public QueueViewerRecordStore(ElapsedTimeSource timeSource) {
        Objects.requireNonNull(timeSource);
    }

    @Override
    public Long lastAcceptedTick(ViewerIdentity viewer) {
        return lastAcceptedTicks.get(viewer);
    }

    @Override
    public void recordAccepted(ViewerIdentity viewer, long acceptedTick) {
        lastAcceptedTicks.put(viewer, acceptedTick);
        expiryEntries.add(new ExpiryEntry(viewer, acceptedTick));
    }

    @Override
    public void cleanupExpired(long nowTick) {
        for (int processed = 0; processed < MAX_EXPIRED_ENTRIES_PER_REQUEST; processed++) {
            ExpiryEntry first = expiryEntries.peek();
            if (first == null || !policy.canAccept(first.acceptedTick(), nowTick)) {
                return;
            }
            expiryEntries.poll();
            // 예산 밖에 남았던 항목이 재조회로 갱신된 기록을 삭제하지 않도록 시각도 비교한다.
            lastAcceptedTicks.remove(first.viewer(), first.acceptedTick());
        }
    }

    private record ExpiryEntry(ViewerIdentity viewer, long acceptedTick) { }
}
