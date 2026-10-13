package kr.rilog.domain.therilog.infrastructure.sheet;

import java.time.format.DateTimeParseException;
import kr.rilog.domain.therilog.exception.TheRilogSheetException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.INVALID_THE_RILOG_SHEET_INPUT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TheRilogSheetRowTest {

    @Test
    @DisplayName("제작대기인 스포트라이트는 필수 입력이 비어 있어도 검증 대상이다.")
    void pendingSpotlightWithMissingInputStillRequiresValidation() {
        TheRilogSheetRow row = row("spotlight_001", "", "2026-10-15 06:00");

        assertThat(row.isProductionPendingSpotlight()).isTrue();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "not-a-url", "ftp://example.com/blog", "https:///blog"})
    @DisplayName("스포트라이트는 유효한 HTTP 원문 URL이 없으면 제작 입력으로 변환할 수 없다.")
    void spotlightRequiresHttpSourceUrl(String sourceUrl) {
        TheRilogSheetRow row = row("spotlight_001", sourceUrl, "2026-10-15 06:00");

        assertThatThrownBy(row::toProductionInput)
                .isInstanceOf(TheRilogSheetException.class).hasMessage(INVALID_THE_RILOG_SHEET_INPUT.getMessage());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = " ")
    @DisplayName("행 ID가 없으면 제작 입력으로 변환할 수 없다.")
    void productionInputRequiresRowId(String rowId) {
        TheRilogSheetRow row = row(rowId, "https://example.com/blog", "2026-10-15 06:00");

        assertThatThrownBy(row::toProductionInput)
                .isInstanceOf(TheRilogSheetException.class).hasMessage(INVALID_THE_RILOG_SHEET_INPUT.getMessage());
    }

    @Test
    @DisplayName("존재하지 않는 날짜는 예약 발행 시각으로 해석하지 않는다.")
    void invalidCalendarDateIsRejected() {
        TheRilogSheetRow row = row("spotlight_001", "https://example.com/blog", "2026-02-30 06:00");

        assertThatThrownBy(row::toProductionInput).isInstanceOf(DateTimeParseException.class);
    }

    private TheRilogSheetRow row(String rowId, String sourceUrl, String scheduledAt) {
        return new TheRilogSheetRow(rowId, "SPOTLIGHT", sourceUrl, "기술", scheduledAt, "제작대기");
    }
}
