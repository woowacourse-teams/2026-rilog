package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.enums.UploadType;
import kr.rilog.global.s3.properties.S3Properties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class S3ImageObjectKeyPolicy {

    private static final String ORIGINALS_DIRECTORY = "originals";
    private static final Pattern OWNED_IMAGE_FILE_PATTERN = Pattern.compile(
            "^(?<userId>\\d+)-"
                    + "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
                    + "\\.(jpg|png|webp|gif)$"
    );

    private final S3Properties properties;

    public String create(Long userId, UUID uploadId, String extension) {
        return "%s/%s/%s/%d-%s.%s".formatted(
                properties.rootDirectory(),
                UploadType.IMAGE.getDirectory(),
                ORIGINALS_DIRECTORY,
                userId,
                uploadId,
                extension
        );
    }

    public boolean isManagedImage(String objectKey) {
        return objectKey != null && objectKey.startsWith(imageDirectoryPrefix());
    }

    public boolean isOwnedBy(String objectKey, Long requesterId) {
        if (requesterId == null || !isManagedImage(objectKey)) {
            return false;
        }

        String fileName = objectKey.substring(imageDirectoryPrefix().length());
        Matcher matcher = OWNED_IMAGE_FILE_PATTERN.matcher(fileName);
        if (!matcher.matches()) {
            return false;
        }

        try {
            long imageOwnerId = Long.parseLong(matcher.group("userId"));
            return requesterId.longValue() == imageOwnerId;
        } catch (NumberFormatException exception) {
            return false;
        }
    }

    private String imageDirectoryPrefix() {
        return "%s/%s/%s/".formatted(
                properties.rootDirectory(),
                UploadType.IMAGE.getDirectory(),
                ORIGINALS_DIRECTORY
        );
    }
}
