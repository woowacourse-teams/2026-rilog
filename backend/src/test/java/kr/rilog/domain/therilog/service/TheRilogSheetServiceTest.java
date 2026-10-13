package kr.rilog.domain.therilog.service;

import java.time.Instant;
import java.util.List;
import kr.rilog.domain.therilog.infrastructure.sheet.GoogleSheetsClient;
import kr.rilog.domain.therilog.infrastructure.sheet.TheRilogSheetRow;
import kr.rilog.domain.therilog.service.dto.result.TheRilogProductionInput;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static kr.rilog.domain.therilog.entity.enums.TheRilogContentType.NEWS;
import static kr.rilog.domain.therilog.entity.enums.TheRilogContentType.SPOTLIGHT;
import static kr.rilog.domain.post.entity.enums.Category.DAILY;
import static kr.rilog.domain.post.entity.enums.Category.TECH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TheRilogSheetServiceTest {

    @Test
    @DisplayName("시트에서 제작대기 상태인 뉴스와 스포트라이트 입력만 읽는다.")
    void readsOnlyProductionPendingInputs() {
        GoogleSheetsClient client = mock(GoogleSheetsClient.class);
        when(client.readRows()).thenReturn(List.of(
                row("waiting", "SPOTLIGHT", "제작대기"),
                row("review", "SPOTLIGHT", "검토대기"),
                row("approved", "SPOTLIGHT", "승인완료"),
                row("published", "SPOTLIGHT", "발행완료"),
                row("news", "NEWS", "제작대기"),
                row("", "SPOTLIGHT", "제작대기")));
        TheRilogSheetService service = new TheRilogSheetService(client);

        List<TheRilogProductionInput> inputs = service.readProductionInputs();

        assertThat(inputs).containsExactly(new TheRilogProductionInput(
                "waiting", SPOTLIGHT, "https://example.com/blog", TECH, Instant.parse("2026-10-14T21:00:00Z")),
                new TheRilogProductionInput("news", NEWS, null, TECH, Instant.parse("2026-10-14T21:00:00Z")));
    }

    @Test
    @DisplayName("같은 행도 제작대기라면 시트에서 수정한 최신 입력을 다시 읽는다.")
    void rereadsLatestInputForTheSameRowId() {
        GoogleSheetsClient client = mock(GoogleSheetsClient.class);
        when(client.readRows()).thenReturn(List.of(row("same-row", "SPOTLIGHT", "제작대기")))
                .thenReturn(List.of(new TheRilogSheetRow("same-row", "SPOTLIGHT", "https://example.com/changed",
                        "일상", "2026-10-16 06:00", "제작대기")));
        TheRilogSheetService service = new TheRilogSheetService(client);
        service.readProductionInputs();

        List<TheRilogProductionInput> inputs = service.readProductionInputs();

        assertThat(inputs).containsExactly(new TheRilogProductionInput(
                "same-row", SPOTLIGHT, "https://example.com/changed", DAILY, Instant.parse("2026-10-15T21:00:00Z")));
    }

    @Test
    @DisplayName("한 행의 입력이 잘못되어도 다른 정상 행의 입력을 읽는다.")
    void invalidInputDoesNotPreventReadingValidInput() {
        GoogleSheetsClient client = mock(GoogleSheetsClient.class);
        when(client.readRows()).thenReturn(List.of(new TheRilogSheetRow("invalid", "SPOTLIGHT",
                "https://example.com/blog", "알 수 없는 분류", "2026-10-15 06:00", "제작대기"),
                row("waiting", "SPOTLIGHT", "제작대기")));
        TheRilogSheetService service = new TheRilogSheetService(client);

        List<TheRilogProductionInput> inputs = service.readProductionInputs();

        assertThat(inputs).containsExactly(new TheRilogProductionInput(
                "waiting", SPOTLIGHT, "https://example.com/blog", TECH, Instant.parse("2026-10-14T21:00:00Z")));
    }

    private TheRilogSheetRow row(String rowId, String contentType, String status) {
        return new TheRilogSheetRow(rowId, contentType, "https://example.com/blog", "기술", "2026-10-15 06:00", status);
    }
}
