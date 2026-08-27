package kr.rilog.domain.upload.domain.vo.v2;

import kr.rilog.domain.upload.domain.TagStatus;

import java.util.Objects;

public record S3TagTarget(
        String key,
        TagStatus tagStatus
) {

    public S3TagTarget {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException(
                    "S3 object key는 비어 있을 수 없습니다."
            );
        }

        Objects.requireNonNull(
                tagStatus,
                "S3 tag status는 null일 수 없습니다."
        );
    }

}
