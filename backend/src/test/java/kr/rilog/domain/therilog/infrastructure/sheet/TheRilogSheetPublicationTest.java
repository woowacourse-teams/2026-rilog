package kr.rilog.domain.therilog.infrastructure.sheet;

import kr.rilog.domain.therilog.exception.TheRilogSheetException;
import kr.rilog.domain.therilog.service.dto.result.TheRilogPublishedArticle;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.Instant;
import java.util.List;

import static kr.rilog.domain.therilog.entity.enums.TheRilogContentType.NEWS;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.INVALID_THE_RILOG_PUBLICATION_STATUS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TheRilogSheetPublicationTest {

    private static final Instant NOW = Instant.parse("2026-10-14T20:00:00Z");
    private static final List<String> HEADER = List.of("rowId", "title", "content", "category", "scheduledAt", "status", "postId");

    @Test
    @DisplayName("예약 시각이 지난 승인된 미발행 행은 이전 날짜여도 발행 대상으로 읽는다.")
    void selectsOnlyDueApprovedUnpublishedRows() {
        var sheet = sheet(List.of(HEADER,
                row("due", "2026-10-15 05:00", "승인완료", ""),
                row("future", "2026-10-15 06:00", "승인완료", ""),
                row("review", "2026-10-15 05:00", "검토대기", ""),
                row("posted", "2026-10-15 05:00", "승인완료", "601"),
                row("yesterday", "2026-10-14 06:00", "승인완료", "")));

        var rows = sheet.readPublicationRows().stream().filter(row -> row.isDue(NOW)).toList();

        assertThat(rows.stream().map(row -> row.input().rowId()).toList()).containsExactly("due", "yesterday");
        assertThat(rows.getFirst().content()).isEqualTo("## 첫 기사\n\n본문");
    }

    @Test
    @DisplayName("발행 결과는 기존 완성본을 유지하고 해당 행의 게시글 ID와 발행완료 상태만 기록한다.")
    void marksOnlyPostIdAndPublishedStatus() {
        var sheet = sheet(List.of(HEADER, row("news", "2026-10-15 05:00", "승인완료", "")));

        var updates = sheet.createPublicationUpdates(new TheRilogPublishedArticle("news", NEWS, 601L));

        assertThat(updates).containsExactly(
                new GoogleSheetValuesUpdateRequest.ValueRange("NEWS!G2", List.of(List.of("601"))),
                new GoogleSheetValuesUpdateRequest.ValueRange("NEWS!F2", List.of(List.of("발행완료"))));
    }

    @ParameterizedTest
    @CsvSource(value = {"검토대기,''", "승인완료,601", "발행완료,602"})
    @DisplayName("승인이 취소되거나 게시글 ID가 이미 기록된 행에는 발행 결과를 덮어쓰지 않는다.")
    void rejectsChangedPublicationStatus(String status, String postId) {
        var sheet = sheet(List.of(HEADER, row("news", "2026-10-15 05:00", status, postId)));

        assertThatThrownBy(() -> sheet.createPublicationUpdates(new TheRilogPublishedArticle("news", NEWS, 601L)))
                .isInstanceOf(TheRilogSheetException.class)
                .hasMessage(INVALID_THE_RILOG_PUBLICATION_STATUS.getMessage());
    }

    private TheRilogSheet sheet(List<List<String>> values) {
        return new TheRilogSheet(NEWS, "NEWS!A:G", new GoogleSheetValuesResponse("NEWS!A1:G10", values));
    }

    private List<String> row(String id, String scheduledAt, String status, String postId) {
        return List.of(id, "오늘의 뉴스", "## 첫 기사\n\n본문", "기술", scheduledAt, status, postId);
    }
}
