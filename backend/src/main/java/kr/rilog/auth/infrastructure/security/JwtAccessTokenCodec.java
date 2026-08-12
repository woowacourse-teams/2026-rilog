package kr.rilog.auth.infrastructure.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import kr.rilog.auth.application.port.AccessTokenCodec;
import kr.rilog.auth.domain.AuthPrincipal;
import kr.rilog.auth.domain.GlobalRole;
import kr.rilog.global.exception.AuthErrorInformation;
import kr.rilog.global.exception.AuthException;

public class JwtAccessTokenCodec implements AccessTokenCodec {

    private static final int MINIMUM_SECRET_BYTES = 32;

    private final String issuer;
    private final String audience;
    private final Duration lifetime;
    private final Clock clock;
    private final Algorithm algorithm;
    private final JWTVerifier verifier;

    public JwtAccessTokenCodec(
            String secret,
            String issuer,
            String audience,
            Duration lifetime,
            Clock clock
    ) {
        if (secret == null
                || secret.getBytes(StandardCharsets.UTF_8).length < MINIMUM_SECRET_BYTES) {
            throw new IllegalArgumentException("JWT signing secret must contain at least 256 bits");
        }
        if (issuer == null || issuer.isBlank() || audience == null || audience.isBlank()) {
            throw new IllegalArgumentException("JWT issuer and audience must not be blank");
        }
        if (lifetime == null || lifetime.isZero() || lifetime.isNegative()) {
            throw new IllegalArgumentException("JWT lifetime must be positive");
        }
        this.issuer = issuer;
        this.audience = audience;
        this.lifetime = lifetime;
        this.clock = clock;
        this.algorithm = Algorithm.HMAC256(secret);
        this.verifier = JWT.require(algorithm)
                .withIssuer(issuer)
                .withAudience(audience)
                .build();
    }

    @Override
    public String issue(AuthPrincipal principal) {
        Instant now = clock.instant();
        return JWT.create()
                .withIssuer(issuer)
                .withAudience(audience)
                .withSubject(principal.userId().toString())
                .withClaim("role", principal.role().name())
                .withIssuedAt(Date.from(now))
                .withExpiresAt(Date.from(now.plus(lifetime)))
                .withJWTId(UUID.randomUUID().toString())
                .sign(algorithm);
    }

    @Override
    public AuthPrincipal verify(String token) {
        try {
            DecodedJWT decoded = verifier.verify(token);
            requireClaims(decoded);
            Long userId = Long.valueOf(decoded.getSubject());
            GlobalRole role = GlobalRole.valueOf(decoded.getClaim("role").asString());
            return new AuthPrincipal(userId, role);
        } catch (JWTVerificationException | IllegalArgumentException | NullPointerException exception) {
            throw new AuthException(AuthErrorInformation.INVALID_ACCESS_TOKEN);
        }
    }

    private void requireClaims(DecodedJWT decoded) {
        if (decoded.getSubject() == null
                || decoded.getClaim("role").isMissing()
                || decoded.getClaim("role").isNull()
                || decoded.getIssuedAt() == null
                || decoded.getExpiresAt() == null
                || decoded.getId() == null
                || decoded.getId().isBlank()) {
            throw new IllegalArgumentException("JWT required claim is missing");
        }
    }
}
