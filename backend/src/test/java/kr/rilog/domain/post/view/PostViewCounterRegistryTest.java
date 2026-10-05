package kr.rilog.domain.post.view;

import kr.rilog.domain.post.exception.PostException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.ArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.FutureTask;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_CAPACITY_EXCEEDED;
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
        }, 100);
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
        }, 100);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            try {
                var first = executor.submit(() -> registry.getOrLoad(1));
                assertThat(loading.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(registry.removeExpiredViewerRecords(100)).isZero();
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
        var registry = registry(ticks, id -> {
            if (attempts.incrementAndGet() == 1) {
                throw new IllegalStateException("DB 누계 조회 실패");
            }
            return 17;
        }, 100);
        assertThatThrownBy(() -> registry.getOrLoad(1)).isInstanceOf(IllegalStateException.class);
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
        var failure = new IllegalStateException("DB 누계 조회 실패");
        var registry = registry(ticks, id -> {
            if (attempts.incrementAndGet() == 1) {
                loading.countDown();
                await(fail);
                throw failure;
            }
            return 17;
        }, 100);
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
        var registry = registry(ticks, id -> stored.get(), 100);
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
        var registry = registry(ticks, id -> stored.get(), 100);
        assertThatThrownBy(() -> registry.getOrLoad(1)).isInstanceOf(IllegalStateException.class);
        stored.set(9_007_199_254_740_992L);
        assertThatThrownBy(() -> registry.currentCount(1)).isInstanceOf(IllegalStateException.class);
        stored.set(42);
        assertThat(registry.getOrLoad(1).currentCount()).isEqualTo(42);
    }

    @Test
    @DisplayName("서로 다른 게시글의 동시 초기화에는 카운터 개수 한도를 적용하지 않는다")
    void concurrentInitializationHasNoCounterLimit() throws Exception {
        var registry = registry(ticks, id -> 0, 100);
        var counters = concurrently(100, i -> registry.getOrLoad(i + 1));
        assertThat(counters).hasSize(100).doesNotHaveDuplicates();
        assertThat(registry.snapshot()).hasSize(100);
    }

    @Test
    @DisplayName("독자 기록 정리는 빈 카운터를 유지하고 DB 누계를 다시 읽지 않는다")
    void retainsEmptyCounterWithoutReloadingDatabase() {
        AtomicInteger loads = new AtomicInteger();
        var registry = registry(ticks, id -> {
            loads.incrementAndGet();
            return 42;
        }, 100);
        PostViewCounter original = registry.getOrLoad(1);
        assertThat(registry.removeExpiredViewerRecords(100)).isZero();
        assertThat(registry.snapshot()).containsExactly(original);
        assertThat(registry.getOrLoad(1)).isSameAs(original);
        assertThat(registry.currentCount(1)).isEqualTo(42);
        assertThat(loads.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("저장 완료 후 만료 독자 기록을 정리해도 카운터와 누계를 유지한다")
    void retainsPersistedCounterAfterViewerExpires() {
        AtomicInteger loads = new AtomicInteger();
        AtomicLong stored = new AtomicLong(42);
        var registry = registry(ticks, id -> {
            loads.incrementAndGet();
            return stored.get();
        }, 1);
        PostViewCounter original = registry.getOrLoad(1);
        registry.recordView(1, ViewerIdentity.member(1));
        var batch = original.prepareFlush().orElseThrow();
        stored.set(43);
        original.completeFlush(batch.batchId());
        ticks.set(Duration.ofHours(1).toNanos() - 1);
        assertThat(registry.removeExpiredViewerRecords(100)).isZero();
        assertThat(registry.getOrLoad(1)).isSameAs(original);
        assertThat(registry.recordView(1, ViewerIdentity.member(1))).isEqualTo(new ViewResult(false, 43));
        ticks.incrementAndGet();
        assertThat(registry.removeExpiredViewerRecords(100)).isEqualTo(1);
        assertThat(registry.snapshot()).containsExactly(original);
        assertThat(registry.getOrLoad(1)).isSameAs(original);
        assertThat(registry.currentCount(1)).isEqualTo(43);
        assertThat(registry.recordView(1, ViewerIdentity.member(1))).isEqualTo(new ViewResult(true, 44));
        assertThat(loads.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("독자 기록이 만료돼도 미저장 증가분과 미확정 배치는 제거하지 않는다")
    void retainsPendingAndUnconfirmedBatchUntilPersisted() {
        var registry = registry(ticks, id -> 0, 100);
        PostViewCounter original = registry.getOrLoad(1);
        registry.recordView(1, ViewerIdentity.member(1));
        ticks.set(Duration.ofHours(1).toNanos());
        assertThat(registry.removeExpiredViewerRecords(100)).isEqualTo(1);
        assertThat(registry.getOrLoad(1)).isSameAs(original);
        assertThat(original.currentCount()).isEqualTo(1);
        var batch = original.prepareFlush().orElseThrow();
        assertThat(registry.removeExpiredViewerRecords(100)).isZero();
        assertThat(registry.getOrLoad(1)).isSameAs(original);
        assertThat(original.prepareFlush()).contains(batch);
        original.completeFlush(batch.batchId());
        assertThat(registry.removeExpiredViewerRecords(100)).isZero();
        assertThat(registry.snapshot()).containsExactly(original);
        assertThat(original.currentCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("독자 기록 정리와 같은 독자의 동시 조회가 경쟁해도 한 번만 인정하고 증가분을 보존한다")
    void cleanupAndConcurrentViewsPreserveCount() throws Exception {
        var registry = registry(ticks, id -> 42, 1);
        registry.getOrLoad(1);
        var results = concurrently(101, i -> {
            if (i == 100) {
                for (int attempt = 0; attempt < 100; attempt++) {
                    registry.removeExpiredViewerRecords(100);
                }
                return new ViewResult(false, 0);
            }
            return registry.recordView(1, ViewerIdentity.member(1));
        });
        assertThat(results.stream().filter(ViewResult::accepted).count()).isEqualTo(1);
        assertThat(registry.currentCount(1)).isEqualTo(43);
        assertThat(registry.snapshot()).hasSize(1);
        assertThat(registry.getOrLoad(1).prepareFlush().orElseThrow().delta()).isEqualTo(1);
    }

    @Test
    @DisplayName("독자 기록 정리의 잠금을 기다린 조회는 같은 카운터에서 집계한다")
    void viewWaitingOnCleanupUsesSameCounter() throws Exception {
        CountDownLatch cleaning = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        ElapsedTimeSource timeSource = () -> {
            if (Thread.currentThread().getName().equals("counter-cleanup-test")) {
                cleaning.countDown();
                await(finish);
            }
            return ticks.get();
        };
        var registry = new PostViewCounterRegistry(id -> 42, new PostViewProperties(1), timeSource, CLOCK);
        PostViewCounter original = registry.getOrLoad(1);
        var cleanup = new FutureTask<>(() -> registry.removeExpiredViewerRecords(100));
        var view = new FutureTask<>(() -> registry.recordView(1, ViewerIdentity.member(1)));
        Thread cleaner = new Thread(cleanup, "counter-cleanup-test");
        Thread reader = new Thread(view, "counter-reader-test");
        try {
            cleaner.start();
            assertThat(cleaning.await(5, TimeUnit.SECONDS)).isTrue();
            reader.start();
            awaitWaiting(reader);
            finish.countDown();
            assertThat(cleanup.get(5, TimeUnit.SECONDS)).isZero();
            assertThat(view.get(5, TimeUnit.SECONDS)).isEqualTo(new ViewResult(true, 43));
            assertThat(registry.getOrLoad(1)).isSameAs(original);
            assertThat(registry.currentCount(1)).isEqualTo(43);
            assertThat(registry.recordView(1, ViewerIdentity.member(1))).isEqualTo(new ViewResult(false, 43));
            assertThatThrownBy(() -> registry.recordView(1, ViewerIdentity.member(2)))
                    .isInstanceOfSatisfying(PostException.class,
                            failure -> assertThat(failure.getErrorInformation()).isEqualTo(POST_VIEW_CAPACITY_EXCEEDED));
        } finally {
            finish.countDown();
            cleaner.join(10_000);
            reader.join(10_000);
        }
    }

    @Test
    @DisplayName("여러 게시글의 동시 조회도 전체 독자 기록 한도를 지킨다")
    void concurrentPostsShareViewerCapacity() throws Exception {
        var registry = registry(ticks, id -> 0, 10);
        PostViewCounter first = registry.getOrLoad(1);
        PostViewCounter second = registry.getOrLoad(2);
        var accepted = concurrently(100, i -> {
            try {
                return registry.recordView(i % 2 + 1, ViewerIdentity.member(i + 1)).accepted();
            } catch (PostException failure) {
                assertThat(failure.getErrorInformation()).isEqualTo(POST_VIEW_CAPACITY_EXCEEDED);
                return false;
            }
        });
        assertThat(accepted).filteredOn(Boolean::booleanValue).hasSize(10);
        assertThat(first.currentCount() + second.currentCount()).isEqualTo(10);
    }

    @Test
    @DisplayName("만료 기록 정리는 슬롯을 반환하지만 카운터와 증가분은 보존한다")
    void boundedExpiryReleasesGlobalSlotsWithoutEvictingCounters() {
        var registry = registry(ticks, id -> 0, 4);
        PostViewCounter first = registry.getOrLoad(1);
        PostViewCounter second = registry.getOrLoad(2);
        for (int post = 1; post <= 2; post++) {
            registry.recordView(post, ViewerIdentity.member(1));
            registry.recordView(post, ViewerIdentity.member(2));
        }
        ticks.set(Duration.ofHours(1).toNanos());
        assertThat(registry.removeExpiredViewerRecords(1)).isEqualTo(2);
        assertThat(registry.recordView(1, ViewerIdentity.member(3))).isEqualTo(new ViewResult(true, 3));
        assertThat(registry.recordView(2, ViewerIdentity.member(3))).isEqualTo(new ViewResult(true, 3));
        assertThatThrownBy(() -> registry.recordView(1, ViewerIdentity.member(4)))
                .isInstanceOfSatisfying(PostException.class,
                        failure -> assertThat(failure.getErrorInformation()).isEqualTo(POST_VIEW_CAPACITY_EXCEEDED));
        assertThat(registry.removeExpiredViewerRecords(1)).isEqualTo(2);
        assertThat(registry.getOrLoad(1)).isSameAs(first);
        assertThat(registry.getOrLoad(2)).isSameAs(second);
        assertThat(registry.recordView(1, ViewerIdentity.member(4))).isEqualTo(new ViewResult(true, 4));
        assertThat(registry.recordView(2, ViewerIdentity.member(4))).isEqualTo(new ViewResult(true, 4));
        assertThatThrownBy(() -> registry.recordView(2, ViewerIdentity.member(5)))
                .isInstanceOfSatisfying(PostException.class,
                        failure -> assertThat(failure.getErrorInformation()).isEqualTo(POST_VIEW_CAPACITY_EXCEEDED));
    }

    @Test
    @DisplayName("잘못된 용량 설정과 게시글 ID는 집계에 사용할 수 없다")
    void rejectsInvalidConfigurationAndPostId() {
        assertThatThrownBy(() -> new PostViewProperties(0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PostViewProperties(-1)).isInstanceOf(IllegalArgumentException.class);
        var registry = registry(ticks, id -> 0, 10);
        assertThatThrownBy(() -> registry.getOrLoad(0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> registry.currentCount(-1)).isInstanceOf(IllegalArgumentException.class);
        assertThat(registry.snapshot()).isEmpty();
    }
}
