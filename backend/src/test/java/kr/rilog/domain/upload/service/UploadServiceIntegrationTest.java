package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.ImageAsset;
import kr.rilog.domain.upload.domain.enums.ImageAssetStatus;
import kr.rilog.domain.upload.domain.enums.UploadType;
import kr.rilog.domain.upload.repository.ImageAssetRepository;
import kr.rilog.domain.upload.service.dto.command.PresignedUrlCreateCommand;
import kr.rilog.domain.upload.service.dto.result.PresignedUrlCreateResult;
import kr.rilog.global.exception.RilogInfrastructureException;
import kr.rilog.support.ServiceSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.MalformedURLException;
import java.net.URI;
import java.time.Clock;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UploadServiceIntegrationTest extends ServiceSupport {

    private static final Long USER_ID = 7L;

    @Autowired
    private UploadService uploadService;

    @Autowired
    private ImageAssetRepository imageAssetRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private Clock clock;

    @MockitoBean
    private S3Presigner s3Presigner;

    @Test
    @DisplayName("이미지 업로드 URL을 발급하면 요청자와 반환한 객체 키로 이미지 자산을 저장한다.")
    void registersImageAsset() throws MalformedURLException {
        stubPresignedUrl();

        PresignedUrlCreateResult result = uploadService.createUploadUrl(USER_ID, imageCommand());

        ImageAsset asset = imageAssetRepository.findAll().getFirst();
        assertThat(asset.getObjectKey()).isEqualTo(result.objectKey());
        assertThat(asset.getUploaderId()).isEqualTo(USER_ID);
    }

    @Test
    @DisplayName("새 이미지 자산은 활성 상태이며 미참조 시각부터 정리 유예 기간이 시작된다.")
    void registersActiveUnreferencedAsset() throws MalformedURLException {
        stubPresignedUrl();
        LocalDateTime before = LocalDateTime.now(clock);

        uploadService.createUploadUrl(USER_ID, imageCommand());

        ImageAsset asset = imageAssetRepository.findAll().getFirst();
        assertThat(asset.getStatus()).isEqualTo(ImageAssetStatus.ACTIVE);
        assertThat(asset.getUnreferencedAt()).isBetween(before.minusSeconds(1), LocalDateTime.now(clock).plusSeconds(1));
    }

    @Test
    @DisplayName("일반 파일 업로드 URL을 발급해도 이미지 자산은 생성되지 않는다.")
    void fileUploadDoesNotRegisterImageAsset() throws MalformedURLException {
        stubPresignedUrl();

        uploadService.createUploadUrl(USER_ID, new PresignedUrlCreateCommand("file.pdf", "application/pdf", 100, UploadType.FILE));

        assertThat(imageAssetRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("이미지 Presign이 실패하면 이미지 자산을 저장하지 않는다.")
    void presignFailureDoesNotRegisterImageAsset() {
        when(s3Presigner.presignPutObject(any(PutObjectPresignRequest.class)))
                .thenThrow(SdkClientException.create("presign failed"));

        assertThatThrownBy(() -> uploadService.createUploadUrl(USER_ID, imageCommand()))
                .isInstanceOf(RilogInfrastructureException.class);

        assertThat(imageAssetRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("상위 트랜잭션이 롤백되면 발급한 이미지 자산도 저장되지 않는다.")
    void rollbackRemovesRegisteredAsset() throws MalformedURLException {
        stubPresignedUrl();

        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            uploadService.createUploadUrl(USER_ID, imageCommand());
            status.setRollbackOnly();
        });

        assertThat(imageAssetRepository.findAll()).isEmpty();
    }

    private PresignedUrlCreateCommand imageCommand() {
        return new PresignedUrlCreateCommand("image.png", "image/png", 100, UploadType.IMAGE);
    }

    private void stubPresignedUrl() throws MalformedURLException {
        PresignedPutObjectRequest request = mock(PresignedPutObjectRequest.class);
        when(request.url()).thenReturn(URI.create("https://example.com/upload").toURL());
        when(s3Presigner.presignPutObject(any(PutObjectPresignRequest.class))).thenReturn(request);
    }
}
