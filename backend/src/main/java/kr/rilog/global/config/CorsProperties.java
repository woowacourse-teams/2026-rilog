package kr.rilog.global.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;
import java.util.Objects;

@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(
        List<String> allowedOrigins
) {

    public CorsProperties {
        Objects.requireNonNull(allowedOrigins, "app.cors.allowed-origins 설정은 필수입니다.");
        allowedOrigins = List.copyOf(allowedOrigins);
    }

    public String[] allowedOriginArray() {
        return allowedOrigins.toArray(String[]::new);
    }
}
