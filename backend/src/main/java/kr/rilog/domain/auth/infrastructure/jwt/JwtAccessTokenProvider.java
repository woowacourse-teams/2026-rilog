package kr.rilog.domain.auth.infrastructure.jwt;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTCreationException;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.exceptions.TokenExpiredException;
import com.auth0.jwt.interfaces.DecodedJWT;
import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.auth.config.AccessTokenProperties;
import kr.rilog.domain.auth.exception.AuthException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Clock;
import java.time.Instant;
import java.util.Date;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.ACCESS_TOKEN_CLAIM_MISSING;
import static kr.rilog.domain.auth.exception.AuthErrorInformation.ACCESS_TOKEN_CONFIGURATION_INVALID;
import static kr.rilog.domain.auth.exception.AuthErrorInformation.EXPIRED_ACCESS_TOKEN;
import static kr.rilog.domain.auth.exception.AuthErrorInformation.INVALID_ACCESS_TOKEN;

@Component
public class JwtAccessTokenProvider implements AccessTokenProvider {

    private static final String USER_ID_CLAIM = "userId";
    private static final String ROLE_CLAIM = "role";
    private static final String SLUG_CLAIM = "slug";

    private final AccessTokenProperties properties;
    private final Algorithm algorithm;
    private final Clock clock;

    @Autowired
    public JwtAccessTokenProvider(AccessTokenProperties properties) {
        this(properties, Clock.systemUTC());
    }

    JwtAccessTokenProvider(AccessTokenProperties properties, Clock clock) {
        validateConfiguration(properties);
        if (clock == null) {
            throw new AuthException(ACCESS_TOKEN_CONFIGURATION_INVALID);
        }
        this.properties = properties;
        this.algorithm = Algorithm.HMAC256(properties.secret());
        this.clock = clock;
    }

    @Override
    public AccessToken issue(Long userId, GlobalRole role, String slug) {
        if (userId == null || role == null || !StringUtils.hasText(slug)) {
            throw new AuthException(ACCESS_TOKEN_CLAIM_MISSING);
        }

        Instant issuedAt = Instant.now(clock);
        Instant expiresAt = issuedAt.plus(properties.expiration());
        try {
            String token = JWT.create()
                    .withClaim(USER_ID_CLAIM, userId)
                    .withClaim(ROLE_CLAIM, role.name())
                    .withClaim(SLUG_CLAIM, slug)
                    .withIssuedAt(Date.from(issuedAt))
                    .withExpiresAt(Date.from(expiresAt))
                    .sign(algorithm);
            return AccessToken.of(token);
        } catch (JWTCreationException exception) {
            throw new AuthException(ACCESS_TOKEN_CONFIGURATION_INVALID);
        }
    }

    @Override
    public AccessTokenClaims parse(String accessToken) {
        if (!StringUtils.hasText(accessToken)) {
            throw new AuthException(INVALID_ACCESS_TOKEN);
        }

        try {
            JWTVerifier verifier = ((JWTVerifier.BaseVerification) JWT.require(algorithm)).build(clock);
            DecodedJWT decodedJWT = verifier.verify(accessToken);
            return claims(decodedJWT);
        } catch (TokenExpiredException exception) {
            throw new AuthException(EXPIRED_ACCESS_TOKEN);
        } catch (JWTVerificationException exception) {
            throw new AuthException(INVALID_ACCESS_TOKEN);
        }
    }

    private AccessTokenClaims claims(DecodedJWT decodedJWT) {
        Long userId = decodedJWT.getClaim(USER_ID_CLAIM).asLong();
        String role = decodedJWT.getClaim(ROLE_CLAIM).asString();
        String slug = decodedJWT.getClaim(SLUG_CLAIM).asString();
        Date issuedAt = decodedJWT.getIssuedAt();
        Date expiresAt = decodedJWT.getExpiresAt();

        if (userId == null || role == null || !StringUtils.hasText(slug) || issuedAt == null || expiresAt == null) {
            throw new AuthException(ACCESS_TOKEN_CLAIM_MISSING);
        }

        try {
            return AccessTokenClaims.of(
                    userId,
                    GlobalRole.valueOf(role),
                    slug,
                    issuedAt.toInstant(),
                    expiresAt.toInstant()
            );
        } catch (IllegalArgumentException exception) {
            throw new AuthException(INVALID_ACCESS_TOKEN);
        }
    }

    private void validateConfiguration(AccessTokenProperties properties) {
        if (properties == null
                || !StringUtils.hasText(properties.secret())
                || properties.expiration() == null
                || properties.expiration().isZero()
                || properties.expiration().isNegative()) {
            throw new AuthException(ACCESS_TOKEN_CONFIGURATION_INVALID);
        }
    }
}
