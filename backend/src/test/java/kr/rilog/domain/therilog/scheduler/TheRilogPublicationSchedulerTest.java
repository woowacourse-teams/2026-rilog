package kr.rilog.domain.therilog.scheduler;

import kr.rilog.domain.therilog.infrastructure.sheet.TheRilogSheetConfig;
import kr.rilog.domain.therilog.infrastructure.sheet.TheRilogSheetProperties;
import kr.rilog.domain.therilog.service.TheRilogPublicationService;
import kr.rilog.domain.therilog.exception.TheRilogPublicationResultWriteException;
import kr.rilog.domain.therilog.service.dto.result.TheRilogPublishedArticle;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.scheduling.annotation.ScheduledAnnotationBeanPostProcessor;
import org.springframework.scheduling.config.CronTask;
import org.springframework.scheduling.config.ScheduledTask;
import org.springframework.scheduling.support.CronTrigger;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;

import static kr.rilog.domain.therilog.entity.enums.TheRilogContentType.NEWS;
import static org.mockito.ArgumentMatchers.any;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class TheRilogPublicationSchedulerTest {

    private static final String PUBLICATION_CRON = "0 0 5 * * *";
    private static final String FALLBACK_CRON = "0 30 5 * * *";
    private static final Instant FIRST_ATTEMPT = Instant.parse("2026-10-18T20:00:00Z");

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    @DisplayName("최초 발행의 실패 기록이 없으면 후속 발행을 실행하지 않는다.")
    void skipsFallbackWithoutFailedPublication(boolean primaryWasExecuted) {
        TheRilogPublicationService service = mock(TheRilogPublicationService.class);
        TheRilogPublicationScheduler scheduler = new TheRilogPublicationScheduler(service,
                Clock.fixed(FIRST_ATTEMPT, ZoneOffset.UTC));
        if (primaryWasExecuted) {
            scheduler.publishApprovedContent();
        }

        scheduler.publishFailedContent();

        if (primaryWasExecuted) {
            verify(service).publishDueContent(FIRST_ATTEMPT);
        } else {
            verifyNoInteractions(service);
        }
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    @DisplayName("최초 발행이 실패하면 후속 발행은 성공 여부와 관계없이 한 번만 실행한다.")
    void attemptsFailedPublicationOnlyOnce(boolean fallbackFails) {
        TheRilogPublicationService service = mock(TheRilogPublicationService.class);
        RuntimeException failure = new IllegalStateException("시트 조회 실패");
        if (fallbackFails) {
            when(service.publishDueContent(any())).thenThrow(failure);
        } else {
            when(service.publishDueContent(any())).thenThrow(failure).thenReturn(List.of());
        }
        TheRilogPublicationScheduler scheduler = new TheRilogPublicationScheduler(service,
                Clock.fixed(FIRST_ATTEMPT, ZoneOffset.UTC));
        scheduler.publishApprovedContent();

        scheduler.publishFailedContent();
        scheduler.publishFailedContent();

        verify(service, times(2)).publishDueContent(FIRST_ATTEMPT);
    }

    @Test
    @DisplayName("전날 최초 발행의 실패는 다음 날 후속 발행 대상에서 제외한다.")
    void skipsPreviousDayFailure() {
        TheRilogPublicationService service = mock(TheRilogPublicationService.class);
        when(service.publishDueContent(any())).thenThrow(new IllegalStateException("시트 조회 실패"));
        Clock clock = mock(Clock.class);
        when(clock.instant()).thenReturn(FIRST_ATTEMPT, FIRST_ATTEMPT.plusSeconds(86400 + 1800));
        TheRilogPublicationScheduler scheduler = new TheRilogPublicationScheduler(service, clock);
        scheduler.publishApprovedContent();

        scheduler.publishFailedContent();

        verify(service).publishDueContent(FIRST_ATTEMPT);
    }

    @Test
    @DisplayName("DB 저장 뒤 시트 기록이 실패하면 후속 실행은 게시글을 다시 만들지 않고 시트 기록만 완료한다.")
    void completesSheetResultsWithoutRepublishingCommittedPosts() {
        TheRilogPublicationService service = mock(TheRilogPublicationService.class);
        List<TheRilogPublishedArticle> published = List.of(new TheRilogPublishedArticle("news", NEWS, 1L));
        when(service.publishDueContent(any())).thenThrow(
                new TheRilogPublicationResultWriteException(published, new IllegalStateException("시트 기록 실패")));
        TheRilogPublicationScheduler scheduler = new TheRilogPublicationScheduler(service,
                Clock.fixed(FIRST_ATTEMPT, ZoneOffset.UTC));
        scheduler.publishApprovedContent();

        scheduler.publishFailedContent();

        verify(service).publishDueContent(FIRST_ATTEMPT);
        verify(service).completePublication(published);
    }

    @Test
    @DisplayName("한국 시간의 최초 발행과 실패분 후속 발행 스케줄을 등록한다.")
    void registersPublicationAndFallbackWithConfiguredCrons() {
        context(true).run(context -> {
            assertThat(context).hasSingleBean(TheRilogPublicationScheduler.class);
            Set<ScheduledTask> tasks = context.getBean(ScheduledAnnotationBeanPostProcessor.class).getScheduledTasks();
            assertThat(tasks.stream().map(task -> ((CronTask) task.getTask()).getTrigger()).toList())
                    .containsExactlyInAnyOrder(
                            new CronTrigger(PUBLICATION_CRON, ZoneId.of("Asia/Seoul")),
                            new CronTrigger(FALLBACK_CRON, ZoneId.of("Asia/Seoul")));
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
                        "the-rilog.publication-cron=" + PUBLICATION_CRON,
                        "the-rilog.publication-fallback-cron=" + FALLBACK_CRON)
                .withBean(TheRilogPublicationService.class, () -> mock(TheRilogPublicationService.class))
                .withBean(Clock.class, Clock::systemUTC);
    }

    @TestConfiguration(proxyBeanMethods = false)
    @EnableConfigurationProperties(TheRilogSheetProperties.class)
    static class SheetPropertiesConfiguration {
    }
}
