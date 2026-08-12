package kr.rilog.auth.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Clock;
import java.time.Duration;
import kr.rilog.auth.domain.AuthPrincipal;
import kr.rilog.auth.domain.GlobalRole;
import kr.rilog.global.exception.AuthException;
import org.junit.jupiter.api.Test;

class JwtAccessTokenCodecTest {

    private static final String SECRET = "01234567890123456789012345678901";

    @Test
    void issuedJwtRoundTripsRequiredPrincipalClaims() {
        JwtAccessTokenCodec codec = codec("rilog-api");

        String token = codec.issue(new AuthPrincipal(7L, GlobalRole.ADMIN));

        assertEquals(
                new AuthPrincipal(7L, GlobalRole.ADMIN),
                codec.verify(token)
        );
    }

    @Test
    void jwtRejectsUnexpectedAudienceAndTamperedSignature() {
        JwtAccessTokenCodec issuer = codec("rilog-api");
        String token = issuer.issue(new AuthPrincipal(7L, GlobalRole.USER));
        String tampered = token.substring(0, token.length() - 1)
                + (token.endsWith("a") ? "b" : "a");

        assertThrows(AuthException.class, () -> codec("other-api").verify(token));
        assertThrows(AuthException.class, () -> issuer.verify(tampered));
    }

    @Test
    void signingSecretMustContainAtLeast256Bits() {
        assertThrows(
                IllegalArgumentException.class,
                () -> new JwtAccessTokenCodec(
                        "short",
                        "rilog",
                        "rilog-api",
                        Duration.ofMinutes(15),
                        Clock.systemUTC()
                )
        );
    }

    private JwtAccessTokenCodec codec(String audience) {
        return new JwtAccessTokenCodec(
                SECRET,
                "rilog",
                audience,
                Duration.ofMinutes(15),
                Clock.systemUTC()
        );
    }
}
