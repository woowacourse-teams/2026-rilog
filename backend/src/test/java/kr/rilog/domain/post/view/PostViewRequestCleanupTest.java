package kr.rilog.domain.post.view;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.FutureTask;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import static kr.rilog.domain.post.view.ViewCounterTestSupport.CLOCK;
import static kr.rilog.domain.post.view.ViewCounterTestSupport.await;
import static org.assertj.core.api.Assertions.assertThat;

class PostViewRequestCleanupTest {

    private final AtomicLong ticks = new AtomicLong();

    private PostViewCounterRegistry registry() {
        return new PostViewCounterRegistry(id -> 0, ticks::get, CLOCK);
    }

    @Test
    @DisplayName("한 시간 안의 방문자 기록이 기존 10만 개를 넘어도 모두 집계한다")
    void acceptsMoreThanPreviousViewerLimit() {
        var registry = registry();
        for (int id = 1; id <= 100_001; id++) {
            assertThat(registry.recordView(1, ViewerIdentity.member(id)).accepted()).isTrue();
        }
        assertThat(registry.currentCount(1)).isEqualTo(100_001);
    }

    @Test
    @DisplayName("해당 글의 조회 요청만 만료 기록을 회수하고 미확정 배치를 보존한다")
    void requestCleansOnlyRequestedPostAndPreservesUnconfirmedBatch() {
        var registry = registry();
        registry.recordView(1, ViewerIdentity.member(1));
        var counter = registry.getOrLoad(1);
        var batch = counter.prepareFlush().orElseThrow();
        ticks.set(Duration.ofHours(1).toNanos() - 1);
        registry.recordView(2, ViewerIdentity.member(2));
        assertThat(viewerRecords(counter)).hasSize(1);
        ticks.incrementAndGet();
        registry.recordView(2, ViewerIdentity.member(2));
        assertThat(viewerRecords(counter)).hasSize(1);
        registry.recordView(1, ViewerIdentity.member(3));
        assertThat(viewerRecords(counter).keySet()).containsExactly(ViewerIdentity.member(3));
        assertThat(counter.prepareFlush()).contains(batch);
        assertThat(counter.currentCount()).isEqualTo(2);
        assertThat(registry.getOrLoad(1)).isSameAs(counter);
        assertThat(viewerRecords(registry.getOrLoad(2))).hasSize(1);
    }

    @Test
    @DisplayName("한 요청은 해당 글의 만료 항목 100개까지 정리하고 중복 요청도 정리한다")
    void cleanupBudgetIsPerPostAndDuplicateRequestDrainsBacklog() {
        var registry = registry();
        for (int id = 1; id <= 205; id++) {
            registry.recordView(1, ViewerIdentity.member(id));
        }
        registry.recordView(2, ViewerIdentity.member(1));
        ticks.set(Duration.ofHours(1).toNanos());
        assertThat(registry.recordView(1, ViewerIdentity.member(206)).accepted()).isTrue();
        assertThat(viewerRecords(registry.getOrLoad(1))).hasSize(106);
        assertThat(viewerRecords(registry.getOrLoad(2))).hasSize(1);
        assertThat(registry.recordView(1, ViewerIdentity.member(206)).accepted()).isFalse();
        assertThat(viewerRecords(registry.getOrLoad(1))).hasSize(6);
        assertThat(registry.recordView(1, ViewerIdentity.member(206)).accepted()).isFalse();
        assertThat(viewerRecords(registry.getOrLoad(1)).keySet()).containsExactly(ViewerIdentity.member(206));
        assertThat(registry.currentCount(1)).isEqualTo(206);
        assertThat(registry.currentCount(2)).isEqualTo(1);
    }

    @Test
    @DisplayName("nanoTime이 long 경계를 넘어도 만료된 기록을 유효 기록보다 먼저 회수한다")
    void expirationQueueOrdersTicksAcrossWrap() {
        var registry = registry();
        long initial = Long.MAX_VALUE - Duration.ofMinutes(30).toNanos();
        ticks.set(initial);
        registry.recordView(1, ViewerIdentity.member(1));
        ticks.set(initial + Duration.ofMinutes(45).toNanos());
        registry.recordView(1, ViewerIdentity.member(2));
        ticks.set(initial + Duration.ofHours(1).toNanos());
        registry.recordView(1, ViewerIdentity.member(3));
        assertThat(viewerRecords(registry.getOrLoad(1)).keySet())
                .containsExactlyInAnyOrder(ViewerIdentity.member(2), ViewerIdentity.member(3));
    }

    @Test
    @DisplayName("정리 예산 뒤에 남은 오래된 항목은 재조회로 갱신된 기록을 삭제하지 않는다")
    void staleBacklogDoesNotDeleteRefreshedRecord() {
        var registry = registry();
        for (int id = 1; id <= 105; id++) {
            ticks.set(id - 1);
            registry.recordView(1, ViewerIdentity.member(id));
        }
        ticks.set(Duration.ofHours(1).toNanos() + 104);
        assertThat(registry.recordView(1, ViewerIdentity.member(105)).accepted()).isTrue();
        assertThat(registry.recordView(1, ViewerIdentity.member(106)).accepted()).isTrue();
        assertThat(registry.recordView(1, ViewerIdentity.member(105)))
                .isEqualTo(new ViewResult(false, 107));
        assertThat(viewerRecords(registry.getOrLoad(1)).keySet())
                .containsExactlyInAnyOrder(ViewerIdentity.member(105), ViewerIdentity.member(106));
    }

    @Test
    @DisplayName("중복 요청은 만료 시간을 연장하지 않으며 조회수 읽기만으로 기록을 정리하지 않는다")
    void duplicatesDoNotExtendExpiryAndCountReadDoesNotClean() {
        var registry = registry();
        var viewer = ViewerIdentity.member(1);
        registry.recordView(1, viewer);
        ticks.set(Duration.ofMinutes(59).toNanos());
        for (int i = 0; i < 100; i++) {
            assertThat(registry.recordView(1, viewer).accepted()).isFalse();
        }
        ticks.set(Duration.ofHours(1).toNanos());
        var counter = registry.getOrLoad(1);
        assertThat(registry.currentCount(1)).isEqualTo(1);
        assertThat(viewerRecords(counter)).hasSize(1);
        registry.recordView(1, ViewerIdentity.member(2));
        assertThat(viewerRecords(counter).keySet()).containsExactly(ViewerIdentity.member(2));
        assertThat(counter.currentCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("한 글의 만료 정리가 잠금을 잡고 있어도 다른 글의 집계는 기다리지 않는다")
    void otherPostDoesNotWaitForCleanup() throws Exception {
        CountDownLatch cleaning = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        var registry = new PostViewCounterRegistry(id -> 0, () -> {
            if (Thread.currentThread().getName().equals("post-one-cleanup")) {
                cleaning.countDown();
                await(finish);
            }
            return ticks.get();
        }, CLOCK);
        registry.recordView(1, ViewerIdentity.member(1));
        registry.recordView(2, ViewerIdentity.member(1));
        ticks.set(Duration.ofHours(1).toNanos());
        var first = new FutureTask<>(() -> registry.recordView(1, ViewerIdentity.member(2)));
        var second = new FutureTask<>(() -> registry.recordView(2, ViewerIdentity.member(2)));
        Thread cleaner = Thread.ofPlatform().daemon().name("post-one-cleanup").unstarted(first);
        Thread otherReader = Thread.ofPlatform().daemon().unstarted(second);
        try {
            cleaner.start();
            assertThat(cleaning.await(5, TimeUnit.SECONDS)).isTrue();
            otherReader.start();
            assertThat(second.get(1, TimeUnit.SECONDS)).isEqualTo(new ViewResult(true, 2));
            finish.countDown();
            assertThat(first.get(5, TimeUnit.SECONDS)).isEqualTo(new ViewResult(true, 2));
        } finally {
            finish.countDown();
            cleaner.join(1_000);
            otherReader.join(1_000);
        }
    }

    // 메모리 회수 결과를 확인하되 운영 코드에 테스트용 상태 조회 기능을 추가하지 않는다.
    @SuppressWarnings("unchecked")
    static Map<ViewerIdentity, Long> viewerRecords(PostViewCounter counter) {
        Object store = ReflectionTestUtils.getField(counter, "viewerRecordStore");
        return (Map<ViewerIdentity, Long>) ReflectionTestUtils.getField(store, "lastAcceptedTicks");
    }
}
