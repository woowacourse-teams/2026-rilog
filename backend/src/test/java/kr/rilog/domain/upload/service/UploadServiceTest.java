package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.enums.UploadType;
import kr.rilog.domain.upload.service.dto.command.PresignedUrlCreateCommand;
import kr.rilog.domain.upload.service.dto.result.PresignedUrlCreateResult;
import kr.rilog.global.s3.properties.S3Properties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
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
    }
}
