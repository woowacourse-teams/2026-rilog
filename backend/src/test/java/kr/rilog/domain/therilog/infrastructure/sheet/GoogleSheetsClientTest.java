package kr.rilog.domain.therilog.infrastructure.sheet;

import kr.rilog.domain.therilog.exception.TheRilogSheetException;
import kr.rilog.domain.therilog.service.dto.result.TheRilogPublishedArticle;
import kr.rilog.global.exception.RilogInfrastructureException;
import kr.rilog.global.logging.SanitizingStackTracePrinter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.web.client.RestClient;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.util.List;

import static kr.rilog.domain.therilog.entity.enums.TheRilogContentType.NEWS;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.DUPLICATE_THE_RILOG_SHEET_ROW_ID;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.INVALID_THE_RILOG_SHEET_INPUT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GoogleSheetsClientTest {

    @TempDir
    private Path tempDirectory;

    @Test
    @DisplayName("헤더 위치를 따라 승인된 미발행 행의 본문만 읽고 과거 본문은 요청하지 않는다.")
    void readPublicationRowsWithServiceAccountToken() throws Exception {
        GoogleSheetsTestSupport sheets = new GoogleSheetsTestSupport(tempDirectory, "NEWS!A:G");
        sheets.expectToken();
        sheets.expectPublicationRead("NEWS!A:G", """
                {"range":"NEWS!A1:G10","majorDimension":"ROWS","values":[
                  ["rowId","title","content","category","scheduledAt","status","postId"],
                  ["past","과거 뉴스","가져오지 않을 긴 본문","기술","2026-10-14 06:00","발행완료","10"],
                  ["review","검토 뉴스","가져오지 않을 긴 본문","기술","2026-10-15 06:00","검토대기",""],
                  ["news_20261015","오늘의 뉴스","뉴스 요약","기술","2026-10-15 06:00","승인완료",""]
                ]}
                """);
        sheets.expectPublicationRead("SPOTLIGHTS!A:M", """
                {"range":"SPOTLIGHTS!A1:M10","majorDimension":"ROWS","values":[
                  ["status","title","rowId","scheduledAt","category","originalArticleUrl","content","postId",
                   "articleType","description","thumbnailImageUrl","sourceProfileName","sourceProfileImage"],
                  ["승인완료","기술 요약","spotlight_20261015_01","2026-10-15 06:00","기술","https://example.com/post",
                   "기술 본문","","enterprise","기술 소개","","기업",""]
                ]}
                """);

        List<TheRilogPublicationRow> rows = sheets.client().readPublicationRows(true);

        assertThat(rows).containsExactly(
                new TheRilogPublicationRow(new TheRilogSheetRow("news_20261015", "NEWS", "", "기술",
                        "2026-10-15 06:00", "승인완료"), "오늘의 뉴스", "뉴스 요약", null, ""),
                new TheRilogPublicationRow(new TheRilogSheetRow("spotlight_20261015_01", "SPOTLIGHT", "https://example.com/post", "기술",
                        "2026-10-15 06:00", "승인완료"), "기술 요약", "기술 본문",
                        new TheRilogPublicationRow.Spotlight("enterprise", "기술 소개", "", "기업", ""), ""));
        sheets.verifyRequests();
    }

    @Test
    @DisplayName("시작 셀과 헤더 순서가 다른 범위에서도 승인 행의 실제 위치만 읽는다.")
    void selectsApprovedRowsWithOffsetAndReorderedColumns() throws Exception {
        GoogleSheetsTestSupport sheets = new GoogleSheetsTestSupport(tempDirectory, "NEWS!C4:I8");
        sheets.expectToken();
        sheets.expectRows("NEWS%21C4%3AI4", """
                {"range":"NEWS!C4:I4","values":[
                  ["status","title","rowId","scheduledAt","category","content","postId"]
                ]}
                """);
        sheets.expectBatchRows(List.of("NEWS!E5:E8", "NEWS!C5:C8", "NEWS!I5:I8"), """
                {"valueRanges":[
                  {"range":"NEWS!E5:E8","values":[["review"],["news"]]},
                  {"range":"NEWS!C5:C8","values":[["검토대기"],["승인완료"]]},
                  {"range":"NEWS!I5:I8","values":[]}
                ]}
                """);
        sheets.expectBatchRows(List.of("NEWS!C6:I6"), """
                {"valueRanges":[{"range":"NEWS!C6:I6","values":[
                  ["승인완료","뉴스","news","2026-10-15 05:00","기술","본문",""]
                ]}]}
                """);

        assertThat(sheets.client().readPublicationRows(false)).containsExactly(
                new TheRilogPublicationRow(new TheRilogSheetRow("news", "NEWS", "", "기술",
                        "2026-10-15 05:00", "승인완료"), "뉴스", "본문", null, ""));
        sheets.verifyRequests();
    }

    @Test
    @DisplayName("헤더만 포함된 범위는 역전된 데이터 범위를 요청하지 않고 발행 대상을 비운다.")
    void readsOnlyHeaderWhenRangeHasNoDataRows() throws Exception {
        GoogleSheetsTestSupport sheets = new GoogleSheetsTestSupport(tempDirectory, "NEWS!C4:I4");
        sheets.expectToken();
        sheets.expectRows("NEWS%21C4%3AI4", """
                {"range":"NEWS!C4:I4","values":[
                  ["rowId","title","content","category","scheduledAt","status","postId"]
                ]}
                """);

        assertThat(sheets.client().readPublicationRows(false)).isEmpty();
        sheets.verifyRequests();
    }

    @Test
    @DisplayName("같은 행 ID가 중복되면 어느 본문도 선택하지 않고 조회에 실패한다.")
    void rejectsDuplicateRowIdsBeforeReadingContent() throws Exception {
        GoogleSheetsTestSupport sheets = new GoogleSheetsTestSupport(tempDirectory, "NEWS!A:G");
        sheets.expectToken();
        sheets.expectPublicationResultRead("NEWS!A:G", """
                {"range":"NEWS!A1:G3","values":[
                  ["rowId","title","content","category","scheduledAt","status","postId"],
                  ["news","뉴스","본문","기술","2026-10-15 05:00","승인완료",""],
                  ["news","이전글","본문","기술","2026-10-14 05:00","발행완료","601"]
                ]}
                """);

        assertThatThrownBy(() -> sheets.client().readPublicationRows(false))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasCauseInstanceOf(TheRilogSheetException.class)
                .satisfies(error -> assertThat(error.getCause()).hasMessage(
                        DUPLICATE_THE_RILOG_SHEET_ROW_ID.getMessage()));
        sheets.verifyRequests();
    }

    @Test
    @DisplayName("본문을 읽기 전에 행이 이동했으면 다른 게시글을 대신 발행하지 않는다.")
    void rejectsMovedSelectedRow() throws Exception {
        GoogleSheetsTestSupport sheets = new GoogleSheetsTestSupport(tempDirectory, "NEWS!A:G");
        sheets.expectToken();
        sheets.expectPublicationResultRead("NEWS!A:G", approvedNews());
        sheets.expectBatchRows(List.of("NEWS!A2:G2"), """
                {"valueRanges":[{"range":"NEWS!A2:G2","values":[
                  ["another-news","다른 글","본문","기술","2026-10-15 05:00","승인완료",""]
                ]}]}
                """);

        assertThatThrownBy(() -> sheets.client().readPublicationRows(false))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasCauseInstanceOf(TheRilogSheetException.class)
                .satisfies(error -> assertThat(error.getCause()).hasMessage(INVALID_THE_RILOG_SHEET_INPUT.getMessage()));
        sheets.verifyRequests();
    }

    @ParameterizedTest
    @CsvSource({"검토대기,''", "승인완료,601"})
    @DisplayName("본문 조회 시점에 승인이 취소되거나 발행된 행은 발행 대상에서 제외한다.")
    void rechecksApprovalAfterReadingContent(String status, String postId) throws Exception {
        GoogleSheetsTestSupport sheets = new GoogleSheetsTestSupport(tempDirectory, "NEWS!A:G");
        sheets.expectToken();
        sheets.expectPublicationResultRead("NEWS!A:G", approvedNews());
        sheets.expectBatchRows(List.of("NEWS!A2:G2"), """
                {"valueRanges":[{"range":"NEWS!A2:G2","values":[
                  ["news","뉴스","본문","기술","2026-10-15 05:00","%s","%s"]
                ]}]}
                """.formatted(status, postId));

        assertThat(sheets.client().readPublicationRows(false)).isEmpty();
        sheets.verifyRequests();
    }

    @Test
    @DisplayName("이미 동일한 발행 결과가 기록된 행은 본문이나 셀을 다시 읽고 쓰지 않는다.")
    void skipsAlreadyRecordedPublicationResult() throws Exception {
        GoogleSheetsTestSupport sheets = new GoogleSheetsTestSupport(tempDirectory, "NEWS!A:G");
        sheets.expectToken();
        sheets.expectPublicationResultRead("NEWS!A:G", """
                {"range":"NEWS!A1:G2","values":[
                  ["rowId","title","content","category","scheduledAt","status","postId"],
                  ["news","뉴스","본문","기술","2026-10-15 05:00","발행완료","601"]
                ]}
                """);

        sheets.client().writePublicationResults(List.of(new TheRilogPublishedArticle("news", NEWS, 601L)));

        sheets.verifyRequests();
    }

    @Test
    @DisplayName("인증 파일 해석 실패 로그에는 자격증명 원문을 남기지 않는다.")
    void credentialReadFailureDoesNotExposeFileContents() throws Exception {
        Path credentialsPath = tempDirectory.resolve("invalid-service-account.json");
        Files.writeString(credentialsPath, "\"PRIVATE_CREDENTIAL_CONTENT\"");
        GoogleSheetsClient client = new GoogleSheetsClient(RestClient.create(), RestClient.create(),
                properties(credentialsPath), Clock.systemUTC());

        assertThatThrownBy(() -> client.readPublicationRows(false)).isInstanceOf(RilogInfrastructureException.class)
                .satisfies(error -> assertThat(new SanitizingStackTracePrinter().printStackTraceToString(error))
                        .doesNotContain("PRIVATE_CREDENTIAL_CONTENT"));
    }

    @Test
    @DisplayName("cron 설정 없이 시트 연동을 켜면 기존 HTTP 클라이언트와 구분하여 구글 클라이언트를 구성한다.")
    void enabledSheetConfigurationCreatesGoogleClient() {
        new ApplicationContextRunner()
                .withUserConfiguration(TheRilogSheetConfig.class)
                .withPropertyValues("the-rilog.enabled=true")
                .withBean(TheRilogSheetProperties.class, () -> properties(tempDirectory.resolve("credentials.json")))
                .withBean(Clock.class, Clock::systemUTC)
                .withBean("githubOAuthRestClient", RestClient.class, RestClient::create)
                .run(context -> assertThat(context).hasSingleBean(GoogleSheetsClient.class));
    }

    private String approvedNews() {
        return """
                {"range":"NEWS!A1:G2","values":[
                  ["rowId","title","content","category","scheduledAt","status","postId"],
                  ["news","뉴스","본문","기술","2026-10-15 05:00","승인완료",""]
                ]}
                """;
    }

    private TheRilogSheetProperties properties(Path credentialsPath) {
        return new TheRilogSheetProperties(
                true,
                "sheet-id",
                "SPOTLIGHTS!A:M",
                "NEWS!A:G",
                credentialsPath.toString(),
                Duration.ofSeconds(1),
                Duration.ofSeconds(1)
        );
    }

}
