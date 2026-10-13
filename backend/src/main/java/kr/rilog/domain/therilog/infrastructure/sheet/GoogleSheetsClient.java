package kr.rilog.domain.therilog.infrastructure.sheet;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import kr.rilog.domain.therilog.entity.enums.TheRilogContentType;
import kr.rilog.domain.therilog.exception.TheRilogSheetException;
import kr.rilog.domain.therilog.service.dto.command.TheRilogSheetWriteCommand;
import kr.rilog.domain.therilog.service.dto.result.TheRilogPublishedArticle;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.EnumMap;
import java.util.concurrent.TimeUnit;

import static kr.rilog.global.exception.GlobalExceptionInformation.INTERNAL_SERVER_ERROR;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.INVALID_THE_RILOG_SHEET_RESULT;

public class GoogleSheetsClient {

    private static final URI GOOGLE_TOKEN_URI = URI.create("https://oauth2.googleapis.com/token");
    private static final String GOOGLE_SHEETS_BASE_URL = "https://sheets.googleapis.com";
    private static final String GRANT_TYPE = "urn:ietf:params:oauth:grant-type:jwt-bearer";
    private static final String SCOPE = "https://www.googleapis.com/auth/spreadsheets";
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
            List<TheRilogSheetRow> rows = new ArrayList<>();
            for (TheRilogContentType type : TheRilogContentType.values()) {
                rows.addAll(readSheet(type, accessToken).readRows());
            }
            return List.copyOf(rows);
        } catch (Exception exception) {
            throw readFailure(startedAt, exception);
        }
    }

    public void writeProductionResult(TheRilogSheetWriteCommand command) {
        long startedAt = System.nanoTime();
        try {
            if (command == null || command.contentType() == null) {
                throw new TheRilogSheetException(INVALID_THE_RILOG_SHEET_RESULT);
            }
            String accessToken = requestAccessToken(readCredentials());
            TheRilogSheet sheet = readSheet(command.contentType(), accessToken);
            GoogleSheetValuesUpdateRequest request = sheet.createWriteRequest(command);
            writeValues(accessToken, request);
        } catch (TheRilogSheetException exception) {
            throw exception;
        } catch (Exception exception) {
            throw writeFailure(startedAt, exception, command);
        }
    }

    public List<TheRilogPublicationRow> readPublicationRows(boolean includeSpotlights) {
        long startedAt = System.nanoTime();
        try {
            String accessToken = requestAccessToken(readCredentials());
            List<TheRilogPublicationRow> rows = new ArrayList<>();
            for (TheRilogContentType type : TheRilogContentType.values()) {
                if (includeSpotlights || type == TheRilogContentType.NEWS) {
                    rows.addAll(readSheet(type, accessToken).readPublicationRows());
                }
            }
            return List.copyOf(rows);
        } catch (Exception exception) {
            throw readFailure(startedAt, exception);
        }
    }

    public void writePublicationResults(List<TheRilogPublishedArticle> articles) {
        if (articles.isEmpty()) {
            return;
        }
        long startedAt = System.nanoTime();
        try {
            String accessToken = requestAccessToken(readCredentials());
            Map<TheRilogContentType, TheRilogSheet> sheets = new EnumMap<>(TheRilogContentType.class);
            List<GoogleSheetValuesUpdateRequest.ValueRange> updates = new ArrayList<>();
            for (TheRilogPublishedArticle article : articles) {
                if (article.contentType() == null || article.postId() == null || article.postId() <= 0) {
                    throw new TheRilogSheetException(INVALID_THE_RILOG_SHEET_RESULT);
                }
                TheRilogSheet sheet = sheets.computeIfAbsent(article.contentType(), type -> readSheet(type, accessToken));
                updates.addAll(sheet.createPublicationUpdates(article));
            }
            writeValues(accessToken, new GoogleSheetValuesUpdateRequest("RAW", updates));
        } catch (TheRilogSheetException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new RilogInfrastructureException(INTERNAL_SERVER_ERROR, INTERNAL_SERVER_ERROR.getMessage(),
                    exception, Map.of("operation", "write_the_rilog_publication", "articles", articles,
                    "durationMs", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt)));
        }
    }

    private void writeValues(String accessToken, GoogleSheetValuesUpdateRequest request) {
        sheetsRestClient.post()
                .uri(GOOGLE_SHEETS_BASE_URL + "/v4/spreadsheets/{spreadsheetId}/values:batchUpdate", properties.spreadsheetId())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .toBodilessEntity();
    }

    private TheRilogSheet readSheet(TheRilogContentType type, String accessToken) {
        String range = properties.rangeFor(type);
        GoogleSheetValuesResponse response = sheetsRestClient.get()
                .uri(GOOGLE_SHEETS_BASE_URL + "/v4/spreadsheets/{spreadsheetId}/values/{range}",
                        properties.spreadsheetId(), range)
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .body(GoogleSheetValuesResponse.class);
        return new TheRilogSheet(type, range, response);
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

    private RilogInfrastructureException writeFailure(long startedAt, Throwable cause,
                                                      TheRilogSheetWriteCommand command) {
        Map<String, Object> context = Map.of(
                "operation", "write_the_rilog_sheet",
                "spreadsheetId", properties.spreadsheetId(),
                "rowId", command.rowId() == null ? "" : command.rowId(),
                "contentType", command.contentType().name(),
                "durationMs", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt)
        );
        return new RilogInfrastructureException(INTERNAL_SERVER_ERROR, INTERNAL_SERVER_ERROR.getMessage(), cause, context);
    }
}
