package kr.rilog.domain.upload.domain.vo;

import kr.rilog.domain.upload.exception.UploadException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static kr.rilog.domain.upload.exception.UploadErrorInformation.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class S3ObjectAddressTest {

    @Test
    @DisplayName("S3 객체 주소에서 버킷과 디코딩된 키를 추출한다")
    void createFromObjectUrl() {
        S3ObjectAddress address = S3ObjectAddress.from(
                "https://rilog-bucket.s3.ap-northeast-2.amazonaws.com/images/2026/a%20b.png"
        );

        assertThat(address.bucket()).isEqualTo("rilog-bucket");
        assertThat(address.key()).isEqualTo("images/2026/a b.png");
    }

    @Test
    @DisplayName("HTTPS 형식이 아니면 예외가 발생한다")
    void throwWhenSchemeIsNotHttps() {
        String objectUrl = "http://rilog-bucket.s3.ap-northeast-2.amazonaws.com/images/a.png";

        assertThatThrownBy(() -> S3ObjectAddress.from(objectUrl))
                .isInstanceOf(UploadException.class)
                .hasMessage(INVALID_S3_URL_SCHEME.getMessage());
    }

    @Test
    @DisplayName("지원하는 S3 호스트가 아니면 예외가 발생한다")
    void throwWhenHostIsUnsupported() {
        String objectUrl = "https://example.com/images/a.png";


        assertThatThrownBy(() -> S3ObjectAddress.from(objectUrl))
                .isInstanceOf(UploadException.class)
                .hasMessage(UNSUPPORTED_S3_HOST.getMessage());
    }

    @Test
    @DisplayName("S3 객체 키가 없으면 예외가 발생한다")
    void throwWhenObjectKeyIsMissing() {
        String objectUrl = "https://rilog-bucket.s3.ap-northeast-2.amazonaws.com";

        assertThatThrownBy(() -> S3ObjectAddress.from(objectUrl))
                .isInstanceOf(UploadException.class)
                .hasMessage(S3_OBJECT_KEY_MISSING.getMessage());
    }

}
