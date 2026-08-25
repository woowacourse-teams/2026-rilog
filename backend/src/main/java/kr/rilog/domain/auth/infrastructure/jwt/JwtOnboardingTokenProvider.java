package kr.rilog.domain.auth.infrastructure.jwt;

import com.auth0.jwt.interfaces.Claim;
import com.auth0.jwt.interfaces.DecodedJWT;
import kr.rilog.domain.auth.application.token.TokenType;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingToken;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingTokenClaims;
import kr.rilog.domain.auth.application.port.token.OnboardingTokenProvider;
import kr.rilog.domain.auth.config.OnboardingTokenProperties;
import kr.rilog.domain.auth.exception.AuthException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Clock;
import java.util.Date;
import java.util.Map;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.*;

@Component
public class JwtOnboardingTokenProvider implements OnboardingTokenProvider {

    private static final String USER_ID_CLAIM = "userId";

    private final OnboardingTokenProperties properties;
    private final JwtTokenProvider jwtTokenProvider;

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
        this.jwtTokenProvider = new JwtTokenProvider(
                properties.secret(),
                clock,
                ONBOARDING_TOKEN_CONFIGURATION_INVALID
        );
    }

    @Override
    public OnboardingToken issue(Long userId) {
        if (userId == null) {
            throw new AuthException(ONBOARDING_TOKEN_CLAIM_MISSING);
        }

        String token = jwtTokenProvider.create(
                Map.of(
                        USER_ID_CLAIM, userId,
                        JwtTokenProvider.TOKEN_TYPE_CLAIM, TokenType.ONBOARDING.name()
                ),
                properties.expiration()
        );
        return OnboardingToken.of(token);
    }

    @Override
    public OnboardingTokenClaims parse(String onboardingToken) {
        if (!StringUtils.hasText(onboardingToken)) {
            throw new AuthException(INVALID_ONBOARDING_TOKEN);
        }

        DecodedJWT decodedJWT = jwtTokenProvider.verify(
                onboardingToken,
                EXPIRED_ONBOARDING_TOKEN,
                INVALID_ONBOARDING_TOKEN
        );
        return claims(decodedJWT);
    }

    private OnboardingTokenClaims claims(DecodedJWT decodedJWT) {
        Long userId = parseLong(USER_ID_CLAIM, decodedJWT);
        String tokenType = parseString(JwtTokenProvider.TOKEN_TYPE_CLAIM, decodedJWT);
        Date issuedAt = parseDate(decodedJWT.getIssuedAt());
        Date expiresAt = parseDate(decodedJWT.getExpiresAt());

        if (!TokenType.ONBOARDING.name().equals(tokenType)) {
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

    public Long parseLong(String claimName, DecodedJWT decodedJWT){
        Claim claim = decodedJWT.getClaim(claimName);
        if (claim.isNull()) {
            throw new AuthException(ONBOARDING_TOKEN_CLAIM_MISSING);
        }

        return claim.asLong();
    }

    public String parseString(String claimName, DecodedJWT decodedJWT){
        Claim claim = decodedJWT.getClaim(claimName);
        if (claim.isNull()) {
            throw new AuthException(ONBOARDING_TOKEN_CLAIM_MISSING);
        }

        return claim.asString();
    }

    public Date parseDate(Date date){
        if (date == null) {
            throw new AuthException(ONBOARDING_TOKEN_CLAIM_MISSING);
        }

        return date;
    }

}
