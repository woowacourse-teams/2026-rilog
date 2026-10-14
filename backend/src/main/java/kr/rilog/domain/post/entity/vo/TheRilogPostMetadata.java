package kr.rilog.domain.post.entity.vo;

import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.exception.PostException;

import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_THE_RILOG_METADATA;

public record TheRilogPostMetadata(
        PostType postType,
        String description,
        String sourceProfileName,
        String sourceProfileImage
) {
    public TheRilogPostMetadata {
        if (postType == null || postType == PostType.STANDARD) {
            throw new PostException(INVALID_THE_RILOG_METADATA);
        }
        if (postType.isSpotlight()) {
            if (isBlankOrTooLong(description, 100) || isBlankOrTooLong(sourceProfileName, 255)
                    || sourceProfileImage != null && isBlankOrTooLong(sourceProfileImage, 512)) {
                throw new PostException(INVALID_THE_RILOG_METADATA);
            }
        } else if (description != null || sourceProfileName != null || sourceProfileImage != null) {
            throw new PostException(INVALID_THE_RILOG_METADATA);
        }
    }

    public static boolean isBlankOrTooLong(String text, int maxLength) {
        return text == null || text.isBlank() || text.codePointCount(0, text.length()) > maxLength;
    }
}
