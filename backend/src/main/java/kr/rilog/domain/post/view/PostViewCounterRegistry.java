package kr.rilog.domain.post.view;

import kr.rilog.domain.post.exception.PostException;

import java.time.Clock;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.function.LongUnaryOperator;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_CAPACITY_EXCEEDED;

public final class PostViewCounterRegistry {

    private final LongUnaryOperator loader;
    private final PostViewProperties properties;
    private final ElapsedTimeSource timeSource;
    private final Clock clock;
    private final ViewPolicy policy = new ViewPolicy();
    private final ViewerRecordCapacity viewerCapacity;
    private final ConcurrentMap<Long, CompletableFuture<PostViewCounter>> counters = new ConcurrentHashMap<>();
    private final Object registrationMonitor = new Object();

    public PostViewCounterRegistry(LongUnaryOperator loader, PostViewProperties properties, ElapsedTimeSource timeSource, Clock clock) {
        this.loader = Objects.requireNonNull(loader);
        this.properties = Objects.requireNonNull(properties);
        this.timeSource = Objects.requireNonNull(timeSource);
        this.clock = Objects.requireNonNull(clock);
        this.viewerCapacity = new ViewerRecordCapacity(properties.maxViewerRecords());
    }

    public PostViewCounter getOrLoad(long postId) {
        validatePostId(postId);
        CompletableFuture<PostViewCounter> pending = counters.get(postId);
        if (pending != null) {
            return awaitCounter(pending);
        }

        boolean initialize = false;
        synchronized (registrationMonitor) {
            pending = counters.get(postId);
            if (pending == null) {
                if (counters.size() >= properties.maxCounters()) {
                    throw new PostException(POST_VIEW_CAPACITY_EXCEEDED);
                }
                pending = new CompletableFuture<>();
                counters.put(postId, pending);
                initialize = true;
            }
        }
        if (!initialize) {
            return awaitCounter(pending);
        }

        // DB I/O는 등록 가드와 게시글 카운터 잠금 밖에서 수행한다.
        try {
            PostViewCounter counter = new PostViewCounter(postId, loadCount(postId), timeSource, clock, policy, viewerCapacity);
            pending.complete(counter);
            return counter;
        } catch (RuntimeException | Error failure) {
            synchronized (registrationMonitor) {
                counters.remove(postId, pending);
            }
            pending.completeExceptionally(failure);
            throw failure;
        }
    }

    public long currentCount(long postId) {
        validatePostId(postId);
        PostViewCounter counter = loadedCounter(counters.get(postId));
        return counter == null ? loadCount(postId) : counter.currentCount();
    }

    public List<PostViewCounter> snapshot() {
        return counters.values().stream()
                .map(this::loadedCounter)
                .filter(Objects::nonNull)
                .toList();
    }

    public int removeExpiredViewerRecords(int limit) {
        if (limit <= 0) {
            throw new IllegalArgumentException("게시글별 만료 정리 한도는 양수여야 합니다.");
        }
        return snapshot().stream().mapToInt(counter -> counter.removeExpiredViewerRecords(limit)).sum();
    }

    private long loadCount(long postId) {
        long storedCount = loader.applyAsLong(postId);
        if (storedCount < 0 || storedCount > PostViewCounter.MAX_VIEW_COUNT) {
            throw new IllegalStateException("저장된 조회수가 허용 범위를 벗어났습니다. postId=" + postId);
        }
        return storedCount;
    }

    private PostViewCounter loadedCounter(CompletableFuture<PostViewCounter> pending) {
        if (pending == null || !pending.isDone()) {
            return null;
        }
        try {
            return pending.join();
        } catch (CompletionException failure) {
            return null;
        }
    }

    private PostViewCounter awaitCounter(CompletableFuture<PostViewCounter> pending) {
        try {
            return pending.join();
        } catch (CompletionException failure) {
            if (failure.getCause() instanceof RuntimeException cause) {
                throw cause;
            }
            if (failure.getCause() instanceof Error cause) {
                throw cause;
            }
            throw new IllegalStateException("조회수 카운터 초기화에 실패했습니다.", failure.getCause());
        }
    }

    private void validatePostId(long postId) {
        if (postId <= 0) {
            throw new IllegalArgumentException("게시글 ID는 양수여야 합니다.");
        }
    }
}
