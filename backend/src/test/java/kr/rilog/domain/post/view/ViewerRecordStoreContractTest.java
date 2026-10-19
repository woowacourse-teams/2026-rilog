package kr.rilog.domain.post.view;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_COUNT_LIMIT_EXCEEDED;
import static kr.rilog.domain.post.view.ViewCounterTestSupport.concurrently;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ViewerRecordStoreContractTest {

    private static final ViewerIdentity VIEWER = ViewerIdentity.member(1);

    private final AtomicLong ticks = new AtomicLong();

    @Test
    @DisplayName("큐와 Caffeine 방문 기록은 한 시간 경계에서 같은 중복 정책을 적용한다")
    void storesShareTtlBoundaryAndDuplicateSemantics() {
        for (var factory : storeFactories()) {
            ticks.set(0);
            PostViewStore registry = registry(factory);
            assertThat(registry.recordView(1, VIEWER)).isEqualTo(new ViewResult(true, 1));
            ticks.set(Duration.ofHours(1).toNanos() - 1);
            assertThat(registry.recordView(1, VIEWER)).isEqualTo(new ViewResult(false, 1));
            ticks.incrementAndGet();
            assertThat(registry.recordView(1, VIEWER)).isEqualTo(new ViewResult(true, 2));
        }
    }

    @Test
    @DisplayName("큐와 Caffeine 방문 기록은 같은 카운터 락 안에서 병렬 중복 요청을 한 번만 인정한다")
    void storesShareParallelDuplicateSemantics() throws Exception {
        for (var factory : storeFactories()) {
            ticks.set(0);
            PostViewStore registry = registry(factory);
            var results = concurrently(100, ignored -> registry.recordView(1, VIEWER));
            assertThat(results.stream().filter(ViewResult::accepted).count()).isEqualTo(1);
            assertThat(registry.currentCount(1)).isEqualTo(1);
        }
    }

    @Test
    @DisplayName("큐와 Caffeine 방문 기록은 병렬 고유 독자 100명을 모두 인정한다")
    void storesShareParallelDistinctVisitorSemantics() throws Exception {
        for (var factory : storeFactories()) {
            ticks.set(0);
            PostViewStore registry = registry(factory);
            var results = concurrently(100, index -> registry.recordView(1, ViewerIdentity.member(index + 1)));
            assertThat(results).allMatch(ViewResult::accepted);
            assertThat(registry.currentCount(1)).isEqualTo(100);
        }
    }

    @Test
    @DisplayName("큐와 Caffeine 방문 기록은 배치 전환 중에도 같은 조회수 합계를 보존한다")
    void storesShareBatchSemantics() {
        for (var factory : storeFactories()) {
            ticks.set(0);
            PostViewStore registry = registry(factory);
            assertThat(registry.recordView(1, ViewerIdentity.member(1))).isEqualTo(new ViewResult(true, 1));
            assertThat(registry.recordView(1, ViewerIdentity.member(2))).isEqualTo(new ViewResult(true, 2));
            ViewFlushBatch batch = registry.prepareFlushBatches().getFirst();
            assertThat(batch.delta()).isEqualTo(2);
            assertThat(registry.currentCount(1)).isEqualTo(2);

            assertThat(registry.recordView(1, ViewerIdentity.member(3))).isEqualTo(new ViewResult(true, 3));
            assertThat(registry.prepareFlushBatches()).containsExactly(batch);
            registry.completeFlush(1, batch.batchId());
            ViewFlushBatch next = registry.prepareFlushBatches().getFirst();
            assertThat(next.delta()).isEqualTo(1);
        }
    }

    @Test
    @DisplayName("큐와 Caffeine 방문 기록은 nanoTime long 경계를 넘어도 같은 만료 경계를 적용한다")
    void storesShareWrappedTickSemantics() {
        for (var factory : storeFactories()) {
            long initial = Long.MAX_VALUE - Duration.ofMinutes(30).toNanos();
            ticks.set(initial);
            PostViewStore registry = registry(factory);
            assertThat(registry.recordView(1, ViewerIdentity.member(1))).isEqualTo(new ViewResult(true, 1));
            ticks.set(initial + Duration.ofMinutes(45).toNanos());
            assertThat(registry.recordView(1, ViewerIdentity.member(2))).isEqualTo(new ViewResult(true, 2));
            ticks.set(initial + Duration.ofHours(1).toNanos());
            assertThat(registry.recordView(1, ViewerIdentity.member(1))).isEqualTo(new ViewResult(true, 3));
            assertThat(registry.recordView(1, ViewerIdentity.member(2))).isEqualTo(new ViewResult(false, 3));
        }
    }

    @Test
    @DisplayName("큐와 Caffeine 방문 기록은 조회수 상한 거절 시 새 방문 기록을 등록하지 않는다")
    void storesDoNotRecordRejectedOverflowView() {
        for (var factory : storeFactories()) {
            ObservedViewerRecordStoreFactory observedFactory = new ObservedViewerRecordStoreFactory(factory);
            ticks.set(0);
            PostViewStore registry = new PostViewCounterRegistry(
                    id -> PostViewCounter.MAX_VIEW_COUNT - 1,
                    ticks::get,
                    ViewCounterTestSupport.CLOCK,
                    observedFactory);
            assertThat(registry.recordView(1, ViewerIdentity.member(1)))
                    .isEqualTo(new ViewResult(true, PostViewCounter.MAX_VIEW_COUNT));
            assertThat(observedFactory.recordAcceptedCalls()).isEqualTo(1);
            assertThatThrownBy(() -> registry.recordView(1, ViewerIdentity.member(2)))
                    .isInstanceOfSatisfying(kr.rilog.domain.post.exception.PostException.class,
                            failure -> assertThat(failure.getErrorInformation())
                                    .isEqualTo(POST_VIEW_COUNT_LIMIT_EXCEEDED));
            assertThat(observedFactory.recordAcceptedCalls()).isEqualTo(1);
            assertThat(registry.currentCount(1)).isEqualTo(PostViewCounter.MAX_VIEW_COUNT);
            ticks.set(Duration.ofHours(1).toNanos());
            assertThatThrownBy(() -> registry.recordView(1, ViewerIdentity.member(2)))
                    .isInstanceOfSatisfying(kr.rilog.domain.post.exception.PostException.class,
                            failure -> assertThat(failure.getErrorInformation())
                                    .isEqualTo(POST_VIEW_COUNT_LIMIT_EXCEEDED));
            assertThat(observedFactory.recordAcceptedCalls()).isEqualTo(1);
        }
    }

    @Test
    @DisplayName("중복 방문은 최초 인정부터 한 시간인 만료 시점을 연장하지 않는다")
    void duplicatesDoNotExtendWindow() {
        for (var factory : storeFactories()) {
            ticks.set(0);
            PostViewStore store = registry(factory);
            assertThat(store.recordView(1, VIEWER)).isEqualTo(new ViewResult(true, 1));
            ticks.set(Duration.ofMinutes(59).toNanos());
            for (int i = 0; i < 10; i++) {
                assertThat(store.recordView(1, VIEWER)).isEqualTo(new ViewResult(false, 1));
            }
            ticks.set(Duration.ofHours(1).toNanos());
            assertThat(store.recordView(1, VIEWER)).isEqualTo(new ViewResult(true, 2));
        }
    }

    @Test
    @DisplayName("회원과 익명 방문자는 서로 다른 독자로 집계한다")
    void identitiesAreIndependent() {
        for (var factory : storeFactories()) {
            ticks.set(0);
            PostViewStore store = registry(factory);
            ViewerIdentity anonymous = ViewerIdentity.anonymous(
                    UUID.fromString("00000000-0000-0000-0000-000000000001"));
            assertThat(store.recordView(1, VIEWER)).isEqualTo(new ViewResult(true, 1));
            assertThat(store.recordView(1, anonymous)).isEqualTo(new ViewResult(true, 2));
            assertThat(store.recordView(1, VIEWER)).isEqualTo(new ViewResult(false, 2));
            assertThat(store.recordView(1, anonymous)).isEqualTo(new ViewResult(false, 2));
        }
    }

    @Test
    @DisplayName("같은 독자의 방문 기록과 만료 시점은 게시글별로 독립적이다")
    void recordsAreIsolatedByPost() {
        for (var factory : storeFactories()) {
            ticks.set(0);
            PostViewStore store = registry(factory);
            assertThat(store.recordView(1, VIEWER)).isEqualTo(new ViewResult(true, 1));
            ticks.set(Duration.ofMinutes(30).toNanos());
            assertThat(store.recordView(2, VIEWER)).isEqualTo(new ViewResult(true, 1));
            ticks.set(Duration.ofHours(1).toNanos());
            assertThat(store.recordView(1, VIEWER)).isEqualTo(new ViewResult(true, 2));
            assertThat(store.recordView(2, VIEWER)).isEqualTo(new ViewResult(false, 1));
            ticks.set(Duration.ofMinutes(90).toNanos());
            assertThat(store.recordView(2, VIEWER)).isEqualTo(new ViewResult(true, 2));
            assertThat(store.recordView(1, VIEWER)).isEqualTo(new ViewResult(false, 2));
        }
    }

    private PostViewStore registry(Function<ElapsedTimeSource, ViewerRecordStore> storeFactory) {
        return new PostViewCounterRegistry(id -> 0, ticks::get, ViewCounterTestSupport.CLOCK, storeFactory);
    }

    private List<Function<ElapsedTimeSource, ViewerRecordStore>> storeFactories() {
        return List.of(
                QueueViewerRecordStore::new,
                CaffeineViewerRecordStore::new
        );
    }

    private static final class ObservedViewerRecordStoreFactory
            implements Function<ElapsedTimeSource, ViewerRecordStore> {

        private final Function<ElapsedTimeSource, ViewerRecordStore> delegateFactory;
        private final AtomicLong recordAcceptedCalls = new AtomicLong();

        private ObservedViewerRecordStoreFactory(Function<ElapsedTimeSource, ViewerRecordStore> delegateFactory) {
            this.delegateFactory = delegateFactory;
        }

        @Override
        public ViewerRecordStore apply(ElapsedTimeSource timeSource) {
            return new ObservedViewerRecordStore(delegateFactory.apply(timeSource), recordAcceptedCalls);
        }

        long recordAcceptedCalls() {
            return recordAcceptedCalls.get();
        }
    }

    private record ObservedViewerRecordStore(ViewerRecordStore delegate, AtomicLong recordAcceptedCalls)
            implements ViewerRecordStore {

        @Override
        public Long lastAcceptedTick(ViewerIdentity viewer) {
            return delegate.lastAcceptedTick(viewer);
        }

        @Override
        public void recordAccepted(ViewerIdentity viewer, long acceptedTick) {
            recordAcceptedCalls.incrementAndGet();
            delegate.recordAccepted(viewer, acceptedTick);
        }

        @Override
        public void cleanupExpired(long nowTick) {
            delegate.cleanupExpired(nowTick);
        }
    }
}
