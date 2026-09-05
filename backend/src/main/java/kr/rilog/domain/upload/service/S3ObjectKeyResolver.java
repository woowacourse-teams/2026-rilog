package kr.rilog.domain.upload.service;

import kr.rilog.global.s3.properties.S3Properties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class S3ObjectKeyResolver {

    private static final String HTTPS_SCHEME = "https";
    private final S3Properties properties;

    public Optional<String> resolve(String objectReference) {
        if (objectReference == null || objectReference.isBlank()) {
            return Optional.empty();
        }

        if (isInRootDirectory(objectReference)) {
            return Optional.of(objectReference);
        }

        URI uri;

        try {
            uri = URI.create(objectReference);
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }

        if (!HTTPS_SCHEME.equalsIgnoreCase(uri.getScheme())) {
            return Optional.empty();
        }

        if (!expectedHost().equalsIgnoreCase(uri.getHost())) {
            return Optional.empty();
        }

        String path = uri.getPath();
        if (path == null || path.length() <= 1) {
            return Optional.empty();
        }

        String objectKey = path.substring(1);
        if (!isInRootDirectory(objectKey)) {
            return Optional.empty();
        }

        return Optional.of(objectKey);

    }

    private boolean isInRootDirectory(String objectKey) {
        return objectKey.startsWith(properties.rootDirectory() + "/");
    }

    private String expectedHost() {
        return "%s.s3.%s.amazonaws.com".formatted(
                properties.bucket(),
                properties.region()
        );
    }

}
