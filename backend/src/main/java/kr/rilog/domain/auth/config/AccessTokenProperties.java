package kr.rilog.domain.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "auth.access-token")
public record AccessTokenProperties(
        String secret,
        Duration expiration
) {

    public static AccessTokenProperties of(String secret, Duration expiration) {
        if (expiration == null) {
            return new AccessTokenProperties(secret, Duration.ofMinutes(15));
        }
        return new AccessTokenProperties(secret, expiration);
    }

}
