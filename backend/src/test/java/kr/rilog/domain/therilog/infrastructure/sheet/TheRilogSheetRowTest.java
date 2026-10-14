package kr.rilog.domain.therilog.infrastructure.sheet;

import java.time.format.DateTimeParseException;
import kr.rilog.domain.therilog.exception.TheRilogSheetException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.INVALID_THE_RILOG_SHEET_INPUT;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TheRilogSheetRowTest {

    @Test
    @DisplayName("뉴스 발행 데이터에는 원문 URL이 필요하지 않다.")
    void newsInputDoesNotRequireSourceUrl() {
        TheRilogSheetRow row = new TheRilogSheetRow(
                "news_20261015", "NEWS", "", "기술", "2026-10-15 06:00", "승인완료");

        assertThatCode(row::validate).doesNotThrowAnyException();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "알 수 없는 분류"})
    @DisplayName("운영자가 입력한 카테고리가 유효하지 않으면 발행 데이터로 사용할 수 없다.")
    void publicationInputRequiresValidCategory(String category) {
        TheRilogSheetRow row = new TheRilogSheetRow(
                "spotlight_001", "SPOTLIGHT", "https://example.com/blog", category,
                "2026-10-15 06:00", "승인완료");

        assertThatThrownBy(row::validate)
                .isInstanceOf(TheRilogSheetException.class).hasMessage(INVALID_THE_RILOG_SHEET_INPUT.getMessage());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "not-a-url", "ftp://example.com/blog", "https:///blog"})
    @DisplayName("스포트라이트는 유효한 HTTP 원문 URL이 없으면 발행 데이터로 사용할 수 없다.")
    void spotlightRequiresHttpSourceUrl(String sourceUrl) {
        TheRilogSheetRow row = row("spotlight_001", sourceUrl, "2026-10-15 06:00");

        assertThatThrownBy(row::validate)
                .isInstanceOf(TheRilogSheetException.class).hasMessage(INVALID_THE_RILOG_SHEET_INPUT.getMessage());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = " ")
    @DisplayName("행 ID가 없으면 발행 데이터로 사용할 수 없다.")
    void publicationInputRequiresRowId(String rowId) {
        TheRilogSheetRow row = row(rowId, "https://example.com/blog", "2026-10-15 06:00");

        assertThatThrownBy(row::validate)
                .isInstanceOf(TheRilogSheetException.class).hasMessage(INVALID_THE_RILOG_SHEET_INPUT.getMessage());
    }

    @Test
    @DisplayName("존재하지 않는 날짜는 예약 발행 시각으로 해석하지 않는다.")
    void invalidCalendarDateIsRejected() {
        TheRilogSheetRow row = row("spotlight_001", "https://example.com/blog", "2026-02-30 06:00");

        assertThatThrownBy(row::validate).isInstanceOf(DateTimeParseException.class);
    }

    private TheRilogSheetRow row(String rowId, String sourceUrl, String scheduledAt) {
        return new TheRilogSheetRow(rowId, "SPOTLIGHT", sourceUrl, "기술", scheduledAt, "승인완료");
    }
}
