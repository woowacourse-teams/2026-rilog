package kr.rilog.domain.therilog.infrastructure.sheet;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import kr.rilog.domain.therilog.entity.enums.TheRilogContentType;
import kr.rilog.global.exception.RilogInfrastructureException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static kr.rilog.global.exception.GlobalExceptionInformation.INTERNAL_SERVER_ERROR;

public class GoogleSheetsClient {

    private static final URI GOOGLE_TOKEN_URI = URI.create("https://oauth2.googleapis.com/token");
    private static final String GOOGLE_SHEETS_BASE_URL = "https://sheets.googleapis.com";
    private static final String GRANT_TYPE = "urn:ietf:params:oauth:grant-type:jwt-bearer";
    private static final String SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final RestClient tokenRestClient;
    private final RestClient sheetsRestClient;
    private final TheRilogSheetProperties properties;
    private final Clock clock;

    public GoogleSheetsClient(
            @Qualifier("googleSheetsTokenRestClient") RestClient tokenRestClient,
            @Qualifier("googleSheetsRestClient") RestClient sheetsRestClient,
            TheRilogSheetProperties properties,
            Clock clock
    ) {
        this.tokenRestClient = tokenRestClient;
        this.sheetsRestClient = sheetsRestClient;
        this.properties = properties;
        this.clock = clock;
    }

    public List<TheRilogSheetRow> readRows() {
        long startedAt = System.nanoTime();
        try {
            String accessToken = requestAccessToken(readCredentials());
            GoogleSheetValuesResponse response = sheetsRestClient.get()
                    .uri(GOOGLE_SHEETS_BASE_URL + "/v4/spreadsheets/{spreadsheetId}/values/{range}",
                            properties.spreadsheetId(),
                            properties.sheetRange())
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(GoogleSheetValuesResponse.class);
            return toRows(response);
        } catch (Exception exception) {
            throw readFailure(startedAt, exception);
        }
    }

    private String requestAccessToken(GoogleServiceAccountCredentials credentials) {
        GoogleAccessTokenResponse response = tokenRestClient.post()
                .uri(GOOGLE_TOKEN_URI)
                .accept(MediaType.APPLICATION_JSON)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(tokenRequestForm(credentials))
                .retrieve()
                .body(GoogleAccessTokenResponse.class);
        if (response == null || !StringUtils.hasText(response.accessToken())) {
            throw new RestClientException("Google access token response is empty.");
        }
        return response.accessToken();
    }

    private MultiValueMap<String, String> tokenRequestForm(GoogleServiceAccountCredentials credentials) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", GRANT_TYPE);
        form.add("assertion", createAssertion(credentials));
        return form;
    }

    private String createAssertion(GoogleServiceAccountCredentials credentials) {
        Instant now = Instant.now(clock);
        Algorithm algorithm = Algorithm.RSA256(null, parsePrivateKey(credentials.privateKey()));
        return JWT.create()
                .withKeyId(credentials.privateKeyId())
                .withIssuer(credentials.clientEmail())
                .withAudience(GOOGLE_TOKEN_URI.toString())
                .withClaim("scope", SCOPE)
                .withIssuedAt(now)
                .withExpiresAt(now.plusSeconds(3600))
                .sign(algorithm);
    }

    private GoogleServiceAccountCredentials readCredentials() {
        try {
            return MAPPER.readValue(Files.readString(Path.of(properties.credentialsPath())), GoogleServiceAccountCredentials.class);
        } catch (Exception exception) {
            throw new IllegalStateException("Google 서비스 계정 인증 파일을 읽을 수 없습니다: "
                    + exception.getClass().getSimpleName());
        }
    }

    private RSAPrivateKey parsePrivateKey(String privateKey) {
        try {
            String normalized = privateKey
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s", "");
            byte[] decoded = Base64.getDecoder().decode(normalized);
            return (RSAPrivateKey) KeyFactory.getInstance("RSA")
                    .generatePrivate(new PKCS8EncodedKeySpec(decoded));
        } catch (Exception exception) {
            throw new IllegalArgumentException("Google service account private key is invalid.", exception);
        }
    }

    private List<TheRilogSheetRow> toRows(GoogleSheetValuesResponse response) {
        if (response == null || response.values() == null || response.values().isEmpty()) {
            return List.of();
        }
        List<String> header = response.values().getFirst();
        Map<String, Integer> columns = readColumns(header);
        return response.values()
                .stream()
                .skip(1)
                .map(row -> new TheRilogSheetRow(
                        cell(row, columns, "rowId"),
                        TheRilogContentType.SPOTLIGHT.name(),
                        cell(row, columns, "originalArticleUrl"),
                        cell(row, columns, "category"),
                        cell(row, columns, "scheduledAt"),
                        cell(row, columns, "status")
                ))
                .toList();
    }

    private Map<String, Integer> readColumns(List<String> header) {
        Map<String, Integer> columns = new HashMap<>();
        for (int index = 0; index < header.size(); index++) {
            columns.put(header.get(index), index);
        }
        requireColumn(columns, "rowId");
        requireColumn(columns, "originalArticleUrl");
        requireColumn(columns, "category");
        requireColumn(columns, "scheduledAt");
        requireColumn(columns, "status");
        return columns;
    }

    private void requireColumn(Map<String, Integer> columns, String name) {
        if (!columns.containsKey(name)) {
            throw new IllegalArgumentException("더 리로그 시트 필수 헤더가 없습니다: " + name);
        }
    }

    private String cell(List<String> row, Map<String, Integer> columns, String name) {
        int index = columns.get(name);
        if (index >= row.size()) {
            return "";
        }
        return row.get(index);
    }

    private RilogInfrastructureException readFailure(long startedAt, Throwable cause) {
        Map<String, Object> context = Map.of(
                "operation", "read_the_rilog_sheet",
                "spreadsheetId", properties.spreadsheetId(),
                "durationMs", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt)
        );
        return new RilogInfrastructureException(
                INTERNAL_SERVER_ERROR, "더 리로그 시트를 읽을 수 없습니다.", cause, context
        );
    }
}
