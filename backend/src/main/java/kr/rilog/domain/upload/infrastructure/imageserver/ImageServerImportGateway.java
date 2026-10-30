package kr.rilog.domain.upload.infrastructure.imageserver;

import kr.rilog.domain.upload.domain.enums.ImagePurpose;
import kr.rilog.domain.upload.exception.ImageImportErrorInformation;
import kr.rilog.domain.upload.exception.UploadException;
import kr.rilog.domain.upload.service.dto.result.ImageImportResult;
import kr.rilog.domain.upload.service.gateway.ImageImportGateway;
import kr.rilog.global.exception.RilogInfrastructureException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.ObjectMapper;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

import static kr.rilog.domain.upload.exception.ImageImportErrorInformation.BUSY;
import static kr.rilog.domain.upload.exception.ImageImportErrorInformation.IMAGE_IMPORT_UNAVAILABLE;
import static kr.rilog.domain.upload.exception.ImageImportErrorInformation.IMAGE_TOO_LARGE;
import static kr.rilog.domain.upload.exception.ImageImportErrorInformation.INVALID_IMAGE;
import static kr.rilog.domain.upload.exception.ImageImportErrorInformation.INVALID_URL;
import static kr.rilog.domain.upload.exception.ImageImportErrorInformation.SOURCE_REJECTED;
import static kr.rilog.domain.upload.exception.ImageImportErrorInformation.SOURCE_TIMEOUT;
import static kr.rilog.domain.upload.exception.ImageImportErrorInformation.SOURCE_UNAVAILABLE;
import static kr.rilog.domain.upload.exception.ImageImportErrorInformation.UNSAFE_HOST;
import static kr.rilog.domain.upload.exception.ImageImportErrorInformation.UNSUPPORTED_ENCODING;

/**
 * 이미지 서버(image-server)에 외부 이미지 가져오기를 맡긴다. 배포 위치와 상관없이 base-url만 바꿔 쓴다.
 *
 * <p>인증한 사용자 ID와 이미지 목적을 본문에 담아 공유 비밀키로 서명하고, 이미지 서버가
 * {@code {root}/{images|profiles}/raw/{userId}-{UUID}/original.webp}에 저장한 결과를 돌려준다.
 */
@Component
public class ImageServerImportGateway implements ImageImportGateway {

    static final String IMPORT_PATH = "/api/images/import";
    static final String TIMESTAMP_HEADER = "X-Rilog-Image-Timestamp";
    static final String SIGNATURE_HEADER = "X-Rilog-Image-Signature";

    // 사용자 요청에서 비롯된 이미지 서버 오류 코드. 서명·저장소·내부 오류는 사용자가 고칠 수 없으므로 넣지 않는다.
    private static final Map<String, ImageImportErrorInformation> CLIENT_ERRORS = Map.of(
            "INVALID_URL", INVALID_URL,
            "UNSAFE_HOST", UNSAFE_HOST,
            "IMAGE_TOO_LARGE", IMAGE_TOO_LARGE,
            "INVALID_IMAGE", INVALID_IMAGE,
            "UNSUPPORTED_ENCODING", UNSUPPORTED_ENCODING,
            "BUSY", BUSY,
            "SOURCE_REJECTED", SOURCE_REJECTED,
            "SOURCE_UNAVAILABLE", SOURCE_UNAVAILABLE,
            "SOURCE_TIMEOUT", SOURCE_TIMEOUT
    );

    private final RestClient restClient;
    private final ImageServerRequestSigner signer;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public ImageServerImportGateway(
            @Qualifier("imageServerRestClient") RestClient restClient,
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
    public ImageImportResult importImage(Long userId, String sourceUrl, ImagePurpose purpose) {
        byte[] body = objectMapper.writeValueAsBytes(new ImportRequest(sourceUrl, userId, purpose.name()));
        long timestamp = clock.instant().getEpochSecond();
        long startedAt = System.nanoTime();
        try {
            ImportResponse response = restClient.post()
                    .uri(IMPORT_PATH)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .header(TIMESTAMP_HEADER, String.valueOf(timestamp))
                    .header(SIGNATURE_HEADER, signer.sign(timestamp, IMPORT_PATH, body))
                    .body(body)
                    .retrieve()
                    .body(ImportResponse.class);

            if (response == null || !StringUtils.hasText(response.key()) || !StringUtils.hasText(response.url())) {
                throw importFailure(startedAt, "INVALID_RESPONSE", null, null);
            }
            return new ImageImportResult(response.key(), response.url());
        } catch (RestClientResponseException exception) {
            throw translate(startedAt, exception);
        } catch (ResourceAccessException exception) {
            throw importFailure(startedAt, "IO_ERROR", null, exception);
        } catch (RestClientException exception) {
            throw importFailure(startedAt, "CLIENT_ERROR", null, exception);
        }
    }

    private RuntimeException translate(long startedAt, RestClientResponseException exception) {
        Optional<ImageImportErrorInformation> clientError = readErrorCode(exception).map(CLIENT_ERRORS::get);
        if (clientError.isEmpty() && exception.getStatusCode().isSameCodeAs(HttpStatus.TOO_MANY_REQUESTS)) {
            // Nginx rate limit의 429는 HTML 본문이라 오류 코드가 없다. 의미는 이미지 서버의 BUSY와 같다.
            clientError = Optional.of(BUSY);
        }
        if (clientError.isPresent()) {
            return new UploadException(clientError.get());
        }
        return importFailure(startedAt, "HTTP_ERROR", exception.getStatusCode().value(), exception);
    }

    private Optional<String> readErrorCode(RestClientResponseException exception) {
        try {
            ErrorResponse response = exception.getResponseBodyAs(ErrorResponse.class);
            if (response == null || response.error() == null) {
                return Optional.empty();
            }
            return Optional.ofNullable(response.error().code());
        } catch (RuntimeException parseFailure) {
            return Optional.empty();
        }
    }

    private RilogInfrastructureException importFailure(
            long startedAt, String failureType, Integer externalStatus, Throwable cause
    ) {
        Map<String, Object> context = new HashMap<>(Map.of(
                "provider", "IMAGE_SERVER",
                "operation", "import_external_image",
                "durationMs", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt),
                "failureType", failureType
        ));
        if (externalStatus != null) {
            context.put("externalStatus", externalStatus);
        }
        return new RilogInfrastructureException(
                IMAGE_IMPORT_UNAVAILABLE, IMAGE_IMPORT_UNAVAILABLE.getMessage(), cause, context
        );
    }

    private record ImportRequest(
            String sourceUrl,
            Long userId,
            String imagePurpose
    ) {
    }

    private record ImportResponse(
            String key,
            String url
    ) {
    }

    private record ErrorResponse(
            ErrorBody error
    ) {
    }

    private record ErrorBody(
            String code,
            String message
    ) {
    }

}
