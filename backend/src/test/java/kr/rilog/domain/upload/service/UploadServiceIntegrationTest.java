package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.enums.ImagePurpose;
import kr.rilog.domain.upload.domain.enums.UploadType;
import kr.rilog.domain.upload.service.dto.command.PresignedUrlCreateCommand;
import kr.rilog.domain.upload.service.dto.result.PresignedUrlCreateResult;
import kr.rilog.global.s3.properties.S3Properties;
import kr.rilog.support.ServiceSupport;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.DisplayName;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URI;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UploadServiceIntegrationTest extends ServiceSupport {

    private static final Long USER_ID = 7L;

    @Autowired
    private UploadService uploadService;

    @Autowired
    private S3ImageObjectKeyPolicy imageObjectKeyPolicy;

    @Autowired
    private S3Properties properties;

    @MockitoBean
    private S3Presigner s3Presigner;

    @ParameterizedTest
    @CsvSource(value = {
            "PROFILE,profiles",
            "CONTENT,images",
            "null,images"
    }, nullValues = "null")
    @DisplayName("이미지 목적별 raw 경로로 TEMPORARY 업로드를 서명하고, 발급한 키는 업로더 소유로 판별된다.")
    void signsPurposeRawObjectOwnedByUploader(ImagePurpose purpose, String directory) throws Exception {
        PresignedPutObjectRequest presigned = mock(PresignedPutObjectRequest.class);
        when(presigned.url()).thenReturn(URI.create("https://example.com/upload").toURL());
        when(s3Presigner.presignPutObject(any(PutObjectPresignRequest.class))).thenReturn(presigned);

        PresignedUrlCreateResult result = uploadService.createUploadUrl(USER_ID,
                new PresignedUrlCreateCommand("image.png", "image/png", 100, UploadType.IMAGE, purpose));

        ArgumentCaptor<PutObjectPresignRequest> captor = ArgumentCaptor.forClass(PutObjectPresignRequest.class);
        verify(s3Presigner).presignPutObject(captor.capture());
        PutObjectRequest putObjectRequest = captor.getValue().putObjectRequest();
        assertThat(result.objectKey()).isEqualTo("%s/%s/raw/%d-%s/original.png".formatted(
                properties.rootDirectory(), directory, USER_ID, result.uploadId()));
        assertThat(putObjectRequest.key()).isEqualTo(result.objectKey());
        assertThat(putObjectRequest.tagging()).isEqualTo("status=TEMPORARY");
        assertThat(imageObjectKeyPolicy.isOwnedBy(result.objectKey(), USER_ID)).isTrue();
        assertThat(imageObjectKeyPolicy.isOwnedBy(result.objectKey(), USER_ID + 1)).isFalse();
    }
}
