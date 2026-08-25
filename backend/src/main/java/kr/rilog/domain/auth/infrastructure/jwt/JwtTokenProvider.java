package kr.rilog.domain.auth.infrastructure.jwt;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTCreator;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTCreationException;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.exceptions.TokenExpiredException;
import com.auth0.jwt.interfaces.DecodedJWT;
import kr.rilog.domain.auth.exception.AuthErrorInformation;
import kr.rilog.domain.auth.exception.AuthException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

final class JwtTokenProvider {

    static final String TOKEN_TYPE_CLAIM = "tokenType";

    private final Algorithm algorithm;
    private final Clock clock;
    private final AuthErrorInformation configurationInvalid;

    JwtTokenProvider(String secret, Clock clock, AuthErrorInformation configurationInvalid) {
        this.algorithm = Algorithm.HMAC256(secret);
        this.clock = clock;
        this.configurationInvalid = configurationInvalid;
    }

    String create(Map<String, Object> claims, Duration expiration) {
        Instant issuedAt = Instant.now(clock);
        Instant expiresAt = issuedAt.plus(expiration);

        try {
            JWTCreator.Builder builder = JWT.create()
                    .withIssuedAt(Date.from(issuedAt))
                    .withExpiresAt(Date.from(expiresAt));
            claims.forEach((name, value) -> addClaim(builder, name, value));
            return builder.sign(algorithm);
        } catch (JWTCreationException exception) {
            throw new AuthException(configurationInvalid);
        }
    }

    DecodedJWT verify(
            String token,
            AuthErrorInformation expired,
            AuthErrorInformation invalid
    ) {
        try {
            JWTVerifier verifier = ((JWTVerifier.BaseVerification) JWT.require(algorithm)).build(clock);
            return verifier.verify(token);
        } catch (TokenExpiredException exception) {
            throw new AuthException(expired);
        } catch (JWTVerificationException exception) {
            throw new AuthException(invalid);
        }
    }

    private void addClaim(JWTCreator.Builder builder, String name, Object value) {
        if (value instanceof Long longValue) {
            builder.withClaim(name, longValue);
            return;
        }
        if (value instanceof String stringValue) {
            builder.withClaim(name, stringValue);
            return;
        }

        throw new AuthException(configurationInvalid);
    }

}
