package kr.rilog.domain.upload.domain.vo.v2;

import kr.rilog.domain.upload.domain.TagStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class S3TagTargetTest {

    @Test
    @DisplayName("S3 객체 키와 태그 상태로 태깅 대상을 생성한다.")
    void createWithObjectKeyAndTagStatus() {
        S3TagTarget target = new S3TagTarget("images/2026/image.png", TagStatus.CONFIRMED);

        assertThat(target).isEqualTo(
                new S3TagTarget("images/2026/image.png", TagStatus.CONFIRMED)
        );
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " "})
    @DisplayName("S3 객체 키가 비어 있으면 생성할 수 없다.")
    void throwWhenObjectKeyIsBlank(String objectKey) {
        assertThatThrownBy(() -> new S3TagTarget(objectKey, TagStatus.CONFIRMED))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("S3 object key는 비어 있을 수 없습니다.");
    }

    @Test
    @DisplayName("S3 태그 상태가 null이면 생성할 수 없다.")
    void throwWhenTagStatusIsNull() {
        assertThatThrownBy(() -> new S3TagTarget("images/2026/image.png", null))
                .isInstanceOf(NullPointerException.class)
                .hasMessage("S3 tag status는 null일 수 없습니다.");
    }

}
