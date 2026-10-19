package kr.rilog.domain.therilog.infrastructure.sheet;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.RequestMatcher;
import org.springframework.web.client.RestClient;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.ArrayList;
import tools.jackson.databind.json.JsonMapper;
import java.util.stream.Collectors;

import static org.assertj.core.api.SoftAssertions.assertSoftly;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;

class GoogleSheetsTestSupport {

    private final MockRestServiceServer tokenServer;
    private final MockRestServiceServer sheetsServer;
    private final KeyPair keyPair;
    private final GoogleSheetsClient client;

    GoogleSheetsTestSupport(Path directory, String newsRange) throws Exception {
        RestClient.Builder tokenBuilder = RestClient.builder();
        RestClient.Builder sheetsBuilder = RestClient.builder();
        tokenServer = MockRestServiceServer.bindTo(tokenBuilder).build();
        sheetsServer = MockRestServiceServer.bindTo(sheetsBuilder).build();
        keyPair = KeyPairGenerator.getInstance("RSA").generateKeyPair();
        Path credentialsPath = directory.resolve("service-account.json");
        String privateKey = Base64.getEncoder().encodeToString(keyPair.getPrivate().getEncoded());
        Files.writeString(credentialsPath, """
                {
                  "type": "service_account",
                  "private_key_id": "test-key-id",
                  "private_key": "-----BEGIN PRIVATE KEY-----\\n%s\\n-----END PRIVATE KEY-----",
                  "client_email": "rilog@example.iam.gserviceaccount.com"
                }
                """.formatted(privateKey));
        client = new GoogleSheetsClient(tokenBuilder.build(), sheetsBuilder.build(),
                new TheRilogSheetProperties(true, "sheet-id", "SPOTLIGHTS!A:M", newsRange,
                        credentialsPath.toString(), Duration.ofSeconds(1), Duration.ofSeconds(1)),
                Clock.fixed(Instant.parse("2026-10-13T00:00:00Z"), ZoneOffset.UTC));
    }

    GoogleSheetsClient client() {
        return client;
    }

    void expectToken() {
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
                                .isEqualTo("https://www.googleapis.com/auth/spreadsheets");
                        softly.assertThat(assertion.getIssuedAtAsInstant()).isEqualTo(Instant.parse("2026-10-13T00:00:00Z"));
                        softly.assertThat(assertion.getExpiresAtAsInstant()).isEqualTo(Instant.parse("2026-10-13T01:00:00Z"));
                    });
                })
                .andRespond(withSuccess("""
                        {"access_token":"google-access-token","token_type":"Bearer","expires_in":3600}
                        """, MediaType.APPLICATION_JSON));
    }

    void expectRows(String encodedRange, String response) {
        sheetsServer.expect(requestTo("https://sheets.googleapis.com/v4/spreadsheets/sheet-id/values/" + encodedRange))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer google-access-token"))
                .andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
    }

    void expectBatchRows(List<String> ranges, String response) {
        sheetsServer.expect(request -> {
                    var query = org.springframework.web.util.UriComponentsBuilder.fromUri(request.getURI())
                            .build().getQueryParams();
                    assertSoftly(softly -> {
                        softly.assertThat(request.getURI().getPath())
                                .isEqualTo("/v4/spreadsheets/sheet-id/values:batchGet");
                        softly.assertThat(query.get("ranges").stream()
                                .map(value -> URLDecoder.decode(value, StandardCharsets.UTF_8)).toList())
                                .containsExactlyElementsOf(ranges);
                    });
                })
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer google-access-token"))
                .andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
    }

    void expectPublicationRead(String range, String response) {
        expectSelectedRead(range, response, true);
    }

    void expectPublicationResultRead(String range, String response) {
        expectSelectedRead(range, response, false);
    }

    private void expectSelectedRead(String range, String response, boolean includeContent) {
        JsonMapper mapper = JsonMapper.builder().build();
        GoogleSheetValuesResponse full = mapper.readValue(response, GoogleSheetValuesResponse.class);
        List<String> header = full.values().getFirst();
        String tab = range.substring(0, range.lastIndexOf('!') + 1);
        String lastColumn = range.substring(range.indexOf(':') + 1);
        expectRows(tab.replace("!", "%21") + "A1%3A" + lastColumn + "1",
                mapper.writeValueAsString(new GoogleSheetValuesResponse(tab + "A1:" + lastColumn + "1", List.of(header))));
        List<String> metadataRanges = new ArrayList<>();
        List<GoogleSheetValuesResponse> metadata = new ArrayList<>();
        for (String name : List.of("rowId", "status", "postId")) {
            int column = header.indexOf(name);
            String columnName = Character.toString((char) ('A' + column));
            String columnRange = tab + columnName + "2:" + columnName;
            metadataRanges.add(columnRange);
            List<List<String>> cells = full.values().stream().skip(1)
                    .map(row -> List.of(column < row.size() ? row.get(column) : "")).toList();
            metadata.add(new GoogleSheetValuesResponse(columnRange, cells));
        }
        expectBatchRows(metadataRanges, mapper.writeValueAsString(java.util.Map.of("valueRanges", metadata)));
        if (!includeContent) {
            return;
        }
        List<String> selectedRanges = new ArrayList<>();
        List<GoogleSheetValuesResponse> selected = new ArrayList<>();
        for (int index = 1; index < full.values().size(); index++) {
            List<String> row = full.values().get(index);
            int postId = header.indexOf("postId");
            if ("승인완료".equals(row.get(header.indexOf("status"))) && (postId >= row.size() || row.get(postId).isBlank())) {
                String selectedRange = tab + "A" + (index + 1) + ":" + lastColumn + (index + 1);
                selectedRanges.add(selectedRange);
                selected.add(new GoogleSheetValuesResponse(selectedRange, List.of(row)));
            }
        }
        if (!selected.isEmpty()) {
            expectBatchRows(selectedRanges, mapper.writeValueAsString(java.util.Map.of("valueRanges", selected)));
        }
    }

    void expectWrite(RequestMatcher payload) {
        sheetsServer.expect(requestTo("https://sheets.googleapis.com/v4/spreadsheets/sheet-id/values:batchUpdate"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer google-access-token"))
                .andExpect(payload)
                .andRespond(withSuccess("""
                        {"spreadsheetId":"sheet-id","totalUpdatedRows":1,"totalUpdatedColumns":3,"totalUpdatedCells":3}
                        """, MediaType.APPLICATION_JSON));
    }

    void verifyRequests() {
        tokenServer.verify();
        sheetsServer.verify();
    }

    void expectFailedWrite() {
        sheetsServer.expect(requestTo("https://sheets.googleapis.com/v4/spreadsheets/sheet-id/values:batchUpdate"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withServerError());
    }
}
