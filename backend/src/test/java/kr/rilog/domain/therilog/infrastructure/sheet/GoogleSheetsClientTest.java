package kr.rilog.domain.therilog.infrastructure.sheet;

import kr.rilog.global.exception.RilogInfrastructureException;
import kr.rilog.global.logging.SanitizingStackTracePrinter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.web.client.RestClient;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GoogleSheetsClientTest {

    @TempDir
    private Path tempDirectory;

    @Test
    @DisplayName("서비스 계정 토큰으로 뉴스와 스포트라이트 탭의 발행 데이터를 읽는다.")
    void readPublicationRowsWithServiceAccountToken() throws Exception {
        GoogleSheetsTestSupport sheets = new GoogleSheetsTestSupport(tempDirectory, "NEWS!A:G");
        sheets.expectToken();
        sheets.expectRows("NEWS%21A%3AG", """
                {"range":"NEWS!A1:G10","majorDimension":"ROWS","values":[
                  ["rowId","title","content","category","scheduledAt","status","postId"],
                  ["news_20261015","오늘의 뉴스","뉴스 요약","기술","2026-10-15 06:00","승인완료",""]
                ]}
                """);
        sheets.expectRows("SPOTLIGHTS%21A%3AM", """
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
