package kr.rilog.domain.therilog.infrastructure.sheet;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.junit.jupiter.api.io.TempDir;
import kr.rilog.global.exception.RilogInfrastructureException;
import kr.rilog.global.logging.SanitizingStackTracePrinter;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPairGenerator;
import java.security.KeyPair;
import java.security.PrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.Arrays;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GoogleSheetsClientTest {

    @TempDir
    private Path tempDirectory;

    @Test
    @DisplayName("서비스 계정 토큰으로 구글 시트 행을 읽는다.")
    void readRowsWithServiceAccountToken() throws Exception {
        RestClient.Builder tokenBuilder = RestClient.builder();
        RestClient.Builder sheetsBuilder = RestClient.builder();
        MockRestServiceServer tokenServer = MockRestServiceServer.bindTo(tokenBuilder).build();
        MockRestServiceServer sheetsServer = MockRestServiceServer.bindTo(sheetsBuilder).build();
        Path credentialsPath = tempDirectory.resolve("service-account.json");
        KeyPair keyPair = generateKeyPair();
        Files.writeString(credentialsPath, credentialsJson(keyPair.getPrivate()));
        GoogleSheetsClient client = new GoogleSheetsClient(
                tokenBuilder.build(),
                sheetsBuilder.build(),
                properties(credentialsPath),
                Clock.fixed(Instant.parse("2026-10-13T00:00:00Z"), ZoneOffset.UTC)
        );

        tokenServer.expect(requestTo("https://oauth2.googleapis.com/token"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(request -> {
                    String body = ((MockClientHttpRequest) request).getBodyAsString();
                    var form = Arrays.stream(body.split("&")).map(part -> part.split("=", 2))
                            .collect(Collectors.toMap(part -> part[0],
                                    part -> URLDecoder.decode(part[1], StandardCharsets.UTF_8)));
                    var assertion = JWT.decode(form.get("assertion"));
                    Algorithm.RSA256((RSAPublicKey) keyPair.getPublic(), null).verify(assertion);
                    assertSoftly(softly -> {
                        softly.assertThat(form.get("grant_type")).isEqualTo("urn:ietf:params:oauth:grant-type:jwt-bearer");
                        softly.assertThat(assertion.getIssuer()).isEqualTo("rilog@example.iam.gserviceaccount.com");
                        softly.assertThat(assertion.getAudience()).containsExactly("https://oauth2.googleapis.com/token");
                        softly.assertThat(assertion.getClaim("scope").asString())
                                .isEqualTo("https://www.googleapis.com/auth/spreadsheets.readonly");
                        softly.assertThat(assertion.getIssuedAtAsInstant()).isEqualTo(Instant.parse("2026-10-13T00:00:00Z"));
                        softly.assertThat(assertion.getExpiresAtAsInstant()).isEqualTo(Instant.parse("2026-10-13T01:00:00Z"));
                    });
                })
                .andRespond(withSuccess("""
                        {
                          "access_token": "google-access-token",
                          "token_type": "Bearer",
                          "expires_in": 3600
                        }
                        """, MediaType.APPLICATION_JSON));
        sheetsServer.expect(requestTo(
                        "https://sheets.googleapis.com/v4/spreadsheets/sheet-id/values/SPOTLIGHTS%21A%3AM"
                ))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer google-access-token"))
                .andRespond(withSuccess("""
                        {
                          "range": "SPOTLIGHTS!A:M",
                          "majorDimension": "ROWS",
                          "values": [
                            ["status", "title", "rowId", "scheduledAt", "category", "originalArticleUrl", "content", "postId", "articleType", "description", "thumbnailImageUrl", "sourceProfileName", "sourceProfileImage"],
                            ["제작대기", "", "spotlight_20261015_01", "2026-10-15 06:00", "기술", "https://example.com/post"]
                          ]
                        }
                        """, MediaType.APPLICATION_JSON));

        List<TheRilogSheetRow> rows = client.readRows();

        assertThat(rows).containsExactly(new TheRilogSheetRow(
                "spotlight_20261015_01",
                "SPOTLIGHT",
                "https://example.com/post",
                "기술",
                "2026-10-15 06:00",
                "제작대기"
        ));
        tokenServer.verify();
        sheetsServer.verify();
    }

    @Test
    @DisplayName("제작 배치 cron은 하루 한 번 실행되는 시각만 허용한다.")
    void productionCronAllowsOnlyDailyTime() {
        assertThatThrownBy(() -> new TheRilogSheetProperties(
                true,
                "sheet-id",
                "SPOTLIGHTS!A:M",
                "0 */5 * * * *",
                "/tmp/google.json",
                Duration.ofSeconds(1),
                Duration.ofSeconds(1)
        )).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("인증 파일 해석 실패 로그에는 자격증명 원문을 남기지 않는다.")
    void credentialReadFailureDoesNotExposeFileContents() throws Exception {
        Path credentialsPath = tempDirectory.resolve("invalid-service-account.json");
        Files.writeString(credentialsPath, "\"PRIVATE_CREDENTIAL_CONTENT\"");
        GoogleSheetsClient client = new GoogleSheetsClient(RestClient.create(), RestClient.create(),
                properties(credentialsPath), Clock.systemUTC());

        assertThatThrownBy(client::readRows).isInstanceOf(RilogInfrastructureException.class)
                .satisfies(error -> assertThat(new SanitizingStackTracePrinter().printStackTraceToString(error))
                        .doesNotContain("PRIVATE_CREDENTIAL_CONTENT"));
    }

    @Test
    @DisplayName("시트 수집을 활성화하면 기존 HTTP 클라이언트와 구분하여 구글 클라이언트를 구성한다.")
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
                "0 0 18 * * *",
                credentialsPath.toString(),
                Duration.ofSeconds(1),
                Duration.ofSeconds(1)
        );
    }

    private String credentialsJson(PrivateKey privateKey) {
        return """
                {
                  "type": "service_account",
                  "private_key_id": "test-key-id",
                  "private_key": "%s",
                  "client_email": "rilog@example.iam.gserviceaccount.com"
                }
                """.formatted(toPem(privateKey).replace("\n", "\\n"));
    }

    private KeyPair generateKeyPair() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        return generator.generateKeyPair();
    }

    private String toPem(PrivateKey privateKey) {
        String encoded = Base64.getMimeEncoder(64, "\n".getBytes()).encodeToString(privateKey.getEncoded());
        return "-----BEGIN PRIVATE KEY-----\n" + encoded + "\n-----END PRIVATE KEY-----\n";
    }
}
