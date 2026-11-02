package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.enums.ImagePurpose;
import kr.rilog.global.s3.properties.S3Properties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 사용자 이미지 원본 key({root}/{images|profiles}/raw/{userId}-{UUID}/original.{ext})를 만들고,
 * 관리 대상 이미지 key의 소유자를 판별한다.
 *
 * <p>관리 대상은 raw 원본, 같은 {userId}-{UUID} 디렉터리의 compact 압축본, 그리고 S3 마이그레이션 전까지 남아 있는
 * 기존 originals 원본({root}/images/originals/{userId}-{UUID}.{ext})이다.
 */
@Component
public class S3ImageObjectKeyPolicy {

    private static final String LEGACY_ORIGINALS_DIRECTORY = "images/originals";
    private static final String RAW_DIRECTORY = "raw";
    private static final String COMPACT_DIRECTORY = "compact";
    private static final String OWNED_IMAGE_ID =
            "(?<userId>\\d+)-"
                    + "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
    private static final String IMAGE_EXTENSION = "\\.(jpg|png|webp|gif|avif|svg|heic)";
    private static final Pattern LEGACY_ORIGINAL_FILE_PATTERN =
            Pattern.compile("^" + OWNED_IMAGE_ID + IMAGE_EXTENSION + "$");
    private static final Pattern RAW_FILE_PATTERN =
            Pattern.compile("^" + OWNED_IMAGE_ID + "/original" + IMAGE_EXTENSION + "$");
    private static final Pattern COMPACT_FILE_PATTERN =
            Pattern.compile("^" + OWNED_IMAGE_ID + "/\\d+\\.webp$");

    private final String rootDirectory;
    private final List<ManagedDirectory> managedDirectories;

    public S3ImageObjectKeyPolicy(S3Properties properties) {
        this.rootDirectory = properties.rootDirectory();
        this.managedDirectories = createManagedDirectories();
    }

    public String create(Long userId, UUID uploadId, ImagePurpose purpose, String extension) {
        return "%s/%s/%s/%d-%s/original.%s".formatted(
                rootDirectory,
                purpose.getDirectory(),
                RAW_DIRECTORY,
                userId,
                uploadId,
                extension
        );
    }

    public boolean isManagedImage(String objectKey) {
        return findManagedDirectory(objectKey).isPresent();
    }

    public boolean isOwnedBy(String objectKey, Long requesterId) {
        if (requesterId == null) {
            return false;
        }

        return findManagedDirectory(objectKey)
                .map(directory -> isOwnedBy(directory, objectKey, requesterId))
                .orElse(false);
    }

    private boolean isOwnedBy(ManagedDirectory directory, String objectKey, Long requesterId) {
        String fileName = objectKey.substring(directory.prefix().length());
        Matcher matcher = directory.filePattern().matcher(fileName);
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

    private Optional<ManagedDirectory> findManagedDirectory(String objectKey) {
        if (objectKey == null) {
            return Optional.empty();
        }

        return managedDirectories.stream()
                .filter(directory -> objectKey.startsWith(directory.prefix()))
                .findFirst();
    }

    private List<ManagedDirectory> createManagedDirectories() {
        List<ManagedDirectory> directories = new ArrayList<>();
        directories.add(new ManagedDirectory(prefix(LEGACY_ORIGINALS_DIRECTORY), LEGACY_ORIGINAL_FILE_PATTERN));
        for (ImagePurpose purpose : ImagePurpose.values()) {
            directories.add(new ManagedDirectory(prefix(purpose.getDirectory() + "/" + RAW_DIRECTORY), RAW_FILE_PATTERN));
            directories.add(new ManagedDirectory(prefix(purpose.getDirectory() + "/" + COMPACT_DIRECTORY), COMPACT_FILE_PATTERN));
        }
        return List.copyOf(directories);
    }

    private String prefix(String directory) {
        return "%s/%s/".formatted(rootDirectory, directory);
    }

    private record ManagedDirectory(
            String prefix,
            Pattern filePattern
    ) {
    }
}
