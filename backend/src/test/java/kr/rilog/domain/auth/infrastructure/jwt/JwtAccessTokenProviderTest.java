package kr.rilog.domain.auth.infrastructure.jwt;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTCreator;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.config.AccessTokenProperties;
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

class JwtAccessTokenProviderTest {

    private static final Instant NOW = Instant.parse("2026-08-13T00:00:00Z");
    private static final String SECRET = "test-access-token-secret-over-32-bytes";
    private static final Duration EXPIRATION = Duration.ofMinutes(15);

    @Test
    @DisplayName("Access Token은 userId, role, slug, tokenType, iat, exp Claim을 포함하고 다시 파싱된다")
    void issueCreatesTokenWithRequiredClaimsAndParseReadsThem() {
        // given
        JwtAccessTokenProvider provider = provider(SECRET, NOW);

        // when
        AccessToken accessToken = provider.issue(1L, GlobalRole.USER, "jinriro");

        // then
        DecodedJWT decodedJWT = JWT.decode(accessToken.value());
        assertThat(decodedJWT.getClaim("userId").asLong()).isEqualTo(1L);
        assertThat(decodedJWT.getClaim("role").asString()).isEqualTo("USER");
        assertThat(decodedJWT.getClaim("slug").asString()).isEqualTo("jinriro");
        assertThat(decodedJWT.getClaim("tokenType").asString()).isEqualTo("ACCESS");
        assertThat(decodedJWT.getClaim("token").isMissing()).isTrue();
        assertThat(decodedJWT.getIssuedAt().toInstant()).isEqualTo(NOW);
        assertThat(decodedJWT.getExpiresAt().toInstant()).isEqualTo(NOW.plus(EXPIRATION));

        AccessTokenClaims parsedClaims = provider.parse(accessToken.value());
        assertThat(parsedClaims)
                .extracting(
                        AccessTokenClaims::userId,
                        AccessTokenClaims::role,
                        AccessTokenClaims::slug,
                        AccessTokenClaims::issuedAt,
                        AccessTokenClaims::expiresAt
                )
                .containsExactly(
                        1L,
                        GlobalRole.USER,
                        "jinriro",
                        NOW,
                        NOW.plus(EXPIRATION)
                );
    }

    @Test
    @DisplayName("slug 없이 Access Token 발급을 요청하면 거부한다")
    void issueRejectsMissingSlug() {
        // given
        JwtAccessTokenProvider provider = provider(SECRET, NOW);

        // when - then
        assertThatThrownBy(() -> provider.issue(1L, GlobalRole.USER, " "))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.ACCESS_TOKEN_CLAIM_MISSING);
    }

    @Test
    @DisplayName("만료된 Access Token은 거부한다")
    void parseRejectsExpiredToken() {
        // given
        String expiredToken = createToken(
                SECRET,
                1L,
                GlobalRole.USER.name(),
                "jinriro",
                NOW.minus(EXPIRATION).minusSeconds(1),
                NOW.minusSeconds(1),
                "ACCESS"
        );

        // when - then
        assertThatThrownBy(() -> provider(SECRET, NOW).parse(expiredToken))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.EXPIRED_ACCESS_TOKEN);
    }

    @Test
    @DisplayName("서명이 일치하지 않는 Access Token은 거부한다")
    void parseRejectsTokenSignedWithDifferentSecret() {
        // given
        AccessToken accessToken = provider(SECRET, NOW).issue(1L, GlobalRole.USER, "jinriro");
        JwtAccessTokenProvider differentSecretProvider = provider(
                "different-access-token-secret-over-32-bytes",
                NOW
        );

        // when - then
        assertThatThrownBy(() -> differentSecretProvider.parse(accessToken.value()))
                .isInstanceOf(AuthException.class)
                .hasMessageNotContaining(accessToken.value())
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.INVALID_ACCESS_TOKEN);
    }

    @Test
    @DisplayName("payload가 변조된 Access Token은 거부한다")
    void parseRejectsTamperedPayload() {
        // given
        AccessToken accessToken = provider(SECRET, NOW).issue(1L, GlobalRole.USER, "jinriro");
        String tamperedToken = tamperPayload(accessToken.value());

        // when - then
        assertThatThrownBy(() -> provider(SECRET, NOW).parse(tamperedToken))
                .isInstanceOf(AuthException.class)
                .hasMessageNotContaining(tamperedToken)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.INVALID_ACCESS_TOKEN);
    }

    @Test
    @DisplayName("필수 Claim 중 하나라도 없는 Access Token은 거부한다")
    void parseRejectsTokenWithoutAnyRequiredClaim() {
        // given
        List<String> requiredClaims = List.of("userId", "role", "slug", "tokenType", "iat", "exp");

        // when - then
        for (String missingClaim : requiredClaims) {
            String token = createTokenWithoutRequiredClaim(missingClaim);

            assertThatThrownBy(() -> provider(SECRET, NOW).parse(token))
                    .as("missing claim: %s", missingClaim)
                    .isInstanceOf(AuthException.class)
                    .extracting("errorInformation")
                    .isEqualTo(AuthErrorInformation.ACCESS_TOKEN_CLAIM_MISSING);
        }
    }

    @Test
    @DisplayName("tokenType Claim이 없는 기존 Access Token은 거부한다")
    void parseRejectsLegacyAccessTokenWithoutTokenType() {
        // given
        String legacyToken = createTokenWithoutRequiredClaim("tokenType");

        // when - then
        assertThatThrownBy(() -> provider(SECRET, NOW).parse(legacyToken))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.ACCESS_TOKEN_CLAIM_MISSING);
    }

    @Test
    @DisplayName("지원하지 않는 role Claim의 Access Token은 거부한다")
    void parseRejectsTokenWithUnsupportedRole() {
        // given
        String tokenWithUnsupportedRole = createToken(
                SECRET,
                1L,
                "OWNER",
                "jinriro",
                NOW,
                NOW.plus(EXPIRATION),
                "ACCESS"
        );

        // when - then
        assertThatThrownBy(() -> provider(SECRET, NOW).parse(tokenWithUnsupportedRole))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.INVALID_ACCESS_TOKEN);
    }

    @Test
    @DisplayName("tokenType이 ACCESS가 아닌 Token은 Access Token으로 거부한다")
    void parseRejectsTokenWithUnsupportedTokenType() {
        // given
        String onboardingToken = createToken(
                SECRET,
                1L,
                GlobalRole.USER.name(),
                "jinriro",
                NOW,
                NOW.plus(EXPIRATION),
                "ONBOARDING"
        );

        // when - then
        assertThatThrownBy(() -> provider(SECRET, NOW).parse(onboardingToken))
                .isInstanceOf(AuthException.class)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.INVALID_ACCESS_TOKEN);
    }

    @Test
    @DisplayName("JWT 형식이 아닌 Access Token은 거부한다")
    void parseRejectsMalformedToken() {
        // given
        String malformedToken = "not-a-jwt";

        // when - then
        assertThatThrownBy(() -> provider(SECRET, NOW).parse(malformedToken))
                .isInstanceOf(AuthException.class)
                .hasMessageNotContaining(malformedToken)
                .extracting("errorInformation")
                .isEqualTo(AuthErrorInformation.INVALID_ACCESS_TOKEN);
    }

    private JwtAccessTokenProvider provider(String secret, Instant now) {
        return new JwtAccessTokenProvider(
                AccessTokenProperties.of(secret, EXPIRATION),
                Clock.fixed(now, ZoneOffset.UTC)
        );
    }

    private String tamperPayload(String token) {
        String[] parts = token.split("\\.");
        String payload = """
                {"userId":2,"role":"USER","slug":"jinriro","tokenType":"ACCESS","iat":1893456000,"exp":1893456900}
                """;
        return parts[0] + "." + encode(payload) + "." + parts[2];
    }

    private String createToken(
            String secret,
            Long userId,
            String role,
            String slug,
            Instant issuedAt,
            Instant expiresAt,
            String tokenType
    ) {
        return JWT.create()
                .withClaim("userId", userId)
                .withClaim("role", role)
                .withClaim("slug", slug)
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
        if (!"role".equals(missingClaim)) {
            builder.withClaim("role", GlobalRole.USER.name());
        }
        if (!"slug".equals(missingClaim)) {
            builder.withClaim("slug", "jinriro");
        }
        if (!"tokenType".equals(missingClaim)) {
            builder.withClaim("tokenType", "ACCESS");
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
