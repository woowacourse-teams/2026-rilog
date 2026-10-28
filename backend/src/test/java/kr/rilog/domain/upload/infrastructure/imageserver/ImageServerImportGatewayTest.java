package kr.rilog.domain.upload.infrastructure.imageserver;

import kr.rilog.domain.upload.domain.enums.ImagePurpose;
import kr.rilog.domain.upload.exception.ImageImportErrorInformation;
import kr.rilog.domain.upload.exception.UploadException;
import kr.rilog.domain.upload.service.dto.result.ImageImportResult;
import kr.rilog.global.exception.RilogInfrastructureException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ImageServerImportGatewayTest {

    private static final String BASE_URL = "https://image.example.com";
    private static final String SECRET = "test-image-server-secret-at-least-32-chars";
    private static final Instant NOW = Instant.ofEpochSecond(1761696000L);
    private static final String SOURCE_URL = "https://example.com/a.png";
    private static final String OBJECT_KEY = "rilog/images/raw/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.webp";

    private final ImageServerRequestSigner signer = new ImageServerRequestSigner(new ImageServerProperties(
            URI.create(BASE_URL), SECRET, Duration.ofSeconds(1), Duration.ofSeconds(1)
    ));
    private final RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final ImageServerImportGateway gateway = new ImageServerImportGateway(
            builder.build(), signer, JsonMapper.builder().build(), Clock.fixed(NOW, ZoneOffset.UTC)
    );

    @Test
    @DisplayName("사용자 ID와 목적을 서명한 본문으로 이미지 서버에 전달하고 저장 결과를 그대로 반환한다")
    void importImage() {
        String body = "{\"sourceUrl\":\"" + SOURCE_URL + "\",\"userId\":7,\"imagePurpose\":\"CONTENT\"}";
        server.expect(requestTo(BASE_URL + "/api/images/import"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().string(body))
                .andExpect(header("X-Rilog-Image-Timestamp", "1761696000"))
                .andExpect(header("X-Rilog-Image-Signature",
                        signer.sign(1761696000L, "/api/images/import", body.getBytes(StandardCharsets.UTF_8))))
                .andRespond(withStatus(HttpStatus.CREATED).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"key\":\"" + OBJECT_KEY + "\",\"url\":\"https://cdn.example.com/" + OBJECT_KEY + "\"}"));

        ImageImportResult result = gateway.importImage(7L, SOURCE_URL, ImagePurpose.CONTENT);

        assertThat(result.objectKey()).isEqualTo(OBJECT_KEY);
        assertThat(result.url()).isEqualTo("https://cdn.example.com/" + OBJECT_KEY);
        server.verify();
    }

    @ParameterizedTest
    @MethodSource("clientErrors")
    @DisplayName("사용자 요청에서 비롯된 이미지 서버 오류는 같은 상태와 코드로 전달한다")
    void forwardsClientErrors(HttpStatus status, ImageImportErrorInformation expected) {
        respondError(status, expected.name());

        assertThatThrownBy(() -> gateway.importImage(7L, SOURCE_URL, ImagePurpose.PROFILE))
                .isInstanceOf(UploadException.class)
                .satisfies(error -> {
                    var information = ((UploadException) error).getErrorInformation();
                    assertThat(information).isEqualTo(expected);
                    assertThat(information.getHttpStatus()).isEqualTo(status);
                });
    }

    static Stream<Arguments> clientErrors() {
        return Stream.of(
                Arguments.of(HttpStatus.BAD_REQUEST, ImageImportErrorInformation.INVALID_URL),
                Arguments.of(HttpStatus.BAD_REQUEST, ImageImportErrorInformation.UNSAFE_HOST),
                Arguments.of(HttpStatus.CONTENT_TOO_LARGE, ImageImportErrorInformation.IMAGE_TOO_LARGE),
                Arguments.of(HttpStatus.UNPROCESSABLE_CONTENT, ImageImportErrorInformation.INVALID_IMAGE),
                Arguments.of(HttpStatus.TOO_MANY_REQUESTS, ImageImportErrorInformation.BUSY),
                Arguments.of(HttpStatus.BAD_GATEWAY, ImageImportErrorInformation.SOURCE_REJECTED),
                Arguments.of(HttpStatus.GATEWAY_TIMEOUT, ImageImportErrorInformation.SOURCE_TIMEOUT)
        );
    }

    @ParameterizedTest
    @MethodSource("serverErrors")
    @DisplayName("서명·저장소·내부 오류와 알 수 없는 응답은 이미지 서버 장애(502)로 감싼다")
    void wrapsServerErrors(HttpStatus status, String responseBody) {
        server.expect(requestTo(BASE_URL + "/api/images/import"))
                .andRespond(withStatus(status).contentType(MediaType.APPLICATION_JSON).body(responseBody));

        assertImageServerUnavailable("HTTP_ERROR");
    }

    static Stream<Arguments> serverErrors() {
        return Stream.of(
                Arguments.of(HttpStatus.UNAUTHORIZED, errorBody("INVALID_SIGNATURE")),
                Arguments.of(HttpStatus.BAD_REQUEST, errorBody("INVALID_REQUEST")),
                Arguments.of(HttpStatus.BAD_GATEWAY, errorBody("STORAGE_UNAVAILABLE")),
                Arguments.of(HttpStatus.INTERNAL_SERVER_ERROR, errorBody("INTERNAL_ERROR")),
                Arguments.of(HttpStatus.BAD_GATEWAY, "<html>nginx</html>"),
                Arguments.of(HttpStatus.BAD_REQUEST, errorBody("IMAGE_IMPORT_UNAVAILABLE"))
        );
    }

    @Test
    @DisplayName("이미지 서버에 연결하지 못하면 이미지 서버 장애(502)로 감싼다")
    void wrapsConnectionFailure() {
        server.expect(requestTo(BASE_URL + "/api/images/import"))
                .andRespond(withException(new IOException("connection refused")));

        assertImageServerUnavailable("IO_ERROR");
    }

    @Test
    @DisplayName("성공 응답에 key나 url이 없으면 이미지 서버 장애(502)로 감싼다")
    void rejectsIncompleteResponse() {
        server.expect(requestTo(BASE_URL + "/api/images/import"))
                .andRespond(withSuccess("{\"key\":\"" + OBJECT_KEY + "\"}", MediaType.APPLICATION_JSON));

        assertImageServerUnavailable("INVALID_RESPONSE");
    }

    private void respondError(HttpStatus status, String code) {
        server.expect(requestTo(BASE_URL + "/api/images/import"))
                .andRespond(withStatus(status).contentType(MediaType.APPLICATION_JSON).body(errorBody(code)));
    }

    private void assertImageServerUnavailable(String failureType) {
        assertThatThrownBy(() -> gateway.importImage(7L, SOURCE_URL, ImagePurpose.CONTENT))
                .isInstanceOf(RilogInfrastructureException.class)
                .satisfies(error -> {
                    var failure = (RilogInfrastructureException) error;
                    assertThat(failure.getErrorInformation()).isEqualTo(ImageImportErrorInformation.IMAGE_IMPORT_UNAVAILABLE);
                    assertThat(failure.getErrorInformation().getHttpStatus()).isEqualTo(HttpStatus.BAD_GATEWAY);
                    assertThat(failure.getLogContext()).containsEntry("provider", "IMAGE_SERVER")
                            .containsEntry("operation", "import_external_image")
                            .containsEntry("failureType", failureType);
                });
    }

    private static String errorBody(String code) {
        return "{\"error\":{\"code\":\"" + code + "\",\"message\":\"test\"}}";
    }
}
