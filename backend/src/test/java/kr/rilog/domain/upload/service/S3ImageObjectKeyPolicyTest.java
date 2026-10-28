package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.enums.ImagePurpose;
import kr.rilog.global.s3.properties.S3Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class S3ImageObjectKeyPolicyTest {

    private static final String ROOT_DIRECTORY = "rilog/uploads";
    private static final String UPLOAD_ID_VALUE = "b38e9b2c-4c13-4f52-9c31-0e52d768d517";
    private static final UUID UPLOAD_ID = UUID.fromString(UPLOAD_ID_VALUE);
    private static final String CONTENT_IMAGE_KEY =
            ROOT_DIRECTORY + "/images/raw/7-" + UPLOAD_ID_VALUE + "/original.png";
    private static final String PROFILE_IMAGE_KEY =
            ROOT_DIRECTORY + "/profiles/raw/7-" + UPLOAD_ID_VALUE + "/original.png";

    private S3ImageObjectKeyPolicy policy;

    @BeforeEach
    void setUp() {
        policy = new S3ImageObjectKeyPolicy(
                new S3Properties("bucket", "ap-northeast-2", ROOT_DIRECTORY, 10)
        );
    }

    @Test
    @DisplayName("일반 이미지 원본 키는 images/raw의 사용자 ID-UUID 디렉터리에 둔다.")
    void createContentImageObjectKey() {
        String objectKey = policy.create(7L, UPLOAD_ID, ImagePurpose.CONTENT, "png");

        assertThat(objectKey).isEqualTo(CONTENT_IMAGE_KEY);
    }

    @Test
    @DisplayName("프로필 이미지 원본 키는 profiles/raw의 사용자 ID-UUID 디렉터리에 둔다.")
    void createProfileImageObjectKey() {
        String objectKey = policy.create(7L, UPLOAD_ID, ImagePurpose.PROFILE, "png");

        assertThat(objectKey).isEqualTo(PROFILE_IMAGE_KEY);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            CONTENT_IMAGE_KEY,
            PROFILE_IMAGE_KEY,
            ROOT_DIRECTORY + "/images/compact/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/750.webp",
            ROOT_DIRECTORY + "/profiles/compact/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/50.webp",
            ROOT_DIRECTORY + "/images/originals/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517.png"
    })
    @DisplayName("raw 원본, compact 압축본, 기존 originals 원본은 키의 사용자 ID로 소유자를 판별한다.")
    void recognizeOwnedImage(String objectKey) {
        assertThat(policy.isManagedImage(objectKey)).isTrue();
        assertThat(policy.isOwnedBy(objectKey, 7L)).isTrue();
        assertThat(policy.isOwnedBy(objectKey, 8L)).isFalse();
    }

    @ParameterizedTest
    @CsvSource({
            "CONTENT,avif",
            "CONTENT,svg",
            "PROFILE,heic",
            "PROFILE,gif"
    })
    @DisplayName("추가 지원 이미지 확장자도 소유자를 검증한다.")
    void recognizeOwnedImageWithSupportedExtension(ImagePurpose purpose, String extension) {
        String objectKey = policy.create(7L, UPLOAD_ID, purpose, extension);

        assertThat(policy.isOwnedBy(objectKey, 7L)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "rilog/uploads/images/originals/b38e9b2c-4c13-4f52-9c31-0e52d768d517.png",
            "rilog/uploads/images/originals/7-not-a-uuid.png",
            "rilog/uploads/images/originals/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517.exe",
            "rilog/uploads/images/originals/nested/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517.png",
            "rilog/uploads/images/raw/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517.png",
            "rilog/uploads/images/raw/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/other.png",
            "rilog/uploads/images/raw/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.exe",
            "rilog/uploads/profiles/raw/7-not-a-uuid/original.png",
            "rilog/uploads/profiles/raw/b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.png",
            "rilog/uploads/images/compact/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/750.png",
            "rilog/uploads/profiles/compact/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.webp",
            "rilog/uploads/profiles/compact/nested/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/50.webp"
    })
    @DisplayName("소유자 정보를 검증할 수 없는 이미지 키는 소유한 이미지가 아니다.")
    void rejectUnverifiableImageKey(String objectKey) {
        assertThat(policy.isManagedImage(objectKey)).isTrue();
        assertThat(policy.isOwnedBy(objectKey, 7L)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            ROOT_DIRECTORY + "/files/b38e9b2c-4c13-4f52-9c31-0e52d768d517.pdf",
            ROOT_DIRECTORY + "/images/imported/b38e9b2c-4c13-4f52-9c31-0e52d768d517.webp",
            ROOT_DIRECTORY + "/profiles/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.png",
            "other/images/raw/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.png"
    })
    @DisplayName("관리 디렉터리 밖의 객체 키는 이미지 소유권 검증 대상이 아니다.")
    void distinguishUnmanagedObjectKey(String objectKey) {
        assertThat(policy.isManagedImage(objectKey)).isFalse();
        assertThat(policy.isOwnedBy(objectKey, 7L)).isFalse();
    }

    @Test
    @DisplayName("사용자 ID 접두어가 겹쳐도 다른 사용자의 이미지로 구분한다.")
    void distinguishOverlappingUserIdPrefix() {
        String userTenImageKey = policy.create(10L, UPLOAD_ID, ImagePurpose.CONTENT, "png");

        assertThat(policy.isOwnedBy(userTenImageKey, 1L)).isFalse();
    }

    @Test
    @DisplayName("객체 키나 요청자가 없으면 소유한 이미지가 아니다.")
    void rejectMissingKeyOrRequester() {
        assertThat(policy.isManagedImage(null)).isFalse();
        assertThat(policy.isOwnedBy(null, 7L)).isFalse();
        assertThat(policy.isOwnedBy(CONTENT_IMAGE_KEY, null)).isFalse();
    }
}
