package kr.rilog.domain.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "auth.onboarding-token")
public record OnboardingTokenProperties(
        String secret,
        Duration expiration
) {

    public static OnboardingTokenProperties of(String secret, Duration expiration) {
        if (expiration == null) {
            return new OnboardingTokenProperties(secret, Duration.ofMinutes(10));
        }
        return new OnboardingTokenProperties(secret, expiration);
    }
}
