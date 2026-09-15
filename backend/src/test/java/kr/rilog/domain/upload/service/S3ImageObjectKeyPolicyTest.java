package kr.rilog.domain.upload.service;

import kr.rilog.global.s3.properties.S3Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class S3ImageObjectKeyPolicyTest {

    private static final String ROOT_DIRECTORY = "rilog/uploads";
    private static final UUID UPLOAD_ID = UUID.fromString("b38e9b2c-4c13-4f52-9c31-0e52d768d517");
    private static final String OWNED_IMAGE_KEY =
            ROOT_DIRECTORY + "/images/originals/7-" + UPLOAD_ID + ".png";

    private S3ImageObjectKeyPolicy policy;

    @BeforeEach
    void setUp() {
        policy = new S3ImageObjectKeyPolicy(
                new S3Properties("bucket", "ap-northeast-2", ROOT_DIRECTORY, 10)
        );
    }

    @Test
    @DisplayName("이미지 객체 키에 사용자 ID와 UUID를 하이픈으로 연결한다.")
    void createOwnedImageObjectKey() {
        String objectKey = policy.create(7L, UPLOAD_ID, "png");

        assertThat(objectKey).isEqualTo(OWNED_IMAGE_KEY);
    }

    @Test
    @DisplayName("객체 키의 사용자 ID와 요청자 ID가 같으면 소유한 이미지이다.")
    void recognizeOwnedImage() {
        assertThat(policy.isOwnedBy(OWNED_IMAGE_KEY, 7L)).isTrue();
    }

    @Test
    @DisplayName("객체 키의 사용자 ID와 요청자 ID가 다르면 소유한 이미지가 아니다.")
    void rejectForeignImage() {
        assertThat(policy.isOwnedBy(OWNED_IMAGE_KEY, 8L)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "rilog/uploads/images/originals/b38e9b2c-4c13-4f52-9c31-0e52d768d517.png",
            "rilog/uploads/images/originals/7-not-a-uuid.png",
            "rilog/uploads/images/originals/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517.exe",
            "rilog/uploads/images/originals/nested/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517.png"
    })
    @DisplayName("소유자 정보를 검증할 수 없는 이미지 키는 소유한 이미지가 아니다.")
    void rejectUnverifiableImageKey(String objectKey) {
        assertThat(policy.isManagedImage(objectKey)).isTrue();
        assertThat(policy.isOwnedBy(objectKey, 7L)).isFalse();
    }

    @Test
    @DisplayName("일반 파일 객체 키는 이미지 소유권 검증 대상이 아니다.")
    void distinguishFileObjectKey() {
        String fileObjectKey = ROOT_DIRECTORY + "/files/" + UPLOAD_ID + ".pdf";

        assertThat(policy.isManagedImage(fileObjectKey)).isFalse();
    }

    @Test
    @DisplayName("사용자 ID 접두어가 겹쳐도 다른 사용자의 이미지로 구분한다.")
    void distinguishOverlappingUserIdPrefix() {
        String userTenImageKey = ROOT_DIRECTORY + "/images/originals/10-" + UPLOAD_ID + ".png";

        assertThat(policy.isOwnedBy(userTenImageKey, 1L)).isFalse();
    }
}
