package kr.rilog.domain.post.view;

import kr.rilog.domain.post.exception.PostException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_COUNT_LIMIT_EXCEEDED;
import static kr.rilog.domain.post.view.ViewCounterTestSupport.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PostViewCounterTest {

    private final AtomicLong ticks = new AtomicLong();

    @Test
    @DisplayName("DB 누계에서 시작해 인정된 조회를 즉시 현재 값에 반영한다")
    void startsWithStoredCountAndImmediatelyReflectsView() {
        var registry = registry(ticks, id -> 42);
        PostViewCounter counter = registry.getOrLoad(1);
        assertThat(counter.currentCount()).isEqualTo(42);
        assertThat(registry.recordView(1, ViewerIdentity.member(1))).isEqualTo(new ViewResult(true, 43));
        assertThat(counter.currentCount()).isEqualTo(43);
    }

    @Test
    @DisplayName("중복 요청은 1시간 제한을 연장하지 않는다")
    void rejectedViewsDoNotExtendWindow() {
        var registry = registry(ticks, id -> 0);
        PostViewCounter counter = registry.getOrLoad(1);
        assertThat(registry.recordView(1, ViewerIdentity.member(1)).accepted()).isTrue();
        ticks.set(Duration.ofMinutes(59).toNanos());
        assertThat(registry.recordView(1, ViewerIdentity.member(1))).isEqualTo(new ViewResult(false, 1));
        ticks.set(Duration.ofHours(1).toNanos());
        assertThat(registry.recordView(1, ViewerIdentity.member(1))).isEqualTo(new ViewResult(true, 2));
    }

    @Test
    @DisplayName("음수 인정 시각을 기록 없음으로 취급하지 않는다")
    void negativeTickStillDeduplicates() {
        ticks.set(-1);
        var registry = registry(ticks, id -> 0);
        PostViewCounter counter = registry.getOrLoad(1);
        assertThat(registry.recordView(1, ViewerIdentity.member(1)).accepted()).isTrue();
        assertThat(registry.recordView(1, ViewerIdentity.member(1)).accepted()).isFalse();
        ticks.addAndGet(Duration.ofHours(1).toNanos());
        assertThat(registry.recordView(1, ViewerIdentity.member(1)).accepted()).isTrue();
        assertThat(counter.currentCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("회원과 익명 독자는 구분되며 게시글별 중복 제한은 독립적이다")
    void readersAndPostsAreIndependent() {
        var registry = registry(ticks, id -> 0);
        ViewerIdentity member = ViewerIdentity.member(1);
        ViewerIdentity anonymous = ViewerIdentity.anonymous(UUID.fromString("00000000-0000-0000-0000-000000000001"));
        assertThat(registry.recordView(1, member).accepted()).isTrue();
        assertThat(registry.recordView(1, anonymous).accepted()).isTrue();
        assertThat(registry.recordView(2, member).accepted()).isTrue();
        assertThat(registry.getOrLoad(1).currentCount()).isEqualTo(2);
        assertThat(registry.getOrLoad(2).currentCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("같은 독자의 동시 요청 100개는 한 번만 증가한다")
    void sameReaderConcurrentRequestsCountOnce() throws Exception {
        var registry = registry(ticks, id -> 0);
        PostViewCounter counter = registry.getOrLoad(1);
        var results = concurrently(100, i -> registry.recordView(1, ViewerIdentity.member(1)));
        assertThat(results.stream().filter(ViewResult::accepted).count()).isEqualTo(1);
        assertThat(counter.currentCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("서로 다른 독자의 동시 요청 100개는 모두 증가한다")
    void differentReadersConcurrentRequestsCountAll() throws Exception {
        var registry = registry(ticks, id -> 0);
        PostViewCounter counter = registry.getOrLoad(1);
        var results = concurrently(100, i -> registry.recordView(1, ViewerIdentity.member(i + 1)));
        assertThat(results).allMatch(ViewResult::accepted);
        assertThat(counter.currentCount()).isEqualTo(100);
    }

    @Test
    @DisplayName("배치 분리와 새 조회와 완료 사이에 현재 값이 유지된다")
    void batchTransitionsPreserveCountAndRetryIdentity() {
        var registry = registry(ticks, id -> 100);
        PostViewCounter counter = registry.getOrLoad(1);
        registry.recordView(1, ViewerIdentity.member(1));
        registry.recordView(1, ViewerIdentity.member(2));
        ViewFlushBatch first = counter.prepareFlush().orElseThrow();
        assertThat(first.postId()).isEqualTo(1);
        assertThat(first.delta()).isEqualTo(2);
        assertThat(first.createdAt()).isEqualTo(CLOCK.instant());
        assertThat(counter.currentCount()).isEqualTo(102);

        registry.recordView(1, ViewerIdentity.member(3));
        assertThat(counter.prepareFlush()).contains(first);
        assertThat(counter.currentCount()).isEqualTo(103);
        counter.completeFlush(UUID.randomUUID());
        assertThat(counter.prepareFlush()).contains(first);
        counter.completeFlush(first.batchId());
        counter.completeFlush(first.batchId());
        assertThat(counter.currentCount()).isEqualTo(103);

        ViewFlushBatch second = counter.prepareFlush().orElseThrow();
        assertThat(second.batchId()).isNotEqualTo(first.batchId());
        assertThat(second.delta()).isEqualTo(1);
        counter.completeFlush(first.batchId());
        assertThat(counter.prepareFlush()).contains(second);
        counter.completeFlush(second.batchId());
        assertThat(counter.prepareFlush()).isEmpty();
        assertThat(counter.currentCount()).isEqualTo(103);
    }

    @Test
    @DisplayName("증가분이 없으면 배치를 만들지 않고 중복 조회도 배치를 추가하지 않는다")
    void createsNoEmptyBatch() {
        var registry = registry(ticks, id -> 10);
        PostViewCounter counter = registry.getOrLoad(1);
        assertThat(counter.prepareFlush()).isEmpty();
        registry.recordView(1, ViewerIdentity.member(1));
        var batch = counter.prepareFlush().orElseThrow();
        counter.completeFlush(batch.batchId());
        registry.recordView(1, ViewerIdentity.member(1));
        assertThat(counter.prepareFlush()).isEmpty();
        assertThat(counter.currentCount()).isEqualTo(11);
    }

    @Test
    @DisplayName("동시 배치 분리는 하나의 불변 배치를 공유한다")
    void concurrentPreparationSharesOneBatch() throws Exception {
        var registry = registry(ticks, id -> 0);
        PostViewCounter counter = registry.getOrLoad(1);
        registry.recordView(1, ViewerIdentity.member(1));
        var batches = concurrently(100, i -> counter.prepareFlush().orElseThrow());
        assertThat(batches).allMatch(batches.getFirst()::equals);
        assertThat(batches.getFirst().delta()).isEqualTo(1);
        assertThat(counter.currentCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("조회와 배치 완료가 경쟁해도 인정된 조회는 누락되지 않는다")
    void concurrentViewsAndCompletionsPreserveTotal() throws Exception {
        var registry = registry(ticks, id -> 100);
        PostViewCounter counter = registry.getOrLoad(1);
        concurrently(101, i -> {
            if (i == 100) {
                for (int attempt = 0; attempt < 100; attempt++) {
                    counter.prepareFlush().ifPresent(batch -> counter.completeFlush(batch.batchId()));
                }
                return null;
            }
            return registry.recordView(1, ViewerIdentity.member(i + 1));
        });
        assertThat(counter.currentCount()).isEqualTo(200);
    }

    @Test
    @DisplayName("요청 시 만료 회수는 갱신된 독자의 중복 제한을 보존한다")
    void expiryPreservesRenewedReader() {
        var registry = registry(ticks, id -> 0);
        PostViewCounter counter = registry.getOrLoad(1);
        registry.recordView(1, ViewerIdentity.member(1));
        ticks.set(Duration.ofMinutes(30).toNanos());
        registry.recordView(1, ViewerIdentity.member(2));
        ticks.set(Duration.ofMinutes(60).toNanos());
        registry.recordView(1, ViewerIdentity.member(1));
        ticks.set(Duration.ofMinutes(90).toNanos());
        assertThat(registry.recordView(1, ViewerIdentity.member(3))).isEqualTo(new ViewResult(true, 4));
        assertThat(PostViewRequestCleanupTest.viewerRecords(counter)).hasSize(2);
        assertThat(registry.recordView(1, ViewerIdentity.member(1)).accepted()).isFalse();
        assertThat(registry.recordView(1, ViewerIdentity.member(4))).isEqualTo(new ViewResult(true, 5));
    }

    @Test
    @DisplayName("수량 상한 거절은 증가분과 마지막 인정 시각을 변경하지 않는다")
    void safeIntegerOverflowDoesNotChangeState() {
        var registry = registry(ticks, id -> id == 1 ? 9_007_199_254_740_990L : 0);
        PostViewCounter counter = registry.getOrLoad(1);
        registry.recordView(1, ViewerIdentity.member(1));
        ViewFlushBatch batch = counter.prepareFlush().orElseThrow();
        assertThat(registry.recordView(1, ViewerIdentity.member(1)).accepted()).isFalse();
        assertThatThrownBy(() -> registry.recordView(1, ViewerIdentity.member(2)))
                .isInstanceOfSatisfying(PostException.class,
                        failure -> assertThat(failure.getErrorInformation()).isEqualTo(POST_VIEW_COUNT_LIMIT_EXCEEDED));
        ticks.set(Duration.ofHours(1).toNanos());
        assertThatThrownBy(() -> registry.recordView(1, ViewerIdentity.member(1))).isInstanceOf(PostException.class);
        assertThat(PostViewRequestCleanupTest.viewerRecords(counter)).isEmpty();
        assertThat(counter.prepareFlush()).contains(batch);
        assertThat(counter.currentCount()).isEqualTo(9_007_199_254_740_991L);
        registry.getOrLoad(2);
        assertThat(registry.recordView(2, ViewerIdentity.member(2))).isEqualTo(new ViewResult(true, 1));
        assertThat(registry.recordView(2, ViewerIdentity.member(3))).isEqualTo(new ViewResult(true, 2));
    }

    @Test
    @DisplayName("동시 요청에서도 조회수 수량 상한을 초과하지 않는다")
    void concurrentViewsRespectSafeIntegerLimit() throws Exception {
        var registry = registry(ticks, id -> 9_007_199_254_740_990L);
        PostViewCounter counter = registry.getOrLoad(1);
        var accepted = concurrently(100, i -> {
            try {
                return registry.recordView(1, ViewerIdentity.member(i + 1)).accepted();
            } catch (PostException failure) {
                assertThat(failure.getErrorInformation()).isEqualTo(POST_VIEW_COUNT_LIMIT_EXCEEDED);
                return false;
            }
        });
        assertThat(accepted).filteredOn(Boolean::booleanValue).hasSize(1);
        assertThat(counter.currentCount()).isEqualTo(9_007_199_254_740_991L);
        ticks.set(Duration.ofHours(1).toNanos());
        assertThatThrownBy(() -> registry.recordView(1, ViewerIdentity.member(101)))
                .isInstanceOfSatisfying(PostException.class,
                        failure -> assertThat(failure.getErrorInformation()).isEqualTo(POST_VIEW_COUNT_LIMIT_EXCEEDED));
        assertThat(PostViewRequestCleanupTest.viewerRecords(counter)).isEmpty();
    }
}
