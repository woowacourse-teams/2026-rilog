package kr.rilog.domain.therilog.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.therilog.entity.TheRilogTask;
import kr.rilog.domain.therilog.entity.enums.TheRilogContentType;
import kr.rilog.domain.therilog.repository.TheRilogTaskRepository;
import kr.rilog.domain.therilog.service.dto.command.TheRilogTaskImportCommand;
import kr.rilog.domain.therilog.service.dto.result.TheRilogTaskImportResult;
import kr.rilog.support.ServiceSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static kr.rilog.domain.therilog.service.dto.result.TheRilogTaskImportResult.ImportStatus.ALREADY_COLLECTED;
import static kr.rilog.domain.therilog.service.dto.result.TheRilogTaskImportResult.ImportStatus.CREATED;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class TheRilogSheetImportServiceIntegrationTest extends ServiceSupport {
    @Autowired
    private TheRilogSheetImportService importService;
    @Autowired
    private TheRilogTaskRepository taskRepository;

    @Test
    @DisplayName("같은 행을 다시 수집해도 기존 작업과 최초 제작 입력을 유지한다.")
    void repeatedRowKeepsOriginalTaskAndInput() {
        TheRilogTaskImportResult first = importService.importRequest(spotlightRequest("sheet-id"));
        TheRilogTask original = taskRepository.findById(first.taskId()).orElseThrow();
        var changed = new TheRilogTaskImportCommand("sheet-id", "spotlight_001", TheRilogContentType.SPOTLIGHT,
                "https://example.com/changed", Category.DAILY, Instant.parse("2026-10-18T21:00:00Z"));

        TheRilogTaskImportResult result = importService.importRequest(changed);

        assertSoftly(softly -> {
            softly.assertThat(result.status()).isEqualTo(ALREADY_COLLECTED);
            softly.assertThat(result.taskId()).isEqualTo(first.taskId());
            softly.assertThat(taskRepository.count()).isEqualTo(1);
            softly.assertThat(taskRepository.findById(first.taskId()).orElseThrow())
                    .usingRecursiveComparison().isEqualTo(original);
        });
    }

    @Test
    @DisplayName("서로 다른 스프레드시트의 같은 행 ID는 독립된 작업으로 등록한다.")
    void sameRowIdInDifferentSpreadsheetsCreatesIndependentTasks() {
        TheRilogTaskImportResult first = importService.importRequest(spotlightRequest("Sheet-id"));

        TheRilogTaskImportResult second = importService.importRequest(spotlightRequest("sheet-id"));

        assertThat(second.taskId()).isNotEqualTo(first.taskId());
        assertThat(taskRepository.count()).isEqualTo(2);
    }

    @Test
    @Tag("mysql")
    @DisplayName("여러 실행이 같은 행을 동시에 수집해도 작업 하나만 등록한다.")
    void concurrentCollectionCreatesOnlyOneTask() throws Exception {
        CountDownLatch ready = new CountDownLatch(3);
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(3)) {
            List<Future<TheRilogTaskImportResult>> futures = java.util.stream.IntStream.range(0, 3)
                    .mapToObj(index -> executor.submit(() -> {
                        ready.countDown();
                        if (!start.await(10, TimeUnit.SECONDS)) {
                            throw new IllegalStateException("동시 수집 시작 대기 시간이 초과되었습니다.");
                        }
                        return importService.importRequest(spotlightRequest("sheet-id"));
                    })).toList();
            if (!ready.await(10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("동시 수집 준비 시간이 초과되었습니다.");
            }
            start.countDown();

            List<TheRilogTaskImportResult> results = new ArrayList<>();
            for (Future<TheRilogTaskImportResult> future : futures) {
                results.add(future.get(20, TimeUnit.SECONDS));
            }

            assertThat(results.stream().filter(result -> result.status() == CREATED)).hasSize(1);
            assertThat(results.stream().map(TheRilogTaskImportResult::taskId).distinct()).hasSize(1);
            assertThat(taskRepository.count()).isEqualTo(1);
        }
    }

    private TheRilogTaskImportCommand spotlightRequest(String spreadsheetId) {
        return new TheRilogTaskImportCommand(spreadsheetId, "spotlight_001", TheRilogContentType.SPOTLIGHT,
                "https://example.com/blog", Category.TECH, Instant.parse("2026-10-14T21:00:00Z"));
    }
}
