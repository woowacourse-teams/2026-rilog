package kr.rilog.domain.auth.infrastructure.crypto;

import kr.rilog.domain.auth.application.token.refresh.RefreshToken;
import kr.rilog.domain.auth.application.port.token.RefreshTokenHasher;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Component
public class Sha256RefreshTokenHasher implements RefreshTokenHasher {

    private static final String HASH_ALGORITHM = "SHA-256";

    @Override
    public String hash(RefreshToken refreshToken) {
        try {
            MessageDigest messageDigest = MessageDigest.getInstance(HASH_ALGORITHM);
            byte[] hashedToken = messageDigest.digest(refreshToken.value().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashedToken);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 algorithm is not available.", exception);
        }
    }
}
