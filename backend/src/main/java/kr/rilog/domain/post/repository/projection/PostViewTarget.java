package kr.rilog.domain.post.repository.projection;

import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.exception.PostException;

import static kr.rilog.domain.post.exception.PostErrorInformation.PRIVATE_POST_READ_FORBIDDEN;

public record PostViewTarget(Long postId, Long authorId, PostVisibility visibility) {

    public void validateReadableBy(Long requesterId) {
        if (visibility == PostVisibility.PRIVATE && !isWrittenBy(requesterId)) {
            throw new PostException(PRIVATE_POST_READ_FORBIDDEN);
        }
    }

    public boolean isWrittenBy(Long requesterId) {
        return authorId != null && authorId.equals(requesterId);
    }
}
