package kr.rilog.domain.post.view;

import kr.rilog.domain.post.exception.PostException;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantLock;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_COUNT_LIMIT_EXCEEDED;

public final class PostViewCounter {

    static final long MAX_VIEW_COUNT = 9_007_199_254_740_991L;

    private final long postId;
    private final ElapsedTimeSource timeSource;
    private final Clock clock;
    private final ViewPolicy policy;
    private final ViewerRecordCapacity capacity;
    private final ReentrantLock lock = new ReentrantLock();
    // 마지막으로 인정된 순서대로 보관해 만료 정리가 전체 Map을 순회하지 않게 한다.
    private final Map<ViewerIdentity, Long> lastAcceptedTicks = new LinkedHashMap<>();
    private long confirmedCount;
    private long pendingDelta;
    private ViewFlushBatch inFlightBatch;

    PostViewCounter(long postId, long confirmedCount, ElapsedTimeSource timeSource, Clock clock,
                    ViewPolicy policy, ViewerRecordCapacity capacity) {
        this.postId = postId;
        this.confirmedCount = confirmedCount;
        this.timeSource = timeSource;
        this.clock = clock;
        this.policy = policy;
        this.capacity = capacity;
    }

    public ViewResult recordView(ViewerIdentity viewer) {
        Objects.requireNonNull(viewer, "독자 식별자가 필요합니다.");
        lock.lock();
        try {
            long now = timeSource.readNanos();
            Long lastAccepted = lastAcceptedTicks.get(viewer);
            if (lastAccepted != null && !policy.canAccept(lastAccepted, now)) {
                return new ViewResult(false, currentCountLocked());
            }
            if (currentCountLocked() >= MAX_VIEW_COUNT) {
                throw new PostException(POST_VIEW_COUNT_LIMIT_EXCEEDED);
            }
            if (lastAccepted == null) {
                capacity.reserve();
            } else {
                lastAcceptedTicks.remove(viewer);
            }
            lastAcceptedTicks.put(viewer, now);
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

    public int removeExpiredViewerRecords(int limit) {
        if (limit <= 0) {
            throw new IllegalArgumentException("만료 정리 한도는 양수여야 합니다.");
        }
        lock.lock();
        try {
            long now = timeSource.readNanos();
            int removed = 0;
            var iterator = lastAcceptedTicks.entrySet().iterator();
            while (iterator.hasNext() && removed < limit) {
                if (!policy.canAccept(iterator.next().getValue(), now)) {
                    break;
                }
                iterator.remove();
                removed++;
            }
            capacity.release(removed);
            return removed;
        } finally {
            lock.unlock();
        }
    }

    private long currentCountLocked() {
        return confirmedCount + pendingDelta + (inFlightBatch == null ? 0 : inFlightBatch.delta());
    }
}
