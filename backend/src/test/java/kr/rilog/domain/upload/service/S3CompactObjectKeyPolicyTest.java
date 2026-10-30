package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.enums.CompactionTarget;
import kr.rilog.domain.upload.exception.UploadErrorInformation;
import kr.rilog.domain.upload.exception.UploadException;
import kr.rilog.domain.upload.service.S3CompactObjectKeyPolicy.CompactSource;
import kr.rilog.global.s3.properties.S3Properties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class S3CompactObjectKeyPolicyTest {

    private static final String UUID = "b38e9b2c-4c13-4f52-9c31-0e52d768d517";
    private static final String IMAGE_ID = "7-" + UUID;

    private final S3CompactObjectKeyPolicy policy = new S3CompactObjectKeyPolicy(
            new S3Properties("bucket", "ap-northeast-2", "rilog", 10)
    );

    @ParameterizedTest
    @CsvSource({
            "rilog/images/raw/" + IMAGE_ID + "/original.png,IMAGE",
            "rilog/images/raw/" + IMAGE_ID + "/original.JPEG,IMAGE",
            "rilog/profiles/raw/" + IMAGE_ID + "/original.webp,PROFILE",
            "rilog/profiles/raw/" + IMAGE_ID + "/original.avif,PROFILE"
    })
    @DisplayName("raw 원본 key에서 압축 대상, userId, UUID를 읽는다")
    void parseRawObjectKey(String rawObjectKey, CompactionTarget expectedTarget) {
        CompactSource source = policy.parse(rawObjectKey);

        assertThat(policy.isCompactable(rawObjectKey)).isTrue();

        assertThat(source.target()).isEqualTo(expectedTarget);
        assertThat(source.userId()).isEqualTo("7");
        assertThat(source.uuid()).isEqualTo(UUID);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {
            "",
            "other/images/raw/" + IMAGE_ID + "/original.png",
            "rilog/files/raw/" + IMAGE_ID + "/original.png",
            "rilog/images/compact/" + IMAGE_ID + "/750.webp",
            "rilog/images/originals/" + IMAGE_ID + ".png",
            "rilog/images/raw/" + IMAGE_ID + "/750.png",
            "rilog/images/raw/" + IMAGE_ID + "/original.heic",
            "rilog/images/raw/" + IMAGE_ID + "/original.gif",
            "rilog/images/raw/" + IMAGE_ID + "/original.svg",
            "rilog/images/raw/abc-b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.png",
            "rilog/images/raw/7-not-a-uuid/original.png",
            "rilog/images/raw/../" + IMAGE_ID + "/original.png",
            "rilog/images/raw/" + IMAGE_ID + "/original.png/../../x"
    })
    @DisplayName("규칙에 맞지 않는 key는 거부한다")
    void rejectInvalidRawObjectKey(String rawObjectKey) {
        assertThat(policy.isCompactable(rawObjectKey)).isFalse();
        assertThatThrownBy(() -> policy.parse(rawObjectKey))
                .isInstanceOf(UploadException.class)
                .hasMessage(UploadErrorInformation.INVALID_UPLOAD_TARGET.getMessage());
    }

    @Test
    @DisplayName("압축본 key는 같은 디렉터리의 compact 아래에 너비별 webp로 만든다")
    void createCompactKey() {
        CompactSource image = policy.parse("rilog/images/raw/" + IMAGE_ID + "/original.png");
        CompactSource profile = policy.parse("rilog/profiles/raw/" + IMAGE_ID + "/original.png");

        assertThat(policy.compactKey(image, 750))
                .isEqualTo("rilog/images/compact/" + IMAGE_ID + "/750.webp");
        assertThat(policy.compactKey(profile, 50))
                .isEqualTo("rilog/profiles/compact/" + IMAGE_ID + "/50.webp");
    }
}
