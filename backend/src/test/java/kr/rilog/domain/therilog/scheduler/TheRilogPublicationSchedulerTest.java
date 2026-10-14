package kr.rilog.domain.therilog.scheduler;

import kr.rilog.domain.therilog.infrastructure.sheet.TheRilogSheetConfig;
import kr.rilog.domain.therilog.infrastructure.sheet.TheRilogSheetProperties;
import kr.rilog.domain.therilog.service.TheRilogPublicationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.scheduling.annotation.ScheduledAnnotationBeanPostProcessor;
import org.springframework.scheduling.config.CronTask;
import org.springframework.scheduling.config.ScheduledTask;
import org.springframework.scheduling.support.CronTrigger;

import java.time.Clock;
import java.time.ZoneId;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class TheRilogPublicationSchedulerTest {

    private static final String PUBLICATION_CRON = "0 0 12 * * *";

    @Test
    @DisplayName("제작 cron 없이 설정한 발행 cron으로 한국 시간의 스케줄 하나를 등록한다.")
    void registersOnlyPublicationWithConfiguredCron() {
        context(true).run(context -> {
            assertThat(context).hasSingleBean(TheRilogPublicationScheduler.class);
            Set<ScheduledTask> tasks = context.getBean(ScheduledAnnotationBeanPostProcessor.class).getScheduledTasks();
            assertThat(tasks).hasSize(1);
            CronTask task = (CronTask) tasks.iterator().next().getTask();
            assertThat(task.getTrigger()).isEqualTo(new CronTrigger(PUBLICATION_CRON, ZoneId.of("Asia/Seoul")));
        });
    }

    @Test
    @DisplayName("시트 연동을 끄면 발행 스케줄러를 등록하지 않는다.")
    void disablesPublicationWhenSheetIntegrationIsDisabled() {
        context(false).run(context -> assertThat(context).doesNotHaveBean(TheRilogPublicationScheduler.class));
    }

    private ApplicationContextRunner context(boolean enabled) {
        return new ApplicationContextRunner()
                .withUserConfiguration(TheRilogSheetConfig.class, TheRilogPublicationScheduler.class, SheetPropertiesConfiguration.class)
                .withPropertyValues(
                        "the-rilog.enabled=" + enabled,
                        "the-rilog.spreadsheet-id=sheet-id",
                        "the-rilog.sheet-range=SPOTLIGHTS!A:M",
                        "the-rilog.news-sheet-range=NEWS!A:G",
                        "the-rilog.credentials-path=/tmp/unused-service-account.json",
                        "the-rilog.publication-cron=" + PUBLICATION_CRON)
                .withBean(TheRilogPublicationService.class, () -> mock(TheRilogPublicationService.class))
                .withBean(Clock.class, Clock::systemUTC);
    }

    @TestConfiguration(proxyBeanMethods = false)
    @EnableConfigurationProperties(TheRilogSheetProperties.class)
    static class SheetPropertiesConfiguration {
    }
}
