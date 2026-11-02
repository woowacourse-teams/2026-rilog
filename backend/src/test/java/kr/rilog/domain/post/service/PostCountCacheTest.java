package kr.rilog.domain.post.service;

import kr.rilog.domain.post.event.PostCountChangedEvent;
import kr.rilog.domain.post.repository.PostRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;

import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PostCountCacheTest {

    private final PostRepository repository = mock(PostRepository.class);
    private final PostCountCache cache = new PostCountCache(repository);

    @Test
    @DisplayName("전체 글 수가 0이어도 캐싱해 COUNT를 반복하지 않는다.")
    void cachesZeroWithoutRepeatingCount() {
        when(repository.countByStatusAndVisibilityAndDeletedAtIsNull(PUBLISHED, PUBLIC)).thenReturn(0L, 5L);

        assertThat(cache.getCount()).isZero();
        assertThat(cache.getCount()).isZero();
        verify(repository).countByStatusAndVisibilityAndDeletedAtIsNull(PUBLISHED, PUBLIC);
    }

    @Test
    @DisplayName("무효화는 COUNT를 실행하지 않고 다음 조회에서 다시 집계한다.")
    void reloadsOnlyOnReadAfterInvalidation() {
        when(repository.countByStatusAndVisibilityAndDeletedAtIsNull(PUBLISHED, PUBLIC)).thenReturn(7L, 9L);
        assertThat(cache.getCount()).isEqualTo(7L);

        cache.onPostCountChanged(new PostCountChangedEvent());

        verify(repository).countByStatusAndVisibilityAndDeletedAtIsNull(PUBLISHED, PUBLIC);
        assertThat(cache.getCount()).isEqualTo(9L);
    }

    @Test
    @DisplayName("COUNT 실패를 캐싱하지 않고 다음 요청에서 다시 조회한다.")
    void retriesLoadingAfterDatabaseFailure() {
        var failure = new DataAccessResourceFailureException("COUNT unavailable");
        when(repository.countByStatusAndVisibilityAndDeletedAtIsNull(PUBLISHED, PUBLIC))
                .thenThrow(failure).thenReturn(3L);

        assertThatThrownBy(cache::getCount).isSameAs(failure);
        assertThat(cache.getCount()).isEqualTo(3L);
    }

    @Test
    @DisplayName("동시에 캐시 미스가 발생해도 성공하는 COUNT 로딩을 한 번만 실행한다.")
    void coalescesConcurrentCacheMisses() throws Exception {
        CountDownLatch ready = new CountDownLatch(8);
        CountDownLatch start = new CountDownLatch(1);
        when(repository.countByStatusAndVisibilityAndDeletedAtIsNull(PUBLISHED, PUBLIC)).thenReturn(12L);

        try (var executor = Executors.newFixedThreadPool(8)) {
            Callable<Long> read = () -> {
                ready.countDown();
                if (!start.await(5, TimeUnit.SECONDS)) {
                    throw new IllegalStateException("동시 조회 시작 대기 시간이 초과되었습니다.");
                }
                return cache.getCount();
            };
            var results = java.util.stream.IntStream.range(0, 8)
                    .mapToObj(i -> executor.submit(read)).toList();
            try {
                assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            } finally {
                start.countDown();
            }
            for (var result : results) {
                assertThat(result.get(5, TimeUnit.SECONDS)).isEqualTo(12L);
            }
        }
        verify(repository).countByStatusAndVisibilityAndDeletedAtIsNull(PUBLISHED, PUBLIC);
    }

    @Test
    @DisplayName("진행 중인 COUNT와 무효화가 겹쳐도 완료된 무효화 뒤에는 새 값을 집계한다.")
    void removesInFlightCountBeforeInvalidationCompletes() throws Exception {
        CountDownLatch loading = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch invalidating = new CountDownLatch(1);
        AtomicInteger loads = new AtomicInteger();
        when(repository.countByStatusAndVisibilityAndDeletedAtIsNull(PUBLISHED, PUBLIC))
                .thenAnswer(invocation -> {
                    if (loads.incrementAndGet() == 1) {
                        loading.countDown();
                        if (!release.await(5, TimeUnit.SECONDS)) {
                            throw new IllegalStateException("COUNT 로딩 대기 시간이 초과되었습니다.");
                        }
                        return 7L;
                    }
                    return 8L;
                });

        try (var executor = Executors.newFixedThreadPool(2)) {
            var firstRead = executor.submit(cache::getCount);
            try {
                assertThat(loading.await(5, TimeUnit.SECONDS)).isTrue();
                var invalidation = executor.submit(() -> {
                    invalidating.countDown();
                    cache.onPostCountChanged(new PostCountChangedEvent());
                });
                assertThat(invalidating.await(5, TimeUnit.SECONDS)).isTrue();
                release.countDown();

                assertThat(firstRead.get(5, TimeUnit.SECONDS)).isEqualTo(7L);
                invalidation.get(5, TimeUnit.SECONDS);
                assertThat(cache.getCount()).isEqualTo(8L);
            } finally {
                release.countDown();
            }
        }
    }
}
