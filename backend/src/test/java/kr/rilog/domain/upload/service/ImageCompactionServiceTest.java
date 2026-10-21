package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.exception.UploadException;
import kr.rilog.domain.upload.service.dto.result.CompactUploadUrlResult;
import kr.rilog.global.exception.GlobalExceptionInformation;
import kr.rilog.global.exception.RilogInfrastructureException;
import kr.rilog.global.s3.properties.S3Properties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ImageCompactionServiceTest {

    private static final String IMAGE_ID = "7-b38e9b2c-4c13-4f52-9c31-0e52d768d517";
    private static final S3Properties PROPERTIES = new S3Properties("bucket", "ap-northeast-2", "rilog", 10);

    @Test
    @DisplayName("본문 이미지 원본이면 750, 1200, 1400, 2000 너비의 업로드 URL을 발급한다")
    void createImageUploadUrls() {
        ImageCompactionService service = service(realPresigner());

        List<CompactUploadUrlResult> results =
                service.createUploadUrls("rilog/images/raw/" + IMAGE_ID + "/original.png");

        assertThat(results).extracting(CompactUploadUrlResult::width)
                .containsExactly(750, 1200, 1400, 2000);
        assertThat(results).extracting(CompactUploadUrlResult::objectKey).containsExactly(
                "rilog/images/compact/" + IMAGE_ID + "/750.webp",
                "rilog/images/compact/" + IMAGE_ID + "/1200.webp",
                "rilog/images/compact/" + IMAGE_ID + "/1400.webp",
                "rilog/images/compact/" + IMAGE_ID + "/2000.webp"
        );
    }

    @Test
    @DisplayName("프로필 원본이면 50, 360 너비의 업로드 URL을 발급한다")
    void createProfileUploadUrls() {
        ImageCompactionService service = service(realPresigner());

        List<CompactUploadUrlResult> results =
                service.createUploadUrls("rilog/profiles/raw/" + IMAGE_ID + "/original.jpg");

        assertThat(results).extracting(CompactUploadUrlResult::width).containsExactly(50, 360);
        assertThat(results).extracting(CompactUploadUrlResult::objectKey).containsExactly(
                "rilog/profiles/compact/" + IMAGE_ID + "/50.webp",
                "rilog/profiles/compact/" + IMAGE_ID + "/360.webp"
        );
    }

    @Test
    @DisplayName("업로드 URL은 webp 형식, 캐시 정책, 덮어쓰기 금지 조건을 서명에 포함한다")
    void signUploadConditions() {
        ImageCompactionService service = service(realPresigner());

        CompactUploadUrlResult result =
                service.createUploadUrls("rilog/images/raw/" + IMAGE_ID + "/original.png").getFirst();

        assertThat(result.uploadUrl())
                .startsWith("https://")
                .contains("rilog/images/compact/" + IMAGE_ID + "/750.webp")
                .contains("X-Amz-Signature=");
        assertThat(result.headers()).containsAllEntriesOf(Map.of(
                "content-type", List.of("image/webp"),
                "cache-control", List.of("public, max-age=31536000, immutable"),
                "if-none-match", List.of("*")
        ));
        assertThat(result.expiresAt()).isNotNull();
    }

    @Test
    @DisplayName("규칙에 맞지 않는 key는 presign 없이 거부한다")
    void rejectInvalidKeyBeforePresign() {
        S3Presigner presigner = mock(S3Presigner.class);
        ImageCompactionService service = service(presigner);

        assertThatThrownBy(() -> service.createUploadUrls("rilog/images/originals/" + IMAGE_ID + ".png"))
                .isInstanceOf(UploadException.class);
        verifyNoInteractions(presigner);
    }

    @Test
    @DisplayName("presign 실패는 진단 정보를 담은 인프라 예외로 바꾼다")
    void presignFailurePreservesContext() {
        S3Presigner presigner = mock(S3Presigner.class);
        SdkClientException cause = SdkClientException.create("credentials unavailable");
        when(presigner.presignPutObject(any(PutObjectPresignRequest.class))).thenThrow(cause);
        ImageCompactionService service = service(presigner);

        assertThatThrownBy(() -> service.createUploadUrls("rilog/images/raw/" + IMAGE_ID + "/original.png"))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasMessage(GlobalExceptionInformation.INTERNAL_SERVER_ERROR.getMessage())
                .hasCause(cause)
                .satisfies(error -> assertThat(((RilogInfrastructureException) error).getLogContext())
                        .containsOnlyKeys("provider", "operation", "failureType", "durationMs")
                        .containsEntry("operation", "presign_compact_put_object")
                        .containsEntry("failureType", "SDK_ERROR"));
    }

    private ImageCompactionService service(S3Presigner presigner) {
        return new ImageCompactionService(presigner, PROPERTIES, new S3CompactObjectKeyPolicy(PROPERTIES));
    }

    // presign은 로컬 서명 계산만 하므로 가짜 자격 증명으로도 네트워크 없이 실제 서명 결과를 확인할 수 있다.
    private S3Presigner realPresigner() {
        return S3Presigner.builder()
                .region(Region.AP_NORTHEAST_2)
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create("test-access-key", "test-secret-key")
                ))
                .build();
    }
}
