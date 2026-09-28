package kr.rilog.domain.upload.service;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import kr.rilog.domain.upload.domain.enums.UploadType;
import kr.rilog.domain.upload.exception.UploadErrorInformation;
import kr.rilog.domain.upload.exception.UploadException;
import kr.rilog.domain.upload.service.dto.command.PresignedUrlCreateCommand;
import kr.rilog.domain.upload.service.dto.result.PresignedUrlCreateResult;
import kr.rilog.global.s3.properties.S3Properties;
import kr.rilog.global.exception.GlobalExceptionInformation;
import kr.rilog.global.exception.RilogInfrastructureException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UploadServiceTest {

    private static final Long USER_ID = 7L;
    private static final String OBJECT_KEY =
            "rilog/uploads/images/originals/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517.png";

    @Mock
    private S3Presigner s3Presigner;

    @Mock
    private S3Client s3Client;

    @Mock
    private S3ImageObjectKeyPolicy imageObjectKeyPolicy;

    @Mock
    private PresignedPutObjectRequest presignedRequest;

    private Logger logger;
    private Level previousLevel;
    private ListAppender<ILoggingEvent> appender;

    @BeforeEach
    void captureLogs() {
        logger = (Logger) LoggerFactory.getLogger(UploadService.class);
        previousLevel = logger.getLevel();
        logger.setLevel(Level.DEBUG);
        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void stopLogCapture() {
        logger.setLevel(previousLevel);
        logger.detachAppender(appender);
        appender.stop();
    }

    @ParameterizedTest
    @MethodSource("presignFailures")
    @DisplayName("Presign 실패는 네 가지 진단 필드만 보존하고 서비스에서 중복 로그를 남기지 않는다.")
    void presignFailurePreservesContext(String failureType, RuntimeException cause) {
        var properties = new S3Properties("bucket", "ap-northeast-2", "rilog/uploads", 10);
        var service = new UploadService(s3Presigner, s3Client, properties, imageObjectKeyPolicy);
        var command = new PresignedUrlCreateCommand("TEST_PRIVATE_FILENAME.png", "image/png", 1024, UploadType.IMAGE);
        when(imageObjectKeyPolicy.create(eq(USER_ID), any(UUID.class), eq("png"))).thenReturn(OBJECT_KEY);
        when(s3Presigner.presignPutObject(any(PutObjectPresignRequest.class))).thenThrow(cause);

        assertThatThrownBy(() -> service.createUploadUrl(USER_ID, command))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasMessage(GlobalExceptionInformation.INTERNAL_SERVER_ERROR.getMessage())
                .hasCause(cause)
                .satisfies(error -> {
                    var failure = (RilogInfrastructureException) error;
                    assertThat(failure.getLogContext()).containsOnlyKeys(
                            "provider", "operation", "failureType", "durationMs"
                    ).containsAllEntriesOf(Map.of(
                            "provider", "S3", "operation", "presign_put_object", "failureType", failureType
                    ));
                    assertThat((Long) failure.getLogContext().get("durationMs")).isGreaterThanOrEqualTo(0L);
                    assertThat(failure.getLogContext().toString()).doesNotContain("TEST_PRIVATE_FILENAME");
                });
        assertThat(appender.list).isEmpty();
    }

    @Test
    @DisplayName("버킷 설정이 누락된 발급 실패도 원인 예외를 보존한다.")
    void missingBucketDoesNotHidePresignFailure() {
        var cause = SdkClientException.create("bucket unavailable");
        var service = new UploadService(s3Presigner, s3Client,
                new S3Properties(null, "ap-northeast-2", "rilog/uploads", 10), imageObjectKeyPolicy);
        when(s3Presigner.presignPutObject(any(PutObjectPresignRequest.class))).thenThrow(cause);

        assertThatThrownBy(() -> service.createUploadUrl(USER_ID,
                new PresignedUrlCreateCommand("file.pdf", "application/pdf", 1024, UploadType.FILE)))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasMessage(GlobalExceptionInformation.INTERNAL_SERVER_ERROR.getMessage())
                .hasCause(cause)
                .satisfies(error -> assertThat(((RilogInfrastructureException) error).getLogContext())
                        .doesNotContainKey("bucket"));
    }

    private static Stream<Arguments> presignFailures() {
        return Stream.of(
                Arguments.of("SDK_ERROR", SdkClientException.create("credentials unavailable")),
                Arguments.of("INVALID_CONFIGURATION", new IllegalArgumentException("invalid signature duration"))
        );
    }

    @ParameterizedTest
    @CsvSource({
            "IMAGE,image/bmp,1024,UNSUPPORTED_IMAGE_FORMAT",
            "IMAGE,image/png,10485761,IMAGE_SIZE_EXCEEDED",
            "FILE,application/octet-stream,1024,UNSUPPORTED_FILE_FORMAT",
            "FILE,application/pdf,20971521,FILE_SIZE_EXCEEDED"
    })
    @DisplayName("업로드 입력 검증 실패는 presign 장애로 분류하거나 로그를 남기지 않는다.")
    void validationFailureDoesNotBecomePresignFailure(
            UploadType type, String contentType, long size, UploadErrorInformation error
    ) {
        var service = new UploadService(s3Presigner, s3Client,
                new S3Properties("bucket", "ap-northeast-2", "rilog/uploads", 10), imageObjectKeyPolicy);
        var command = new PresignedUrlCreateCommand("file", contentType, size, type);

        assertThatThrownBy(() -> service.createUploadUrl(USER_ID, command))
                .isInstanceOf(UploadException.class).hasMessage(error.getMessage());
        assertThat(appender.list).isEmpty();
        verifyNoInteractions(s3Presigner);
    }

    @Test
    @DisplayName("이미지 업로드 URL을 발급할 때 사용자 소유 객체 키를 사용한다.")
    void createImageUploadUrlWithOwnedObjectKey() throws Exception {
        S3Properties properties = new S3Properties(
                "bucket",
                "ap-northeast-2",
                "rilog/uploads",
                10
        );
        UploadService uploadService = new UploadService(
                s3Presigner,
                s3Client,
                properties,
                imageObjectKeyPolicy
        );
        PresignedUrlCreateCommand command = new PresignedUrlCreateCommand(
                "image.png",
                "image/png",
                1024,
                UploadType.IMAGE
        );
        when(imageObjectKeyPolicy.create(eq(USER_ID), any(UUID.class), eq("png")))
                .thenReturn(OBJECT_KEY);
        when(s3Presigner.presignPutObject(any(PutObjectPresignRequest.class)))
                .thenReturn(presignedRequest);
        when(presignedRequest.url()).thenReturn(URI.create("https://example.com/upload").toURL());
        when(presignedRequest.signedHeaders()).thenReturn(Map.of("content-type", List.of("image/png")));
        when(presignedRequest.expiration()).thenReturn(Instant.parse("2026-09-15T00:00:00Z"));

        PresignedUrlCreateResult result = uploadService.createUploadUrl(USER_ID, command);

        ArgumentCaptor<UUID> uploadIdCaptor = ArgumentCaptor.forClass(UUID.class);
        verify(imageObjectKeyPolicy).create(eq(USER_ID), uploadIdCaptor.capture(), eq("png"));
        ArgumentCaptor<PutObjectPresignRequest> presignRequestCaptor =
                ArgumentCaptor.forClass(PutObjectPresignRequest.class);
        verify(s3Presigner).presignPutObject(presignRequestCaptor.capture());
        assertThat(result.uploadId()).isEqualTo(uploadIdCaptor.getValue());
        assertThat(result.objectKey()).isEqualTo(OBJECT_KEY);
        assertThat(presignRequestCaptor.getValue().putObjectRequest().key()).isEqualTo(OBJECT_KEY);
        assertThat(appender.list).isEmpty();
    }
}
