package kr.rilog.domain.post.scheduler;

import kr.rilog.domain.post.repository.PostViewCountRepository;
import kr.rilog.domain.post.service.PostViewFlushService;
import kr.rilog.domain.post.view.PostViewConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.scheduling.annotation.ScheduledAnnotationBeanPostProcessor;
import org.springframework.scheduling.config.FixedDelayTask;

import java.time.Clock;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class PostViewFlushSchedulerTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(PostViewConfig.class, PostViewFlushScheduler.class)
            .withBean(PostViewCountRepository.class, () -> mock(PostViewCountRepository.class))
            .withBean(PostViewFlushService.class, () -> mock(PostViewFlushService.class))
            .withBean(Clock.class, Clock::systemUTC);

    @Test
    @DisplayName("조회수 저장은 기본 설정에서 처음과 이전 작업 완료 후 각각 10분을 기다린다.")
    void schedulesDefaultTenMinuteDelay() {
        contextRunner.run(context -> {
            var tasks = context.getBean(ScheduledAnnotationBeanPostProcessor.class).getScheduledTasks();
            assertThat(tasks).hasSize(1);
            FixedDelayTask task = (FixedDelayTask) tasks.iterator().next().getTask();
            assertThat(task.getIntervalDuration()).isEqualTo(Duration.ofMinutes(10));
            assertThat(task.getInitialDelayDuration()).isEqualTo(Duration.ofMinutes(10));
        });
    }

    @Test
    @DisplayName("조회수 저장 주기를 설정하면 최초 실행과 반복 실행에 같은 주기를 적용한다.")
    void overridesFlushInterval() {
        contextRunner.withPropertyValues("post.view.flush.interval=1h").run(context -> {
            var tasks = context.getBean(ScheduledAnnotationBeanPostProcessor.class).getScheduledTasks();
            assertThat(tasks).hasSize(1);
            FixedDelayTask task = (FixedDelayTask) tasks.iterator().next().getTask();
            assertThat(task.getIntervalDuration()).isEqualTo(Duration.ofHours(1));
            assertThat(task.getInitialDelayDuration()).isEqualTo(Duration.ofHours(1));
        });
    }

    @Test
    @DisplayName("조회수 저장을 끄면 저장 스케줄을 등록하지 않는다.")
    void disablesAutomaticFlush() {
        contextRunner.withPropertyValues("post.view.flush.enabled=false").run(context -> {
            assertThat(context).doesNotHaveBean(PostViewFlushScheduler.class);
            assertThat(context.getBean(ScheduledAnnotationBeanPostProcessor.class).getScheduledTasks()).isEmpty();
        });
    }

    @Test
    @DisplayName("0인 저장 주기는 애플리케이션 시작 시 거절한다.")
    void rejectsNonPositiveInterval() {
        contextRunner.withPropertyValues("post.view.flush.interval=0s").run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure()).hasRootCauseInstanceOf(IllegalArgumentException.class);
        });
    }
}
