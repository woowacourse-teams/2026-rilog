package kr.rilog.domain.post.view;

import kr.rilog.domain.post.repository.PostViewCountRepository;
import kr.rilog.global.exception.RilogInfrastructureException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.util.Optional;

import static kr.rilog.domain.post.view.ViewCounterTestSupport.CLOCK;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PostViewConfigTest {

    private final PostViewCountRepository repository = mock(PostViewCountRepository.class);
    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(PostViewConfig.class)
            .withBean(PostViewCountRepository.class, () -> repository)
            .withBean(Clock.class, () -> CLOCK);

    @Test
    @DisplayName("Spring은 Caffeine 방문 기록을 선택하고 PostViewStore로 집계한다")
    void selectsCaffeineAndExposesPostViewStore() {
        when(repository.findViewCountByPostId(1L)).thenReturn(Optional.of(42L));

        contextRunner.run(context -> {
            PostViewStore store = context.getBean(PostViewStore.class);
            assertThat(store.currentCount(1)).isEqualTo(42);
            assertThat(store.recordView(1, ViewerIdentity.member(1))).isEqualTo(new ViewResult(true, 43));
            assertThat(store.recordView(1, ViewerIdentity.member(1))).isEqualTo(new ViewResult(false, 43));

            PostViewCounterRegistry registry = context.getBean(PostViewCounterRegistry.class);
            Object records = ReflectionTestUtils.getField(registry.getOrLoad(1), "viewerRecordStore");
            assertThat(records).isInstanceOf(CaffeineViewerRecordStore.class);
        });
    }

    @Test
    @DisplayName("Spring 저장소는 누계 누락을 0으로 숨기지 않는다")
    void propagatesMissingDatabaseCount() {
        when(repository.findViewCountByPostId(999L)).thenReturn(Optional.empty());

        contextRunner.run(context -> {
            PostViewStore store = context.getBean(PostViewStore.class);
            assertThatThrownBy(() -> store.currentCount(999))
                    .isInstanceOfSatisfying(RilogInfrastructureException.class, failure ->
                            assertThat(failure.getErrorInformation().getErrorCode())
                                    .isEqualTo("POST_VIEW_COUNT_MISSING"));
            assertThatThrownBy(() -> store.recordView(999, ViewerIdentity.member(1)))
                    .isInstanceOfSatisfying(RilogInfrastructureException.class, failure ->
                            assertThat(failure.getErrorInformation().getErrorCode())
                                    .isEqualTo("POST_VIEW_COUNT_MISSING"));
        });
    }
}
