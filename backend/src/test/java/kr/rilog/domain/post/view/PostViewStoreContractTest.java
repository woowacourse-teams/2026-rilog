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
    @DisplayName("배치 준비와 저장 완료 중에도 현재 조회수 합계를 유지한다.")
    void batchTransitionsPreserveCurrentCount(ViewerStorage storage) {
        PostViewStore store = store(storage);
        acceptReaders(store, 10);
        ViewFlushBatch batch = store.prepareFlushBatches().getFirst();
        assertThat(batch.delta()).isEqualTo(10);
        assertThat(store.currentCount(1)).isEqualTo(110);

        acceptReaders(store, 13);
        assertThat(store.currentCount(1)).isEqualTo(113);
        assertThat(store.prepareFlushBatches()).containsExactly(batch);
        store.completeFlush(1, batch.batchId());
        assertThat(store.currentCount(1)).isEqualTo(113);
        assertThat(store.prepareFlushBatches().getFirst().delta()).isEqualTo(3);
    }

    @ParameterizedTest
    @EnumSource(ViewerStorage.class)
    @DisplayName("미완료 배치를 재반환하고 이전 배치의 완료 요청은 새 배치에 영향을 주지 않는다.")
    void unconfirmedBatchesRetryAndStaleCompletionsDoNotConfirmNewBatch(ViewerStorage storage) {
        PostViewStore store = store(storage);
        acceptReaders(store, 10);
        ViewFlushBatch first = store.prepareFlushBatches().getFirst();
        assertThat(store.prepareFlushBatches()).containsExactly(first);
        store.completeFlush(1, UUID.fromString("00000000-0000-0000-0000-000000000001"));
        assertThat(store.prepareFlushBatches()).containsExactly(first);

        acceptReaders(store, 13);
        store.completeFlush(1, first.batchId());
        store.completeFlush(1, first.batchId());
        ViewFlushBatch second = store.prepareFlushBatches().getFirst();
        assertThat(second.batchId()).isNotEqualTo(first.batchId());
        assertThat(second.delta()).isEqualTo(3);
        store.completeFlush(1, first.batchId());
        assertThat(store.prepareFlushBatches()).containsExactly(second);
        assertThat(store.currentCount(1)).isEqualTo(113);

        store.completeFlush(1, second.batchId());
        store.completeFlush(1, second.batchId());
        assertThat(store.prepareFlushBatches()).isEmpty();
        assertThat(store.currentCount(1)).isEqualTo(113);
    }

    @ParameterizedTest
    @EnumSource(ViewerStorage.class)
    @DisplayName("독자 기록이 만료되어도 미완료 배치와 새 증가분을 보존한다.")
    void expiredVisitorRecordsDoNotRemoveUnconfirmedBatch(ViewerStorage storage) {
        PostViewStore store = store(storage);
        ViewerIdentity viewer = ViewerIdentity.member(1);
        assertThat(store.recordView(1, viewer)).isEqualTo(new ViewResult(true, 101));
        ViewFlushBatch batch = store.prepareFlushBatches().getFirst();

        ticks.set(Duration.ofHours(1).toNanos());
        assertThat(store.recordView(1, viewer)).isEqualTo(new ViewResult(true, 102));
        assertThat(store.prepareFlushBatches()).containsExactly(batch);
        store.completeFlush(1, batch.batchId());
        assertThat(store.currentCount(1)).isEqualTo(102);
        assertThat(store.prepareFlushBatches().getFirst().delta()).isEqualTo(1);
    }

    @ParameterizedTest
    @EnumSource(ViewerStorage.class)
    @DisplayName("조회 등록과 배치 완료가 경쟁해도 새 증가분을 보존한다.")
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
    @DisplayName("동시 재시도 준비와 조회수 읽기는 새 증가분을 변경하지 않는다.")
    void concurrentPreparationAndCountReadsPreservePendingViews(ViewerStorage storage) throws Exception {
        PostViewStore store = store(storage);
        acceptReaders(store, 10);
        ViewFlushBatch batch = store.prepareFlushBatches().getFirst();

        var observedCounts = concurrently(120, index -> {
            if (index < 100) {
                assertThat(store.recordView(1, ViewerIdentity.member(index + 11)).accepted()).isTrue();
            } else {
                assertThat(store.prepareFlushBatches()).containsExactly(batch);
            }
            return store.currentCount(1);
        });

        assertThat(observedCounts).allSatisfy(count -> assertThat(count).isBetween(110L, 210L));
        assertThat(store.currentCount(1)).isEqualTo(210);
        store.completeFlush(1, batch.batchId());
        assertThat(store.currentCount(1)).isEqualTo(210);
        assertThat(store.prepareFlushBatches().getFirst().delta()).isEqualTo(100);
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
