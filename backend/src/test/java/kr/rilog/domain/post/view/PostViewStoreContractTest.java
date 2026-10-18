package kr.rilog.domain.post.view;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;

import static kr.rilog.domain.post.view.ViewCounterTestSupport.CLOCK;
import static kr.rilog.domain.post.view.ViewCounterTestSupport.concurrently;
import static org.assertj.core.api.Assertions.assertThat;

class PostViewStoreContractTest {

    private final AtomicLong ticks = new AtomicLong();

    @ParameterizedTest
    @EnumSource(ViewerStorage.class)
    void batchTransitionsPreserveCurrentCount(ViewerStorage storage) {
        PostViewStore store = store(storage);
        acceptReaders(store, 10);
        ViewFlushBatch batch = store.prepareFlushBatches().getFirst();
        assertThat(batch.delta()).isEqualTo(10);
        assertThat(store.currentCount(1)).isEqualTo(110);

        acceptReaders(store, 13);
        assertThat(store.currentCount(1)).isEqualTo(113);
        assertThat(store.prepareFlushBatches()).isEmpty();
        store.completeFlush(1, batch.batchId());
        assertThat(store.currentCount(1)).isEqualTo(113);
        assertThat(store.prepareFlushBatches().getFirst().delta()).isEqualTo(3);
    }

    @ParameterizedTest
    @EnumSource(ViewerStorage.class)
    void inFlightBatchesAreNotReissuedAndStaleCompletionsDoNotConfirmNewBatch(ViewerStorage storage) {
        PostViewStore store = store(storage);
        acceptReaders(store, 10);
        ViewFlushBatch first = store.prepareFlushBatches().getFirst();
        assertThat(store.prepareFlushBatches()).isEmpty();
        store.completeFlush(1, UUID.fromString("00000000-0000-0000-0000-000000000001"));
        assertThat(store.prepareFlushBatches()).isEmpty();

        acceptReaders(store, 13);
        store.completeFlush(1, first.batchId());
        store.completeFlush(1, first.batchId());
        ViewFlushBatch second = store.prepareFlushBatches().getFirst();
        assertThat(second.batchId()).isNotEqualTo(first.batchId());
        assertThat(second.delta()).isEqualTo(3);
        store.completeFlush(1, first.batchId());
        assertThat(store.prepareFlushBatches()).isEmpty();
        assertThat(store.currentCount(1)).isEqualTo(113);

        store.completeFlush(1, second.batchId());
        store.completeFlush(1, second.batchId());
        assertThat(store.prepareFlushBatches()).isEmpty();
        assertThat(store.currentCount(1)).isEqualTo(113);
    }

    @ParameterizedTest
    @EnumSource(ViewerStorage.class)
    void expiredVisitorRecordsDoNotRemoveUnconfirmedBatch(ViewerStorage storage) {
        PostViewStore store = store(storage);
        ViewerIdentity viewer = ViewerIdentity.member(1);
        assertThat(store.recordView(1, viewer)).isEqualTo(new ViewResult(true, 101));
        ViewFlushBatch batch = store.prepareFlushBatches().getFirst();

        ticks.set(Duration.ofHours(1).toNanos());
        assertThat(store.recordView(1, viewer)).isEqualTo(new ViewResult(true, 102));
        assertThat(store.prepareFlushBatches()).isEmpty();
        store.completeFlush(1, batch.batchId());
        assertThat(store.currentCount(1)).isEqualTo(102);
        assertThat(store.prepareFlushBatches().getFirst().delta()).isEqualTo(1);
    }

    @ParameterizedTest
    @EnumSource(ViewerStorage.class)
    void concurrentReadersAndCompletionPreserveAllNewViews(ViewerStorage storage) throws Exception {
        PostViewStore store = store(storage);
        acceptReaders(store, 10);
        ViewFlushBatch batch = store.prepareFlushBatches().getFirst();

        var observedCounts = concurrently(101, index -> {
            if (index == 100) {
                store.completeFlush(1, batch.batchId());
            } else {
                assertThat(store.recordView(1, ViewerIdentity.member(index + 11)).accepted()).isTrue();
            }
            return store.currentCount(1);
        });

        assertThat(observedCounts).allSatisfy(count -> assertThat(count).isBetween(110L, 210L));
        assertThat(store.currentCount(1)).isEqualTo(210);
        assertThat(store.prepareFlushBatches().getFirst().delta()).isEqualTo(100);
    }

    @ParameterizedTest
    @EnumSource(ViewerStorage.class)
    void concurrentPreparationAndCountReadsPreservePendingViews(ViewerStorage storage) throws Exception {
        PostViewStore store = store(storage);
        acceptReaders(store, 10);
        ViewFlushBatch batch = store.prepareFlushBatches().getFirst();

        var observedCounts = concurrently(120, index -> {
            if (index < 100) {
                assertThat(store.recordView(1, ViewerIdentity.member(index + 11)).accepted()).isTrue();
            } else {
                assertThat(store.prepareFlushBatches()).isEmpty();
            }
            return store.currentCount(1);
        });

        assertThat(observedCounts).allSatisfy(count -> assertThat(count).isBetween(110L, 210L));
        assertThat(store.currentCount(1)).isEqualTo(210);
        store.completeFlush(1, batch.batchId());
        assertThat(store.currentCount(1)).isEqualTo(210);
        assertThat(store.prepareFlushBatches().getFirst().delta()).isEqualTo(100);
    }

    @ParameterizedTest
    @EnumSource(ViewerStorage.class)
    @DisplayName("배치를 폐기하면 확정 누계와 저장 중 새로 인정된 증가분만 남는다.")
    void discardingBatchPreservesConfirmedCountAndNewViews(ViewerStorage storage) {
        // given
        PostViewStore store = store(storage);
        acceptReaders(store, 10);
        ViewFlushBatch failed = store.prepareFlushBatches().getFirst();
        acceptReaders(store, 13);

        // when
        store.discardFlush(1, failed.batchId());

        // then
        assertThat(store.currentCount(1)).isEqualTo(103L);
        assertThat(store.prepareFlushBatches()).hasSize(1)
                .allSatisfy(batch -> assertThat(batch.delta()).isEqualTo(3L));
    }

    @ParameterizedTest
    @EnumSource(ViewerStorage.class)
    @DisplayName("이전 배치의 폐기와 완료 요청은 새 배치를 제거하거나 확정하지 않는다.")
    void staleDiscardAndCompletionDoNotAffectNewBatch(ViewerStorage storage) {
        // given
        PostViewStore store = store(storage);
        acceptReaders(store, 10);
        ViewFlushBatch first = store.prepareFlushBatches().getFirst();
        store.discardFlush(1, first.batchId());
        acceptReaders(store, 13);
        ViewFlushBatch second = store.prepareFlushBatches().getFirst();

        // when
        store.discardFlush(1, first.batchId());
        store.completeFlush(1, first.batchId());
        assertThat(store.currentCount(1)).isEqualTo(103L);
        store.discardFlush(1, second.batchId());

        // then
        assertThat(store.currentCount(1)).isEqualTo(100L);
        assertThat(store.prepareFlushBatches()).isEmpty();
    }

    @ParameterizedTest
    @EnumSource(ViewerStorage.class)
    @DisplayName("배치 저장 실패로 증가분을 폐기해도 독자의 한 시간 중복 제한은 유지한다.")
    void discardingBatchPreservesViewerDeduplication(ViewerStorage storage) {
        // given
        PostViewStore store = store(storage);
        acceptReaders(store, 1);
        ViewFlushBatch failed = store.prepareFlushBatches().getFirst();
        store.discardFlush(1, failed.batchId());

        // when
        ViewResult result = store.recordView(1, ViewerIdentity.member(1));

        // then
        assertThat(result).isEqualTo(new ViewResult(false, 100L));
        assertThat(store.prepareFlushBatches()).isEmpty();
    }

    private PostViewStore store(ViewerStorage storage) {
        return new PostViewCounterRegistry(ignored -> 100, ticks::get, CLOCK, storage.factory);
    }

    private void acceptReaders(PostViewStore store, int count) {
        for (int id = 1; id <= count; id++) {
            store.recordView(1, ViewerIdentity.member(id));
        }
    }

    enum ViewerStorage {
        QUEUE(QueueViewerRecordStore::new),
        CAFFEINE(CaffeineViewerRecordStore::new);

        private final Function<ElapsedTimeSource, ViewerRecordStore> factory;

        ViewerStorage(Function<ElapsedTimeSource, ViewerRecordStore> factory) {
            this.factory = factory;
        }
    }
}
