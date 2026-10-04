package kr.rilog.domain.post.view;

import kr.rilog.domain.post.exception.PostException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
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
        }, 1, 100);
        var counters = concurrently(100, i -> registry.getOrLoad(1));
        assertThat(counters).allMatch(counter -> counter == counters.getFirst());
        assertThat(loads.get()).isEqualTo(1);
        assertThat(registry.counterCount()).isEqualTo(1);
        assertThat(registry.snapshot()).containsExactly(counters.getFirst());
    }

    @Test
    @DisplayName("한 게시글의 느린 DB 초기화가 다른 게시글 초기화를 막지 않는다")
    void databaseLoadingDoesNotHoldRegistrationGuard() throws Exception {
        CountDownLatch loading = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        var registry = registry(ticks, id -> {
            if (id == 1) {
                loading.countDown();
                await(finish);
            }
            return id * 10;
        }, 2, 100);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            try {
                var first = executor.submit(() -> registry.getOrLoad(1));
                assertThat(loading.await(5, TimeUnit.SECONDS)).isTrue();
                var second = executor.submit(() -> registry.getOrLoad(2));
                assertThat(second.get(2, TimeUnit.SECONDS).currentCount()).isEqualTo(20);
                assertThat(registry.snapshot()).containsExactly(second.get());
                assertThat(registry.counterCount()).isEqualTo(2);
                finish.countDown();
                assertThat(first.get(2, TimeUnit.SECONDS).currentCount()).isEqualTo(10);
            } finally {
                finish.countDown();
            }
        }
    }

    @Test
    @DisplayName("초기화 실패는 원인을 반환하고 예약 슬롯을 해제해 재시도한다")
    void failedInitializationCanRetryWithoutLeakingSlot() {
        AtomicInteger attempts = new AtomicInteger();
        var registry = registry(ticks, id -> {
            if (attempts.incrementAndGet() == 1) {
                throw new IllegalStateException("DB 누계 조회 실패");
            }
            return 17;
        }, 1, 100);
        assertThatThrownBy(() -> registry.getOrLoad(1)).isInstanceOf(IllegalStateException.class);
        assertThat(registry.counterCount()).isZero();
        assertThat(registry.snapshot()).isEmpty();
        assertThat(registry.getOrLoad(1).currentCount()).isEqualTo(17);
        assertThat(registry.counterCount()).isEqualTo(1);
        assertThat(attempts.get()).isEqualTo(2);
    }

    @Test
    @DisplayName("현재 값 읽기만으로 카운터나 중복 기록을 만들지 않는다")
    void readUsesDatabaseUntilCounterExistsThenUsesMemoryTotal() {
        AtomicLong stored = new AtomicLong(10);
        var registry = registry(ticks, id -> stored.get(), 1, 100);
        assertThat(registry.currentCount(1)).isEqualTo(10);
        assertThat(registry.counterCount()).isZero();
        PostViewCounter counter = registry.getOrLoad(1);
        counter.recordView(ViewerIdentity.member(1));
        counter.prepareFlush();
        stored.set(11); // DB 커밋은 되었지만 메모리 완료 처리가 아직 오지 않은 상황
        assertThat(registry.currentCount(1)).isEqualTo(11);
        assertThat(registry.viewerRecordCount()).isEqualTo(1);
        assertThat(registry.counterCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("수량 범위를 벗어난 DB 누계는 초기화하지 않는다")
    void invalidDatabaseCountReleasesSlot() {
        AtomicLong stored = new AtomicLong(-1);
        var registry = registry(ticks, id -> stored.get(), 1, 100);
        assertThatThrownBy(() -> registry.getOrLoad(1)).isInstanceOf(IllegalStateException.class);
        assertThat(registry.counterCount()).isZero();
        stored.set(9_007_199_254_740_992L);
        assertThatThrownBy(() -> registry.currentCount(1)).isInstanceOf(IllegalStateException.class);
        stored.set(42);
        assertThat(registry.getOrLoad(1).currentCount()).isEqualTo(42);
    }

    @Test
    @DisplayName("서로 다른 게시글의 동시 초기화는 카운터 한도를 초과하지 않는다")
    void concurrentInitializationRespectsCounterCapacity() throws Exception {
        var registry = registry(ticks, id -> 0, 1, 100);
        var accepted = concurrently(100, i -> {
            try {
                registry.getOrLoad(i + 1);
                return true;
            } catch (PostException failure) {
                assertThat(failure.getErrorInformation()).isEqualTo(POST_VIEW_CAPACITY_EXCEEDED);
                return false;
            }
        });
        assertThat(accepted).filteredOn(Boolean::booleanValue).hasSize(1);
        assertThat(registry.counterCount()).isEqualTo(1);
        assertThat(registry.snapshot()).hasSize(1);
    }

    @Test
    @DisplayName("여러 게시글의 동시 조회도 전체 독자 기록 한도를 지킨다")
    void concurrentPostsShareViewerCapacity() throws Exception {
        var registry = registry(ticks, id -> 0, 2, 10);
        PostViewCounter first = registry.getOrLoad(1);
        PostViewCounter second = registry.getOrLoad(2);
        var accepted = concurrently(100, i -> {
            try {
                return (i % 2 == 0 ? first : second).recordView(ViewerIdentity.member(i + 1)).accepted();
            } catch (PostException failure) {
                assertThat(failure.getErrorInformation()).isEqualTo(POST_VIEW_CAPACITY_EXCEEDED);
                return false;
            }
        });
        assertThat(accepted).filteredOn(Boolean::booleanValue).hasSize(10);
        assertThat(registry.viewerRecordCount()).isEqualTo(10);
        assertThat(first.currentCount() + second.currentCount()).isEqualTo(10);
    }

    @Test
    @DisplayName("만료 기록 정리는 슬롯을 반환하지만 카운터와 증가분은 보존한다")
    void boundedExpiryReleasesGlobalSlotsWithoutEvictingCounters() {
        var registry = registry(ticks, id -> 0, 2, 4);
        for (int post = 1; post <= 2; post++) {
            registry.getOrLoad(post).recordView(ViewerIdentity.member(1));
            registry.getOrLoad(post).recordView(ViewerIdentity.member(2));
        }
        ticks.set(Duration.ofHours(1).toNanos());
        assertThat(registry.removeExpiredViewerRecords(1)).isEqualTo(2);
        assertThat(registry.viewerRecordCount()).isEqualTo(2);
        assertThat(registry.removeExpiredViewerRecords(1)).isEqualTo(2);
        assertThat(registry.viewerRecordCount()).isZero();
        assertThat(registry.counterCount()).isEqualTo(2);
        assertThat(registry.snapshot()).allMatch(counter -> counter.currentCount() == 2);
        assertThat(registry.getOrLoad(1).recordView(ViewerIdentity.member(1))).isEqualTo(new ViewResult(true, 3));
    }

    @Test
    @DisplayName("잘못된 용량 설정과 게시글 ID는 집계에 사용할 수 없다")
    void rejectsInvalidConfigurationAndPostId() {
        assertThatThrownBy(() -> new PostViewProperties(0, 1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PostViewProperties(1, -1)).isInstanceOf(IllegalArgumentException.class);
        var registry = registry(ticks, id -> 0, 2, 10);
        assertThatThrownBy(() -> registry.getOrLoad(0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> registry.currentCount(-1)).isInstanceOf(IllegalArgumentException.class);
        assertThat(registry.counterCount()).isZero();
    }
}
