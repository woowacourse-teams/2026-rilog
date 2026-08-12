package kr.rilog.auth.application;

import java.time.Duration;

public record AuthPolicy(
        Duration oauthAttemptLifetime,
        Duration exchangeCodeLifetime,
        Duration refreshLifetime,
        Duration refreshConcurrencyGrace
) {

    public AuthPolicy {
        requirePositive(oauthAttemptLifetime, "oauthAttemptLifetime");
        requirePositive(exchangeCodeLifetime, "exchangeCodeLifetime");
        requirePositive(refreshLifetime, "refreshLifetime");
        requirePositive(refreshConcurrencyGrace, "refreshConcurrencyGrace");
    }

    private static void requirePositive(Duration value, String name) {
        if (value == null || value.isZero() || value.isNegative()) {
            throw new IllegalArgumentException(name + " must be positive");
        }
    }

}
