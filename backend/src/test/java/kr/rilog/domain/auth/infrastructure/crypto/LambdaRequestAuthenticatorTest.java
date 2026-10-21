package kr.rilog.domain.auth.infrastructure.crypto;

import kr.rilog.domain.auth.config.LambdaRequestProperties;
import kr.rilog.domain.auth.exception.AuthErrorInformation;
import kr.rilog.domain.auth.exception.AuthException;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LambdaRequestAuthenticatorTest {

    private static final String SECRET = "test-internal-lambda-secret-at-least-32-chars";
    private static final String PATH = "/internal/v1/image-compactions/upload-urls";
    private static final Instant NOW = Instant.parse("2026-10-21T00:00:00Z");
    private static final byte[] BODY =
            "{\"objectKey\":\"rilog/images/raw/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.png\"}"
                    .getBytes(StandardCharsets.UTF_8);

    private final LambdaRequestAuthenticator authenticator = new LambdaRequestAuthenticator(
            new LambdaRequestProperties(SECRET),
            Clock.fixed(NOW, ZoneOffset.UTC)
    );

    @Test
    @DisplayName("같은 비밀키로 시각, 경로, 본문에 서명한 요청은 통과한다")
    void authenticateValidSignature() {
        String timestamp = String.valueOf(NOW.getEpochSecond());

        assertThatCode(() -> authenticator.authenticate(PATH, BODY, timestamp, sign(SECRET, timestamp, PATH, BODY)))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("image-compact-lambda(Node.js)가 만든 서명을 검증한다")
    void authenticateSignatureFromLambda() {
        // deploy/image-compact-lambda/index.mjs의 requestUploadUrls가 같은 입력으로 만든 값이다.
        String timestamp = "1761004800";
        LambdaRequestAuthenticator lambdaClockAuthenticator = new LambdaRequestAuthenticator(
                new LambdaRequestProperties(SECRET),
                Clock.fixed(Instant.ofEpochSecond(1761004800L), ZoneOffset.UTC)
        );

        assertThatCode(() -> lambdaClockAuthenticator.authenticate(
                PATH,
                BODY,
                timestamp,
                "v1=28dd4f68028cb68293d050edbcece4c05a7cbacf93a3cc61b80c1648c2b8d704"
        )).doesNotThrowAnyException();
    }

    @ParameterizedTest
    @ValueSource(longs = {300L, -30L})
    @DisplayName("허용 오차 경계의 시각은 통과한다")
    void authenticateTimestampAtBoundary(long ageSeconds) {
        String timestamp = String.valueOf(NOW.getEpochSecond() - ageSeconds);

        assertThatCode(() -> authenticator.authenticate(PATH, BODY, timestamp, sign(SECRET, timestamp, PATH, BODY)))
                .doesNotThrowAnyException();
    }

    @ParameterizedTest
    @ValueSource(longs = {301L, -31L})
    @DisplayName("5분보다 오래됐거나 30초보다 미래인 요청은 서명이 맞아도 거부한다")
    void rejectTimestampOutOfRange(long ageSeconds) {
        String timestamp = String.valueOf(NOW.getEpochSecond() - ageSeconds);

        assertInvalid(() -> authenticator.authenticate(PATH, BODY, timestamp, sign(SECRET, timestamp, PATH, BODY)));
    }

    @Test
    @DisplayName("서명 후 본문이 바뀌면 거부한다")
    void rejectTamperedBody() {
        String timestamp = String.valueOf(NOW.getEpochSecond());
        String signature = sign(SECRET, timestamp, PATH, BODY);
        byte[] tamperedBody = "{\"objectKey\":\"rilog/images/raw/9-b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.png\"}"
                .getBytes(StandardCharsets.UTF_8);

        assertInvalid(() -> authenticator.authenticate(PATH, tamperedBody, timestamp, signature));
    }

    @Test
    @DisplayName("다른 경로용 서명은 거부한다")
    void rejectSignatureForOtherPath() {
        String timestamp = String.valueOf(NOW.getEpochSecond());
        String signature = sign(SECRET, timestamp, "/internal/v1/other", BODY);

        assertInvalid(() -> authenticator.authenticate(PATH, BODY, timestamp, signature));
    }

    @Test
    @DisplayName("다른 비밀키로 만든 서명은 거부한다")
    void rejectSignatureWithOtherSecret() {
        String timestamp = String.valueOf(NOW.getEpochSecond());
        String signature = sign("other-internal-lambda-secret-at-least-32-chars", timestamp, PATH, BODY);

        assertInvalid(() -> authenticator.authenticate(PATH, BODY, timestamp, signature));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "abc", "1761030000.5"})
    @DisplayName("시각 헤더가 없거나 숫자가 아니면 거부한다")
    void rejectInvalidTimestamp(String timestamp) {
        assertInvalid(() -> authenticator.authenticate(PATH, BODY, timestamp, "v1=00"));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "abcd", "v2=abcd", "v1=not-hex"})
    @DisplayName("서명 헤더가 없거나 형식이 틀리면 거부한다")
    void rejectInvalidSignatureFormat(String signature) {
        String timestamp = String.valueOf(NOW.getEpochSecond());

        assertInvalid(() -> authenticator.authenticate(PATH, BODY, timestamp, signature));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "short-secret"})
    @DisplayName("비밀키가 없거나 32자보다 짧으면 생성에 실패한다")
    void rejectWeakSecret(String secret) {
        assertThatThrownBy(() -> new LambdaRequestAuthenticator(
                new LambdaRequestProperties(secret),
                Clock.fixed(NOW, ZoneOffset.UTC)
        ))
                .isInstanceOf(AuthException.class)
                .hasMessage(AuthErrorInformation.LAMBDA_REQUEST_CONFIGURATION_INVALID.getMessage());
    }

    private void assertInvalid(ThrowingCallable callable) {
        assertThatThrownBy(callable)
                .isInstanceOf(AuthException.class)
                .hasMessage(AuthErrorInformation.INVALID_LAMBDA_REQUEST_SIGNATURE.getMessage());
    }

    private static String sign(String secret, String timestamp, String path, byte[] body) {
        try {
            String bodyHash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(body));
            String payload = timestamp + "\nPOST\n" + path + "\n" + bodyHash;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return "v1=" + HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
