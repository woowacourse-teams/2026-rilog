package kr.rilog.domain.upload.infrastructure.imageserver;

import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * 이미지 서버로 보내는 요청에 공유 비밀키의 HMAC 서명을 만든다.
 *
 * <p>서명 대상은 Lambda 내부 API와 같은 {@code timestamp \n POST \n path \n sha256(body)}다. 이미지 서버는 수신한
 * 바이트로 본문 해시를 계산하므로 서명한 바이트를 그대로 전송해야 한다.
 */
@Component
class ImageServerRequestSigner {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String HASH_ALGORITHM = "SHA-256";
    private static final String SIGNATURE_PREFIX = "v1=";
    private static final int MIN_SECRET_LENGTH = 32;

    private final byte[] secret;

    ImageServerRequestSigner(ImageServerProperties properties) {
        if (properties == null || properties.secret() == null || properties.secret().length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException("이미지 서버 비밀키는 %d자 이상이어야 합니다.".formatted(MIN_SECRET_LENGTH));
        }
        this.secret = properties.secret().getBytes(StandardCharsets.UTF_8);
    }

    public String sign(long timestamp, String path, byte[] body) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret, HMAC_ALGORITHM));
            String payload = timestamp + "\nPOST\n" + path + "\n" + bodyHash(body);
            return SIGNATURE_PREFIX + HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException exception) {
            throw new IllegalStateException("이미지 서버 요청 서명을 계산할 수 없습니다.", exception);
        }
    }

    private String bodyHash(byte[] body) throws NoSuchAlgorithmException {
        return HexFormat.of().formatHex(MessageDigest.getInstance(HASH_ALGORITHM).digest(body));
    }

}
