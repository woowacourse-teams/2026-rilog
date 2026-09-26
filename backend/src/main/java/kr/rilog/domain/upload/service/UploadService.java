package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.enums.TagStatus;
import kr.rilog.domain.upload.domain.enums.UploadType;
import kr.rilog.domain.upload.exception.UploadException;
import kr.rilog.domain.upload.service.dto.command.PresignedUrlCreateCommand;
import kr.rilog.domain.upload.service.dto.result.PresignedUrlCreateResult;
import kr.rilog.global.exception.RilogInfrastructureException;
import kr.rilog.global.s3.properties.S3Properties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectTaggingRequest;
import software.amazon.awssdk.services.s3.model.Tag;
import software.amazon.awssdk.services.s3.model.Tagging;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static kr.rilog.domain.upload.domain.enums.TagStatus.CONFIRMED;
import static kr.rilog.domain.upload.domain.enums.TagStatus.TEMPORARY;
import static kr.rilog.domain.upload.exception.UploadErrorInformation.*;
import static kr.rilog.global.exception.GlobalExceptionInformation.INTERNAL_SERVER_ERROR;

@Service
@RequiredArgsConstructor
public class UploadService {

    private static final long MB = 1024 * 1024;
    private static final long IMAGE_MAX_SIZE = 10 * MB;
    private static final long FILE_MAX_SIZE = 20 * MB;

    private static final Set<String> IMAGE_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );

    private static final Map<String, String> FILE_EXTENSIONS = Map.of(
            "application/pdf", "pdf",
            "application/zip", "zip",
            "text/plain", "txt"
    );

    private final S3Presigner s3Presigner;
    private final S3Client s3Client;
    private final S3Properties properties;
    private final S3ImageObjectKeyPolicy imageObjectKeyPolicy;

    public PresignedUrlCreateResult createUploadUrl(Long userId, PresignedUrlCreateCommand command) {
        validate(command);

        UUID uploadId = UUID.randomUUID();
        String extension = resolveExtension(command);
        String objectKey = createObjectKey(
                userId,
                uploadId,
                command.type(),
                extension
        );

        PresignedPutObjectRequest presignedRequest = presignUpload(objectKey, command);

        return new PresignedUrlCreateResult(
                uploadId,
                objectKey,
                presignedRequest.url().toString(),
                presignedRequest.signedHeaders(),
                presignedRequest.expiration()
        );
    }

    public void confirm(String objectKey) {
        validateObjectKey(objectKey);
        updateStatus(objectKey, CONFIRMED);
    }

    public void activateAll(Set<String> objectKeys) {
        objectKeys.forEach(this::confirm);
    }

    public void markTemporary(String objectKey) {
        validateObjectKey(objectKey);
        updateStatus(objectKey, TEMPORARY);
    }

    public void markTemporaryAll(Set<String> objectKeys) {
        objectKeys.forEach(this::markTemporary);
    }

    private PresignedPutObjectRequest presignUpload(String objectKey, PresignedUrlCreateCommand command) {
        long startedAt = System.nanoTime();
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(properties.bucket())
                    .key(objectKey)
                    .contentType(command.contentType())
                    .tagging(createTaggingQuery(TEMPORARY))
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
                "operation", "presign_put_object",
                "durationMs", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt),
                "failureType", failureType
        );
        return new RilogInfrastructureException(INTERNAL_SERVER_ERROR, INTERNAL_SERVER_ERROR.getMessage(), cause, context);
    }

    private void updateStatus(String objectKey, TagStatus value) {
        Tagging tagging = Tagging.builder()
                .tagSet(generateTag("status", value))
                .build();

        PutObjectTaggingRequest request =
                PutObjectTaggingRequest.builder()
                        .bucket(properties.bucket())
                        .key(objectKey)
                        .tagging(tagging)
                        .build();

        s3Client.putObjectTagging(request);
    }

    private static Tag generateTag(String key, TagStatus status) {
        return Tag.builder()
                .key(key)
                .value(status.name())
                .build();
    }

    private String createObjectKey(Long userId, UUID uploadId, UploadType type, String extension) {
        if (type == UploadType.IMAGE) {
            return imageObjectKeyPolicy.create(userId, uploadId, extension);
        }

        return "%s/%s/%s.%s".formatted(
                properties.rootDirectory(),
                type.getDirectory(),
                uploadId,
                extension
        );
    }

    private String createTaggingQuery(TagStatus status) {
        return "status=" + status.name();
    }

    private void validate(PresignedUrlCreateCommand command) {
        switch (command.type()) {
            case IMAGE -> validateImage(command);
            case FILE -> validateFile(command);
        }
    }

    private void validateImage(PresignedUrlCreateCommand command) {
        if (!IMAGE_CONTENT_TYPES.contains(command.contentType())) {
            throw new UploadException(UNSUPPORTED_IMAGE_FORMAT);
        }

        if (command.size() > IMAGE_MAX_SIZE) {
            throw new UploadException(IMAGE_SIZE_EXCEEDED);
        }
    }

    private void validateFile(PresignedUrlCreateCommand command) {
        if (!FILE_EXTENSIONS.containsKey(command.contentType())) {
            throw new UploadException(UNSUPPORTED_FILE_FORMAT);
        }

        if (command.size() > FILE_MAX_SIZE) {
            throw new UploadException(FILE_SIZE_EXCEEDED);
        }
    }

    private String resolveExtension(
            PresignedUrlCreateCommand command
    ) {
        if (command.type() == UploadType.IMAGE) {
            return switch (command.contentType()) {
                case "image/jpeg" -> "jpg";
                case "image/png" -> "png";
                case "image/webp" -> "webp";
                case "image/gif" -> "gif";
                default -> throw new UploadException(UNSUPPORTED_IMAGE_FORMAT);
            };
        }

        String extension =
                FILE_EXTENSIONS.get(command.contentType());

        if (extension == null) {
            throw new UploadException(UNSUPPORTED_FILE_FORMAT);
        }

        return extension;
    }

    private void validateObjectKey(String objectKey) {
        String prefix = properties.rootDirectory() + "/";

        if (!objectKey.startsWith(prefix)) {
            throw new UploadException(INVALID_UPLOAD_TARGET);
        }
    }
}
