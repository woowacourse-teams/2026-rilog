package kr.rilog.domain.post.view;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.IntFunction;
import java.util.function.LongUnaryOperator;

import static org.assertj.core.api.Assertions.assertThat;

final class ViewCounterTestSupport {

    static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-04T00:00:00Z"), ZoneOffset.UTC);

    static PostViewCounterRegistry registry(AtomicLong ticks, LongUnaryOperator loader, int viewers) {
        return new PostViewCounterRegistry(loader, new PostViewProperties(viewers), ticks::get, CLOCK);
    }

    static <T> List<T> concurrently(int calls, IntFunction<T> operation) throws Exception {
        CountDownLatch ready = new CountDownLatch(calls);
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var futures = new ArrayList<java.util.concurrent.Future<T>>();
            try {
                for (int i = 0; i < calls; i++) {
                    int index = i;
                    futures.add(executor.submit(() -> {
                        ready.countDown();
                        await(start);
                        return operation.apply(index);
                    }));
                }
                assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
                start.countDown();
                List<T> results = new ArrayList<>();
                for (var future : futures) {
                    results.add(future.get(10, TimeUnit.SECONDS));
                }
                return results;
            } finally {
                start.countDown();
            }
        }
    }

    static void await(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) {
                throw new AssertionError("동시성 시험 대기 시간이 초과되었습니다.");
            }
        } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
            throw new AssertionError(failure);
        }
    }

    static void awaitWaiting(Thread thread) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (thread.getState() != Thread.State.WAITING && System.nanoTime() - deadline < 0) {
            Thread.sleep(1);
        }
        assertThat(thread.getState()).isEqualTo(Thread.State.WAITING);
    }

    private ViewCounterTestSupport() { }
}
