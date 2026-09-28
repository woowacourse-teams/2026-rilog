package kr.rilog.domain.seo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "site.sitemap")
public record SitemapProperties(String baseUrl, Duration cacheMaxAge) {

    private static final String DEFAULT_BASE_URL = "https://www.rilog.kr";
    private static final Duration DEFAULT_CACHE_MAX_AGE = Duration.ofMinutes(10);

    public SitemapProperties {
        baseUrl = normalizeBaseUrl(baseUrl);
        cacheMaxAge = cacheMaxAge == null ? DEFAULT_CACHE_MAX_AGE : cacheMaxAge;
    }

    private static String normalizeBaseUrl(String baseUrl) {
        if (baseUrl == null || baseUrl.isBlank()) {
            return DEFAULT_BASE_URL;
        }

        String stripped = baseUrl.strip();
        while (stripped.endsWith("/")) {
            stripped = stripped.substring(0, stripped.length() - 1);
        }
        return stripped;
    }

}

