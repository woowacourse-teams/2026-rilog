package kr.rilog.domain.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "internal-api.lambda")
public record LambdaRequestProperties(
        String secret
) {
}
