package kr.rilog.domain.auth.application.token.onboarding;

import java.time.Instant;

public record OnboardingTokenClaims(
        Long userId,
        Instant issuedAt,
        Instant expiresAt
) {

    public static OnboardingTokenClaims of(
            Long userId,
            Instant issuedAt,
            Instant expiresAt
    ) {
        return new OnboardingTokenClaims(userId, issuedAt, expiresAt);
    }

}
