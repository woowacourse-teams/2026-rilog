package kr.rilog.auth.domain;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

final class SecretHashes {

    private SecretHashes() {
    }

    static boolean matches(String expected, String presented) {
        if (expected == null || presented == null) {
            return false;
        }
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                presented.getBytes(StandardCharsets.UTF_8)
        );
    }
}
