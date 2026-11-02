package kr.rilog.domain.upload.infrastructure.imageserver;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImageServerRequestSignerTest {

    private static final String SECRET = "test-image-server-secret-at-least-32-chars";

    @Test
    @DisplayName("이미지 서버(image-server/src/auth.mjs)와 같은 서명을 만든다")
    void signsLikeImageServer() {
        ImageServerRequestSigner signer = new ImageServerRequestSigner(properties(SECRET));
        byte[] body = "{\"sourceUrl\":\"https://example.com/a.png\",\"userId\":7,\"imagePurpose\":\"CONTENT\"}"
                .getBytes(StandardCharsets.UTF_8);

        // image-server의 sign(secret, '1761696000', '/api/images/import', body)로 계산한 값
        assertThat(signer.sign(1761696000L, "/api/images/import", body))
                .isEqualTo("v1=add477bc70dc5c0d4e5557d008b35085ad234e0f2d360da608b0a71eec0afdb3");
    }

    @Test
    @DisplayName("비밀키가 없거나 32자보다 짧으면 생성하지 않는다")
    void rejectsShortSecret() {
        assertThatThrownBy(() -> new ImageServerRequestSigner(properties(null)))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new ImageServerRequestSigner(properties("short-secret")))
                .isInstanceOf(IllegalStateException.class);
    }

    private ImageServerProperties properties(String secret) {
        return new ImageServerProperties(
                URI.create("https://image.example.com"), secret, Duration.ofSeconds(1), Duration.ofSeconds(1), Duration.ofSeconds(1)
        );
    }
}
