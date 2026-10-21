package kr.rilog.domain.auth.infrastructure.crypto;

import kr.rilog.domain.auth.config.LambdaRequestProperties;
import kr.rilog.domain.auth.exception.AuthException;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.HexFormat;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.INVALID_LAMBDA_REQUEST_SIGNATURE;
import static kr.rilog.domain.auth.exception.AuthErrorInformation.LAMBDA_REQUEST_CONFIGURATION_INVALID;

/**
 * Lambda가 보낸 내부 API 요청의 HMAC 서명을 검증한다.
 *
 * <p>서명 대상은 {@code timestamp \n POST \n path \n sha256(body)}다. 본문 해시는 수신한 바이트로 계산해야 한다.
 * 역직렬화 후 다시 직렬화한 문자열은 공백과 키 순서가 달라져 서명이 어긋난다.
 */
@Component
public class LambdaRequestAuthenticator {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String HASH_ALGORITHM = "SHA-256";
    private static final String SIGNATURE_PREFIX = "v1=";
    private static final int MIN_SECRET_LENGTH = 32;
    private static final long MAX_AGE_SECONDS = 300L;
    // 미래 시각은 시계 오차로만 설명되므로 과거만큼 넓게 열면 가로챈 서명의 유효 시간만 늘어난다.
    private static final long MAX_FUTURE_SKEW_SECONDS = 30L;

    private final byte[] secret;
    private final Clock clock;

    public LambdaRequestAuthenticator(LambdaRequestProperties properties, Clock clock) {
        if (properties == null || properties.secret() == null
                || properties.secret().length() < MIN_SECRET_LENGTH || clock == null) {
            throw new AuthException(LAMBDA_REQUEST_CONFIGURATION_INVALID);
        }
        this.secret = properties.secret().getBytes(StandardCharsets.UTF_8);
        this.clock = clock;
    }

    public void authenticate(String path, byte[] rawBody, String timestamp, String signature) {
        long requestedAt = parseTimestamp(timestamp);
        long age = clock.instant().getEpochSecond() - requestedAt;
        if (age > MAX_AGE_SECONDS || age < -MAX_FUTURE_SKEW_SECONDS) {
            throw new AuthException(INVALID_LAMBDA_REQUEST_SIGNATURE);
        }

        byte[] expected = sign(timestamp, path, rawBody);
        byte[] provided = decodeSignature(signature);
        if (!MessageDigest.isEqual(expected, provided)) {
            throw new AuthException(INVALID_LAMBDA_REQUEST_SIGNATURE);
        }
    }

    private long parseTimestamp(String timestamp) {
        try {
            return Long.parseLong(timestamp);
        } catch (NumberFormatException exception) {
            throw new AuthException(INVALID_LAMBDA_REQUEST_SIGNATURE);
        }
    }

    private byte[] sign(String timestamp, String path, byte[] rawBody) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret, HMAC_ALGORITHM));
            String payload = timestamp + "\nPOST\n" + path + "\n" + bodyHash(rawBody);
            return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException | InvalidKeyException exception) {
            throw new IllegalStateException("Lambda 요청 서명을 계산할 수 없습니다.", exception);
        }
    }

    private String bodyHash(byte[] rawBody) throws NoSuchAlgorithmException {
        byte[] body = rawBody == null ? new byte[0] : rawBody;
        return HexFormat.of().formatHex(MessageDigest.getInstance(HASH_ALGORITHM).digest(body));
    }

    private byte[] decodeSignature(String signature) {
        if (signature == null || !signature.startsWith(SIGNATURE_PREFIX)) {
            throw new AuthException(INVALID_LAMBDA_REQUEST_SIGNATURE);
        }
        try {
            return HexFormat.of().parseHex(signature.substring(SIGNATURE_PREFIX.length()));
        } catch (IllegalArgumentException exception) {
            throw new AuthException(INVALID_LAMBDA_REQUEST_SIGNATURE);
        }
    }

}
