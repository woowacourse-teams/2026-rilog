package kr.rilog.domain.auth.infrastructure.jwt;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTCreationException;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.exceptions.TokenExpiredException;
import com.auth0.jwt.interfaces.DecodedJWT;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingToken;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingTokenClaims;
import kr.rilog.domain.auth.application.port.token.OnboardingTokenProvider;
import kr.rilog.domain.auth.config.OnboardingTokenProperties;
import kr.rilog.domain.auth.exception.AuthException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Clock;
import java.time.Instant;
import java.util.Date;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.EXPIRED_ONBOARDING_TOKEN;
import static kr.rilog.domain.auth.exception.AuthErrorInformation.INVALID_ONBOARDING_TOKEN;
import static kr.rilog.domain.auth.exception.AuthErrorInformation.ONBOARDING_TOKEN_CLAIM_MISSING;
import static kr.rilog.domain.auth.exception.AuthErrorInformation.ONBOARDING_TOKEN_CONFIGURATION_INVALID;

@Component
public class JwtOnboardingTokenProvider implements OnboardingTokenProvider {

    private static final String USER_ID_CLAIM = "userId";
    private static final String PURPOSE_CLAIM = "purpose";
    private static final String ONBOARDING_PURPOSE = "ONBOARDING";

    private final OnboardingTokenProperties properties;
    private final Algorithm algorithm;
    private final Clock clock;

    @Autowired
    public JwtOnboardingTokenProvider(OnboardingTokenProperties properties) {
        this(properties, Clock.systemUTC());
    }

    JwtOnboardingTokenProvider(OnboardingTokenProperties properties, Clock clock) {
        validateConfiguration(properties);
        if (clock == null) {
            throw new AuthException(ONBOARDING_TOKEN_CONFIGURATION_INVALID);
        }
        this.properties = properties;
        this.algorithm = Algorithm.HMAC256(properties.secret());
        this.clock = clock;
    }

    @Override
    public OnboardingToken issue(Long userId) {
        if (userId == null) {
            throw new AuthException(ONBOARDING_TOKEN_CLAIM_MISSING);
        }

        Instant issuedAt = Instant.now(clock);
        Instant expiresAt = issuedAt.plus(properties.expiration());
        try {
            String token = JWT.create()
                    .withClaim(USER_ID_CLAIM, userId)
                    .withClaim(PURPOSE_CLAIM, ONBOARDING_PURPOSE)
                    .withIssuedAt(Date.from(issuedAt))
                    .withExpiresAt(Date.from(expiresAt))
                    .sign(algorithm);
            return OnboardingToken.of(token);
        } catch (JWTCreationException exception) {
            throw new AuthException(ONBOARDING_TOKEN_CONFIGURATION_INVALID);
        }
    }

    @Override
    public OnboardingTokenClaims parse(String onboardingToken) {
        if (!StringUtils.hasText(onboardingToken)) {
            throw new AuthException(INVALID_ONBOARDING_TOKEN);
        }

        try {
            JWTVerifier verifier = ((JWTVerifier.BaseVerification) JWT.require(algorithm)).build(clock);
            DecodedJWT decodedJWT = verifier.verify(onboardingToken);
            return claims(decodedJWT);
        } catch (TokenExpiredException exception) {
            throw new AuthException(EXPIRED_ONBOARDING_TOKEN);
        } catch (JWTVerificationException exception) {
            throw new AuthException(INVALID_ONBOARDING_TOKEN);
        }
    }

    private OnboardingTokenClaims claims(DecodedJWT decodedJWT) {
        Long userId = decodedJWT.getClaim(USER_ID_CLAIM).asLong();
        String purpose = decodedJWT.getClaim(PURPOSE_CLAIM).asString();
        Date issuedAt = decodedJWT.getIssuedAt();
        Date expiresAt = decodedJWT.getExpiresAt();

        if (userId == null || !StringUtils.hasText(purpose) || issuedAt == null || expiresAt == null) {
            throw new AuthException(ONBOARDING_TOKEN_CLAIM_MISSING);
        }
        if (!ONBOARDING_PURPOSE.equals(purpose)) {
            throw new AuthException(INVALID_ONBOARDING_TOKEN);
        }

        return OnboardingTokenClaims.of(
                userId,
                issuedAt.toInstant(),
                expiresAt.toInstant()
        );
    }

    private void validateConfiguration(OnboardingTokenProperties properties) {
        if (properties == null
                || !StringUtils.hasText(properties.secret())
                || properties.expiration() == null
                || properties.expiration().isZero()
                || properties.expiration().isNegative()) {
            throw new AuthException(ONBOARDING_TOKEN_CONFIGURATION_INVALID);
        }
    }
}
