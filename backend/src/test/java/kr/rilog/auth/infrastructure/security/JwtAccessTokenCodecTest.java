package kr.rilog.auth.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import kr.rilog.auth.domain.AuthPrincipal;
import kr.rilog.auth.domain.GlobalRole;
import kr.rilog.global.exception.AuthException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

class JwtAccessTokenCodecTest {

    private static final String SECRET = "01234567890123456789012345678901";
    private static final Instant NOW = Instant.parse("2026-08-12T00:00:00Z");

    @Test
    @DisplayName("발급한 JWT를 검증하면 필수 사용자 인증 정보를 복원한다.")
    void issuedJwtRoundTripsRequiredPrincipalClaims() {
        // given
        JwtAccessTokenCodec codec = codec("rilog-api");
        AuthPrincipal principal = new AuthPrincipal(7L, GlobalRole.ADMIN);

        // when
        String token = codec.issue(principal);
        AuthPrincipal verifiedPrincipal = codec.verify(token);

        // then
        assertEquals(principal, verifiedPrincipal);
    }

    @Test
    @DisplayName("JWT의 audience가 다르거나 서명이 변조되면 검증을 거부한다.")
    void jwtRejectsUnexpectedAudienceAndTamperedSignature() {
        // given
        JwtAccessTokenCodec issuer = codec("rilog-api");
        String token = issuer.issue(new AuthPrincipal(7L, GlobalRole.USER));
        String tampered = token.substring(0, token.length() - 1)
                + (token.endsWith("a") ? "b" : "a");

        // when
        Executable verifyUnexpectedAudience = () -> codec("other-api").verify(token);
        Executable verifyTamperedSignature = () -> issuer.verify(tampered);

        // then
        assertThrows(AuthException.class, verifyUnexpectedAudience);
        assertThrows(AuthException.class, verifyTamperedSignature);
    }

    @Test
    @DisplayName("JWT 서명 시크릿은 최소 256비트여야 한다.")
    void signingSecretMustContainAtLeast256Bits() {
        // given
        String shortSecret = "short";

        // when
        Executable createCodec = () -> new JwtAccessTokenCodec(
                shortSecret,
                "rilog",
                "rilog-api",
                Duration.ofMinutes(15),
                Clock.systemUTC()
        );

        // then
        assertThrows(IllegalArgumentException.class, createCodec);
    }

    @Test
    @DisplayName("JWT 만료 검증에는 주입한 Clock을 사용한다.")
    void verificationUsesInjectedClockForExpiration() {
        // given
        String token = codec("rilog-api", fixedClock(NOW))
                .issue(new AuthPrincipal(7L, GlobalRole.USER));
        JwtAccessTokenCodec afterExpiration = codec(
                "rilog-api",
                fixedClock(NOW.plus(Duration.ofMinutes(16)))
        );

        // when
        Executable verifyExpiredToken = () -> afterExpiration.verify(token);

        // then
        assertThrows(AuthException.class, verifyExpiredToken);
    }

    @Test
    @DisplayName("주입한 Clock보다 미래에 발급된 JWT는 거부한다.")
    void rejectsTokenIssuedInTheFutureAccordingToInjectedClock() {
        // given
        String token = codec("rilog-api", fixedClock(NOW.plusSeconds(1)))
                .issue(new AuthPrincipal(7L, GlobalRole.USER));

        // when
        Executable verifyFutureToken = () -> codec(
                "rilog-api",
                fixedClock(NOW)
        ).verify(token);

        // then
        assertThrows(AuthException.class, verifyFutureToken);
    }

    private JwtAccessTokenCodec codec(String audience) {
        return codec(audience, Clock.systemUTC());
    }

    private JwtAccessTokenCodec codec(String audience, Clock clock) {
        return new JwtAccessTokenCodec(
                SECRET,
                "rilog",
                audience,
                Duration.ofMinutes(15),
                clock
        );
    }

    private Clock fixedClock(Instant instant) {
        return Clock.fixed(instant, ZoneOffset.UTC);
    }

}
