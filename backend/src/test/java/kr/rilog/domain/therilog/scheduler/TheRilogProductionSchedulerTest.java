package kr.rilog.domain.therilog.scheduler;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.therilog.entity.enums.TheRilogContentType;
import kr.rilog.domain.therilog.infrastructure.sheet.GoogleSheetsClient;
import kr.rilog.domain.therilog.infrastructure.sheet.TheRilogSheetProperties;
import kr.rilog.domain.therilog.infrastructure.sheet.TheRilogSheetRow;
import kr.rilog.domain.therilog.repository.TheRilogTaskRepository;
import kr.rilog.domain.therilog.service.TheRilogSheetImportService;
import kr.rilog.domain.therilog.service.dto.command.TheRilogTaskImportCommand;
import kr.rilog.support.ServiceSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TheRilogProductionSchedulerTest extends ServiceSupport {
    @Autowired
    private TheRilogSheetImportService importService;
    @Autowired
    private TheRilogTaskRepository taskRepository;

    @Test
    @DisplayName("제작대기인 신규 스포트라이트만 제작 요청으로 저장한다.")
    void collectsOnlyPendingSpotlightRows() {
        GoogleSheetsClient sheetsClient = mock(GoogleSheetsClient.class);
        when(sheetsClient.readRows()).thenReturn(List.of(
                row("waiting", "SPOTLIGHT", "제작대기"), row("review", "SPOTLIGHT", "검토대기"),
                row("approved", "SPOTLIGHT", "승인완료"), row("published", "SPOTLIGHT", "발행완료"),
                row("news", "NEWS", "제작대기"), row("", "SPOTLIGHT", "제작대기")));

        scheduler(sheetsClient).prepareNextEdition();

        assertThat(taskRepository.findAll()).extracting(task -> task.getRowId()).containsExactly("waiting");
    }

    @Test
    @DisplayName("잘못된 신규 행의 수집 실패는 다른 정상 행의 저장을 막지 않는다.")
    void invalidNewRowDoesNotPreventValidRowCollection() {
        GoogleSheetsClient sheetsClient = mock(GoogleSheetsClient.class);
        when(sheetsClient.readRows()).thenReturn(List.of(
                new TheRilogSheetRow("invalid", "SPOTLIGHT", "https://example.com/blog",
                        "알 수 없는 분류", "2026-10-15 06:00", "제작대기"), row("waiting", "SPOTLIGHT", "제작대기")));

        scheduler(sheetsClient).prepareNextEdition();

        assertThat(taskRepository.findAll()).extracting(task -> task.getRowId()).containsExactly("waiting");
    }

    @Test
    @DisplayName("이미 수집한 행의 잘못 변경된 입력은 다시 해석하거나 오류로 기록하지 않는다.")
    void existingRowSkipsChangedInvalidInputWithoutWarning() {
        importService.importRequest(new TheRilogTaskImportCommand("sheet-id", "existing", TheRilogContentType.SPOTLIGHT,
                "https://example.com/blog", Category.TECH, Instant.parse("2026-10-14T21:00:00Z")));
        GoogleSheetsClient sheetsClient = mock(GoogleSheetsClient.class);
        when(sheetsClient.readRows()).thenReturn(List.of(new TheRilogSheetRow(
                "existing", "SPOTLIGHT", "changed", "잘못된 분류", "invalid-time", "제작대기")));
        Logger logger = (Logger) LoggerFactory.getLogger(TheRilogProductionScheduler.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            scheduler(sheetsClient).prepareNextEdition();

            assertThat(appender.list).noneMatch(event -> event.getLevel().isGreaterOrEqual(Level.WARN));
            assertThat(taskRepository.count()).isEqualTo(1);
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    private TheRilogProductionScheduler scheduler(GoogleSheetsClient sheetsClient) {
        return new TheRilogProductionScheduler(sheetsClient, importService, new TheRilogSheetProperties(
                true, "sheet-id", "SPOTLIGHTS!A:M", "0 0 18 * * *", "/tmp/google.json",
                Duration.ofSeconds(1), Duration.ofSeconds(1)));
    }

    private TheRilogSheetRow row(String rowId, String contentType, String status) {
        return new TheRilogSheetRow(rowId, contentType, "https://example.com/blog", "기술", "2026-10-15 06:00", status);
    }
}
