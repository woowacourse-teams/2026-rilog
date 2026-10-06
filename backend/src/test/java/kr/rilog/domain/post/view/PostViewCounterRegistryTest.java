package kr.rilog.domain.post.view;

import kr.rilog.global.exception.RilogInfrastructureException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.FutureTask;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static kr.rilog.domain.post.view.ViewCounterTestSupport.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PostViewCounterRegistryTest {

    private final AtomicLong ticks = new AtomicLong();

    @Test
    @DisplayName("동시 최초 요청은 카운터와 DB 초기화를 하나만 공유한다")
    void sharesInitializationAcrossConcurrentRequests() throws Exception {
        AtomicInteger loads = new AtomicInteger();
        var registry = registry(ticks, id -> {
            loads.incrementAndGet();
            return 42;
        });
        var counters = concurrently(100, i -> registry.getOrLoad(1));
        assertThat(counters).allMatch(counter -> counter == counters.getFirst());
        assertThat(loads.get()).isEqualTo(1);
        assertThat(registry.snapshot()).containsExactly(counters.getFirst());
    }

    @Test
    @DisplayName("한 게시글의 느린 DB 초기화가 다른 게시글 초기화를 막지 않는다")
    void databaseLoadingDoesNotHoldRegistrationGuard() throws Exception {
        CountDownLatch loading = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        AtomicInteger firstPostLoads = new AtomicInteger();
        var registry = registry(ticks, id -> {
            if (id == 1) {
                firstPostLoads.incrementAndGet();
                loading.countDown();
                await(finish);
            }
            return id * 10;
        });
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            try {
                var first = executor.submit(() -> registry.getOrLoad(1));
                assertThat(loading.await(5, TimeUnit.SECONDS)).isTrue();
                var second = executor.submit(() -> registry.getOrLoad(2));
                assertThat(second.get(2, TimeUnit.SECONDS).currentCount()).isEqualTo(20);
                assertThat(registry.snapshot()).containsExactly(second.get());
                assertThat(registry.getOrLoad(3).currentCount()).isEqualTo(30);
                finish.countDown();
                assertThat(first.get(2, TimeUnit.SECONDS).currentCount()).isEqualTo(10);
                assertThat(registry.getOrLoad(1)).isSameAs(first.get());
                assertThat(firstPostLoads.get()).isEqualTo(1);
            } finally {
                finish.countDown();
            }
        }
    }

    @Test
    @DisplayName("초기화 실패는 원인을 반환하고 다음 요청에서 재시도한다")
    void failedInitializationCanRetry() {
        AtomicInteger attempts = new AtomicInteger();
        var cause = new IllegalStateException("DB 연결 종료");
        var failure = new DataAccessResourceFailureException("DB 누계 조회 실패", cause);
        var registry = registry(ticks, id -> {
            if (attempts.incrementAndGet() == 1) {
                throw failure;
            }
            return 17;
        });
        assertThatThrownBy(() -> registry.getOrLoad(1)).isSameAs(failure).hasCause(cause);
        assertThat(registry.snapshot()).isEmpty();
        assertThat(registry.getOrLoad(1).currentCount()).isEqualTo(17);
        assertThat(attempts.get()).isEqualTo(2);
    }

    @Test
    @DisplayName("초기화를 기다리던 요청들은 같은 실패 원인을 받고 다음 요청은 재시도한다")
    void initializationFailureReachesWaitingRequests() throws Exception {
        CountDownLatch loading = new CountDownLatch(1);
        CountDownLatch fail = new CountDownLatch(1);
        AtomicInteger attempts = new AtomicInteger();
        var failure = new DataAccessResourceFailureException("DB 누계 조회 실패");
        var registry = registry(ticks, id -> {
            if (attempts.incrementAndGet() == 1) {
                loading.countDown();
                await(fail);
                throw failure;
            }
            return 17;
        });
        var requests = new ArrayList<FutureTask<PostViewCounter>>();
        var threads = new ArrayList<Thread>();
        try {
            var owner = new FutureTask<>(() -> registry.getOrLoad(1));
            requests.add(owner);
            Thread initializer = new Thread(owner);
            threads.add(initializer);
            initializer.start();
            assertThat(loading.await(5, TimeUnit.SECONDS)).isTrue();
            for (int i = 0; i < 3; i++) {
                var request = new FutureTask<>(() -> registry.getOrLoad(1));
                requests.add(request);
                Thread waiter = new Thread(request);
                threads.add(waiter);
                waiter.start();
                awaitWaiting(waiter);
            }
            fail.countDown();
            for (var request : requests) {
                assertThatThrownBy(() -> request.get(5, TimeUnit.SECONDS))
                        .isInstanceOfSatisfying(ExecutionException.class,
                                thrown -> assertThat(thrown.getCause()).isSameAs(failure));
            }
            assertThat(registry.snapshot()).isEmpty();
            assertThat(registry.getOrLoad(1).currentCount()).isEqualTo(17);
            assertThat(attempts.get()).isEqualTo(2);
        } finally {
            fail.countDown();
            for (Thread thread : threads) {
                thread.join(10_000);
            }
        }
    }

    @Test
    @DisplayName("현재 값 읽기만으로 카운터나 중복 기록을 만들지 않는다")
    void readUsesDatabaseUntilCounterExistsThenUsesMemoryTotal() {
        AtomicLong stored = new AtomicLong(10);
        var registry = registry(ticks, id -> stored.get());
        assertThat(registry.currentCount(1)).isEqualTo(10);
        assertThat(registry.snapshot()).isEmpty();
        PostViewCounter counter = registry.getOrLoad(2);
        registry.recordView(2, ViewerIdentity.member(1));
        counter.prepareFlush();
        stored.set(11); // DB 커밋은 되었지만 메모리 완료 처리가 아직 오지 않은 상황
        assertThat(registry.currentCount(2)).isEqualTo(11);
    }

    @Test
    @DisplayName("수량 범위를 벗어난 DB 누계는 초기화하지 않는다")
    void invalidDatabaseCountDoesNotRemainRegistered() {
        AtomicLong stored = new AtomicLong(-1);
        var registry = registry(ticks, id -> stored.get());
        assertThatThrownBy(() -> registry.getOrLoad(1))
                .isInstanceOfSatisfying(RilogInfrastructureException.class, failure -> {
                    assertThat(failure.getErrorInformation().getErrorCode()).isEqualTo("POST_VIEW_COUNT_INVALID");
                    assertThat(failure.getErrorInformation().getHttpStatus().value()).isEqualTo(500);
                    assertThat(failure.getMessage()).contains("postId=1");
                });
        assertThat(registry.snapshot()).isEmpty();
        stored.set(9_007_199_254_740_992L);
        assertThatThrownBy(() -> registry.currentCount(1))
                .isInstanceOfSatisfying(RilogInfrastructureException.class, failure -> {
                    assertThat(failure.getErrorInformation().getErrorCode()).isEqualTo("POST_VIEW_COUNT_INVALID");
                    assertThat(failure.getErrorInformation().getHttpStatus().value()).isEqualTo(500);
                });
        assertThat(registry.snapshot()).isEmpty();
        stored.set(42);
        assertThat(registry.getOrLoad(1).currentCount()).isEqualTo(42);
    }

    @Test
    @DisplayName("서로 다른 게시글의 동시 초기화에는 카운터 개수 한도를 적용하지 않는다")
    void concurrentInitializationHasNoCounterLimit() throws Exception {
        var registry = registry(ticks, id -> 0);
        var counters = concurrently(100, i -> registry.getOrLoad(i + 1));
        assertThat(counters).hasSize(100).doesNotHaveDuplicates();
        assertThat(registry.snapshot()).hasSize(100);
    }

    @Test
    @DisplayName("만료 기록을 회수해도 저장 완료 카운터를 유지하고 DB를 다시 읽지 않는다")
    void retainsPersistedCounterAfterViewerExpires() {
        AtomicInteger loads = new AtomicInteger();
        var registry = registry(ticks, id -> {
            loads.incrementAndGet();
            return 42;
        });
        PostViewCounter original = registry.getOrLoad(1);
        registry.recordView(1, ViewerIdentity.member(1));
        var batch = original.prepareFlush().orElseThrow();
        original.completeFlush(batch.batchId());
        ticks.set(Duration.ofHours(1).toNanos() - 1);
        assertThat(registry.recordView(1, ViewerIdentity.member(1))).isEqualTo(new ViewResult(false, 43));
        ticks.incrementAndGet();
        assertThat(registry.recordView(1, ViewerIdentity.member(1))).isEqualTo(new ViewResult(true, 44));
        assertThat(PostViewRequestCleanupTest.viewerRecords(original)).hasSize(1);
        assertThat(registry.getOrLoad(1)).isSameAs(original);
        assertThat(registry.currentCount(1)).isEqualTo(44);
        assertThat(registry.recordView(1, ViewerIdentity.member(1))).isEqualTo(new ViewResult(false, 44));
        assertThat(loads.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("만료 기록 회수는 미저장 증가분과 미확정 배치와 빈 카운터를 유지한다")
    void retainsPendingBatchAndEmptyCounters() {
        var registry = registry(ticks, id -> 0);
        PostViewCounter empty = registry.getOrLoad(3);
        registry.recordView(1, ViewerIdentity.member(1));
        PostViewCounter original = registry.getOrLoad(1);
        ticks.set(Duration.ofHours(1).toNanos());
        assertThat(registry.recordView(1, ViewerIdentity.member(2))).isEqualTo(new ViewResult(true, 2));
        assertThat(original.currentCount()).isEqualTo(2);
        var batch = original.prepareFlush().orElseThrow();
        assertThat(batch.delta()).isEqualTo(2);
        assertThat(registry.recordView(1, ViewerIdentity.member(2))).isEqualTo(new ViewResult(false, 2));
        assertThat(original.prepareFlush()).contains(batch);
        original.completeFlush(batch.batchId());
        assertThat(registry.getOrLoad(1)).isSameAs(original);
        assertThat(registry.getOrLoad(3)).isSameAs(empty);
        assertThat(registry.snapshot()).containsExactlyInAnyOrder(original, empty);
        assertThat(original.currentCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("만료 정리와 같은 독자의 재조회가 경쟁해도 한 번만 집계하고 갱신 기록을 보존한다")
    void expiryAndConcurrentViewsPreserveCount() throws Exception {
        var registry = registry(ticks, id -> 42);
        registry.recordView(1, ViewerIdentity.member(1));
        ticks.set(Duration.ofHours(1).toNanos());
        var results = concurrently(200, i -> registry.recordView(1, ViewerIdentity.member(1)));
        assertThat(results.stream().filter(ViewResult::accepted).count()).isEqualTo(1);
        assertThat(registry.currentCount(1)).isEqualTo(44);
        assertThat(registry.recordView(1, ViewerIdentity.member(1)).accepted()).isFalse();
        assertThat(registry.getOrLoad(1).prepareFlush().orElseThrow().delta()).isEqualTo(2);
    }

    @Test
    @DisplayName("여러 게시글의 동시 조회에도 방문자 기록 개수 한도를 적용하지 않는다")
    void concurrentPostsAcceptAllVisitors() throws Exception {
        var registry = registry(ticks, id -> 0);
        var results = concurrently(100, i -> registry.recordView(i % 2 + 1, ViewerIdentity.member(i + 1)));
        assertThat(results).allMatch(ViewResult::accepted);
        assertThat(registry.currentCount(1) + registry.currentCount(2)).isEqualTo(100);
    }

    @Test
    @DisplayName("잘못된 게시글 ID와 독자 입력은 집계에 사용할 수 없다")
    void rejectsInvalidPostIdAndViewer() {
        var registry = registry(ticks, id -> 0);
        assertThatThrownBy(() -> registry.getOrLoad(0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> registry.currentCount(-1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> registry.recordView(0, ViewerIdentity.member(1))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> registry.recordView(1, null)).isInstanceOf(NullPointerException.class);
        assertThat(registry.snapshot()).isEmpty();
    }
}
