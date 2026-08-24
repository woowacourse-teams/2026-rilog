package kr.rilog.domain.auth.infrastructure.jwt;

import com.auth0.jwt.interfaces.DecodedJWT;
import kr.rilog.domain.auth.application.token.TokenType;
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
import java.util.Date;
import java.util.Map;

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
    private final JwtTokenProvider jwtTokenProvider;

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
        this.jwtTokenProvider = new JwtTokenProvider(
                properties.secret(),
                clock,
                ACCESS_TOKEN_CONFIGURATION_INVALID
        );
    }

    @Override
    public AccessToken issue(Long userId, GlobalRole role, String slug) {
        if (userId == null || role == null || !StringUtils.hasText(slug)) {
            throw new AuthException(ACCESS_TOKEN_CLAIM_MISSING);
        }

        String token = jwtTokenProvider.create(
                Map.of(
                        USER_ID_CLAIM, userId,
                        ROLE_CLAIM, role.name(),
                        SLUG_CLAIM, slug,
                        JwtTokenProvider.TOKEN_TYPE_CLAIM, TokenType.ACCESS.name()
                ),
                properties.expiration()
        );
        return AccessToken.of(token);
    }

    @Override
    public AccessTokenClaims parse(String accessToken) {
        if (!StringUtils.hasText(accessToken)) {
            throw new AuthException(INVALID_ACCESS_TOKEN);
        }

        DecodedJWT decodedJWT = jwtTokenProvider.verify(
                accessToken,
                EXPIRED_ACCESS_TOKEN,
                INVALID_ACCESS_TOKEN
        );
        return claims(decodedJWT);
    }

    private AccessTokenClaims claims(DecodedJWT decodedJWT) {
        Long userId = decodedJWT.getClaim(USER_ID_CLAIM).asLong();
        String role = decodedJWT.getClaim(ROLE_CLAIM).asString();
        String slug = decodedJWT.getClaim(SLUG_CLAIM).asString();
        String tokenType = decodedJWT.getClaim(JwtTokenProvider.TOKEN_TYPE_CLAIM).asString();
        Date issuedAt = decodedJWT.getIssuedAt();
        Date expiresAt = decodedJWT.getExpiresAt();

        if (userId == null
                || role == null
                || !StringUtils.hasText(slug)
                || !StringUtils.hasText(tokenType)
                || issuedAt == null
                || expiresAt == null) {
            throw new AuthException(ACCESS_TOKEN_CLAIM_MISSING);
        }
        if (!TokenType.ACCESS.name().equals(tokenType)) {
            throw new AuthException(INVALID_ACCESS_TOKEN);
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
