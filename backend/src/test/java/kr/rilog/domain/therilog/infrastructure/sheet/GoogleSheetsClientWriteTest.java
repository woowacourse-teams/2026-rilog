package kr.rilog.domain.therilog.infrastructure.sheet;

import kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation;
import kr.rilog.domain.therilog.exception.TheRilogSheetException;
import kr.rilog.domain.therilog.service.TheRilogSheetService;
import kr.rilog.domain.therilog.service.dto.command.TheRilogSheetWriteCommand;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.Arguments;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.test.web.client.RequestMatcher;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static kr.rilog.domain.therilog.entity.enums.TheRilogContentType.NEWS;
import static kr.rilog.domain.therilog.entity.enums.TheRilogContentType.SPOTLIGHT;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.DUPLICATE_THE_RILOG_SHEET_ROW_ID;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.INVALID_THE_RILOG_SHEET_STATUS;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.INVALID_THE_RILOG_SHEET_RESULT;
import static kr.rilog.global.exception.GlobalExceptionInformation.INTERNAL_SERVER_ERROR;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.THE_RILOG_SHEET_ROW_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GoogleSheetsClientWriteTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String EMPTY_SPOTLIGHTS = """
            {"range":"SPOTLIGHTS!A1:M10","values":[
              ["rowId","title","content","category","scheduledAt","status","postId","originalArticleUrl",
               "articleType","description","thumbnailImageUrl","sourceProfileName","sourceProfileImage"]
            ]}
            """;

    @TempDir
    private Path tempDirectory;

    @Test
    @DisplayName("조회 후 위치가 바뀐 뉴스 행에 샘플 완성본과 검토대기 상태만 함께 기록한다.")
    void writesNewsResultToTheCurrentRowWithoutChangingManualInput() throws Exception {
        GoogleSheetsTestSupport sheets = new GoogleSheetsTestSupport(tempDirectory, "'NEWS'!B2:H");
        sheets.expectToken();
        sheets.expectToken();
        sheets.expectRows("%27NEWS%27%21B2%3AH", """
                {"range":"'NEWS'!B2:H10","values":[
                  ["category","content","rowId","status","title","postId","scheduledAt"],
                  ["회고","","target","제작대기","","","2026-10-15 06:00"]
                ]}
                """);
        sheets.expectRows("SPOTLIGHTS%21A%3AM", EMPTY_SPOTLIGHTS);
        sheets.expectRows("%27NEWS%27%21B2%3AH", """
                {"range":"'NEWS'!B2:H10","values":[
                  ["category","content","rowId","status","title","postId","scheduledAt"],
                  ["기술","다른 본문","other","검토대기","다른 제목","","2026-10-14 06:00"],
                  [],
                  ["회고","","target","제작대기","","","2026-10-15 06:00"]
                ]}
                """);
        sheets.expectWrite(payload("""
                {"valueInputOption":"RAW","data":[
                  {"range":"'NEWS'!F5","values":[["=AI 뉴스"]]},
                  {"range":"'NEWS'!C5","values":[["# 뉴스\\n\\n요약과 [출처](https://example.com/news)"]]},
                  {"range":"'NEWS'!E5","values":[["검토대기"]]}
                ]}
                """));
        TheRilogSheetService service = new TheRilogSheetService(sheets.client());
        var input = service.readProductionInputs().getFirst();
        TheRilogSheetWriteCommand result = new TheRilogSheetWriteCommand(
                input.rowId(), input.contentType(), "=AI 뉴스",
                "# 뉴스\n\n요약과 [출처](https://example.com/news)", null);

        service.writeProductionResult(result);

        sheets.verifyRequests();
    }

    @Test
    @DisplayName("스포트라이트 완성본과 출처 정보를 수동 입력 칼럼을 제외하고 기록한다.")
    void writesSpotlightResultWithoutChangingManualInput() throws Exception {
        GoogleSheetsTestSupport sheets = new GoogleSheetsTestSupport(tempDirectory, "NEWS!A:G");
        sheets.expectToken();
        sheets.expectRows("SPOTLIGHTS%21A%3AM", """
                {"range":"SPOTLIGHTS!A1:M10","values":[
                  ["status","title","rowId","scheduledAt","category","originalArticleUrl","content","postId",
                   "articleType","description","thumbnailImageUrl","sourceProfileName","sourceProfileImage"],
                  ["검토대기","다른 제목","other","2026-10-15 06:00","기술","https://example.com/other"],
                  ["제작대기","","target","2026-10-15 06:00","일상","https://example.com/post","",""]
                ]}
                """);
        sheets.expectWrite(payload("""
                {"valueInputOption":"RAW","data":[
                  {"range":"SPOTLIGHTS!B3","values":[["코드 리뷰 경험"]]},
                  {"range":"SPOTLIGHTS!G3","values":[["요약과 원문 출처"]]},
                  {"range":"SPOTLIGHTS!I3","values":[["personal"]]},
                  {"range":"SPOTLIGHTS!J3","values":[["개발자의 코드 리뷰 경험을 소개합니다."]]},
                  {"range":"SPOTLIGHTS!K3","values":[["https://example.com/thumbnail.webp"]]},
                  {"range":"SPOTLIGHTS!L3","values":[["개발자 A"]]},
                  {"range":"SPOTLIGHTS!M3","values":[["https://example.com/profile.png"]]},
                  {"range":"SPOTLIGHTS!A3","values":[["검토대기"]]}
                ]}
                """));
        TheRilogSheetWriteCommand result = new TheRilogSheetWriteCommand("target", SPOTLIGHT,
                "코드 리뷰 경험", "요약과 원문 출처", new TheRilogSheetWriteCommand.Spotlight(
                "personal", "개발자의 코드 리뷰 경험을 소개합니다.", "https://example.com/thumbnail.webp",
                "개발자 A", "https://example.com/profile.png"));

        new TheRilogSheetService(sheets.client()).writeProductionResult(result);

        sheets.verifyRequests();
    }

    @ParameterizedTest
    @MethodSource("ambiguousTargets")
    @DisplayName("행 ID로 대상을 하나로 식별할 수 없으면 시트를 수정하지 않는다.")
    void rejectsMissingOrDuplicateRowId(List<String> rowIds, TheRilogSheetErrorInformation error) throws Exception {
        GoogleSheetsTestSupport sheets = new GoogleSheetsTestSupport(tempDirectory, "NEWS!A:G");
        sheets.expectToken();
        sheets.expectRows("NEWS%21A%3AG", pendingNewsRows(rowIds));
        TheRilogSheetService service = new TheRilogSheetService(sheets.client());

        assertThatThrownBy(() -> service.writeProductionResult(newsResult()))
                .isInstanceOf(TheRilogSheetException.class).hasMessage(error.getMessage());
        sheets.verifyRequests();
    }

    @ParameterizedTest
    @ValueSource(strings = {"검토대기", "승인완료", "발행완료"})
    @DisplayName("제작대기가 아닌 행은 완성본으로 덮어쓰지 않는다.")
    void doesNotOverwriteReviewedOrPublishedRows(String status) throws Exception {
        GoogleSheetsTestSupport sheets = new GoogleSheetsTestSupport(tempDirectory, "NEWS!A:G");
        sheets.expectToken();
        sheets.expectRows("NEWS%21A%3AG", """
                {"range":"NEWS!A1:G10","values":[
                  ["rowId","title","content","category","scheduledAt","status","postId"],
                  ["target","검토한 제목","검토한 본문","기술","2026-10-15 06:00","%s",""]
                ]}
                """.formatted(status));
        TheRilogSheetService service = new TheRilogSheetService(sheets.client());

        assertThatThrownBy(() -> service.writeProductionResult(newsResult()))
                .isInstanceOf(TheRilogSheetException.class).hasMessage(INVALID_THE_RILOG_SHEET_STATUS.getMessage());
        sheets.verifyRequests();
    }

    @Test
    @DisplayName("필수 결과 칼럼이 없으면 검토대기 상태를 기록하지 않는다.")
    void missingOutputColumnDoesNotWriteReviewStatus() throws Exception {
        GoogleSheetsTestSupport sheets = new GoogleSheetsTestSupport(tempDirectory, "NEWS!A:G");
        sheets.expectToken();
        sheets.expectRows("NEWS%21A%3AG", """
                {"range":"NEWS!A1:F10","values":[
                  ["rowId","title","category","scheduledAt","status","postId"],
                  ["target","","기술","2026-10-15 06:00","제작대기",""]
                ]}
                """);
        TheRilogSheetService service = new TheRilogSheetService(sheets.client());

        assertThatThrownBy(() -> service.writeProductionResult(newsResult()))
                .isInstanceOf(kr.rilog.global.exception.RilogInfrastructureException.class)
                .hasMessage(INTERNAL_SERVER_ERROR.getMessage());
        sheets.verifyRequests();
    }

    @ParameterizedTest
    @MethodSource("incompleteResults")
    @DisplayName("제목이나 본문이 없는 결과는 검토대기 상태로 기록하지 않는다.")
    void incompleteResultDoesNotWriteReviewStatus(String title, String content) throws Exception {
        GoogleSheetsTestSupport sheets = new GoogleSheetsTestSupport(tempDirectory, "NEWS!A:G");
        sheets.expectToken();
        sheets.expectRows("NEWS%21A%3AG", pendingNewsRows(List.of("target")));
        TheRilogSheetService service = new TheRilogSheetService(sheets.client());
        TheRilogSheetWriteCommand result = new TheRilogSheetWriteCommand("target", NEWS, title, content, null);

        assertThatThrownBy(() -> service.writeProductionResult(result))
                .isInstanceOf(TheRilogSheetException.class).hasMessage(INVALID_THE_RILOG_SHEET_RESULT.getMessage());
        sheets.verifyRequests();
    }

    private static Stream<Arguments> incompleteResults() {
        return Stream.of(Arguments.of("", "뉴스 본문"), Arguments.of("뉴스 제목", ""));
    }

    private static Stream<Arguments> ambiguousTargets() {
        return Stream.of(
                Arguments.of(List.of("other"), THE_RILOG_SHEET_ROW_NOT_FOUND),
                Arguments.of(List.of("target", "target"), DUPLICATE_THE_RILOG_SHEET_ROW_ID));
    }

    private String pendingNewsRows(List<String> rowIds) {
        List<List<String>> values = new ArrayList<>();
        values.add(List.of("rowId", "title", "content", "category", "scheduledAt", "status", "postId"));
        rowIds.forEach(id -> values.add(List.of(id, "", "", "기술", "2026-10-15 06:00", "제작대기", "")));
        return MAPPER.writeValueAsString(Map.of("range", "NEWS!A1:G10", "values", values));
    }

    private TheRilogSheetWriteCommand newsResult() {
        return new TheRilogSheetWriteCommand("target", NEWS, "오늘의 뉴스", "뉴스 요약", null);
    }

    private RequestMatcher payload(String expected) {
        return request -> assertThat(MAPPER.readTree(((MockClientHttpRequest) request).getBodyAsString()))
                .isEqualTo(MAPPER.readTree(expected));
    }
}
