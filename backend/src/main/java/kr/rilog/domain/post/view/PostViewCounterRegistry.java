package kr.rilog.domain.post.view;

import kr.rilog.global.exception.RilogInfrastructureException;

import java.time.Clock;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.function.Function;
import java.util.function.LongUnaryOperator;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_COUNT_INVALID;
import static kr.rilog.global.exception.GlobalExceptionInformation.INTERNAL_SERVER_ERROR;

public final class PostViewCounterRegistry implements PostViewStore {

    private final LongUnaryOperator loader;
    private final ElapsedTimeSource timeSource;
    private final Clock clock;
    private final Function<ElapsedTimeSource, ViewerRecordStore> viewerRecordStoreFactory;
    private final ViewPolicy policy = new ViewPolicy();
    private final ConcurrentMap<Long, CompletableFuture<PostViewCounter>> counters = new ConcurrentHashMap<>();

    public PostViewCounterRegistry(LongUnaryOperator loader, ElapsedTimeSource timeSource, Clock clock) {
        this(loader, timeSource, clock, QueueViewerRecordStore::new);
    }

    public PostViewCounterRegistry(LongUnaryOperator loader, ElapsedTimeSource timeSource, Clock clock,
                                   Function<ElapsedTimeSource, ViewerRecordStore> viewerRecordStoreFactory) {
        this.loader = Objects.requireNonNull(loader);
        this.timeSource = Objects.requireNonNull(timeSource);
        this.clock = Objects.requireNonNull(clock);
        this.viewerRecordStoreFactory = Objects.requireNonNull(viewerRecordStoreFactory);
    }

    @Override
    public ViewResult recordView(long postId, ViewerIdentity viewer) {
        validatePostId(postId);
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
                    candidate.complete(new PostViewCounter(
                            postId, loadCount(postId), timeSource, clock, policy,
                            viewerRecordStoreFactory.apply(timeSource)));
                } catch (RuntimeException | Error failure) {
                    counters.remove(postId, candidate);
                    candidate.completeExceptionally(failure);
                    throw failure;
                }
            }
        }
        return awaitCounter(pending);
    }

    @Override
    public long currentCount(long postId) {
        validatePostId(postId);
        PostViewCounter counter = loadedCounter(counters.get(postId));
        return counter == null ? loadCount(postId) : counter.currentCount();
    }

    @Override
    public List<ViewFlushBatch> prepareFlushBatches() {
        return snapshot().stream()
                .map(PostViewCounter::prepareFlush)
                .flatMap(Optional::stream)
                .toList();
    }

    @Override
    public void completeFlush(long postId, UUID batchId) {
        validatePostId(postId);
        Objects.requireNonNull(batchId, "완료할 배치 ID가 필요합니다.");
        PostViewCounter counter = loadedCounter(counters.get(postId));
        if (counter != null) {
            counter.completeFlush(batchId);
        }
    }

    List<PostViewCounter> snapshot() {
        return counters.values().stream()
                .map(this::loadedCounter)
                .filter(Objects::nonNull)
                .toList();
    }

    private long loadCount(long postId) {
        long storedCount = loader.applyAsLong(postId);
        if (storedCount < 0 || storedCount > PostViewCounter.MAX_VIEW_COUNT) {
            throw new RilogInfrastructureException(
                    POST_VIEW_COUNT_INVALID, "저장된 조회수가 허용 범위를 벗어났습니다. postId=" + postId, null);
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
            throw new RilogInfrastructureException(
                    INTERNAL_SERVER_ERROR, "조회수 카운터 초기화에 실패했습니다.", failure.getCause());
        }
    }

    private void validatePostId(long postId) {
        if (postId <= 0) {
            throw new IllegalArgumentException("게시글 ID는 양수여야 합니다.");
        }
    }
}
