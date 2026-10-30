package kr.rilog.domain.upload.infrastructure.imageserver;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;

import static java.util.stream.Collectors.toMap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ImageServerCompactionGatewayTest {

    private static final String BASE_URL = "https://image.example.com";
    private static final String SECRET = "test-image-server-secret-at-least-32-chars";
    private static final Instant NOW = Instant.ofEpochSecond(1761696000L);
    private static final String RAW_KEY = "rilog/images/raw/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.png";

    private final ImageServerRequestSigner signer = new ImageServerRequestSigner(new ImageServerProperties(
            URI.create(BASE_URL), SECRET, Duration.ofSeconds(1), Duration.ofSeconds(1), Duration.ofSeconds(1)
    ));
    private final RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final ImageServerCompactionGateway gateway = new ImageServerCompactionGateway(
            builder.build(), signer, JsonMapper.builder().build(), Clock.fixed(NOW, ZoneOffset.UTC)
    );

    private Logger logger;
    private ListAppender<ILoggingEvent> appender;

    @BeforeEach
    void startLogCapture() {
        logger = (Logger) LoggerFactory.getLogger(ImageServerCompactionGateway.class);
        appender = new ListAppender<>() {
            @Override
            protected void append(ILoggingEvent event) {
                event.prepareForDeferredProcessing();
                super.append(event);
            }
        };
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void stopLogCapture() {
        logger.detachAppender(appender);
        appender.stop();
    }

    @Test
    @DisplayName("원본 key를 서명한 본문으로 이미지 서버 압축 API에 보낸다")
    void requestCompaction() {
        String body = "{\"objectKey\":\"" + RAW_KEY + "\"}";
        server.expect(requestTo(BASE_URL + "/api/images/compact"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().string(body))
                .andExpect(header("X-Rilog-Image-Timestamp", "1761696000"))
                .andExpect(header("X-Rilog-Image-Signature",
                        signer.sign(1761696000L, "/api/images/compact", body.getBytes(StandardCharsets.UTF_8))))
                .andRespond(withSuccess("{\"keys\":[]}", MediaType.APPLICATION_JSON));

        gateway.compact(RAW_KEY);

        server.verify();
        assertThat(appender.list).isEmpty();
    }

    @Test
    @DisplayName("실패 응답은 예외 없이 상태와 오류 코드를 ERROR로 기록한다")
    void logFailureResponse() {
        server.expect(requestTo(BASE_URL + "/api/images/compact"))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"code\":\"INVALID_IMAGE\",\"message\":\"test\"}}"));

        assertThatCode(() -> gateway.compact(RAW_KEY)).doesNotThrowAnyException();

        ILoggingEvent event = onlyEvent();
        assertThat(event.getLevel()).isEqualTo(Level.ERROR);
        assertThat(logFields(event))
                .containsEntry("event", "image_compaction_failed")
                .containsEntry("key", RAW_KEY)
                .containsEntry("failureType", "HTTP_ERROR")
                .containsEntry("externalStatus", "422")
                .containsEntry("errorCode", "INVALID_IMAGE");
    }

    @Test
    @DisplayName("이미지 서버에 연결하지 못하면 예외 없이 ERROR로 기록한다")
    void logConnectionFailure() {
        server.expect(requestTo(BASE_URL + "/api/images/compact"))
                .andRespond(withException(new IOException("connection refused")));

        assertThatCode(() -> gateway.compact(RAW_KEY)).doesNotThrowAnyException();

        ILoggingEvent event = onlyEvent();
        assertThat(event.getLevel()).isEqualTo(Level.ERROR);
        assertThat(logFields(event)).containsEntry("failureType", "IO_ERROR");
    }

    @Test
    @DisplayName("응답을 기다리다 끊긴 요청은 다시 보내지 않고 WARN으로만 기록한다")
    void ignoreLostResponse() {
        server.expect(requestTo(BASE_URL + "/api/images/compact"))
                .andRespond(withException(new SocketTimeoutException("Read timed out")));

        assertThatCode(() -> gateway.compact(RAW_KEY)).doesNotThrowAnyException();

        server.verify();
        ILoggingEvent event = onlyEvent();
        assertThat(event.getLevel()).isEqualTo(Level.WARN);
        assertThat(logFields(event)).containsEntry("event", "image_compaction_response_lost");
    }

    private ILoggingEvent onlyEvent() {
        assertThat(appender.list).hasSize(1);
        return appender.list.getFirst();
    }

    private static Map<String, String> logFields(ILoggingEvent event) {
        return event.getKeyValuePairs()
                .stream()
                .collect(toMap(pair -> pair.key, pair -> String.valueOf(pair.value)));
    }
}
