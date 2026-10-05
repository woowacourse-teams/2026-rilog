package kr.rilog.domain.post.view;

import java.time.Clock;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.function.LongUnaryOperator;

public final class PostViewCounterRegistry {

    private final LongUnaryOperator loader;
    private final ElapsedTimeSource timeSource;
    private final Clock clock;
    private final ViewPolicy policy = new ViewPolicy();
    private final ViewerRecordCapacity viewerCapacity;
    private final ConcurrentMap<Long, CompletableFuture<PostViewCounter>> counters = new ConcurrentHashMap<>();

    public PostViewCounterRegistry(LongUnaryOperator loader, PostViewProperties properties, ElapsedTimeSource timeSource, Clock clock) {
        this.loader = Objects.requireNonNull(loader);
        Objects.requireNonNull(properties);
        this.timeSource = Objects.requireNonNull(timeSource);
        this.clock = Objects.requireNonNull(clock);
        this.viewerCapacity = new ViewerRecordCapacity(properties.maxViewerRecords());
    }

    public ViewResult recordView(long postId, ViewerIdentity viewer) {
        Objects.requireNonNull(viewer, "독자 식별자가 필요합니다.");
        return getOrLoad(postId).recordView(viewer);
    }

    PostViewCounter getOrLoad(long postId) {
        validatePostId(postId);
        CompletableFuture<PostViewCounter> pending = counters.get(postId);
        if (pending == null) {
            CompletableFuture<PostViewCounter> candidate = new CompletableFuture<>();
            pending = counters.putIfAbsent(postId, candidate);
            if (pending == null) {
                pending = candidate;
                // 등록에 성공한 요청만 초기화한다. DB I/O는 Map 연산과 Counter 잠금 밖이다.
                try {
                    candidate.complete(new PostViewCounter(postId, loadCount(postId), timeSource, clock, policy, viewerCapacity));
                } catch (RuntimeException | Error failure) {
                    counters.remove(postId, candidate);
                    candidate.completeExceptionally(failure);
                    throw failure;
                }
            }
        }
        return awaitCounter(pending);
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
        int removed = 0;
        for (var pending : counters.values()) {
            PostViewCounter counter = loadedCounter(pending);
            if (counter == null) {
                continue;
            }
            removed += counter.removeExpiredViewerRecords(limit);
        }
        return removed;
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
