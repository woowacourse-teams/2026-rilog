package kr.rilog.domain.upload.infrastructure.imageserver;

import kr.rilog.domain.upload.service.gateway.ImageCompactionGateway;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.ObjectMapper;

import java.net.SocketTimeoutException;
import java.time.Clock;
import java.util.concurrent.TimeUnit;

/**
 * 이미지 서버(image-server)에 사용 확정된 raw 원본의 압축을 요청한다.
 *
 * <p>이미지 서버가 목적별 너비(images: 750, 1200, 1400, 2000 / profiles: 50, 360)의 WebP 압축본을 만든다.
 * 실패 응답은 오류로 기록하고, 응답을 기다리다 끊긴 요청은 이미지 서버에서 끝났을 수 있으므로 경고로만 남긴다.
 * 어느 경우든 다시 시도하지 않는다.
 */
@Slf4j
@Component
public class ImageServerCompactionGateway implements ImageCompactionGateway {

    static final String COMPACT_PATH = "/api/images/compact";

    private static final String COMPACTION_FAILED_EVENT = "image_compaction_failed";
    private static final String COMPACTION_FAILED_LOG_FORMAT =
            "event=image_compaction_failed key={} failureType={}";
    private static final String COMPACTION_RESPONSE_LOST_EVENT = "image_compaction_response_lost";
    private static final String COMPACTION_RESPONSE_LOST_LOG_FORMAT =
            "event=image_compaction_response_lost key={}";

    private final RestClient restClient;
    private final ImageServerRequestSigner signer;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public ImageServerCompactionGateway(
            @Qualifier("imageServerCompactionRestClient") RestClient restClient,
            ImageServerRequestSigner signer,
            ObjectMapper objectMapper,
            Clock clock
    ) {
        this.restClient = restClient;
        this.signer = signer;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Override
    public void compact(String rawObjectKey) {
        byte[] body = objectMapper.writeValueAsBytes(new CompactRequest(rawObjectKey));
        long timestamp = clock.instant().getEpochSecond();
        long startedAt = System.nanoTime();
        try {
            restClient.post()
                    .uri(COMPACT_PATH)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .header(ImageServerImportGateway.TIMESTAMP_HEADER, String.valueOf(timestamp))
                    .header(ImageServerImportGateway.SIGNATURE_HEADER, signer.sign(timestamp, COMPACT_PATH, body))
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException exception) {
            log.atError()
                    .addKeyValue("event", COMPACTION_FAILED_EVENT)
                    .addKeyValue("provider", "IMAGE_SERVER")
                    .addKeyValue("key", rawObjectKey)
                    .addKeyValue("failureType", "HTTP_ERROR")
                    .addKeyValue("externalStatus", exception.getStatusCode().value())
                    .addKeyValue("errorCode", ImageServerImportGateway.readErrorCode(exception).orElse("UNKNOWN"))
                    .addKeyValue("durationMs", elapsedMillis(startedAt))
                    .log(COMPACTION_FAILED_LOG_FORMAT, rawObjectKey, "HTTP_ERROR");
        } catch (ResourceAccessException exception) {
            if (isResponseTimeout(exception)) {
                log.atWarn()
                        .addKeyValue("event", COMPACTION_RESPONSE_LOST_EVENT)
                        .addKeyValue("provider", "IMAGE_SERVER")
                        .addKeyValue("key", rawObjectKey)
                        .addKeyValue("durationMs", elapsedMillis(startedAt))
                        .log(COMPACTION_RESPONSE_LOST_LOG_FORMAT, rawObjectKey);
                return;
            }
            logFailure(rawObjectKey, "IO_ERROR", startedAt, exception);
        } catch (RestClientException exception) {
            logFailure(rawObjectKey, "CLIENT_ERROR", startedAt, exception);
        }
    }

    private void logFailure(String rawObjectKey, String failureType, long startedAt, Exception exception) {
        log.atError()
                .addKeyValue("event", COMPACTION_FAILED_EVENT)
                .addKeyValue("provider", "IMAGE_SERVER")
                .addKeyValue("key", rawObjectKey)
                .addKeyValue("failureType", failureType)
                .addKeyValue("durationMs", elapsedMillis(startedAt))
                .setCause(exception)
                .log(COMPACTION_FAILED_LOG_FORMAT, rawObjectKey, failureType);
    }

    // 요청을 보낸 뒤 응답을 기다리다 끊긴 경우다. 연결 자체가 안 된 경우(Connect timed out)는 실패로 본다.
    private boolean isResponseTimeout(ResourceAccessException exception) {
        return exception.getCause() instanceof SocketTimeoutException timeout
                && (timeout.getMessage() == null || !timeout.getMessage().startsWith("Connect"));
    }

    private long elapsedMillis(long startedAt) {
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);
    }

    private record CompactRequest(
            String objectKey
    ) {
    }

}
