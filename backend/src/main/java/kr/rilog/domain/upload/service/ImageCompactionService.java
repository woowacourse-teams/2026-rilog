package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.service.S3CompactObjectKeyPolicy.CompactSource;
import kr.rilog.domain.upload.service.dto.result.CompactUploadUrlResult;
import kr.rilog.global.exception.RilogInfrastructureException;
import kr.rilog.global.s3.properties.S3Properties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static kr.rilog.global.exception.GlobalExceptionInformation.INTERNAL_SERVER_ERROR;

/**
 * 이미지 압축 Lambda가 압축본을 올릴 presigned PUT URL을 발급한다.
 *
 * <p>{@code If-None-Match: *}를 서명에 넣어 이미 있는 압축본을 덮어쓰지 못하게 한다. Lambda는 재시도 중 412를
 * 받으면 이미 올라간 것으로 보고 넘어간다. 사용 중인 AWS SDK 버전에는 {@code ifNoneMatch} 빌더가 없어
 * override header로 서명에 포함한다.
 */
@Service
@RequiredArgsConstructor
public class ImageCompactionService {

    private static final String CONTENT_TYPE = "image/webp";
    private static final String CACHE_CONTROL = "public, max-age=31536000, immutable";
    private static final String IF_NONE_MATCH_HEADER = "If-None-Match";
    private static final String IF_NONE_MATCH_ANY = "*";

    private final S3Presigner s3Presigner;
    private final S3Properties properties;
    private final S3CompactObjectKeyPolicy compactObjectKeyPolicy;

    public List<CompactUploadUrlResult> createUploadUrls(String rawObjectKey) {
        CompactSource source = compactObjectKeyPolicy.parse(rawObjectKey);

        return source.target().getWidths().stream()
                .map(width -> createUploadUrl(source, width))
                .toList();
    }

    private CompactUploadUrlResult createUploadUrl(CompactSource source, int width) {
        String objectKey = compactObjectKeyPolicy.compactKey(source, width);
        PresignedPutObjectRequest presignedRequest = presignUpload(objectKey);

        return new CompactUploadUrlResult(
                width,
                objectKey,
                presignedRequest.url().toString(),
                presignedRequest.signedHeaders(),
                presignedRequest.expiration()
        );
    }

    private PresignedPutObjectRequest presignUpload(String objectKey) {
        long startedAt = System.nanoTime();
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(properties.bucket())
                    .key(objectKey)
                    .contentType(CONTENT_TYPE)
                    .cacheControl(CACHE_CONTROL)
                    .overrideConfiguration(override -> override.putHeader(IF_NONE_MATCH_HEADER, IF_NONE_MATCH_ANY))
                    .build();
            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(properties.presignedUrlExpirationMinutes()))
                    .putObjectRequest(putObjectRequest)
                    .build();
            return s3Presigner.presignPutObject(presignRequest);
        } catch (SdkException exception) {
            throw presignFailure(startedAt, "SDK_ERROR", exception);
        } catch (IllegalArgumentException exception) {
            throw presignFailure(startedAt, "INVALID_CONFIGURATION", exception);
        }
    }

    private RilogInfrastructureException presignFailure(
            long startedAt, String failureType, Throwable cause
    ) {
        Map<String, Object> context = Map.of(
                "provider", "S3",
                "operation", "presign_compact_put_object",
                "durationMs", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt),
                "failureType", failureType
        );
        return new RilogInfrastructureException(INTERNAL_SERVER_ERROR, INTERNAL_SERVER_ERROR.getMessage(), cause, context);
    }
}
