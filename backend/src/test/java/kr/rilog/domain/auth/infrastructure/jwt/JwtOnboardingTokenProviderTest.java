package kr.rilog.domain.auth.infrastructure.jwt;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTCreator;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingToken;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingTokenClaims;
import kr.rilog.domain.auth.config.OnboardingTokenProperties;
import kr.rilog.domain.auth.exception.AuthErrorInformation;
import kr.rilog.domain.auth.exception.AuthException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtOnboardingTokenProviderTest {

    private static final Instant NOW = Instant.parse("2026-08-13T00:00:00Z");
    private static final String SECRET = "test-onboarding-token-secret-over-32-bytes";
    private static final Duration EXPIRATION = Duration.ofMinutes(10);

    @Test
    @DisplayName("Onboarding Token은 userId, tokenType, iat, exp Claim을 포함하고 다시 파싱된다")
    void issueCreatesTokenWithRequiredClaimsAndParseReadsThem() {
        // given
        JwtOnboardingTokenProvider provider = provider(SECRET, NOW);

        // when
        OnboardingToken onboardingToken = provider.issue(1L);

        // then
        DecodedJWT decodedJWT = JWT.decode(onboardingToken.value());
        assertThat(decodedJWT.getClaim("userId").asLong()).isEqualTo(1L);
        assertThat(decodedJWT.getClaim("tokenType").asString()).isEqualTo("ONBOARDING");
        assertThat(decodedJWT.getClaim("role").isMissing()).isTrue();
        assertThat(decodedJWT.getClaim("slug").isMissing()).isTrue();
        assertThat(decodedJWT.getIssuedAt().toInstant()).isEqualTo(NOW);
        assertThat(decodedJWT.getExpiresAt().toInstant()).isEqualTo(NOW.plus(EXPIRATION));

        OnboardingTokenClaims parsedClaims = provider.parse(onboardingToken.value());
        assertThat(parsedClaims)
                .extracting(
                        OnboardingTokenClaims::userId,
                        OnboardingTokenClaims::issuedAt,
                        OnboardingTokenClaims::expiresAt
                )
                .containsExactly(
                        1L,
                        NOW,
                        NOW.plus(EXPIRATION)
                );
    }

    @Test
    @DisplayName("userId 없이 Onboarding Token 발급을 요청하면 거부한다")
    void issueRejectsMissingUserId() {
        // given
        JwtOnboardingTokenProvider provider = provider(SECRET, NOW);

        // when - then
        assertThatThrownBy(() -> provider.issue(null))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.ONBOARDING_TOKEN_CLAIM_MISSING);
    }

    @Test
    @DisplayName("만료된 Onboarding Token은 거부한다")
    void parseRejectsExpiredToken() {
        // given
        String expiredToken = createToken(
                SECRET,
                1L,
                "ONBOARDING",
                NOW.minus(EXPIRATION).minusSeconds(1),
                NOW.minusSeconds(1)
        );

        // when - then
        assertThatThrownBy(() -> provider(SECRET, NOW).parse(expiredToken))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.EXPIRED_ONBOARDING_TOKEN);
    }

    @Test
    @DisplayName("서명이 일치하지 않는 Onboarding Token은 거부한다")
    void parseRejectsTokenSignedWithDifferentSecret() {
        // given
        OnboardingToken onboardingToken = provider(SECRET, NOW).issue(1L);
        JwtOnboardingTokenProvider differentSecretProvider = provider(
                "different-onboarding-token-secret-over-32-bytes",
                NOW
        );

        // when - then
        assertThatThrownBy(() -> differentSecretProvider.parse(onboardingToken.value()))
                .isInstanceOf(AuthException.class)
                .hasMessageNotContaining(onboardingToken.value())
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.INVALID_ONBOARDING_TOKEN);
    }

    @Test
    @DisplayName("payload가 변조된 Onboarding Token은 거부한다")
    void parseRejectsTamperedPayload() {
        // given
        OnboardingToken onboardingToken = provider(SECRET, NOW).issue(1L);
        String tamperedToken = tamperPayload(onboardingToken.value());

        // when - then
        assertThatThrownBy(() -> provider(SECRET, NOW).parse(tamperedToken))
                .isInstanceOf(AuthException.class)
                .hasMessageNotContaining(tamperedToken)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.INVALID_ONBOARDING_TOKEN);
    }

    @Test
    @DisplayName("필수 Claim 중 하나라도 없는 Onboarding Token은 거부한다")
    void parseRejectsTokenWithoutAnyRequiredClaim() {
        // given
        List<String> requiredClaims = List.of("userId", "tokenType", "iat", "exp");

        // when - then
        for (String missingClaim : requiredClaims) {
            String token = createTokenWithoutRequiredClaim(missingClaim);

            assertThatThrownBy(() -> provider(SECRET, NOW).parse(token))
                    .as("missing claim: %s", missingClaim)
                    .isInstanceOf(AuthException.class)
                    .extracting("errorInformation")
                    .isEqualTo(AuthErrorInformation.ONBOARDING_TOKEN_CLAIM_MISSING);
        }
    }

    @Test
    @DisplayName("purpose Claim만 가진 기존 Onboarding Token은 거부한다")
    void parseRejectsLegacyOnboardingTokenWithPurposeClaim() {
        // given
        String legacyToken = JWT.create()
                .withClaim("userId", 1L)
                .withClaim("purpose", "ONBOARDING")
                .withIssuedAt(Date.from(NOW))
                .withExpiresAt(Date.from(NOW.plus(EXPIRATION)))
                .sign(Algorithm.HMAC256(SECRET));

        // when - then
        assertThatThrownBy(() -> provider(SECRET, NOW).parse(legacyToken))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.ONBOARDING_TOKEN_CLAIM_MISSING);
    }

    @Test
    @DisplayName("tokenType이 ONBOARDING이 아닌 Token은 거부한다")
    void parseRejectsTokenWithUnsupportedTokenType() {
        // given
        String accessToken = createToken(
                SECRET,
                1L,
                "ACCESS",
                NOW,
                NOW.plus(EXPIRATION)
        );

        // when - then
        assertThatThrownBy(() -> provider(SECRET, NOW).parse(accessToken))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.INVALID_ONBOARDING_TOKEN);
    }

    @Test
    @DisplayName("JWT 형식이 아닌 Onboarding Token은 거부한다")
    void parseRejectsMalformedToken() {
        // given
        String malformedToken = "not-a-jwt";

        // when - then
        assertThatThrownBy(() -> provider(SECRET, NOW).parse(malformedToken))
                .isInstanceOf(AuthException.class)
                .hasMessageNotContaining(malformedToken)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.INVALID_ONBOARDING_TOKEN);
    }

    private JwtOnboardingTokenProvider provider(String secret, Instant now) {
        return new JwtOnboardingTokenProvider(
                OnboardingTokenProperties.of(secret, EXPIRATION),
                Clock.fixed(now, ZoneOffset.UTC)
        );
    }

    private String tamperPayload(String token) {
        String[] parts = token.split("\\.");
        String payload = """
                {"userId":2,"tokenType":"ONBOARDING","iat":1893456000,"exp":1893456600}
                """;
        return parts[0] + "." + encode(payload) + "." + parts[2];
    }

    private String createToken(String secret, Long userId, String tokenType, Instant issuedAt, Instant expiresAt) {
        return JWT.create()
                .withClaim("userId", userId)
                .withClaim("tokenType", tokenType)
                .withIssuedAt(Date.from(issuedAt))
                .withExpiresAt(Date.from(expiresAt))
                .sign(Algorithm.HMAC256(secret));
    }

    private String createTokenWithoutRequiredClaim(String missingClaim) {
        JWTCreator.Builder builder = JWT.create();

        if (!"userId".equals(missingClaim)) {
            builder.withClaim("userId", 1L);
        }
        if (!"tokenType".equals(missingClaim)) {
            builder.withClaim("tokenType", "ONBOARDING");
        }
        if (!"iat".equals(missingClaim)) {
            builder.withIssuedAt(Date.from(NOW));
        }
        if (!"exp".equals(missingClaim)) {
            builder.withExpiresAt(Date.from(NOW.plus(EXPIRATION)));
        }

        return builder.sign(Algorithm.HMAC256(SECRET));
    }

    private String encode(String value) {
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }
}
