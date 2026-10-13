package kr.rilog.domain.therilog.entity;

import java.time.Instant;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.therilog.entity.enums.TheRilogContentType;
import kr.rilog.domain.therilog.entity.enums.TheRilogTaskStatus;
import kr.rilog.domain.therilog.exception.TheRilogTaskException;
import kr.rilog.domain.therilog.service.dto.command.TheRilogTaskImportCommand;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static kr.rilog.domain.therilog.exception.TheRilogTaskErrorInformation.INVALID_THE_RILOG_TASK_INPUT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TheRilogTaskTest {
    private static final Instant COLLECTED_AT = Instant.parse("2026-10-14T09:00:00Z");
    private static final Instant SCHEDULED_AT = Instant.parse("2026-10-14T21:00:00Z");

    @Test
    @DisplayName("수집한 제작 요청은 제작대기 상태로 시작한다.")
    void collectedTaskStartsPendingProduction() {
        TheRilogTask task = TheRilogTask.collect(spotlight("spotlight_001", "https://example.com/blog"), COLLECTED_AT);
        assertThat(task.getStatus()).isEqualTo(TheRilogTaskStatus.PRODUCTION_PENDING);
    }

    @Test
    @DisplayName("뉴스 제작 요청은 개별 원문 URL 없이 등록할 수 있다.")
    void newsDoesNotRequireSourceUrl() {
        var command = new TheRilogTaskImportCommand("sheet-id", "news_20261015", TheRilogContentType.NEWS,
                null, Category.TECH, SCHEDULED_AT);
        TheRilogTask task = TheRilogTask.collect(command, COLLECTED_AT);
        assertThat(task.getSourceUrl()).isNull();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "not-a-url", "ftp://example.com/blog", "https:///blog"})
    @DisplayName("스포트라이트는 유효한 HTTP 원문 URL이 없으면 등록할 수 없다.")
    void spotlightRequiresHttpSourceUrl(String sourceUrl) {
        assertThatThrownBy(() -> TheRilogTask.collect(spotlight("spotlight_001", sourceUrl), COLLECTED_AT))
                .isInstanceOf(TheRilogTaskException.class).hasMessage(INVALID_THE_RILOG_TASK_INPUT.getMessage());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = " ")
    @DisplayName("고정 행 ID가 없으면 제작 요청을 등록할 수 없다.")
    void taskRequiresFixedRowId(String rowId) {
        assertThatThrownBy(() -> TheRilogTask.collect(spotlight(rowId, "https://example.com/blog"), COLLECTED_AT))
                .isInstanceOf(TheRilogTaskException.class).hasMessage(INVALID_THE_RILOG_TASK_INPUT.getMessage());
    }

    private TheRilogTaskImportCommand spotlight(String rowId, String sourceUrl) {
        return new TheRilogTaskImportCommand("sheet-id", rowId, TheRilogContentType.SPOTLIGHT,
                sourceUrl, Category.TECH, SCHEDULED_AT);
    }
}
