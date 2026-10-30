package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.enums.CompactionTarget;
import kr.rilog.domain.upload.exception.UploadException;
import kr.rilog.global.s3.properties.S3Properties;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static kr.rilog.domain.upload.exception.UploadErrorInformation.INVALID_UPLOAD_TARGET;

/**
 * 압축 원본 key({root}/{images|profiles}/raw/{userId}-{UUID}/original.{ext})에서
 * 압축본 key({root}/{images|profiles}/compact/{userId}-{UUID}/{width}.webp)를 만든다.
 *
 * <p>확장자는 이미지 서버(와 이전 압축 Lambda)가 변환하는 형식만 허용한다. 나머지 형식은 압축을 요청하지 않고 원본만 쓴다.
 */
@Component
public class S3CompactObjectKeyPolicy {

    private static final String RAW_DIRECTORY = "raw";
    private static final String COMPACT_DIRECTORY = "compact";

    private final String rootDirectory;
    private final Pattern rawKeyPattern;

    public S3CompactObjectKeyPolicy(S3Properties properties) {
        this.rootDirectory = properties.rootDirectory();
        this.rawKeyPattern = Pattern.compile(
                "^" + Pattern.quote(rootDirectory) + "/"
                        + "(?<directory>[a-z]+)/" + RAW_DIRECTORY + "/"
                        + "(?<userId>\\d+)-"
                        + "(?<uuid>[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})"
                        + "/original\\.(?i:jpg|jpeg|png|webp|avif)$"
        );
    }

    public boolean isCompactable(String objectKey) {
        if (objectKey == null) {
            return false;
        }

        Matcher matcher = rawKeyPattern.matcher(objectKey);
        return matcher.matches() && CompactionTarget.fromDirectory(matcher.group("directory")).isPresent();
    }

    public CompactSource parse(String rawObjectKey) {
        if (rawObjectKey == null) {
            throw new UploadException(INVALID_UPLOAD_TARGET);
        }

        Matcher matcher = rawKeyPattern.matcher(rawObjectKey);
        if (!matcher.matches()) {
            throw new UploadException(INVALID_UPLOAD_TARGET);
        }

        CompactionTarget target = CompactionTarget.fromDirectory(matcher.group("directory"))
                .orElseThrow(() -> new UploadException(INVALID_UPLOAD_TARGET));
        return new CompactSource(target, matcher.group("userId"), matcher.group("uuid"));
    }

    public String compactKey(CompactSource source, int width) {
        return "%s/%s/%s/%s-%s/%d.webp".formatted(
                rootDirectory,
                source.target().getDirectory(),
                COMPACT_DIRECTORY,
                source.userId(),
                source.uuid(),
                width
        );
    }

    // userId는 key에 적힌 문자열 그대로 둔다. 숫자로 바꾸면 선행 0이나 범위 초과에서 원본과 다른 key가 만들어진다.
    public record CompactSource(
            CompactionTarget target,
            String userId,
            String uuid
    ) {
    }
}
