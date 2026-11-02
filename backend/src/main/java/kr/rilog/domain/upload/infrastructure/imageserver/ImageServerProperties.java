package kr.rilog.domain.upload.infrastructure.imageserver;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.net.URI;
import java.time.Duration;

@ConfigurationProperties(prefix = "image-server")
public record ImageServerProperties(
        URI baseUrl,
        String secret,
        Duration connectTimeout,
        Duration readTimeout,
        Duration compactionReadTimeout
) {
}
