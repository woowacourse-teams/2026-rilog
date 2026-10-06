package kr.rilog.domain.post.view;

import kr.rilog.domain.post.exception.PostException;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.PriorityQueue;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantLock;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_COUNT_LIMIT_EXCEEDED;

public final class PostViewCounter {

    private static final int MAX_EXPIRED_ENTRIES_PER_REQUEST = 100;

    static final long MAX_VIEW_COUNT = 9_007_199_254_740_991L;

    private final long postId;
    private final ElapsedTimeSource timeSource;
    private final Clock clock;
    private final ViewPolicy policy;
    private final ReentrantLock lock = new ReentrantLock();
    private final Map<ViewerIdentity, Long> lastAcceptedTicks = new HashMap<>();
    // nanoTime의 long 경계 순환을 고려해 tick 차이로 정렬한다.
    private final PriorityQueue<ExpiryEntry> expiryEntries = new PriorityQueue<>(
            (first, second) -> Long.compare(first.acceptedTick() - second.acceptedTick(), 0));
    private long confirmedCount;
    private long pendingDelta;
    private ViewFlushBatch inFlightBatch;

    PostViewCounter(long postId, long confirmedCount, ElapsedTimeSource timeSource, Clock clock,
                    ViewPolicy policy) {
        this.postId = postId;
        this.confirmedCount = confirmedCount;
        this.timeSource = timeSource;
        this.clock = clock;
        this.policy = policy;
    }

    ViewResult recordView(ViewerIdentity viewer) {
        Objects.requireNonNull(viewer, "독자 식별자가 필요합니다.");
        lock.lock();
        try {
            long now = timeSource.readNanos();
            removeExpiredEntriesLocked(now);
            Long lastAccepted = lastAcceptedTicks.get(viewer);
            if (lastAccepted != null && !policy.canAccept(lastAccepted, now)) {
                return new ViewResult(false, currentCountLocked());
            }
            if (currentCountLocked() >= MAX_VIEW_COUNT) {
                throw new PostException(POST_VIEW_COUNT_LIMIT_EXCEEDED);
            }
            lastAcceptedTicks.put(viewer, now);
            expiryEntries.add(new ExpiryEntry(viewer, now));
            pendingDelta++;
            return new ViewResult(true, currentCountLocked());
        } finally {
            lock.unlock();
        }
    }

    public long currentCount() {
        lock.lock();
        try {
            return currentCountLocked();
        } finally {
            lock.unlock();
        }
    }

    public Optional<ViewFlushBatch> prepareFlush() {
        lock.lock();
        try {
            if (inFlightBatch != null) {
                return Optional.of(inFlightBatch);
            }
            if (pendingDelta == 0) {
                return Optional.empty();
            }
            inFlightBatch = new ViewFlushBatch(UUID.randomUUID(), postId, pendingDelta, clock.instant());
            pendingDelta = 0;
            return Optional.of(inFlightBatch);
        } finally {
            lock.unlock();
        }
    }

    // DB 반영이 확인된 배치만 완료한다. 실패/결과 불명확 시 호출하지 않는다.
    public void completeFlush(UUID batchId) {
        Objects.requireNonNull(batchId, "완료할 배치 ID가 필요합니다.");
        lock.lock();
        try {
            if (inFlightBatch != null && inFlightBatch.batchId().equals(batchId)) {
                confirmedCount += inFlightBatch.delta();
                inFlightBatch = null;
            }
        } finally {
            lock.unlock();
        }
    }

    private void removeExpiredEntriesLocked(long now) {
        for (int processed = 0; processed < MAX_EXPIRED_ENTRIES_PER_REQUEST; processed++) {
            ExpiryEntry first = expiryEntries.peek();
            if (first == null || !policy.canAccept(first.acceptedTick(), now)) {
                return;
            }
            expiryEntries.poll();
            // 예산 밖에 남았던 항목이 재조회로 갱신된 기록을 삭제하지 않도록 시각도 비교한다.
            lastAcceptedTicks.remove(first.viewer(), first.acceptedTick());
        }
    }

    private long currentCountLocked() {
        return confirmedCount + pendingDelta + (inFlightBatch == null ? 0 : inFlightBatch.delta());
    }

    private record ExpiryEntry(ViewerIdentity viewer, long acceptedTick) { }
}
